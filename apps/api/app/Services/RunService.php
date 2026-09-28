<?php

namespace App\Services;

use App\Content\Catalog;
use App\Enums\ErrorCode;
use App\Enums\IntegrityMode;
use App\Enums\LeaderboardPeriod;
use App\Enums\RunMode;
use App\Enums\RunStatus;
use App\Exceptions\ApiException;
use App\Game\Checkpoint;
use App\Game\EngineError;
use App\Models\Run;
use App\Models\User;
use App\Services\Integrity\DeviceIntegrity;
use App\Services\Social\DuelService;
use Carbon\CarbonInterface;
use Illuminate\Container\Attributes\Config;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * A run from seed to board. The app never tells the API a score: it sends
 * what the player did, and everything a player sees afterwards — the score,
 * the stats, the ranks, the league, the daily card — is worked out here.
 */
final class RunService
{
    /**
     * @param  array<string, mixed>  $plausibility
     */
    public function __construct(
        private readonly RunVerifier $verifier,
        private readonly LeaderboardService $leaderboards,
        private readonly RunStatsBuilder $statsBuilder,
        private readonly PlayerStatsService $playerStats,
        private readonly DailyService $daily,
        private readonly LeagueService $leagues,
        private readonly DeviceIntegrity $devices,
        private readonly Checkpoint $checkpoints,
        private readonly DuelService $duels,
        #[Config('quezby.plausibility')]
        private readonly array $plausibility,
    ) {}

    /**
     * Hands out a seed. A player has one open run at a time — starting
     * another abandons it — and one daily run per Istanbul day. The run
     * records the player's device verdict standing now; the finish judges it.
     *
     * A VS run either opens a VS against `$opponent`, on a fresh seed, or
     * answers the one `$duelId` names, on its seed.
     */
    public function start(User $user, RunMode $mode, int $engineVersion, int $contentVersion, ?string $appVersion, ?User $opponent = null, ?string $duelId = null): Run
    {
        if ($user->username === null) {
            throw ValidationException::withMessages([
                'username' => [__('messages.username_to_play')],
            ]);
        }
        if ($engineVersion !== (int) config('quezby.engine_version') || ! Catalog::has($contentVersion)) {
            throw ApiException::of(ErrorCode::EngineOutdated);
        }

        $now = now();
        $this->expireStale($user, $now);

        $dayKey = $mode === RunMode::Daily ? $this->daily->dayKey($now) : null;
        if ($dayKey !== null && $user->runs()->where('daily_key', $dayKey)->exists()) {
            throw ApiException::of(ErrorCode::DailyAlreadyPlayed);
        }
        $deviceVerdict = IntegrityMode::current() === IntegrityMode::Off ? null : $this->devices->verdictAt($user, $now);

        for ($attempt = 0; ; $attempt++) {
            try {
                return DB::transaction(function () use ($user, $mode, $dayKey, $contentVersion, $appVersion, $deviceVerdict, $now, $opponent, $duelId) {
                    Run::query()
                        ->where('open_user_id', $user->id)
                        ->where('status', RunStatus::Started)
                        ->update(['status' => RunStatus::Abandoned, 'open_user_id' => null, 'finished_at' => $now]);

                    $duel = null;
                    if ($mode === RunMode::Vs) {
                        $duel = $duelId !== null
                            ? $this->duels->answer($user, $duelId)
                            : $this->duels->challenge($user, $opponent ?? throw ApiException::of(ErrorCode::NotFound), $contentVersion);
                    }

                    $run = $user->runs()->create([
                        'seed' => $duel?->seed ?? ($dayKey === null ? random_int(1, 4294967295) : $this->daily->seed($dayKey)),
                        'engine_version' => config('quezby.engine_version'),
                        'content_version' => $duel?->content_version ?? $contentVersion,
                        'app_version' => $appVersion === null ? null : mb_substr($appVersion, 0, 32),
                        'device_verdict' => $deviceVerdict,
                        'status' => RunStatus::Started,
                        'mode' => $mode,
                        'daily_key' => $dayKey,
                        'duel_id' => $duel?->id,
                        'open_user_id' => $user->id,
                        'started_at' => $now,
                    ]);
                    if ($duel !== null) {
                        $this->duels->attach($duel, $run);
                    }

                    return $run;
                });
            } catch (UniqueConstraintViolationException $error) {
                if ($dayKey !== null && $user->runs()->where('daily_key', $dayKey)->exists()) {
                    throw ApiException::of(ErrorCode::DailyAlreadyPlayed);
                }
                // Another start of the same player took the open slot first.
                if ($attempt >= 1) {
                    throw $error;
                }
            }
        }
    }

