<?php

namespace App\Services\Admin;

use App\Enums\LeaderboardPeriod;
use App\Enums\RunMode;
use App\Models\LeaderboardEntry;
use App\Models\Run;
use App\Services\DailyService;
use App\Services\LeaderboardService;
use App\Support\Timestamp;
use Carbon\CarbonImmutable;
use Illuminate\Container\Attributes\Config;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

/**
 * The high-score boards as the admin panel reads them: any board, any period,
 * any season — a page at a time, ranked the way the game ranks them, with the
 * run behind every row and the signals it carries.
 */
final class AdminBoards
{
    public function __construct(
        private readonly LeaderboardService $leaderboards,
        private readonly DailyService $daily,
        #[Config('quezby.daily.epoch')]
        private readonly string $epoch,
    ) {}

    /**
     * `AdminBoardResponse` in `packages/types`.
     *
     * @return array<string, mixed>
     */
    public function board(LeaderboardPeriod $period, ?string $key, ?int $season, int $page, int $perPage): array
    {
        $season ??= $this->leaderboards->season();
        $key ??= $this->leaderboards->keyAt($period, now());

        /** @var LengthAwarePaginator<int, LeaderboardEntry> $rows */
        $rows = $this->scope($period, $key, $season)
            ->with('user')
            ->orderByDesc('score')
            ->orderBy('achieved_at')
            ->orderBy('id')
            ->paginate($perPage, ['*'], 'page', $page);

        $runs = Run::query()
            ->whereKey(collect($rows->items())->pluck('run_id')->filter()->all())
            ->get(['id', 'status', 'flags', 'device_verdict'])
            ->keyBy('id');

        $ranked = [];
        $previous = null;
        $rank = 0;
        foreach ($rows->items() as $index => $entry) {
            $tied = $previous !== null
                && $entry->score === $previous->score
                && $entry->getRawOriginal('achieved_at') === $previous->getRawOriginal('achieved_at');
            $rank = match (true) {
                $previous === null => 1 + $this->ahead($entry),
                $tied => $rank,
                default => ($rows->currentPage() - 1) * $rows->perPage() + $index + 1,
            };
            $run = $entry->run_id === null ? null : $runs->get($entry->run_id);
            $ranked[] = [
                'rank' => $rank,
                'player' => AdminRuns::ref($entry->user),
                'score' => $entry->score,
                'reels' => $entry->reels,
                'achievedAt' => Timestamp::iso($entry->achieved_at),
                'run' => $run === null ? null : [
                    'id' => $run->id,
                    'status' => $run->status->value,
                    'flags' => AdminRuns::flags($run->flags),
                    'deviceVerdict' => $run->device_verdict?->value,
                ],
            ];
            $previous = $entry;
        }

        [$starts, $ends] = $this->boundsOf($period, $key);

        return [
            'items' => $ranked,
            'page' => $rows->currentPage(),
            'perPage' => $rows->perPage(),
            'total' => $rows->total(),
            'board' => $period->value,
            'key' => $key,
            'season' => $season,
            'seasons' => LeaderboardEntry::query()->distinct()->orderByDesc('season')->pluck('season')->map(fn ($value) => (int) $value)->values()->all(),
            'number' => $period === LeaderboardPeriod::Challenge ? $this->challengeNumber($key) : null,
            'startsAt' => Timestamp::iso($starts),
            'endsAt' => Timestamp::iso($ends),
        ];
    }

