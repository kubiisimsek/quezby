<?php

namespace App\Support;

use DateTimeInterface;
use Illuminate\Support\Carbon;

final class Timestamp
{
    /** Precision the runs and leaderboards store, so ties go to the earlier millisecond. */
    public const STORAGE_FORMAT = 'Y-m-d H:i:s.v';

    /** ISO-8601 in UTC with milliseconds — what JavaScript's `toISOString()` writes. */
    public static function iso(?DateTimeInterface $at): ?string
    {
        return $at === null ? null : Carbon::instance($at)->utc()->format('Y-m-d\TH:i:s.v\Z');
    }

    /** `iso()` of a moment as a query hands it back raw — `2026-09-24 10:00:00.123`, in UTC. */
    public static function isoStored(?string $stored): ?string
    {
        return $stored === null ? null : self::iso(Carbon::parse($stored, 'UTC'));
    }
}
