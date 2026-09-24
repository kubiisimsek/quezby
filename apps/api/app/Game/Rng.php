<?php

namespace App\Game;

/**
 * xorshift32 over unsigned 32-bit integers — the PHP twin of
 * `packages/engine/src/rng.ts`. Every intermediate is masked back to 32 bits
 * so the bits match JavaScript's `>>> 0` exactly.
 */
final class Rng
{
    private const UINT32 = 4294967296;

    private const MASK = 0xFFFFFFFF;

    private const ZERO_SEED_FALLBACK = 0x6D2B79F5;

    private const WARM_UP = 16;

    private int $state;

    public function __construct(int $seed)
    {
        $start = $seed & self::MASK;
        $this->state = $start === 0 ? self::ZERO_SEED_FALLBACK : $start;

        for ($i = 0; $i < self::WARM_UP; $i++) {
            $this->next();
        }
    }

    /** The next unsigned 32-bit value. */
    public function next(): int
    {
        $x = $this->state;
        $x = ($x ^ ($x << 13)) & self::MASK;
        $x = ($x ^ ($x >> 17)) & self::MASK;
        $x = ($x ^ ($x << 5)) & self::MASK;
        $this->state = $x;

        return $x;
    }

    /** A whole number in `[0, $max)`, taken from the high bits. */
    public function int(int $max): int
    {
        return intdiv($this->next() * $max, self::UINT32);
    }
}
