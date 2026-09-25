<?php

namespace App\Services\Admin;

use App\Enums\LeaderboardPeriod;
use App\Services\LeaderboardService;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Query\Builder;

/**
 * Counts by the game's day — Europe/Istanbul, where a daily board turns over
 * — for the admin panel's charts.
 *
 * One query per series whatever the database: each row falls in a day by
 * `CASE WHEN col >= ? AND col < ? THEN 'Y-m-d' … END`, with the UTC bounds of
 * every day bound in the column's own storage format — no `CONVERT_TZ`, no
 * `strftime`, the same in SQLite, MySQL and MariaDB.
 */
final class DaySeries
{
    public function __construct(
        private readonly LeaderboardService $leaderboards,
    ) {}

    /**
     * The last `$count` days, oldest first, with each one's UTC bounds.
     *
     * @return list<array{key: string, start: CarbonImmutable, end: CarbonImmutable}>
     */
    public function days(int $count, ?CarbonInterface $now = null): array
    {
        $local = ($now ?? now())->toImmutable()->setTimezone($this->leaderboards->timezone());
        $days = [];
        for ($back = $count - 1; $back >= 0; $back--) {
            $at = $local->subDays($back);
            [$start, $end] = $this->leaderboards->boundsAt(LeaderboardPeriod::Daily, $at) ?? [$at, $at];
            $days[] = ['key' => $this->leaderboards->keyAt(LeaderboardPeriod::Daily, $at), 'start' => $start, 'end' => $end];
        }

        return $days;
    }

    /**
     * How many rows of `$query` fall on each day by `$column` — or, with
     * `$distinct`, how many different values of it (players who played).
     *
     * @param  list<array{key: string, start: CarbonImmutable, end: CarbonImmutable}>  $days
     * @return list<int>
     */
    public function count(Builder $query, string $column, string $format, array $days, ?string $distinct = null): array
    {
        if ($days === []) {
            return [];
        }

        $cases = [];
        $bindings = [];
        foreach ($days as $day) {
            $cases[] = "when {$column} >= ? and {$column} < ? then ?";
            array_push($bindings, $day['start']->format($format), $day['end']->format($format), $day['key']);
        }
        $aggregate = $distinct === null ? 'count(*)' : "count(distinct {$distinct})";

        $totals = (clone $query)
            ->selectRaw('case '.implode(' ', $cases)." end as day, {$aggregate} as total", $bindings)
            ->where($column, '>=', $days[0]['start']->format($format))
            ->where($column, '<', $days[count($days) - 1]['end']->format($format))
            ->groupBy('day')
            ->pluck('total', 'day');

        return array_map(fn (array $day) => (int) ($totals[$day['key']] ?? 0), $days);
    }
}
