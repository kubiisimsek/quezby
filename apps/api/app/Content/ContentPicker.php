<?php

namespace App\Content;

use App\Game\ReelKind;

/**
 * Which post reel `$index` of a run showed — the same pick as the app's
 * `postFor`, so the server credits likes to the posts the player saw without
 * asking the app.
 */
final class ContentPicker
{
    public static function postId(int $version, int $seed, int $index, ReelKind $kind): string
    {
        return Catalog::idOf($kind, Mix::of($seed, $index, Mix::SALT_POST) % Catalog::size($version, $kind));
    }
}
