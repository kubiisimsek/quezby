<?php

namespace App\Services;

use App\Enums\DeviceVerdict;
use App\Enums\IntegrityMode;
use App\Game\Checkpoint;
use App\Game\EngineError;
use App\Game\Gesture;
use App\Game\ReelKind;
use App\Game\Replay;
use App\Game\Run as Engine;
use App\Game\RunSummary;
use App\Game\Step;
use App\Game\Verdict;
use App\Models\Run;
use Carbon\CarbonInterface;
use Illuminate\Container\Attributes\Config;

/**
 * Replays a finished run with the API's own engine, then asks whether a human
 * with the real app could have played that log in the time that passed — at
 * the finish, and at each checkpoint on the way — and on a phone the API can
 * trust. The thresholds sit far outside what simulated players of every
 * skill do (`tests/Unit/RunVerifierTest.php` proves none of them is caught).
 */
final class RunVerifier
{
    /**
     * @param  array<string, mixed>  $limits
     */
    public function __construct(
        #[Config('quezby.plausibility')]
        private readonly array $limits,
        private readonly RunClock $clock,
        private readonly Checkpoint $receipts,
    ) {}

    /**
     * @param  array<mixed>  $actions
     * @param  array<mixed>  $checkpoints  the receipts the app collected on the way
     *
     * @throws EngineError when the log is one the app could not have produced
     */
    public function verify(Run $run, array $actions, int $clientScore, int $clientReels, CarbonInterface $now, bool $banned, array $checkpoints = []): Verification
    {
        $replay = Engine::replay($run->seed, $actions);
        $onTheWay = $this->checkpoints($run, $actions, $replay, $checkpoints);
        $device = $this->deviceIntegrity($run);

        $hard = array_values(array_filter([
            $this->wallClock($run->started_at, $replay->summary, $replay->steps, $now),
            $this->decisionSpeed($replay->steps),
            $this->holdBounds($replay->steps),
            $this->clientMismatch($replay->summary, $clientScore, $clientReels),
            $banned ? ['code' => 'banned'] : null,
            ...$onTheWay['hard'],
            ...$device['hard'],
        ]));
        $soft = array_values(array_filter([
            $this->reactionRhythm($replay->steps),
            $this->floorHugging($replay->steps),
            $this->perfectShare($replay->steps),
            ...$onTheWay['soft'],
            ...$device['soft'],
        ]));

        return new Verification($replay, $hard, $soft);
    }

    /**
     * The least time the app could have taken: the countdown, every reel's
     * active time, and after each verdict its pause and the slide. Timers only
     * fire late, so an honest run always took longer.
     *
     * @param  list<Step>  $steps
     * @return array<string, mixed>|null
     */
    public function wallClock(CarbonInterface $startedAt, RunSummary $summary, array $steps, CarbonInterface $now): ?array
    {
        $neededMs = $this->clock->countdownMs() + $summary->activeMs;
        foreach ($steps as $step) {
            $neededMs += $this->clock->afterMs($step);
        }
        $neededMs -= $this->limits['clock_tolerance_ms'];
        $elapsedMs = $now->getTimestampMs() - $startedAt->getTimestampMs();

        return $elapsedMs >= $neededMs
            ? null
            : ['code' => 'wall_clock', 'elapsedMs' => $elapsedMs, 'neededMs' => $neededMs];
    }

