<?php

namespace App\Content;

use App\Game\ReelKind;
use InvalidArgumentException;

/**
 * How many posts each reel kind has, per catalog version — all the API needs
 * to know which post a reel wore. The twin of
 * `packages/config/src/content/catalog.ts`; `tests/Unit/ContentParityTest.php`
 * checks it against `packages/config/fixtures/content.json`. Catalogs are
 * append-only: a post's id is its kind and its place in the list.
 */
final class Catalog
{
    public const LATEST = 1;

    /** @var array<int, array<string, int>> */
    public const SIZES = [
        1 => ['skip' => 18, 'like' => 10, 'hold' => 6, 'freeze' => 5],
    ];

    public static function has(int $version): bool
    {
        return isset(self::SIZES[$version]);
    }

    public static function size(int $version, ReelKind $kind): int
    {
        return self::SIZES[$version][$kind->value]
            ?? throw new InvalidArgumentException("No content catalog v{$version}.");
    }

    /** `like-007`: the post at `$position` (from 0) in its kind's list. */
    public static function idOf(ReelKind $kind, int $position): string
    {
        return sprintf('%s-%03d', $kind->value, $position + 1);
    }
}
