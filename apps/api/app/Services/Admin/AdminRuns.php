<?php

namespace App\Services\Admin;

use App\Enums\LeaderboardPeriod;
use App\Enums\RunFlag;
use App\Enums\RunMode;
use App\Game\EngineError;
use App\Game\Rules;
use App\Game\Run as Engine;
use App\Game\Step;
use App\Models\Duel;
use App\Models\Run;
use App\Models\User;
use App\Support\Timestamp;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

/**
 * Runs as the admin panel sees them — every status, with the flags the API
 * put on them and what they measured.
 */
final class AdminRuns
{
    public function __construct(
        private readonly AuditLog $audit,
    ) {}

    /**
     * `AdminRunsResponse` in `packages/types`: a page of runs, newest or best
     * first, and how many of each status the other filters leave.
     *
     * @param  array{status?: string|null, mode?: string|null, flag?: string|null, player?: string|null, from?: string|null, to?: string|null, sort?: string|null}  $filters
     * @return array<string, mixed>
     */
    public function list(array $filters, int $page, int $perPage): array
    {
        $scoped = $this->filtered($filters);
        $counts = (clone $scoped)->toBase()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status')
            ->map(fn ($total) => (int) $total)->all();

        $query = $scoped->select(Run::LIST_COLUMNS)->with('user');
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (($filters['sort'] ?? 'newest') === 'score') {
            $query->orderByRaw('score is null')->orderByDesc('score')->orderByDesc('started_at');
        } else {
            $query->orderByDesc('started_at')->orderByDesc('id');
        }

        /** @var LengthAwarePaginator<int, Run> $rows */
        $rows = $query->paginate($perPage, ['*'], 'page', $page);

        return Paginated::of($rows, fn (Run $run) => $this->present($run)) + ['counts' => $counts];
    }

    /**
     * `AdminRunResponse` in `packages/types`: the run, its post-by-post
     * timeline as the API's own engine replays it, and what was done about it.
     *
     * @return array<string, mixed>
     */
    public function detail(Run $run, bool $withIp): array
    {
        [$timeline, $unavailable] = $this->timeline($run);

        return [
            'run' => $this->present($run) + [
                'seed' => $run->seed,
                'contentVersion' => $run->content_version,
                'hits' => $run->hits,
                'misses' => $run->misses,
                'perfects' => $run->perfects,
                'maxStreak' => $run->max_streak,
                'maxCombo' => $run->max_combo,
                'bonusPoints' => $run->bonus_points,
                'level' => $run->level,
                'activeMs' => $run->active_ms,
                'endedBy' => $run->ended_by?->value,
                'clientScore' => $run->client_score,
                'clientReels' => $run->client_reels,
                'stats' => $run->stats,
                'duel' => $this->duel($run),
            ],
            'timeline' => $timeline,
            'timelineUnavailable' => $unavailable,
            'audit' => $this->audit->about('run', $run->id)->map(fn ($entry) => $this->audit->present($entry, $withIp))->values()->all(),
        ];
    }

    /**
     * `AdminRunDuel`: the VS a `vs` run belongs to — both players, both
     * scores, how it stands. Null for any other run.
     *
     * @return array<string, mixed>|null
     */
    private function duel(Run $run): ?array
    {
        $duel = $run->duel_id === null ? null : Duel::query()->with(['challenger', 'opponent'])->find($run->duel_id);
        if ($duel === null) {
            return null;
        }

        return [
            'id' => $duel->id,
            'status' => $duel->status->value,
            'challenger' => self::ref($duel->challenger),
            'opponent' => self::ref($duel->opponent),
            'challengerScore' => $duel->challenger_score,
            'opponentScore' => $duel->opponent_score,
            'winnerId' => $duel->winner_id,
        ];
    }

