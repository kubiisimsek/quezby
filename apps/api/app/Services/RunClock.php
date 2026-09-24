<?php

namespace App\Services;

use App\Game\Gesture;
use App\Game\ReelKind;
use App\Game\Replay;
use App\Game\Step;
use App\Game\Verdict;
use Illuminate\Container\Attributes\Config;

/**
 * The app's real pace, reel by reel (`@quezby/config` PACE): the countdown,
 * then each reel for as long as it was on screen, the pause after its verdict
 * and the slide to the next. Timers only fire late, so this is the least time
 * an honest phone takes to play a log — what the wall-clock check and the
 * checkpoints hold the server's own clock against.
 */
final class RunClock
{
    /**
     * @param  array{countdown_step_ms: int, countdown_steps: int, slide_ms: int, exit_ms: array{skip_hit: int, hit: int, miss: int}}  $pace
     */
    public function __construct(
        #[Config('quezby.plausibility.pace')]
        private readonly array $pace,
    ) {}

    /** The 3-2-1 before the first reel. */
    public function countdownMs(): int
    {
        return $this->pace['countdown_step_ms'] * $this->pace['countdown_steps'];
    }

    /** What the app spends after a reel's verdict: its pause, then the slide to the next reel. */
    public function afterMs(Step $step): int
    {
        return $this->pace['slide_ms'] + match (true) {
            ! $step->verdict->isHit() => $this->pace['exit_ms']['miss'],
            $step->reel->kind === ReelKind::Skip => $this->pace['exit_ms']['skip_hit'],
            default => $this->pace['exit_ms']['hit'],
        };
    }

    /**
     * For every n from 0 to the last reel: the least ms from the start of
     * the countdown until the app has played the first n reels and moved on
     * past the n-th. The first entry is the countdown; the last is the whole
     * run, the sum `RunVerifier::wallClock` checks.
     *
     * @return list<int>
     */
    public function needed(Replay $replay): array
    {
        $at = $this->countdownMs();
        $needed = [$at];
        foreach ($this->onScreenMs($replay) as $i => $ms) {
            $at += $ms + $this->afterMs($replay->steps[$i]);
            $needed[] = $at;
        }

        return $needed;
    }

    /**
     * For every reel n, at index n − 1: the least ms from the start of the
     * countdown until its verdict — before the pause and the slide that
     * follow it. The app checks in right at a verdict, so this is what a
     * checkpoint's receipt is held against.
     *
     * @return list<int>
     */
    public function verdicts(Replay $replay): array
    {
        $at = $this->countdownMs();
        $verdicts = [];
        foreach ($this->onScreenMs($replay) as $i => $ms) {
            $at += $ms;
            $verdicts[] = $at;
            $at += $this->afterMs($replay->steps[$i]);
        }

        return $verdicts;
    }

    /**
     * When an app on this pace checks in: at the first verdict at or after
     * each mark of the game's clock (ms after the countdown) — how many reels
     * it has played by then, and when that verdict came. The demo's bot and
     * the tests' honest players check in exactly like this.
     *
     * @param  list<int>  $marksMs
     * @return list<array{reel: int, atMs: int}>
     */
    public function checkIns(Replay $replay, array $marksMs): array
    {
        sort($marksMs);
        $checkIns = [];
        foreach ($this->verdicts($replay) as $i => $verdictAt) {
            $atMs = $verdictAt - $this->countdownMs();
            if ($marksMs !== [] && $atMs >= $marksMs[0]) {
                $checkIns[] = ['reel' => $i + 1, 'atMs' => $atMs];
                // One check-in per verdict, however many marks it passed.
                $marksMs = array_values(array_filter($marksMs, fn (int $mark) => $mark > $atMs));
            }
        }

        return $checkIns;
    }

    /**
     * How long each reel was on screen until its verdict: the decision, a
     * whole hold, the full window of a reel left alone — or, on the reel
     * that drained the meter (always the last), until the meter ran dry.
     *
     * @return list<int>
     */
    private function onScreenMs(Replay $replay): array
    {
        $onScreen = [];
        $sum = 0;
        foreach ($replay->steps as $step) {
            $ms = $step->verdict === Verdict::Drained
                ? $replay->summary->activeMs - $sum
                : match ($step->gesture) {
                    Gesture::None => $step->reel->window,
                    Gesture::Hold => $step->t + $step->d,
                    default => $step->t,
                };
            $onScreen[] = $ms;
            $sum += $ms;
        }

        return $onScreen;
    }
}
