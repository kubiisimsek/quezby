<?php

namespace App\Services;

use App\Enums\LeaderboardPeriod;
use App\Enums\LeagueOutcome;
use App\Enums\LeagueTier;
use App\Models\LeaderboardEntry;
use App\Models\LeagueGroup;
use App\Models\LeagueMember;
use App\Models\Run;
use App\Models\User;
use App\Support\Timestamp;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Container\Attributes\Config;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Weekly leagues, with no cron. A player takes a seat in a group of their
 * tier on their first ranked run of the ISO week; last week's group is
 * settled the first time any of its players needs it. League points are the
 * sum of a player's best score of each day of the week — showing up every
 * day pays, grinding one evening does not.
 */
final class LeagueService
{
    public function __construct(
        private readonly LeaderboardService $leaderboards,
        #[Config('quezby.leagues.group_size')]
        private readonly int $groupSize,
        #[Config('quezby.leagues.zone_per_30')]
        private readonly int $zonePer30,
    ) {}

    public function weekKey(CarbonInterface $at): string
    {
        return $this->leaderboards->keyAt(LeaderboardPeriod::Weekly, $at);
    }

    /**
     * Seats the player of a ranked run in this week's group, once, and says
     * where they stand now (`LeagueStanding` in `packages/types`).
     *
     * @return array{tier: string, rank: int, members: int, zone: string, points: int}
     */
    public function join(Run $run): array
    {
        $week = $this->weekKey($run->finished_at);
        $member = $this->membership($run->user, $week)
            ?? $this->seat($run->user, $week, $this->tierFor($run->user, $week), $run->finished_at);

        return $this->standingOf($member);
    }

    /** The tier a player plays `$week` in: last league's outcome applied; Bronz for a newcomer. */
    public function tierFor(User $user, string $week): LeagueTier
    {
        $previous = $this->previousMembership($user, $week);
        if ($previous === null) {
            return LeagueTier::Bronze;
        }
        $this->settle($previous->group);
        $previous->refresh();

        return match ($previous->outcome) {
            LeagueOutcome::Promoted => $previous->tier->up(),
            LeagueOutcome::Demoted => $previous->tier->down(),
            default => $previous->tier,
        };
    }

    /**
     * `LeagueResponse` in `packages/types`.
     *
     * @return array<string, mixed>
     */
    public function current(User $user, ?CarbonInterface $at = null): array
    {
        $at ??= now();
        $week = $this->weekKey($at);
        $bounds = $this->leaderboards->boundsAt(LeaderboardPeriod::Weekly, $at);
        $member = $this->membership($user, $week);
        $lastWeek = $this->lastWeek($user, $week);

        $response = [
            'season' => $this->leaderboards->season(),
            'weekKey' => $week,
            'tier' => ($member?->tier ?? $this->tierFor($user, $week))->slug(),
            'endsAt' => Timestamp::iso($bounds[1] ?? null),
            'serverTime' => Timestamp::iso(now()),
            'joined' => $member !== null,
            'members' => [],
            'me' => null,
            'promoteCount' => 0,
            'demoteCount' => 0,
            'promotionGap' => null,
            'nextRankProgress' => null,
            'lastWeek' => $lastWeek,
        ];
        if ($member === null) {
            return $response;
        }

        $standings = $this->standings($member->group);
        [$promote, $demote] = $this->zones($member->tier, count($standings));
        $following = $this->leaderboards->followedAmong($user, array_map(fn (array $row) => $row['userId'], $standings));

        $members = [];
        $over = null;
        $promotionGap = null;
        $progress = null;
        foreach ($standings as $row) {
            $entry = [
                'rank' => $row['rank'],
                'username' => $row['username'],
                'points' => $row['points'],
                'daysPlayed' => $row['days'],
                'isMe' => $row['userId'] === $user->id,
                'isFollowing' => isset($following[$row['userId']]),
                'zone' => $this->zoneOf($row['rank'], count($standings), $promote, $demote),
                'gap' => $over === null ? null : $over['points'] - $row['points'] + 1,
            ];
            $members[] = $entry;
            if ($entry['isMe']) {
                $response['me'] = $entry;
                $lastPromoted = $standings[$promote - 1] ?? null;
                $promotionGap = $promote > 0 && $row['rank'] > $promote && $lastPromoted !== null
                    ? $lastPromoted['points'] - $row['points'] + 1
                    : null;
                $progress = $over === null ? null : min(999, intdiv($row['points'] * 1000, $over['points'] + 1));
            }
            $over = $row;
        }

        return [
            ...$response,
            'members' => $members,
            'promoteCount' => $promote,
            'demoteCount' => $demote,
            'promotionGap' => $promotionGap,
            'nextRankProgress' => $progress,
        ];
    }

