<?php

namespace App\Services\Rating;

use Illuminate\Container\Attributes\Config;

/**
 * How far a run moves a rating: by its score as a share of the target it
 * played against — the same share, the same move, at every rating and in
 * every league. `quezby.rating.curve` sets the move at a few shares (per cent
 * of the target → qb); between two of them the move runs straight, and past
 * either end it stays at that end's. Reaching the target moves nothing; the
 * lowest point is the full loss — no score at all, and a forfeit.
 */
final readonly class RatingCurve
{
    /** @var list<array{int, int}> per cent of the target → qb, the lowest share first */
    private array $points;

    /**
     * @param  array<int, int>  $points  per cent of the target → qb, both rising
     */
    public function __construct(#[Config('quezby.rating.curve')] array $points)
    {
        ksort($points);
        $this->points = array_map(
            fn (int $percent, int $qb) => [$percent, $qb],
            array_keys($points),
            array_values($points),
        );
    }

    /** How far a run that scored `$score` against `$target` moves a rating. No score at all is the full loss. */
    public function delta(?int $score, int|float $target): int
    {
        if ($score === null || $score <= 0 || $target <= 0) {
            return $this->floor();
        }
        $percent = $score * 100 / $target;
        $last = count($this->points) - 1;
        if ($percent <= $this->points[0][0]) {
            return $this->points[0][1];
        }
        for ($i = 1; $i <= $last; $i++) {
            [$p1, $q1] = $this->points[$i];
            if ($percent <= $p1) {
                [$p0, $q0] = $this->points[$i - 1];

                return (int) round($q0 + ($q1 - $q0) * ($percent - $p0) / ($p1 - $p0));
            }
        }

        return $this->points[$last][1];
    }

    /** The biggest loss: a run far short of its target, no score at all, a forfeit. */
    public function floor(): int
    {
        return $this->points[0][1];
    }

    /** The biggest gain. */
    public function ceiling(): int
    {
        return $this->points[count($this->points) - 1][1];
    }

    /**
     * The points the curve runs through, the lowest share first.
     *
     * @return list<array{percent: int, qb: int}>
     */
    public function points(): array
    {
        return array_map(fn (array $point) => ['percent' => $point[0], 'qb' => $point[1]], $this->points);
    }
}
