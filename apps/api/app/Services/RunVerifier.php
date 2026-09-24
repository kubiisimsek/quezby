<?php

namespace App\Services;

use App\Game\EngineError;
use App\Game\Gesture;
use App\Game\ReelKind;
use App\Game\Run as Engine;
use App\Game\RunSummary;
use App\Game\Step;
use App\Game\Verdict;
use App\Models\Run;
use Carbon\CarbonInterface;
use Illuminate\Container\Attributes\Config;

/**
 * Replays a finished run with the API's own engine, then asks whether a human
 * with the real app could have played that log in the time that passed. The
 * thresholds sit far outside what simulated players of every skill do
 * (`tests/Unit/RunVerifierTest.php` proves none of them is caught).
 */
final class RunVerifier
{
    /**
     * @param  array<string, mixed>  $limits
     */
    public function __construct(
        #[Config('quezby.plausibility')]
        private readonly array $limits,
    ) {}

    /**
     * @param  array<mixed>  $actions
     *
     * @throws EngineError when the log is one the app could not have produced
     */
    public function verify(Run $run, array $actions, int $clientScore, int $clientReels, CarbonInterface $now, bool $banned): Verification
    {
        $replay = Engine::replay($run->seed, $actions);

        $hard = array_values(array_filter([
            $this->wallClock($run->started_at, $replay->summary, $replay->steps, $now),
            $this->decisionSpeed($replay->steps),
            $this->holdBounds($replay->steps),
            $this->clientMismatch($replay->summary, $clientScore, $clientReels),
            $banned ? ['code' => 'banned'] : null,
        ]));
        $soft = array_values(array_filter([
            $this->reactionRhythm($replay->steps),
            $this->floorHugging($replay->steps),
            $this->perfectShare($replay->steps),
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
        $pace = $this->limits['pace'];
        $neededMs = $pace['countdown_step_ms'] * $pace['countdown_steps'] + $summary->activeMs;
        foreach ($steps as $step) {
            $neededMs += $pace['slide_ms'] + match (true) {
                ! $step->verdict->isHit() => $pace['exit_ms']['miss'],
                $step->reel->kind === ReelKind::Skip => $pace['exit_ms']['skip_hit'],
                default => $pace['exit_ms']['hit'],
            };
        }
        $neededMs -= $this->limits['clock_tolerance_ms'];
        $elapsedMs = $now->getTimestampMs() - $startedAt->getTimestampMs();

        return $elapsedMs >= $neededMs
            ? null
            : ['code' => 'wall_clock', 'elapsedMs' => $elapsedMs, 'neededMs' => $neededMs];
    }

    /**
     * Among swipe and like hits — once there are enough — too large a share
     * decided faster than the speed bonus pays for.
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
