<?php

namespace App\Game;

use InvalidArgumentException;

/**
 * Dereceli's difficulty ("Zorluk", 0–16) — the PHP twin of
 * `packages/engine/src/difficulty.ts`. The API picks a rated run's
 * difficulty from the player's qb when it hands out the seed
 * (`RatingService::difficultyFor`), and replays the run at it.
 *
 * Difficulty 0 is the engine exactly as `Rules` has it. The feed is the same
 * at every difficulty; only the meter's economy tightens: a hit's gain (a
 * perfect's extra left whole) and a miss's loss, as per-mille multipliers.
 * Sealed apart from the rules (`packages/engine/difficulty.lock.json`,
 * `tests/Unit/DifficultyLockTest.php`): a change is a `VERSION` bump and a
 * new qb target table, never a new season.
 */
final class Difficulty
{
    public const VERSION = 2;

    public const MAX = 16;

    /**
     * Row `z`: gain `1000 − 12·z`, penalty `1000 + 40·z` — ×0.81 and ×1.64 at the top.
     *
     * @return array{gain: int, penalty: int}
     *
     * @throws InvalidArgumentException for anything but `0..MAX`
     */
    public static function rulesFor(int $difficulty): array
    {
        if ($difficulty < 0 || $difficulty > self::MAX) {
            throw new InvalidArgumentException("No difficulty {$difficulty}.");
        }

        return ['gain' => 1000 - 12 * $difficulty, 'penalty' => 1000 + 40 * $difficulty];
    }

    /**
     * Every row, as the lock and the fixtures list them.
     *
     * @return list<array{gain: int, penalty: int}>
     */
    public static function table(): array
    {
        return array_map(self::rulesFor(...), range(0, self::MAX));
    }

    /** A hit's dopamine at `$difficulty`, before a perfect's extra is added. */
    public static function gainAt(int $gain, int $difficulty): int
    {
        return intdiv($gain * self::rulesFor($difficulty)['gain'], 1000);
    }

    /** A miss's loss at `$difficulty`, before a blind move doubles it. */
    public static function lossAt(int $loss, int $difficulty): int
    {
        return intdiv($loss * self::rulesFor($difficulty)['penalty'], 1000);
    }
}