    /**
     * `AdminBoardKeysResponse`: the periods a board has rows for, newest first,
     * with their size and their leader — and, for "Günün akışı", today even
     * before anyone played it.
     *
     * @return array<string, mixed>
     */
    public function keys(LeaderboardPeriod $period, ?int $season, int $limit): array
    {
        $season ??= $this->leaderboards->season();
        $counts = LeaderboardEntry::query()
            ->toBase()
            ->selectRaw('period_key, count(*) as players')
            ->where('season', $season)
            ->where('period', $period->value)
            ->groupBy('period_key')
            ->orderByDesc('period_key')
            ->limit($limit)
            ->pluck('players', 'period_key')
            ->map(fn ($players) => (int) $players)
            ->all();

        if ($period === LeaderboardPeriod::Challenge && $season === $this->leaderboards->season()) {
            $today = $this->leaderboards->keyAt($period, now());
            $counts = [$today => $counts[$today] ?? 0] + $counts;
        }

        $attempts = $period === LeaderboardPeriod::Challenge
            ? Run::query()->toBase()->selectRaw('daily_key, count(*) as attempts')
                ->where('mode', RunMode::Daily->value)
                ->where('engine_version', $season)
                ->whereIn('daily_key', array_keys($counts))
                ->groupBy('daily_key')
                ->pluck('attempts', 'daily_key')
                ->map(fn ($attempts) => (int) $attempts)
                ->all()
            : [];

        $keys = [];
        foreach ($counts as $key => $players) {
            $top = $players === 0 ? null : $this->scope($period, (string) $key, $season)
                ->with('user')
                ->orderByDesc('score')
                ->orderBy('achieved_at')
                ->orderBy('id')
                ->first();
            $keys[] = [
                'key' => (string) $key,
                'players' => $players,
                'number' => $period === LeaderboardPeriod::Challenge ? $this->challengeNumber((string) $key) : null,
                'topScore' => $top?->score,
                'topPlayer' => AdminRuns::ref($top?->user),
                'attempts' => $period === LeaderboardPeriod::Challenge ? ($attempts[$key] ?? 0) : null,
            ];
        }

        return ['board' => $period->value, 'season' => $season, 'keys' => $keys];
    }

    /**
     * "Günün akışı #N" — none for a day before the challenge's first
     * (`QUEZBY_DAILY_EPOCH`), which the game would call #1 as well.
     */
    private function challengeNumber(string $key): ?int
    {
        $first = CarbonImmutable::parse($this->epoch, $this->leaderboards->timezone())->format('Y-m-d');

        return $key < $first ? null : $this->daily->number($key);
    }

    /**
     * @return Builder<LeaderboardEntry>
     */
    private function scope(LeaderboardPeriod $period, string $key, int $season): Builder
    {
        return LeaderboardEntry::query()
            ->where('season', $season)
            ->where('period', $period->value)
            ->where('period_key', $key);
    }

    /** How many rows are strictly ahead of `$entry` — the game's rank, less one. */
    private function ahead(LeaderboardEntry $entry): int
    {
        $achievedAt = $entry->getRawOriginal('achieved_at');

        return $this->scope($entry->period, $entry->period_key, $entry->season)
            ->where(fn (Builder $query) => $query
                ->where('score', '>', $entry->score)
                ->orWhere(fn (Builder $query) => $query->where('score', $entry->score)->where('achieved_at', '<', $achievedAt)))
            ->count();
    }

    /**
     * When a period starts and ends, from its key; all time has neither.
     *
     * @return array{0: CarbonImmutable|null, 1: CarbonImmutable|null}
     */
    private function boundsOf(LeaderboardPeriod $period, string $key): array
    {
        $timezone = $this->leaderboards->timezone();
        $at = match ($period) {
            LeaderboardPeriod::Daily, LeaderboardPeriod::Challenge => CarbonImmutable::parse("{$key} 12:00", $timezone),
            LeaderboardPeriod::Weekly => CarbonImmutable::now($timezone)->setISODate((int) substr($key, 0, 4), (int) substr($key, 6, 2), 3)->setTime(12, 0),
            LeaderboardPeriod::Monthly => CarbonImmutable::parse("{$key}-15 12:00", $timezone),
            LeaderboardPeriod::All => null,
        };

        return $at === null ? [null, null] : ($period->boundsAt($at, $timezone) ?? [null, null]);
    }
}
