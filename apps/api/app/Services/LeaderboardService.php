<?php

namespace App\Services;

use App\Enums\LeaderboardPeriod;
use App\Enums\RunMode;
use App\Enums\RunStatus;
use App\Models\LeaderboardEntry;
use App\Models\Run;
use App\Models\User;
use App\Support\Timestamp;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Container\Attributes\Config;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * One row per player, board and season — their best ranked run — ranked by
 * score, then by who got there first:
 * `rank = 1 + count(score > mine) + count(score = mine and achieved_at < mine)`.
 *
 * Every query is scoped to the current season (the engine version), so a
 * rules change can never rank one game against another.
 */
final class LeaderboardService
{
    public function __construct(
        #[Config('quezby.leaderboard.timezone')]
        private readonly string $timezone,
        #[Config('quezby.season')]
        private readonly int $season,
    ) {}

    public function season(): int
    {
        return $this->season;
    }

    public function timezone(): string
    {
        return $this->timezone;
    }

    public function keyAt(LeaderboardPeriod $period, CarbonInterface $at): string
    {
        return $period->keyAt($at, $this->timezone);
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}|null
     */
    public function boundsAt(LeaderboardPeriod $period, CarbonInterface $at): ?array
    {
        return $period->boundsAt($at, $this->timezone);
    }

    /**
     * Puts a ranked run on today's, this week's, this month's and the season's
     * board — and on today's challenge board when it was the daily run. A row
     * only ever moves to a strictly higher score, so an equal score keeps the
     * earlier `achieved_at`.
     */
    public function record(Run $run): RecordOutcome
    {
        $user = $run->user;
        $before = $this->ranksFor($user, $run->finished_at);
        $dailyBefore = $this->rowOf($user, LeaderboardPeriod::Daily, $this->keyAt(LeaderboardPeriod::Daily, $run->finished_at));

        $raised = [];
        foreach ($this->boardsFor($run) as $period) {
            $raised[$period->value] = $this->put($run, $period);
        }

        $passed = $raised[LeaderboardPeriod::Daily->value]
            ? $this->passedOn(LeaderboardPeriod::Daily, $run, $dailyBefore?->score ?? 0)
            : [];

        return new RecordOutcome(
            before: $before,
            after: $this->ranksFor($user, $run->finished_at),
            isNewBest: $raised[LeaderboardPeriod::All->value],
            passed: $passed,
        );
    }

    /**
     * @return list<LeaderboardPeriod>
     */
    private function boardsFor(Run $run): array
    {
        $boards = LeaderboardPeriod::calendar();
        if ($run->mode === RunMode::Daily) {
            $boards[] = LeaderboardPeriod::Challenge;
        }

        return $boards;
    }

    /** Writes one board's row for a run; true when it is now the player's best there. */
    private function put(Run $run, LeaderboardPeriod $period): bool
    {
        $row = [
            'season' => $this->season,
            'period' => $period->value,
            'period_key' => $this->keyAt($period, $run->finished_at),
            'user_id' => $run->user_id,
        ];
        $values = [
            'run_id' => $run->id,
            'score' => $run->score,
            'reels' => $run->reels,
            'achieved_at' => $run->finished_at->format(Timestamp::STORAGE_FORMAT),
        ];

        if ($this->raise($row, $values) > 0) {
            return true;
        }

        $now = now()->format(Timestamp::STORAGE_FORMAT);
        $inserted = LeaderboardEntry::query()->insertOrIgnore($row + $values + ['created_at' => $now, 'updated_at' => $now]);
        if ($inserted > 0) {
            return true;
        }

        // Another finish of the same player inserted the row first.
        return $this->raise($row, $values) > 0;
    }