    /**
     * Signs how far a started run has got — its reels and the hash of those
     * moves — with the time the API saw it. Nothing is written: the receipt
     * goes back to the app and comes back with the finish, where the
     * verifier holds it against the log and the clock.
     *
     * @throws ApiException not_found, run_already_finished, run_expired
     */
    public function checkpoint(User $user, string $runId, int $reel, string $prefixHash): string
    {
        $run = $user->runs()->find($runId) ?? throw ApiException::of(ErrorCode::NotFound);
        $now = now();

        if ($run->status !== RunStatus::Started) {
            throw ApiException::of(ErrorCode::RunAlreadyFinished);
        }
        if ($run->hasExpired($now)) {
            throw ApiException::of(ErrorCode::RunExpired);
        }

        return $this->checkpoints->sign($run->id, $reel, $prefixHash, $now->getTimestampMs());
    }

    /**
     * Replays the player's log and stores the server's result. Only a
     * `ranked` run touches the boards, the league and the lifetime numbers;
     * a run quit before the first point is kept but places nobody. A VS run
     * is `played` (or `flagged`): it only settles its VS.
     *
     * @param  array<mixed>  $actions
     * @param  list<string>  $checkpoints  the receipts the app collected on the way
     *
     * @throws ApiException
     */
    public function finish(User $user, string $runId, array $actions, int $clientScore, int $clientReels, array $checkpoints = []): FinishedRun
    {
        $run = $user->runs()->find($runId) ?? throw ApiException::of(ErrorCode::NotFound);
        $run->setRelation('user', $user);
        $now = now();

        if ($run->status !== RunStatus::Started) {
            throw ApiException::of(ErrorCode::RunAlreadyFinished);
        }
        if ($run->hasExpired($now)) {
            $this->close($run, ['status' => RunStatus::Expired, 'open_user_id' => null]);
            throw ApiException::of(ErrorCode::RunExpired);
        }
        if ($run->engine_version !== (int) config('quezby.engine_version')) {
            throw ApiException::of(ErrorCode::EngineOutdated);
        }

        $claim = [
            'finished_at' => $now,
            'client_score' => $clientScore,
            'client_reels' => $clientReels,
            'actions' => $actions,
            'open_user_id' => null,
        ];

        try {
            $verification = $this->verifier->verify($run, $actions, $clientScore, $clientReels, $now, $user->isBanned(), $checkpoints);
        } catch (EngineError $error) {
            $closed = $this->close($run, $claim + [
                'status' => RunStatus::Rejected,
                'flags' => [['code' => 'engine_error', 'error' => $error->error, 'reelIndex' => $error->reelIndex, 'severity' => 'hard']],
            ]);

            throw ApiException::of($closed ? ErrorCode::RunRejected : ErrorCode::RunAlreadyFinished);
        }

        $summary = $verification->summary();
        $ranks = $run->mode->ranks();
        if ($ranks) {
            $verification = $verification->withSoft($this->historySignals($user, $run, $summary->score));
        }
        $stats = $this->statsBuilder->build($verification->replay, $run->seed, $run->content_version);
        $status = $ranks
            ? $this->statusOf($verification, $user, $summary->score, $now)
            // A VS never ranks, so nothing needs holding for a moderator: a clean run is played, a hard flag loses it.
            : ($verification->hard === [] ? RunStatus::Played : RunStatus::Flagged);

        return DB::transaction(function () use ($user, $run, $claim, $verification, $summary, $stats, $status) {
            $closed = $this->close($run, $claim + [
                'status' => $status,
                'flags' => $verification->flags() === [] ? null : $verification->flags(),
                'score' => $summary->score,
                'reels' => $summary->reels,
                'hits' => $summary->hits,
                'misses' => $summary->misses,
                'perfects' => $summary->perfects,
                'max_streak' => $summary->maxStreak,
                'max_combo' => $summary->maxCombo,
                'bonus_points' => $summary->bonusPoints,
                'level' => $summary->level,
                'accuracy' => $summary->accuracy,
                'avg_reaction_ms' => $summary->avgReactionMs,
                'active_ms' => $summary->activeMs,
                'ended_by' => $summary->endedBy,
                'stats' => $stats->toArray(),
            ]);
            if (! $closed) {
                throw ApiException::of(ErrorCode::RunAlreadyFinished);
            }

            $outcome = null;
            $league = null;
            if ($run->status === RunStatus::Ranked) {
                $this->playerStats->add($user, $summary, $stats);
                if ($run->score > 0) {
                    $outcome = $this->leaderboards->record($run);
                    $league = $this->leagues->join($run);
                }
            }
            $leagueUnlock = $league === null && $run->mode->ranks() ? $this->leagues->unlock($user) : null;
            $daily = $run->mode === RunMode::Daily ? $this->daily->resultFor($run) : null;
            $duel = $run->mode === RunMode::Vs ? $this->duels->onRunFinished($run) : null;

            return new FinishedRun($run, $outcome, $league, $leagueUnlock, $daily, $duel);
        });
    }

