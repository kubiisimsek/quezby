<?php

namespace App\Support;

use App\Enums\AppStatus;

/** Dotted numeric app versions (`1.4.2`). Anything else does not parse. */
final class AppVersion
{
    /**
     * A version that does not parse is `ok`: the network must never lock a
     * player out.
     */
    public static function status(?string $version, ?string $min, ?string $latest): AppStatus
    {
        $current = self::parse($version);
        if ($current === null) {
            return AppStatus::Ok;
        }

        $minimum = self::parse($min);
        if ($minimum !== null && self::compare($current, $minimum) < 0) {
            return AppStatus::UpdateRequired;
        }

        $newest = self::parse($latest);
        if ($newest !== null && self::compare($current, $newest) < 0) {
            return AppStatus::UpdateAvailable;
        }

        return AppStatus::Ok;
    }

    /**
     * @return list<int>|null
     */
    public static function parse(?string $version): ?array
    {
        if ($version === null || preg_match('/^\d{1,9}(\.\d{1,9}){0,3}$/', $version) !== 1) {
            return null;
        }

        return array_map(intval(...), explode('.', $version));
    }

    /**
     * @param  list<int>  $a
     * @param  list<int>  $b
     */
    public static function compare(array $a, array $b): int
    {
        $length = max(count($a), count($b));
        for ($i = 0; $i < $length; $i++) {
            $difference = ($a[$i] ?? 0) <=> ($b[$i] ?? 0);
            if ($difference !== 0) {
                return $difference;
            }
        }

        return 0;
    }
}