    /**
     * Up to three players this run overtook on a board: those at or above the
     * player's old score and below the new one, closest first.
     *
     * @return list<array{username: string, score: int, isFollowing: bool}>
     */
    private function passedOn(LeaderboardPeriod $period, Run $run, int $oldScore): array
    {
        $rows = $this->scope($period, $this->keyAt($period, $run->finished_at))
            ->join('users', 'users.id', '=', 'leaderboard_entries.user_id')
            ->where('leaderboard_entries.user_id', '!=', $run->user_id)
            ->where('leaderboard_entries.score', '>=', $oldScore)
            ->where('leaderboard_entries.score', '<', $run->score)
            ->orderByDesc('leaderboard_entries.score')
            ->orderBy('leaderboard_entries.achieved_at')
            ->limit(3)
            ->get(['leaderboard_entries.user_id', 'leaderboard_entries.score', 'users.username']);

        $following = $this->followedAmong($run->user, $rows->pluck('user_id')->all());

        return $rows->map(fn (LeaderboardEntry $entry) => [
            'username' => (string) $entry->username,
            'score' => $entry->score,
            'isFollowing' => isset($following[$entry->user_id]),
        ])->values()->all();
    }

    /**
     * The player's rank on each calendar board right now.
     *
     * @return array{daily: int|null, weekly: int|null, monthly: int|null, all: int|null}
     */
    public function ranksFor(User $user, ?CarbonInterface $at = null): array
    {
        $at ??= now();
        $ranks = ['daily' => null, 'weekly' => null, 'monthly' => null, 'all' => null];

        $entries = LeaderboardEntry::query()
            ->where('season', $this->season)
            ->where('user_id', $user->id)
            ->where(function (Builder $query) use ($at) {
                foreach (LeaderboardPeriod::calendar() as $period) {
                    $query->orWhere(fn (Builder $query) => $query
                        ->where('period', $period->value)
                        ->where('period_key', $this->keyAt($period, $at)));
                }
            })
            ->get();

        foreach ($entries as $entry) {
            $ranks[$entry->period->value] = $this->rankOf($entry);
        }

        return $ranks;
    }

    /** The player's best of the season: their all-time row. */
    public function bestOf(User $user): ?LeaderboardEntry
    {
        return $this->rowOf($user, LeaderboardPeriod::All, 'all');
    }

    public function rowOf(User $user, LeaderboardPeriod $period, string $key): ?LeaderboardEntry
    {
        return $this->scope($period, $key)->where('user_id', $user->id)->first();
    }

    /**
     * @param  list<string>|null  $among  Only these players count (a friends board).
     */
    public function rankOf(LeaderboardEntry $entry, ?array $among = null): int
    {
        $achievedAt = $entry->getRawOriginal('achieved_at');

        return 1 + LeaderboardEntry::query()
            ->where('season', $entry->season)
            ->where('period', $entry->period->value)
            ->where('period_key', $entry->period_key)
            ->when($among !== null, fn (Builder $query) => $query->whereIn('user_id', $among))
            ->where(fn (Builder $query) => $query
                ->where('score', '>', $entry->score)
                ->orWhere(fn (Builder $query) => $query
                    ->where('score', $entry->score)
                    ->where('achieved_at', '<', $achievedAt)))
            ->count();
    }

    /** Whether `$score` would enter the top `$places` of a board today, ignoring `$user`'s own row. */
    public function wouldPlace(LeaderboardPeriod $period, CarbonInterface $at, int $score, int $places, User $user): bool
    {
        $ahead = $this->scope($period, $this->keyAt($period, $at))
            ->where('user_id', '!=', $user->id)
            ->where('score', '>=', $score)
            ->count();

        return $ahead < $places;
    }

