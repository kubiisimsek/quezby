<?php

namespace App\Game;

/**
 * One judged reel. Mirrors the TypeScript `Step`, plus the action that was
 * judged (`gesture`, `t`, `d`) so the API can inspect a replay for anti-cheat
 * and statistics without touching the summary.
 */
final readonly class Step
{
    /**
     * @param  list<BonusHit>  $bonuses
     */
    public function __construct(
        public Reel $reel,
        public Verdict $verdict,
        /** What the reel itself paid. Named combos are in `bonuses`. */
        public int $points,
        /** The combo the points were earned at, per-mille. 0 on a miss. */
        public int $combo,
        public array $bonuses,
        /**
         * How many blind moves in a row this miss made: its penalty was
         * multiplied by `Rules::blindFactor($blind)` — 1 for the first, then
         * 2, 4. 0 on a hit, and on a miss that was not blind.
         */
        public int $blind,
        public int $meter,
        public bool $over,
        public Gesture $gesture,
        public int $t,
        public int $d,
    ) {}

    /** What the named combos on this reel paid. */
    public function bonusPoints(): int
    {
        return array_sum(array_map(fn (BonusHit $bonus) => $bonus->points, $this->bonuses));
    }
}