    /**
     * Closes the player's runs that outlived their time, so they no longer
     * hold the open-run slot.
     */
    private function expireStale(User $user, CarbonInterface $now): void
    {
        Run::query()
            ->where('user_id', $user->id)
            ->where('status', RunStatus::Started)
            ->where('started_at', '<', $now->copy()->subMinutes((int) config('quezby.runs.ttl_minutes')))
            ->update(['status' => RunStatus::Expired, 'open_user_id' => null]);
    }

    /**
     * Ranked, flagged, or held for review: a clean run ranks; a hard flag
     * never does; a soft signal holds back only a score that would reach the
     * top of the season or the week.
     */
    private function statusOf(Verification $verification, User $user, int $score, CarbonInterface $now): RunStatus
    {
        if ($verification->hard !== []) {
            return RunStatus::Flagged;
        }
        if ($verification->soft === [] || $score === 0) {
            return RunStatus::Ranked;
        }

        $reachesTop = $this->leaderboards->wouldPlace(LeaderboardPeriod::All, $now, $score, $this->plausibility['review_top_all'], $user)
            || $this->leaderboards->wouldPlace(LeaderboardPeriod::Weekly, $now, $score, $this->plausibility['review_top_weekly'], $user);

        return $reachesTop ? RunStatus::Review : RunStatus::Ranked;
    }

    /**
     * Soft signals that need the player's history: a score far beyond their
     * own best, or a second account on one phone playing the same daily feed.
     *
     * @return list<array<string, mixed>>
     */
    private function historySignals(User $user, Run $run, int $score): array
    {
        $signals = [];

        $best = $this->leaderboards->bestOf($user);
        if ($best !== null && $score >= $best->score * $this->plausibility['score_jump_factor']) {
            $ranked = $user->runs()->where('status', RunStatus::Ranked)->where('engine_version', $run->engine_version)->count();
            if ($ranked >= $this->plausibility['score_jump_min_runs']) {
                $signals[] = ['code' => 'score_jump', 'score' => $score, 'best' => $best->score];
            }
        }

        if ($run->daily_key !== null && $user->install_id !== null) {
            $shared = Run::query()
                ->where('daily_key', $run->daily_key)
                ->where('user_id', '!=', $user->id)
                ->whereIn('user_id', User::query()->where('install_id', $user->install_id)->select('id'))
                ->exists();
            if ($shared) {
                $signals[] = ['code' => 'daily_shared_install'];
            }
        }

        return $signals;
    }

    /**
     * Moves a started run to its final state. False when a concurrent finish
     * got there first — the status check and the write are one statement.
     *
     * @param  array<string, mixed>  $attributes
     */
    private function close(Run $run, array $attributes): bool
    {
        $run->fill($attributes);

        $updated = Run::query()
            ->whereKey($run->getKey())
            ->where('status', RunStatus::Started)
            ->update($run->getDirty());

        if ($updated === 0) {
            return false;
        }
        $run->syncOriginal();

        return true;
    }
}