    /**
     * The board a player asked for, with everything "Zirve" draws: the top,
     * their own row and its neighbours, the rival right above and how far away
     * they are, and when the period turns over.
     *
     * @return array<string, mixed>
     */
    public function board(LeaderboardPeriod $period, string $scope, int $limit, User $viewer, ?CarbonInterface $at = null): array
    {
        $at ??= now();
        $key = $this->keyAt($period, $at);
        $bounds = $this->boundsAt($period, $at);
        $among = $scope === 'friends' ? $this->friendsOf($viewer) : null;
        $query = fn (): Builder => $this->scope($period, $key)
            ->when($among !== null, fn (Builder $query) => $query->whereIn('leaderboard_entries.user_id', $among));

        $top = $query()
            ->join('users', 'users.id', '=', 'leaderboard_entries.user_id')
            ->orderByDesc('leaderboard_entries.score')
            ->orderBy('leaderboard_entries.achieved_at')
            ->orderBy('leaderboard_entries.id')
            ->limit($limit)
            ->get(['leaderboard_entries.*', 'users.username']);

        $mine = $query()->where('leaderboard_entries.user_id', $viewer->id)->first();
        $myRank = $mine === null ? null : $this->rankOf($mine, $among);

        $above = collect();
        $below = collect();
        if ($mine !== null) {
            $achievedAt = $mine->getRawOriginal('achieved_at');
            $above = $query()
                ->join('users', 'users.id', '=', 'leaderboard_entries.user_id')
                ->where(fn (Builder $q) => $q
                    ->where('leaderboard_entries.score', '>', $mine->score)
                    ->orWhere(fn (Builder $q) => $q
                        ->where('leaderboard_entries.score', $mine->score)
                        ->where('leaderboard_entries.achieved_at', '<', $achievedAt)))
                ->orderBy('leaderboard_entries.score')
                ->orderByDesc('leaderboard_entries.achieved_at')
                ->orderByDesc('leaderboard_entries.id')
                ->limit(3)
                ->get(['leaderboard_entries.*', 'users.username'])
                ->reverse()
                ->values();
            $below = $query()
                ->join('users', 'users.id', '=', 'leaderboard_entries.user_id')
                ->where(fn (Builder $q) => $q
                    ->where('leaderboard_entries.score', '<', $mine->score)
                    ->orWhere(fn (Builder $q) => $q
                        ->where('leaderboard_entries.score', $mine->score)
                        ->where('leaderboard_entries.achieved_at', '>', $achievedAt)))
                ->orderByDesc('leaderboard_entries.score')
                ->orderBy('leaderboard_entries.achieved_at')
                ->orderBy('leaderboard_entries.id')
                ->limit(2)
                ->get(['leaderboard_entries.*', 'users.username']);
        }

        $userIds = $top->pluck('user_id')->merge($above->pluck('user_id'))->merge($below->pluck('user_id'))->unique()->values()->all();
        $following = $this->followedAmong($viewer, $userIds);
        $present = fn (LeaderboardEntry $entry, int $rank, ?LeaderboardEntry $over) => $this->present(
            $entry, $rank, (string) ($entry->username ?? $viewer->username), $viewer, $following, $over,
        );

        $entries = [];
        $previous = null;
        $rank = 0;
        foreach ($top->values() as $position => $row) {
            $tied = $previous !== null
                && $row->score === $previous->score
                && $row->getRawOriginal('achieved_at') === $previous->getRawOriginal('achieved_at');
            $rank = $tied ? $rank : $position + 1;
            $entries[] = $present($row, $rank, $previous);
            $previous = $row;
        }

        $me = null;
        $neighbors = [];
        $rival = null;
        $progress = null;
        if ($mine !== null && $myRank !== null) {
            $closest = $above->last();
            $me = $present($mine, $myRank, $closest);

            $aboveRows = $above->values();
            $count = $aboveRows->count();
            foreach ($aboveRows as $i => $row) {
                if ($count === 3 && $i === 0) {
                    continue; // Only fetched to tell the next row its gap.
                }
                $neighbors[] = $present($row, $myRank - ($count - $i), $aboveRows[$i - 1] ?? null);
            }
            $neighbors[] = $me;
            $over = $mine;
            foreach ($below->values() as $i => $row) {
                $neighbors[] = $present($row, $myRank + $i + 1, $over);
                $over = $row;
            }

            if ($closest !== null) {
                $gap = $closest->score - $mine->score + 1;
                $rival = [
                    'entry' => $present($closest, $myRank - 1, $aboveRows[$count - 2] ?? null),
                    'gap' => $gap,
                ];
                $progress = min(999, intdiv($mine->score * 1000, $closest->score + 1));
            }
        }

        return [
            'board' => $period->value,
            'periodKey' => $key,
            'season' => $this->season,
            'scope' => $scope,
            'startsAt' => $bounds === null ? null : Timestamp::iso($bounds[0]),
            'endsAt' => $bounds === null ? null : Timestamp::iso($bounds[1]),
            'serverTime' => Timestamp::iso(now()),
            'entries' => $entries,
            'me' => $me,
            'neighbors' => $neighbors,
            'rival' => $rival,
            'nextRankProgress' => $progress,
            'players' => $query()->count(),
        ];
    }