    /**
     * Every post of the run as the engine judged it — or why there is no
     * replay: no log (never finished), another season's rules, or a log the
     * engine refused.
     *
     * @return array{0: list<array<string, mixed>>|null, 1: string|null}
     */
    private function timeline(Run $run): array
    {
        if ($run->actions === null || $run->actions === []) {
            return [null, 'no_log'];
        }
        if ($run->engine_version !== Rules::ENGINE_VERSION) {
            return [null, 'other_engine'];
        }

        try {
            $replay = Engine::replay($run->seed, $run->actions);
        } catch (EngineError) {
            return [null, 'engine_error'];
        }

        return [array_map(fn (Step $step) => [
            'index' => $step->reel->index,
            'kind' => $step->reel->kind->value,
            'level' => $step->reel->level,
            'window' => $step->reel->window,
            'gesture' => strtolower($step->gesture->name),
            't' => $step->t,
            'd' => $step->d,
            'verdict' => $step->verdict->value,
            'points' => $step->points,
            'bonusPoints' => $step->bonusPoints(),
            'combo' => $step->combo,
            'meter' => $step->meter,
        ], $replay->steps), null];
    }

    /**
     * The runs the filters leave, before the status.
     *
     * @param  array{mode?: string|null, flag?: string|null, player?: string|null, from?: string|null, to?: string|null}  $filters
     * @return Builder<Run>
     */
    private function filtered(array $filters): Builder
    {
        $query = Run::query();
        if (isset($filters['mode'])) {
            $query->where('mode', RunMode::from($filters['mode']));
        }
        if (isset($filters['flag'])) {
            $query->withFlag(RunFlag::from($filters['flag']));
        }
        if (isset($filters['player'])) {
            $query->where('user_id', strtolower($filters['player']));
        }
        $timezone = (string) config('quezby.leaderboard.timezone');
        $format = (new Run)->getDateFormat();
        if (isset($filters['from'])) {
            $start = LeaderboardPeriod::Daily->boundsAt(CarbonImmutable::parse($filters['from'].' 12:00', $timezone), $timezone);
            $query->where('started_at', '>=', $start[0]->format($format));
        }
        if (isset($filters['to'])) {
            $end = LeaderboardPeriod::Daily->boundsAt(CarbonImmutable::parse($filters['to'].' 12:00', $timezone), $timezone);
            $query->where('started_at', '<', $end[1]->format($format));
        }

        return $query;
    }

    /**
     * `AdminRunRow` in `packages/types`. The run's player should be loaded.
     *
     * @return array<string, mixed>
     */
    public function present(Run $run): array
    {
        return [
            'id' => $run->id,
            'player' => self::ref($run->user),
            'status' => $run->status->value,
            'mode' => $run->mode->value,
            'dailyKey' => $run->daily_key,
            'score' => $run->score,
            'reels' => $run->reels,
            'accuracy' => $run->accuracy,
            'avgReactionMs' => $run->avg_reaction_ms,
            'flags' => self::flags($run->flags),
            'deviceVerdict' => $run->device_verdict?->value,
            'appVersion' => $run->app_version,
            'engineVersion' => $run->engine_version,
            'startedAt' => Timestamp::iso($run->started_at),
            'finishedAt' => Timestamp::iso($run->finished_at),
        ];
    }

    /**
     * `AdminRunFlag[]`: each stored flag's code and severity, and what else it
     * measured as its details.
     *
     * @param  list<array<string, mixed>>|null  $flags
     * @return list<array{code: string, severity: string, details: array<string, mixed>}>
     */
    public static function flags(?array $flags): array
    {
        return array_values(array_map(function (array $flag) {
            $details = $flag;
            unset($details['code'], $details['severity']);

            return [
                'code' => (string) ($flag['code'] ?? ''),
                'severity' => ($flag['severity'] ?? 'hard') === 'soft' ? 'soft' : 'hard',
                'details' => (object) $details,
            ];
        }, array_filter($flags ?? [], 'is_array')));
    }

    /**
     * `AdminPlayerRef` in `packages/types`.
     *
     * @return array{id: string, username: string|null, bannedAt: string|null}|null
     */
    public static function ref(?User $player): ?array
    {
        return $player === null ? null : [
            'id' => $player->id,
            'username' => $player->username,
            'bannedAt' => Timestamp::iso($player->banned_at),
        ];
    }
}
