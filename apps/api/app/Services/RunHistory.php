<?php

namespace App\Services;

use App\Enums\RunMode;
use App\Enums\RunStatus;
use App\Models\Duel;
use App\Models\Run;
use App\Models\User;
use App\Services\Social\DuelService;
use App\Support\Cursor;
use App\Support\Timestamp;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * A player's own past games: every run played to its end and replayed —
 * ranked, held, flagged or a VS — the newest first, a page at a time, each
 * as the server's replay found it. Runs left open, abandoned or refused are
 * not games the player finished, and are left out.
 */
final class RunHistory
{
    public const PAGE_SIZE = 30;

    public function __construct(
        private readonly LeaderboardService $leaderboards,
        private readonly DailyService $daily,
        private readonly DuelService $duels,
    ) {}

    /**
     * `RunHistoryResponse`.
     *
     * @param  array{0: string, 1: string}|null  $after
     * @return array{runs: list<array<string, mixed>>, nextCursor: string|null}
     */
    public function page(User $user, ?RunMode $mode, ?array $after): array
    {
        $rows = $this->finished($user)
            ->when($mode !== null, fn (Builder $query) => $query->where('mode', $mode))
            ->when($after !== null, fn (Builder $query) => $query->where(fn (Builder $query) => $query
                ->where('finished_at', '<', $after[0])
                ->orWhere(fn (Builder $query) => $query->where('finished_at', $after[0])->where('id', '<', $after[1]))))
            ->orderByDesc('finished_at')
            ->orderByDesc('id')
            ->limit(self::PAGE_SIZE + 1)
            ->get(Run::LIST_COLUMNS);

        $page = $rows->take(self::PAGE_SIZE)->values();
        $last = $page->last();

        return [
            'runs' => $this->summaries($user, $page),
            'nextCursor' => $rows->count() > self::PAGE_SIZE && $last !== null
                ? Cursor::encode((string) $last->getRawOriginal('finished_at'), $last->id)
                : null,
        ];
    }

    /** One finished run of the player's, or null when it is not theirs or not finished. */
    public function find(User $user, string $runId): ?Run
    {
        return $this->finished($user)->find($runId);
    }

    /**
     * `RunSummary` in `packages/types` for each run, with a few queries
     * whatever the page: the season's best, the VS behind each VS run and who
     * it was against.
     *
     * @param  Collection<int, Run>  $runs
     * @return list<array<string, mixed>>
     */
    public function summaries(User $user, Collection $runs): array
    {
        $best = $this->leaderboards->bestOf($user)?->run_id;
        $duels = Duel::query()->whereIn('id', $runs->pluck('duel_id')->filter()->unique()->values()->all())->get()
            ->map(fn (Duel $duel) => $this->duels->settle($duel))
            ->keyBy('id');
        $names = User::query()->whereIn('id', $duels->map(fn (Duel $duel) => $duel->otherOf($user))->values()->all())->pluck('username', 'id');

        return $runs->map(function (Run $run) use ($user, $best, $duels, $names) {
            $duel = $run->duel_id === null ? null : $duels->get($run->duel_id);

            return [
                'runId' => $run->id,
                'mode' => $run->mode->value,
                'status' => $run->status->value,
                'score' => (int) $run->score,
                'reels' => (int) $run->reels,
                'level' => (int) $run->level,
                'activeMs' => (int) $run->active_ms,
                'finishedAt' => Timestamp::iso($run->finished_at),
                'isBest' => $best !== null && $run->id === $best,
                'dailyNumber' => $run->daily_key === null ? null : $this->daily->number($run->daily_key),
                'duel' => $duel === null ? null : $this->duels->brief($user, $duel) + ['opponent' => $names[$duel->otherOf($user)] ?? null],
            ];
        })->values()->all();
    }

    /** @return Builder<Run> */
    private function finished(User $user): Builder
    {
        return Run::query()->where('user_id', $user->id)->whereIn('status', RunStatus::finished());
    }
}