    /**
     * Where a seated player stands in their group right now.
     *
     * @return array{tier: string, rank: int, members: int, zone: string, points: int}
     */
    public function standingOf(LeagueMember $member): array
    {
        $standings = $this->standings($member->group);
        [$promote, $demote] = $this->zones($member->tier, count($standings));
        foreach ($standings as $row) {
            if ($row['userId'] === $member->user_id) {
                return [
                    'tier' => $member->tier->slug(),
                    'rank' => $row['rank'],
                    'members' => count($standings),
                    'zone' => $this->zoneOf($row['rank'], count($standings), $promote, $demote),
                    'points' => $row['points'],
                ];
            }
        }

        throw new RuntimeException('A seated player is missing from their group.');
    }

    /**
     * Closes a finished week's group: every member's final rank and whether
     * they go up, stay or go down. Does nothing while the week is still on.
     */
    public function settle(LeagueGroup $group): void
    {
        $ends = $this->weekBounds($group->week_key)[1];
        if (now()->lessThan($ends)) {
            return;
        }
        if (! $group->memberships()->whereNull('settled_at')->exists()) {
            return;
        }

        $standings = $this->standings($group);
        [$promote, $demote] = $this->zones($group->tier, count($standings));
        DB::transaction(function () use ($group, $standings, $promote, $demote) {
            foreach ($standings as $row) {
                $zone = $this->zoneOf($row['rank'], count($standings), $promote, $demote);
                LeagueMember::query()
                    ->where('group_id', $group->id)
                    ->where('user_id', $row['userId'])
                    ->whereNull('settled_at')
                    ->update([
                        'final_rank' => $row['rank'],
                        'outcome' => match ($zone) {
                            'promote' => LeagueOutcome::Promoted->value,
                            'demote' => LeagueOutcome::Demoted->value,
                            default => LeagueOutcome::Stayed->value,
                        },
                        'settled_at' => now(),
                    ]);
            }
            // Banned players are off the standings; they stay where they were.
            LeagueMember::query()->where('group_id', $group->id)->whereNull('settled_at')->update([
                'outcome' => LeagueOutcome::Stayed->value,
                'settled_at' => now(),
            ]);
        });
    }

    /**
     * How many go up and down: five in thirty, fewer in a smaller group, none
     * above Elmas or below Bronz.
     *
     * @return array{0: int, 1: int}
     */
    public function zones(LeagueTier $tier, int $members): array
    {
        $zone = intdiv($members * $this->zonePer30, $this->groupSize);

        return [$tier->isTop() ? 0 : $zone, $tier->isBottom() ? 0 : $zone];
    }

    private function zoneOf(int $rank, int $members, int $promote, int $demote): string
    {
        return match (true) {
            $rank <= $promote => 'promote',
            $rank > $members - $demote => 'demote',
            default => 'stay',
        };
    }

    /**
     * A group's members, best first: points (each day's best, summed), then
     * whoever joined first. Banned players are left out.
     *
     * @return list<array{userId: string, username: string, points: int, days: int, rank: int}>
     */
    private function standings(LeagueGroup $group): array
    {
        $members = LeagueMember::query()
            ->where('group_id', $group->id)
            ->join('users', 'users.id', '=', 'league_members.user_id')
            ->whereNull('users.banned_at')
            ->get(['league_members.user_id', 'league_members.joined_at', 'users.username']);

        $totals = LeaderboardEntry::query()
            ->where('season', $group->season)
            ->where('period', LeaderboardPeriod::Daily->value)
            ->whereIn('period_key', $this->daysOf($group->week_key))
            ->whereIn('user_id', $members->pluck('user_id'))
            ->groupBy('user_id')
            ->selectRaw('user_id, sum(score) as points, count(*) as days')
            ->get()
            ->keyBy('user_id');

        $rows = $members->map(fn (LeagueMember $member) => [
            'userId' => $member->user_id,
            'username' => (string) $member->getAttribute('username'),
            'points' => (int) ($totals[$member->user_id]->points ?? 0),
            'days' => (int) ($totals[$member->user_id]->days ?? 0),
            'joinedAt' => $member->getRawOriginal('joined_at'),
        ])->sort(fn (array $a, array $b) => [$b['points'], $a['joinedAt'], $a['userId']] <=> [$a['points'], $b['joinedAt'], $b['userId']])
            ->values();

        return $rows->map(fn (array $row, int $i) => [
            'userId' => $row['userId'],
            'username' => $row['username'],
            'points' => $row['points'],
            'days' => $row['days'],
            'rank' => $i + 1,
        ])->all();
    }

