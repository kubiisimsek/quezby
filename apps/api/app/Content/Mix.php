<?php

namespace App\Content;

/**
 * The twin of `packages/config/src/content/mix.ts`: a small integer hash of a
 * seed, a reel index and a salt, in unsigned 32-bit arithmetic. JavaScript's
 * `Math.imul` is rebuilt from 16-bit halves so no product outgrows 64 bits.
 */
final class Mix
{
    private const MASK = 0xFFFFFFFF;

    public const SALT_BACKGROUND = 1;

    public const SALT_POST = 2;

    public const SALT_LIKES = 7;

    public const SALT_COMMENTS = 8;

    public static function of(int $seed, int $index, int $salt): int
    {
        $h = ($seed ^ self::imul($index + 1, 0x9E3779B1) ^ self::imul($salt, 0x85EBCA6B)) & self::MASK;
        $h = self::imul($h ^ ($h >> 16), 0x7FEB352D);
        $h = self::imul($h ^ ($h >> 15), 0x846CA68B);

        return ($h ^ ($h >> 16)) & self::MASK;
    }

    /** `Math.imul($a, $b) >>> 0`. */
    private static function imul(int $a, int $b): int
    {
        $a &= self::MASK;
        $b &= self::MASK;

        return ((($a & 0xFFFF) * $b) + (((($a >> 16) * $b) & 0xFFFF) << 16)) & self::MASK;
    }
}
