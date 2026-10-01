<?php

namespace App\Game;

/**
 * The feed. Every reel costs exactly three draws — used or not — so reel `n`
 * always reads the same bits of the seed as `packages/engine/src/reels.ts`.
 * It is the same feed at every Dereceli difficulty: difficulty only tightens
 * the meter (`Difficulty`), never what comes on screen. Its caps go by the
 * reel, never the score, so everyone on a seed sees the same reels.
 */
final class ReelStream
{
    private readonly Rng $rng;

    private int $index = 0;

    private ?ReelKind $previous = null;

    private int $specialRun = 0;

    /** @var list<ReelKind> The kinds of the last `CAP_WINDOW − 1` reels, oldest first. */
    private array $recent = [];

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
        } else {
            $kind = $pick < Rules::WEIGHT_LIKE + Rules::WEIGHT_HOLD ? ReelKind::Hold : ReelKind::Freeze;
            if (! $this->allows($kind, $n)) {
                $kind = ReelKind::Skip;
            }
        }

        $this->specialRun = $kind === ReelKind::Skip ? 0 : $this->specialRun + 1;
        $this->previous = $kind;
        $this->recent[] = $kind;
        if (count($this->recent) >= Rules::CAP_WINDOW) {
            array_shift($this->recent);
        }
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

    /** Whether a hold or a freeze may come on reel `$n`: never a freeze after a freeze, never past its cap. */
    private function allows(ReelKind $kind, int $n): bool
    {
        if ($kind === ReelKind::Freeze && $this->previous === ReelKind::Freeze) {
            return false;
        }
        $seen = count(array_filter($this->recent, fn (ReelKind $recent) => $recent === $kind));

        return $seen < Rules::capsFor($n)[$kind->value];
    }
}
