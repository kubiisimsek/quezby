<?php

namespace App\Enums;

/**
 * What a device verdict does to a run (`QUEZBY_INTEGRITY_MODE`), see
 * `config/quezby.php` › integrity.
 */
enum IntegrityMode: string
{
    /** Devices are not checked; the device endpoints answer `unavailable`. */
    case Off = 'off';

    /** Every run records its device's verdict, and nothing else changes. */
    case Log = 'log';

    /** A failed device never ranks; an unverified one's top score waits for review. */
    case Enforce = 'enforce';

    /** The configured mode; a value it does not know is `log`, which changes no run. */
    public static function current(): self
    {
        return self::tryFrom(strtolower(trim((string) config('quezby.integrity.mode')))) ?? self::Log;
    }
}