    /**
     * Rebuilds a player's rows this season from the ranked runs they have
     * left — after a moderator rejected one of them.
     */
    public function rebuildFor(User $user): void
    {
        DB::transaction(function () use ($user) {
            LeaderboardEntry::query()->where('season', $this->season)->where('user_id', $user->id)->delete();

            $user->runs()
                ->where('status', RunStatus::Ranked)
                ->where('engine_version', $this->season)
                ->where('score', '>', 0)
                ->orderBy('finished_at')
                ->each(function (Run $run) {
                    foreach ($this->boardsFor($run) as $period) {
                        $this->put($run, $period);
                    }
                });
        });
    }

    /**
     * The players on a board of this season.
     *
     * @return Builder<LeaderboardEntry>
     */
    public function scope(LeaderboardPeriod $period, string $key): Builder
    {
        return LeaderboardEntry::query()
            ->where('leaderboard_entries.season', $this->season)
            ->where('leaderboard_entries.period', $period->value)
            ->where('leaderboard_entries.period_key', $key);
    }

    /**
     * A player's friends board: the players they follow, and themselves.
     *
     * @return list<string>
     */
    public function friendsOf(User $user): array
    {
        return DB::table('follows')->where('follower_id', $user->id)->pluck('followee_id')
            ->push($user->id)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * Which of `$userIds` the viewer follows.
     *
     * @param  list<string>  $userIds
     * @return array<string, true>
     */
    public function followedAmong(User $viewer, array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }

        return DB::table('follows')
            ->where('follower_id', $viewer->id)
            ->whereIn('followee_id', $userIds)
            ->pluck('followee_id')
            ->mapWithKeys(fn (string $id) => [$id => true])
            ->all();
    }

    /**
     * @param  array{season: int, period: string, period_key: string, user_id: string}  $row
     * @param  array{run_id: string, score: int|null, reels: int|null, achieved_at: string}  $values
     */
    private function raise(array $row, array $values): int
    {
        return LeaderboardEntry::query()
            ->where($row)
            ->where('score', '<', $values['score'])
            ->update($values);
    }

    /**
     * `LeaderboardEntry` in `packages/types`. `gap` is what it takes to pass
     * the row above: its score plus one, since a tie goes to whoever was first.
     *
     * @param  array<string, true>  $following
     * @return array{rank: int, username: string, score: int, reels: int, isMe: bool, isFollowing: bool, gap: int|null}
     */
    private function present(LeaderboardEntry $entry, int $rank, string $username, User $viewer, array $following, ?LeaderboardEntry $over): array
    {
        return [
            'rank' => $rank,
            'username' => $username,
            'score' => $entry->score,
            'reels' => $entry->reels,
            'isMe' => $entry->user_id === $viewer->id,
            'isFollowing' => isset($following[$entry->user_id]),
            'gap' => $over === null ? null : $over->score - $entry->score + 1,
        ];
    }
}