    private function membership(User $user, string $week): ?LeagueMember
    {
        return LeagueMember::query()
            ->with('group')
            ->where('user_id', $user->id)
            ->where('season', $this->leaderboards->season())
            ->where('week_key', $week)
            ->first();
    }

    private function previousMembership(User $user, string $week): ?LeagueMember
    {
        return LeagueMember::query()
            ->with('group')
            ->where('user_id', $user->id)
            ->where('season', $this->leaderboards->season())
            ->where('week_key', '<', $week)
            ->orderByDesc('week_key')
            ->first();
    }

    /**
     * `LeagueResponse.lastWeek`: how the player's last league ended.
     *
     * @return array<string, mixed>|null
     */
    private function lastWeek(User $user, string $week): ?array
    {
        $previous = $this->previousMembership($user, $week);
        if ($previous === null) {
            return null;
        }
        $this->settle($previous->group);
        $previous->refresh();
        if ($previous->outcome === null || $previous->final_rank === null) {
            return null;
        }
        $newTier = match ($previous->outcome) {
            LeagueOutcome::Promoted => $previous->tier->up(),
            LeagueOutcome::Demoted => $previous->tier->down(),
            default => $previous->tier,
        };

        return [
            'weekKey' => $previous->week_key,
            'tier' => $previous->tier->slug(),
            'rank' => $previous->final_rank,
            'members' => LeagueMember::query()->where('group_id', $previous->group_id)->whereNotNull('final_rank')->count(),
            'outcome' => $previous->outcome->value,
            'newTier' => $newTier->slug(),
        ];
    }

    /**
     * Takes the first free seat of the week's groups of `$tier`, opening a new
     * group when they are full. The seat is claimed by one conditional update,
     * so two players can never overfill a group.
     */
    private function seat(User $user, string $week, LeagueTier $tier, CarbonInterface $joinedAt): LeagueMember
    {
        $season = $this->leaderboards->season();
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $group = LeagueGroup::query()
                ->where('season', $season)
                ->where('week_key', $week)
                ->where('tier', $tier->value)
                ->where('members', '<', $this->groupSize)
                ->orderBy('id')
                ->first()
                ?? LeagueGroup::query()->create(['season' => $season, 'week_key' => $week, 'tier' => $tier, 'members' => 0]);

            $claimed = LeagueGroup::query()
                ->whereKey($group->id)
                ->where('members', '<', $this->groupSize)
                ->update(['members' => DB::raw('members + 1')]);
            if ($claimed === 1) {
                return LeagueMember::query()->create([
                    'group_id' => $group->id,
                    'user_id' => $user->id,
                    'season' => $season,
                    'week_key' => $week,
                    'tier' => $tier,
                    'joined_at' => $joinedAt,
                ])->load('group');
            }
        }

        throw new RuntimeException('Could not find a league seat.');
    }

    /**
     * The seven Istanbul days of an ISO week key, `Y-m-d`.
     *
     * @return list<string>
     */
    private function daysOf(string $week): array
    {
        $monday = $this->weekBounds($week)[0]->setTimezone($this->leaderboards->timezone());

        return array_map(fn (int $day) => $monday->addDays($day)->format('Y-m-d'), range(0, 6));
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private function weekBounds(string $week): array
    {
        [$year, $number] = array_map('intval', explode('-W', $week));
        $monday = CarbonImmutable::now($this->leaderboards->timezone())->setISODate($year, $number, 1)->startOfDay();

        return [$monday->utc(), $monday->addWeek()->utc()];
    }
}
