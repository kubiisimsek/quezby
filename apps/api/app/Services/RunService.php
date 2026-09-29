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
use App\Game\Difficulty;
use App\Game\EngineError;
use App\Models\Run;
use App\Models\User;
use App\Services\Integrity\DeviceIntegrity;
use App\Services\Rating\RatingService;
use App\Services\Social\DuelService;
use Carbon\CarbonInterface;
use Illuminate\Container\Attributes\Config;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * A run from seed to board. The app never tells the API a score: it sends
 * what the player did, and everything a player sees afterwards — the score,
 * the stats, the ranks, the rating, the daily card — is worked
 * out here.
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
        private readonly DeviceIntegrity $devices,
        private readonly Checkpoint $checkpoints,
        private readonly DuelService $duels,
        private readonly RatingService $ratings,
        private readonly RunCloser $closer,
        #[Config('quezby.plausibility')]
        private readonly array $plausibility,
    ) {}

    /**
     * Hands out a seed. A player has one open run at a time — starting
     * another abandons it, a forfeit on their rating — and one daily run per
     * Istanbul day. The run
     * records the player's device verdict standing now; the finish judges it.
     *
     * A rated run is handed the difficulty of the player's rating once the
     * run they leave has been charged; an app that does not play the
     * difficulty table (`$difficultyVersion`) cannot open one.
     *
     * A VS run either opens a VS against `$opponent`, on a fresh seed, or
     * answers the one `$duelId` names, on its seed.
     */
    public function start(User $user, RunMode $mode, int $engineVersion, int $contentVersion, ?string $appVersion, ?User $opponent = null, ?string $duelId = null, ?int $difficultyVersion = null): Run
    {
        if ($user->username === null) {
            throw ValidationException::withMessages([
                'username' => [__('messages.username_to_play')],
            ]);
        }
        if ($engineVersion !== (int) config('quezby.engine_version') || ! Catalog::has($contentVersion)) {
            throw ApiException::of(ErrorCode::EngineOutdated);
        }
        if ($mode->rated() && $difficultyVersion !== Difficulty::VERSION) {
            throw ApiException::of(ErrorCode::EngineOutdated);
        }

        $now = now();
        $this->expireStale($user, $now);

        $dayKey = $mode === RunMode::Daily ? $this->daily->dayKey($now) : null;
        if ($dayKey !== null && $user->runs()->where('daily_key', $dayKey)->exists()) {
            throw ApiException::of(ErrorCode::DailyAlreadyPlayed);
        }
        if ($mode->rated() && $this->ratings->unlock($user) !== null) {
            throw ApiException::of(ErrorCode::RatedLocked);
        }
        $deviceVerdict = IntegrityMode::current() === IntegrityMode::Off ? null : $this->devices->verdictAt($user, $now);

        for ($attempt = 0; ; $attempt++) {
            try {
                return DB::transaction(function () use ($user, $mode, $dayKey, $contentVersion, $appVersion, $deviceVerdict, $now, $opponent, $duelId) {
                    $open = Run::query()
                        ->where('open_user_id', $user->id)
                        ->where('status', RunStatus::Started)
                        ->lockForUpdate()
                        ->get();
                    foreach ($open as $left) {
                        $this->closer->closeUnfinished($left->setRelation('user', $user), RunStatus::Abandoned, $now);
                    }

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
                        'difficulty' => $mode->rated() ? $this->ratings->difficultyFor($user) : 0,
                        'difficulty_version' => $mode->rated() ? Difficulty::VERSION : null,
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
     * Gives up a run in its countdown: closed as abandoned, and — within
     * `runs.cancel_seconds` of its start — for nothing. Later it is a forfeit,
     * as leaving it for a new one would be: a run already under way is ended
     * with its score, never cancelled. A run already closed is left as it is.
     *
     * @throws ApiException not_found
     */
    public function cancel(User $user, string $runId): void
    {
        $run = $user->runs()->find($runId) ?? throw ApiException::of(ErrorCode::NotFound);
        $run->setRelation('user', $user);
        if ($run->status !== RunStatus::Started) {
            return;
        }
        $now = now();
        $early = $run->started_at->diffInSeconds($now) <= (int) config('quezby.runs.cancel_seconds');

        $this->closer->closeUnfinished($run, RunStatus::Abandoned, $now, spared: $early);
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
     * `ranked` run counts in the lifetime numbers; a Normal or Günlük one
     * climbs the boards, a rated one moves the rating and nothing else;
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
            $this->closer->closeUnfinished($run, RunStatus::Expired, $now);
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
            if ($closed) {
                // A log the app could not have written is the same way out of a bad run as leaving it.
                $this->ratings->forfeit($run);
            }

            throw ApiException::of($closed ? ErrorCode::RunRejected : ErrorCode::RunAlreadyFinished);
        }

        $summary = $verification->summary();
        $ranks = $run->mode->ranks();
        if ($ranks) {
            $verification = $verification->withSoft($this->historySignals($user, $run, $summary->score));
        }
        $stats = $this->statsBuilder->build($verification->replay, $run->seed, $run->content_version);
        $status = $ranks
            ? $this->statusOf($verification, $user, $run, $summary->score, $now)
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

            $rating = $this->ratings->forFinishedRun($run);
            $outcome = null;
            if ($run->status === RunStatus::Ranked) {
                $this->playerStats->add($user, $summary, $stats);
                if ($run->score > 0 && $run->mode->boards()) {
                    $outcome = $this->leaderboards->record($run);
                }
            }
            $leagueUnlock = $this->ratings->unlockAfter($run);
            $daily = $run->mode === RunMode::Daily ? $this->daily->resultFor($run) : null;
            $duel = $run->mode === RunMode::Vs ? $this->duels->onRunFinished($run) : null;

            return new FinishedRun($run, $outcome, $leagueUnlock, $daily, $duel, $rating);
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
            ->get()
            ->each(fn (Run $run) => $this->closer->closeUnfinished($run->setRelation('user', $user), RunStatus::Expired, $now));
    }

    /**
     * Ranked, flagged, or held for review: a clean run ranks; a hard flag
     * never does; a soft signal holds back only a score that would reach the
     * top of the season or the week — or, for a rated run, which never
     * reaches a board, one that would lift its player into the Elo board's top.
     */
    private function statusOf(Verification $verification, User $user, Run $run, int $score, CarbonInterface $now): RunStatus
    {
        if ($verification->hard !== []) {
            return RunStatus::Flagged;
        }
        if ($verification->soft === [] || $score === 0) {
            return RunStatus::Ranked;
        }

        $reachesTop = $run->mode->rated()
            ? $this->ratings->wouldReachTop($user, $run, $score, $this->plausibility['review_top_rating'])
            : $this->leaderboards->wouldPlace(LeaderboardPeriod::All, $now, $score, $this->plausibility['review_top_all'], $user)
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
