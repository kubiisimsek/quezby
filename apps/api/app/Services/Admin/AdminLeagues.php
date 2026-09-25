<?php

namespace App\Services\Admin;

use App\Enums\LeagueTier;
use App\Models\LeagueGroup;
use App\Models\LeagueMember;
use App\Models\User;
use App\Services\LeaderboardService;
use App\Services\LeagueService;
use App\Support\Timestamp;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/** The weekly leagues as the admin panel sees them: every group of a week, and any group's table. */
final class AdminLeagues
{
    public function __construct(
        private readonly LeagueService $leagues,
        private readonly LeaderboardService $leaderboards,
    ) {}

    /**
     * `AdminLeaguesResponse` in `packages/types`.
     *
     * @return array<string, mixed>
     */
    public function week(?string $week, ?LeagueTier $tier, int $page, int $perPage): array
    {
        $season = $this->leaderboards->season();
        $week ??= $this->leagues->weekKey(now());

        /** @var LengthAwarePaginator<int, LeagueGroup> $groups */
        $groups = LeagueGroup::query()
            ->where('season', $season)
            ->where('week_key', $week)
            ->when($tier !== null, fn ($query) => $query->where('tier', $tier?->value))
            ->withCount(['memberships as open_members' => fn ($query) => $query->whereNull('settled_at')])
            ->orderByDesc('tier')
            ->orderBy('id')
            ->paginate($perPage, ['*'], 'page', $page);

        $seated = LeagueMember::query()
            ->toBase()
            ->selectRaw('tier, count(*) as players')
            ->where('season', $season)
            ->where('week_key', $week)
            ->groupBy('tier')
            ->pluck('players', 'tier');

        return Paginated::of($groups, fn (LeagueGroup $group) => $this->row($group)) + [
            'season' => $season,
            'weekKey' => $week,
            'weeks' => LeagueGroup::query()->where('season', $season)->distinct()->orderByDesc('week_key')->limit(26)->pluck('week_key')->values()->all(),
            'tiers' => collect(LeagueTier::cases())->mapWithKeys(fn (LeagueTier $case) => [$case->slug() => (int) ($seated[$case->value] ?? 0)])->all(),
        ];
    }

    /**
     * `AdminLeagueGroupResponse`: the group's table as its players see it,
     * the final ranks once the week is settled, and the banned members who
     * sit out of it. Looking at a finished week settles it, as a player would.
     *
     * @return array<string, mixed>
     */
    public function group(LeagueGroup $group): array
    {
        $this->leagues->settle($group);
        $table = $this->leagues->table($group);
        $members = LeagueMember::query()->where('group_id', $group->id)->get()->keyBy('user_id');
        $players = User::query()->whereKey($members->keys())->get()->keyBy('id');
        [$starts, $ends] = $this->leagues->boundsOfWeek($group->week_key);
        $group->loadCount(['memberships as open_members' => fn ($query) => $query->whereNull('settled_at')]);

        return [
            'group' => $this->row($group) + [
                'season' => $group->season,
                'weekKey' => $group->week_key,
                'startsAt' => Timestamp::iso($starts),
                'endsAt' => Timestamp::iso($ends),
            ],
            'promoteCount' => $table['promote'],
            'demoteCount' => $table['demote'],
            'standings' => array_map(function (array $row) use ($members, $players) {
                $member = $members->get($row['userId']);

                return [
                    'rank' => $row['rank'],
                    'player' => AdminRuns::ref($players->get($row['userId'])),
                    'points' => $row['points'],
                    'daysPlayed' => $row['days'],
                    'zone' => $row['zone'],
                    'finalRank' => $member?->final_rank,
                    'outcome' => $member?->outcome?->value,
                ];
            }, $table['standings']),
            'banned' => $players->filter(fn (User $player) => $player->isBanned())->map(fn (User $player) => AdminRuns::ref($player))->values()->all(),
        ];
    }

    /**
     * `AdminLeagueGroupRow`.
     *
     * @return array<string, mixed>
     */
    private function row(LeagueGroup $group): array
    {
        return [
            'id' => $group->id,
            'tier' => $group->tier->slug(),
            'members' => $group->members,
            'settled' => $group->members > 0 && (int) $group->getAttribute('open_members') === 0,
            'createdAt' => Timestamp::iso($group->created_at),
        ];
    }
}
