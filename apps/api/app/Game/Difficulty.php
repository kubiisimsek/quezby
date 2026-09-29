<?php

namespace App\Game;

use InvalidArgumentException;

/**
 * Dereceli's difficulty ("Zorluk", 0–16) — the PHP twin of
 * `packages/engine/src/difficulty.ts`. The API picks a rated run's
 * difficulty from the player's Elo when it hands out the seed
 * (`RatingService::difficultyFor`), and replays the run at it.
 *
 * Difficulty 0 is the engine exactly as `Rules` has it. The others only move
 * four numbers: the special-reel share (per-mille added), the like weight
 * given to freeze reels, the meter's losses and its drain (per-mille
 * multipliers). Sealed apart from the rules (`packages/engine/difficulty.lock.json`,
 * `tests/Unit/DifficultyLockTest.php`): a change is a `VERSION` bump and a
 * new Elo target table, never a new season.
 */
final class Difficulty
{
    public const VERSION = 1;

    /** @var list<array{special: int, freeze: int, penalty: int, drain: int}> */
    public const TABLE = [
        ['special' => 0, 'freeze' => 0, 'penalty' => 1000, 'drain' => 1000],
        ['special' => 15, 'freeze' => 0, 'penalty' => 1030, 'drain' => 1001],
        ['special' => 30, 'freeze' => 1, 'penalty' => 1060, 'drain' => 1006],
        ['special' => 45, 'freeze' => 1, 'penalty' => 1090, 'drain' => 1013],
        ['special' => 60, 'freeze' => 2, 'penalty' => 1120, 'drain' => 1024],
        ['special' => 75, 'freeze' => 3, 'penalty' => 1150, 'drain' => 1037],
        ['special' => 90, 'freeze' => 3, 'penalty' => 1180, 'drain' => 1054],
        ['special' => 105, 'freeze' => 4, 'penalty' => 1210, 'drain' => 1073],
        ['special' => 120, 'freeze' => 5, 'penalty' => 1240, 'drain' => 1096],
        ['special' => 135, 'freeze' => 5, 'penalty' => 1270, 'drain' => 1121],
        ['special' => 150, 'freeze' => 6, 'penalty' => 1300, 'drain' => 1150],
        ['special' => 165, 'freeze' => 6, 'penalty' => 1330, 'drain' => 1181],
        ['special' => 180, 'freeze' => 7, 'penalty' => 1360, 'drain' => 1216],
        ['special' => 195, 'freeze' => 8, 'penalty' => 1390, 'drain' => 1253],
        ['special' => 210, 'freeze' => 8, 'penalty' => 1420, 'drain' => 1294],
        ['special' => 225, 'freeze' => 9, 'penalty' => 1450, 'drain' => 1337],
        ['special' => 240, 'freeze' => 10, 'penalty' => 1480, 'drain' => 1384],
    ];

    public const MAX = 16;

    /**
     * A difficulty's row.
     *
     * @return array{special: int, freeze: int, penalty: int, drain: int}
     *
     * @throws InvalidArgumentException for anything but `0..MAX`
     */
    public static function rulesFor(int $difficulty): array
    {
        return self::TABLE[$difficulty] ?? throw new InvalidArgumentException("No difficulty {$difficulty}.");
    }

    /** The special-reel share on reel `$n` at `$difficulty`, per-mille. */
    public static function specialShareAt(int $n, int $difficulty): int
    {
        return Rules::specialShareFor($n) + self::rulesFor($difficulty)['special'];
    }

    /** How many of every hundred special reels are likes at `$difficulty`; the freeze reels take the rest. */
    public static function likeWeightAt(int $difficulty): int
    {
        return Rules::WEIGHT_LIKE - self::rulesFor($difficulty)['freeze'];
    }

    /** Meter lost per second on reel `$n` at `$difficulty`, per-mille. */
    public static function drainAt(int $n, int $difficulty): int
    {
        return intdiv(Rules::drainFor($n) * self::rulesFor($difficulty)['drain'], 1000);
    }

    /** A miss's loss at `$difficulty`, before a blind move doubles it. */
    public static function lossAt(int $loss, int $difficulty): int
    {
        return intdiv($loss * self::rulesFor($difficulty)['penalty'], 1000);
    }
}
