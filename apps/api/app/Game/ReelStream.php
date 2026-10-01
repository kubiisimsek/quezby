<?php

namespace App\Game;

/**
 * The feed. Every reel costs exactly three draws — used or not — so reel `n`
 * always reads the same bits of the seed as `packages/engine/src/reels.ts`.
 * It is the same feed at every Dereceli difficulty: difficulty only tightens
 * the meter (`Difficulty`), never what comes on screen.
 */
final class ReelStream
{
    private readonly Rng $rng;

    private int $index = 0;

    private ?ReelKind $previous = null;

    private int $specialRun = 0;

    public function __construct(int $seed)
    {
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
        } elseif ($special >= Rules::specialShareFor($n) || $this->specialRun >= Rules::MAX_SPECIAL_RUN) {
            $kind = ReelKind::Skip;
        } elseif ($pick < Rules::WEIGHT_LIKE) {
            $kind = ReelKind::Like;
        } elseif ($pick < Rules::WEIGHT_LIKE + Rules::WEIGHT_HOLD) {
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
            drain: Rules::drainFor($n),
            level: Rules::levelFor($n),
        );
    }
}
