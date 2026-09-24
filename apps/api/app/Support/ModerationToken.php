<?php

namespace App\Support;

/**
 * The token that unlocks `POST /ops/moderate` — `MODERATION_TOKEN` as the
 * `.env` file says right now, read the way `OpsToken` reads `OPS_TOKEN`.
 */
final class ModerationToken
{
    public static function current(): string
    {
        return OpsToken::resolve(
            app()->configurationIsCached(),
            app()->environmentFilePath(),
            (string) config('quezby.moderation_token'),
            'MODERATION_TOKEN',
        );
    }
}