    /**
     * The receipts the app collected at its checkpoints, held against the log
     * and the clock. Each must be one the API signed for this run (else hard
     * `checkpoint_forged`), over exactly the moves the log starts with (else
     * hard `checkpoint_mismatch`), and stamped when the app could have come to
     * the verdict of its last reel — it checks in right then, before the pause
     * and slide — on its pace: not sooner (hard `wall_clock`), and not far
     * later — a slowed-down game, hard `slow_motion`, or soft `slow_timing`
     * when it is only a little late. A run that went on well past a mark
     * without a receipt for it is a soft `checkpoint_missing`: the app may
     * have had no network, so it only matters for a top score.
     *
     * @param  array<mixed>  $actions
     * @param  array<mixed>  $receipts
     * @return array{hard: list<array<string, mixed>>, soft: list<array<string, mixed>>}
     */
    public function checkpoints(Run $run, array $actions, Replay $replay, array $receipts): array
    {
        $limits = $this->limits['checkpoints'];
        $tolerance = $this->limits['clock_tolerance_ms'];
        $verdicts = $this->clock->verdicts($replay);
        $startedMs = $run->started_at->getTimestampMs();
        $hard = [];
        $soft = [];
        $stamped = [];

        $receipts = array_slice(array_values(array_unique(array_filter($receipts, 'is_string'))), 0, $limits['max_receipts']);
        foreach ($receipts as $index => $raw) {
            $receipt = $this->receipts->open($raw);
            if ($receipt === null || $receipt->runId !== $run->id) {
                $hard['checkpoint_forged'] ??= ['code' => 'checkpoint_forged', 'receipt' => $index];

                continue;
            }
            if ($receipt->reel < 1 || $receipt->reel > count($replay->steps)
                || ! hash_equals(Checkpoint::prefixHash($actions, $receipt->reel), $receipt->prefixHash)) {
                $hard['checkpoint_mismatch'] ??= ['code' => 'checkpoint_mismatch', 'reel' => $receipt->reel];

                continue;
            }

            $neededMs = $verdicts[$receipt->reel - 1];
            $elapsedMs = $receipt->timeMs - $startedMs;
            $stamped[] = $elapsedMs;
            $slowMotionMs = (int) ($neededMs * $limits['slow_motion_ratio']) + $limits['slow_motion_ms'];
            $slowTimingMs = (int) ($neededMs * $limits['slow_timing_ratio']) + $limits['slow_timing_ms'];
            $at = ['reel' => $receipt->reel, 'elapsedMs' => $elapsedMs];
            if ($elapsedMs < $neededMs - $tolerance) {
                $hard['wall_clock'] ??= ['code' => 'wall_clock', ...$at, 'neededMs' => $neededMs - $tolerance];
            } elseif ($elapsedMs > $slowMotionMs) {
                $hard['slow_motion'] ??= ['code' => 'slow_motion', ...$at, 'neededMs' => $neededMs, 'limitMs' => $slowMotionMs];
            } elseif ($elapsedMs > $slowTimingMs) {
                $soft['slow_timing'] ??= ['code' => 'slow_timing', ...$at, 'neededMs' => $neededMs, 'limitMs' => $slowTimingMs];
            }
        }

        $needed = $this->clock->needed($replay);
        $missing = $this->missingCheckpoints(end($needed) - $this->clock->countdownMs(), $stamped);
        if ($missing !== null) {
            $soft['checkpoint_missing'] = $missing;
        }

        return ['hard' => array_values($hard), 'soft' => array_values($soft)];
    }

    /**
     * What the phone the run was started on is worth while devices are
     * enforced: one that failed its integrity check never ranks (hard
     * `device_integrity`); one without a verdict ranks, but a top score waits
     * for review (soft `device_unverified`). In `log` and `off` the verdict
     * is only recorded.
     *
     * @return array{hard: list<array<string, mixed>>, soft: list<array<string, mixed>>}
     */
    public function deviceIntegrity(Run $run): array
    {
        if (IntegrityMode::current() !== IntegrityMode::Enforce) {
            return ['hard' => [], 'soft' => []];
        }

        return match ($run->device_verdict) {
            DeviceVerdict::Pass => ['hard' => [], 'soft' => []],
            DeviceVerdict::Fail => ['hard' => [['code' => 'device_integrity']], 'soft' => []],
            default => ['hard' => [], 'soft' => [['code' => 'device_unverified']]],
        };
    }

    /**
     * Among swipe and like hits — once there are enough — too large a share
     * decided faster than the speed bonus pays for. A player who swipes
     * everything hits every swipe reel as fast, and is just as fast on the
     * reels it gets wrong: when more than `fast_wrong_share` of all the fast
     * gestures were wrong, that is guessing, not deciding.
     *
     * @param  list<Step>  $steps
     * @return array<string, mixed>|null
     */
    public function decisionSpeed(array $steps): ?array
    {
        $times = self::decisionTimes($steps);
        $fast = count(array_filter($times, fn (int $t) => $t < $this->limits['fast_decision_ms']));

        if (count($times) < $this->limits['fast_min_samples'] || $fast <= count($times) * $this->limits['fast_share_limit']) {
            return null;
        }

        $gestures = 0;
        $wrong = 0;
        foreach ($steps as $step) {
            if ($step->gesture !== Gesture::None && $step->t < $this->limits['fast_decision_ms']) {
                $gestures++;
                $wrong += in_array($step->verdict, [Verdict::Wrong, Verdict::Caught], true) ? 1 : 0;
            }
        }
        if ($wrong > $gestures * $this->limits['fast_wrong_share']) {
            return null;
        }

        return ['code' => 'fast_decisions', 'fast' => $fast, 'samples' => count($times)];
    }

    /**
     * A hold the app would have ended already: past the point it can only be
     * late on a gold reel, or past the window on any other.
     *
     * @param  list<Step>  $steps
     * @return array<string, mixed>|null
     */
    public function holdBounds(array $steps): ?array
    {
        $slack = $this->limits['hold_slack_ms'];
        foreach ($steps as $step) {
            if ($step->gesture !== Gesture::Hold || $step->verdict === Verdict::Drained) {
                continue;
            }
            $reel = $step->reel;
            $limit = $reel->kind === ReelKind::Hold
                ? intdiv(($reel->zoneCenter + $reel->zoneHalf + 1) * $reel->holdFill + 999, 1000)
                : $reel->window - $step->t;
            if ($step->d > $limit + $slack) {
                return ['code' => 'hold_bounds', 'reelIndex' => $reel->index, 'd' => $step->d, 'limit' => $limit];
            }
        }

        return null;
    }

