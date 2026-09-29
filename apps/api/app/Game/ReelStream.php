<?php

namespace App\Game;

/**
 * The feed. Every reel costs exactly three draws — used or not — so reel `n`
 * always reads the same bits of the seed as `packages/engine/src/reels.ts`.
 * A Dereceli difficulty (`Difficulty`) only moves the thresholds the draws
 * are held against, and the drain; 0 is the feed of every other run.
 */
final class ReelStream
{
    private readonly Rng $rng;

    private readonly int $likeWeight;

    private int $index = 0;

    private ?ReelKind $previous = null;

    private int $specialRun = 0;

    public function __construct(int $seed, private readonly int $difficulty = 0)
    {
        $this->likeWeight = Difficulty::likeWeightAt($difficulty);
        $this->rng = new Rng($seed);
    }

    public function next(): Reel
    {
        $n = $this->index;
        $special = $this->rng->int(1000);
        $pick = $this->rng->int(100);
        $center = $this->rng->int(Rules::ZONE_CENTER_SPAN);

        $intro = Rules::INTRO[$n] ?? null;
        if ($intro !== null) {
            $kind = $intro;
        } elseif ($special >= Difficulty::specialShareAt($n, $this->difficulty) || $this->specialRun >= Rules::MAX_SPECIAL_RUN) {
            $kind = ReelKind::Skip;
        } elseif ($pick < $this->likeWeight) {
            $kind = ReelKind::Like;
        } elseif ($pick < $this->likeWeight + Rules::WEIGHT_HOLD) {
            $kind = ReelKind::Hold;
        } else {
            $kind = $this->previous === ReelKind::Freeze ? ReelKind::Like : ReelKind::Freeze;
        }

        $this->specialRun = $kind === ReelKind::Skip ? 0 : $this->specialRun + 1;
        $this->previous = $kind;
        $this->index++;

        $isHold = $kind === ReelKind::Hold;

        return new Reel(
            index: $n,
            kind: $kind,
            window: Rules::windowFor($kind, $n),
            holdFill: $isHold ? Rules::holdFillFor($n) : 0,
            zoneCenter: $isHold ? Rules::ZONE_CENTER_MIN + $center : 0,
            zoneHalf: $isHold ? intdiv(Rules::zoneWidthFor($n), 2) : 0,
            drain: Difficulty::drainAt($n, $this->difficulty),
            level: Rules::levelFor($n),
        );
    }
}
