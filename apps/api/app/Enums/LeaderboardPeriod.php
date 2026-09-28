<?php

namespace App\Enums;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

/**
 * A board: the calendar periods every ranked run counts on, and `challenge` —
 * the day's "Günün akışı", which only daily runs reach. All in the
 * leaderboard timezone (Europe/Istanbul).
 *
 * `daily` is kept but never shown: a player's best of each day is what their
 * league points add up (`LeagueService::standings`), and the period names an
 * Istanbul day wherever one is needed. No player or admin route serves it as
 * a board (`boards()`).
 */
enum LeaderboardPeriod: string
{
    case Daily = 'daily';
    case Weekly = 'weekly';
    case Monthly = 'monthly';
    case All = 'all';
    case Challenge = 'challenge';

    /** @return list<self> What every ranked run is recorded on — the day's row included, for the league. */
    public static function calendar(): array
    {
        return [self::Daily, self::Weekly, self::Monthly, self::All];
    }

    /** @return list<self> The calendar boards players climb and see a rank on: the week, the month, the season. */
    public static function periods(): array
    {
        return [self::Weekly, self::Monthly, self::All];
    }

    /** @return list<self> Every board a route may serve: the periods and today's challenge. */
    public static function boards(): array
    {
        return [...self::periods(), self::Challenge];
    }

    /** @return list<string> */
    public static function boardValues(): array
    {
        return array_map(fn (self $board) => $board->value, self::boards());
    }

    /**
     * The period `$at` falls in, as seen in `$timezone`: `2026-09-24`,
     * `2026-W39` (ISO week-numbering year and week, Monday first), `2026-09`
     * or `all`. The challenge is keyed by its day.
     */
    public function keyAt(CarbonInterface $at, string $timezone): string
    {
        $local = $at->toImmutable()->setTimezone($timezone);

        return match ($this) {
            self::Daily, self::Challenge => $local->format('Y-m-d'),
            self::Weekly => $local->format('o-\WW'),
            self::Monthly => $local->format('Y-m'),
            self::All => 'all',
        };
    }

    /**
     * When the period `$at` falls in starts and ends, in UTC; null for all time.
     *
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}|null
     */
    public function boundsAt(CarbonInterface $at, string $timezone): ?array
    {
        $local = $at->toImmutable()->setTimezone($timezone);

        $start = match ($this) {
            self::Daily, self::Challenge => $local->startOfDay(),
            self::Weekly => $local->startOfWeek(CarbonInterface::MONDAY),
            self::Monthly => $local->startOfMonth(),
            self::All => null,
        };
        if ($start === null) {
            return null;
        }

        $end = match ($this) {
            self::Weekly => $start->addWeek(),
            self::Monthly => $start->addMonth(),
            default => $start->addDay(),
        };

        return [$start->utc(), $end->utc()];
    }
}