    /** The app runs the same engine: a different score means a changed app, or a bug worth seeing. */
    public function clientMismatch(RunSummary $summary, int $clientScore, int $clientReels): ?array
    {
        if ($summary->score === $clientScore && $summary->reels === $clientReels) {
            return null;
        }

        return [
            'code' => 'client_mismatch',
            'serverScore' => $summary->score,
            'clientScore' => $clientScore,
            'serverReels' => $summary->reels,
            'clientReels' => $clientReels,
        ];
    }

    /**
     * A thumb keeps its own rhythm, but never a metronome's.
     *
     * @param  list<Step>  $steps
     * @return array<string, mixed>|null
     */
    public function reactionRhythm(array $steps): ?array
    {
        $times = self::decisionTimes($steps);
        if (count($times) < $this->limits['reaction_cv_samples']) {
            return null;
        }
        $mean = array_sum($times) / count($times);
        $variance = array_sum(array_map(fn (int $t) => ($t - $mean) ** 2, $times)) / count($times);
        $cv = $mean > 0 ? sqrt($variance) / $mean : 0.0;

        return $cv < $this->limits['reaction_cv_min']
            ? ['code' => 'reaction_cv', 'cv' => round($cv, 3), 'samples' => count($times)]
            : null;
    }

    /**
     * Decisions that crowd just past the speed floor, where the bonus is fullest.
     *
     * @param  list<Step>  $steps
     * @return array<string, mixed>|null
     */
    public function floorHugging(array $steps): ?array
    {
        $times = self::decisionTimes($steps);
        if (count($times) < $this->limits['floor_hugging_samples']) {
            return null;
        }
        $hugging = count(array_filter(
            $times,
            fn (int $t) => $t >= $this->limits['fast_decision_ms'] && $t <= $this->limits['floor_hugging_ms'],
        ));

        return $hugging > count($times) * $this->limits['floor_hugging_share']
            ? ['code' => 'floor_hugging', 'hugging' => $hugging, 'samples' => count($times)]
            : null;
    }

    /**
     * Gold reels let go dead centre nearly every time.
     *
     * @param  list<Step>  $steps
     * @return array<string, mixed>|null
     */
    public function perfectShare(array $steps): ?array
    {
        $holds = array_filter($steps, fn (Step $step) => $step->reel->kind === ReelKind::Hold && $step->verdict->isHit());
        $perfect = count(array_filter($holds, fn (Step $step) => $step->verdict === Verdict::Perfect));

        if (count($holds) < $this->limits['perfect_min_holds'] || $perfect < count($holds) * $this->limits['perfect_share_limit']) {
            return null;
        }

        return ['code' => 'perfect_share', 'perfect' => $perfect, 'holds' => count($holds)];
    }

    /**
     * The marks a run went on well past (`missing_grace_ms`) each want a
     * receipt stamped no sooner than the mark after the start (within the
     * clock tolerance): the app checks in once its game clock, which starts
     * after the countdown, has passed it. A receipt stands for one mark, so
     * early ones cannot stand in for the later marks.
     *
     * @param  int  $playedMs  the least time the log took after the countdown
     * @param  list<int>  $stamped  ms after the start, of the receipts that checked out
     * @return array<string, mixed>|null
     */
    private function missingCheckpoints(int $playedMs, array $stamped): ?array
    {
        $limits = $this->limits['checkpoints'];
        $expected = array_values(array_filter(
            $limits['marks_ms'],
            fn (int $mark) => $mark <= $playedMs - $limits['missing_grace_ms'],
        ));
        sort($expected);
        sort($stamped);

        $received = 0;
        foreach ($expected as $mark) {
            // Receipts from before the mark are too early for it, so for every later mark too.
            while ($stamped !== [] && $stamped[0] < $mark - $this->limits['clock_tolerance_ms']) {
                array_shift($stamped);
            }
            if ($stamped === []) {
                break;
            }
            // The earliest one left stands for this mark, and for no other.
            array_shift($stamped);
            $received++;
        }

        return $received < count($expected)
            ? ['code' => 'checkpoint_missing', 'expected' => count($expected), 'received' => $received]
            : null;
    }

    /**
     * When swipe and like hits were decided, ms after the reel came up.
     *
     * @param  list<Step>  $steps
     * @return list<int>
     */
    private static function decisionTimes(array $steps): array
    {
        $times = [];
        foreach ($steps as $step) {
            if ($step->verdict->isHit() && in_array($step->reel->kind, [ReelKind::Skip, ReelKind::Like], true)) {
                $times[] = $step->t;
            }
        }

        return $times;
    }
}
