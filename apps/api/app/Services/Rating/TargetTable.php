<?php

namespace App\Services\Rating;

use App\Models\Run;

/**
 * The target a run plays against. `quezby.rating.targets` sets, every
 * thousand rating points, the score a player of that rating typically makes;
 * between two anchors the score grows geometrically — the engine's scores
 * double and triple from one skill to the next — and past the ends the
 * nearest stretch carries on.
 *
 *   target(R)      the score a player rated R typically makes
 *   performance(s) the rating whose typical score s is
 *   delta          max × tanh((P − R) / width): past the target up, short of
 *                  it down, never more than max either way
 */
final readonly class TargetTable
{
    /** @var list<array{int, float}> rating → score, lowest first */
    private array $anchors;

    /**
     * @param  array<int, int>  $anchors  rating → score, both rising
     */
    public function __construct(array $anchors)
    {
        ksort($anchors);
        $this->anchors = array_map(
            fn (int $rating, int $score) => [$rating, (float) $score],
            array_keys($anchors),
            array_values($anchors),
        );
    }

    /** The table of an engine version at difficulty 0; null when it has none. */
    public static function forEngine(int $engineVersion): ?self
    {
        return self::of(config("quezby.rating.targets.{$engineVersion}"));
    }

    /**
     * The table of rated runs played on a difficulty table: each rating's
     * typical score at the difficulty that rating plays. Null when it has none.
     */
    public static function forDifficulty(int $engineVersion, int $difficultyVersion): ?self
    {
        return self::of(config("quezby.rating.difficulty.targets.{$engineVersion}.{$difficultyVersion}"));
    }

    /**
     * The table a placed player's rated run is measured with: its difficulty
     * table's, or — for a run from before there was one — its engine's.
     */
    public static function forRun(Run $run): ?self
    {
        return $run->difficulty_version === null
            ? self::forEngine($run->engine_version)
            : self::forDifficulty($run->engine_version, $run->difficulty_version);
    }

    private static function of(mixed $anchors): ?self
    {
        return is_array($anchors) && count($anchors) >= 2 ? new self($anchors) : null;
    }

    /** The score a player of `$rating` typically makes: reaching it neither wins nor loses. */
    public function target(int $rating): float
    {
        [[$r0, $t0], [$r1, $t1]] = $this->stretch(fn (array $anchor) => $rating <= $anchor[0]);

        return $t0 * ($t1 / $t0) ** (($rating - $r0) / ($r1 - $r0));
    }

    /** The target as the player sees it: rounded up to a hundred, so reaching it never loses. */
    public function shown(int $rating): int
    {
        return self::roundUp($this->target($rating));
    }

    /** A target up to the next hundred, the way the player sees it — a float's last digit never adds a hundred. */
    public static function roundUp(float|int $target): int
    {
        return (int) (ceil(round($target, 6) / 100) * 100);
    }

    /** The rating whose typical score `$score` is; null for no score at all. */
    public function performance(int $score): ?int
    {
        if ($score <= 0) {
            return null;
        }
        [[$r0, $t0], [$r1, $t1]] = $this->stretch(fn (array $anchor) => $score <= $anchor[1]);

        return (int) round($r0 + ($r1 - $r0) * log($score / $t0) / log($t1 / $t0));
    }

    /**
     * How far a run moves a rating: `$max` × tanh of how far above or below
     * the rating the run played, in widths. No score at all is the full loss.
     */
    public static function delta(int $rating, ?int $performance, int $width, int $max): int
    {
        if ($performance === null) {
            return -$max;
        }

        return (int) round($max * tanh(($performance - $rating) / $width));
    }

    /**
     * The middle score — the lower of the two middles for an even count, so a
     * lucky run never tips it.
     *
     * @param  non-empty-list<int>  $scores
     */
    public static function median(array $scores): int
    {
        sort($scores);

        return $scores[intdiv(count($scores) - 1, 2)];
    }

    /**
     * The two anchors around a point: the first anchor `$within` accepts and
     * the one below it, or the first or last stretch past the ends.
     *
     * @param  callable(array{int, float}): bool  $within
     * @return array{array{int, float}, array{int, float}}
     */
    private function stretch(callable $within): array
    {
        $last = count($this->anchors) - 1;
        for ($i = 1; $i < $last; $i++) {
            if ($within($this->anchors[$i])) {
                return [$this->anchors[$i - 1], $this->anchors[$i]];
            }
        }

        return [$this->anchors[$last - 1], $this->anchors[$last]];
    }
}
