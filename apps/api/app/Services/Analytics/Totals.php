<?php

namespace App\Services\Analytics;

use Illuminate\Support\Facades\DB;

/**
 * Anonymous counters per Istanbul day (`analytics_totals`): `active`,
 * `visits`, `seconds`, `screen:home`, `event:rival`, `dropped`, and `age:N`
 * under the day players joined. Added to as things happen, so no job ever
 * has to add them up later; a few dozen rows a day, kept for good.
 */
final class Totals
{
    /**
     * Two statements whatever the number of buckets: make sure every row
     * exists, then add to all of them at once (`PlayerStatsService::addTo`).
     * Buckets go in one order, so two writers never take locks crosswise.
     *
     * @param  array<string, int>  $buckets
     */
    public function add(string $day, array $buckets): void
    {
        $buckets = array_filter($buckets, fn (int $amount) => $amount > 0);
        if ($buckets === []) {
            return;
        }
        ksort($buckets);
        $names = array_keys($buckets);

        DB::table('analytics_totals')->insertOrIgnore(array_map(
            fn (string $bucket) => ['day' => $day, 'bucket' => $bucket, 'total' => 0],
            $names,
        ));

        $cases = [];
        $bindings = [];
        foreach ($buckets as $bucket => $amount) {
            $cases[] = 'WHEN ? THEN ?';
            array_push($bindings, $bucket, $amount);
        }
        $placeholders = implode(',', array_fill(0, count($names), '?'));

        DB::update(
            'UPDATE analytics_totals SET total = total + CASE bucket '.implode(' ', $cases).' ELSE 0 END'
            ." WHERE day = ? AND bucket IN ({$placeholders})",
            [...$bindings, $day, ...$names],
        );
    }

    /**
     * Each bucket's total on each day from `$from` to `$to`.
     *
     * @param  list<string>  $buckets
     * @return array<string, array<string, int>> bucket => day => total
     */
    public function grid(string $from, string $to, array $buckets): array
    {
        $grid = array_fill_keys($buckets, []);
        DB::table('analytics_totals')
            ->whereBetween('day', [$from, $to])
            ->whereIn('bucket', $buckets)
            ->get(['day', 'bucket', 'total'])
            ->each(function (object $row) use (&$grid) {
                $grid[$row->bucket][$row->day] = (int) $row->total;
            });

        return $grid;
    }

    /**
     * Every bucket starting with `$prefix`, summed over the days from `$from` to `$to`.
     *
     * @return array<string, int> bucket without the prefix => total
     */
    public function sums(string $prefix, string $from, string $to): array
    {
        return DB::table('analytics_totals')
            ->whereBetween('day', [$from, $to])
            ->whereRaw("bucket like ? escape '!'", [str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $prefix).'%'])
            ->groupBy('bucket')
            ->selectRaw('bucket, sum(total) as amount')
            ->pluck('amount', 'bucket')
            ->mapWithKeys(fn ($amount, string $bucket) => [substr($bucket, strlen($prefix)) => (int) $amount])
            ->all();
    }
}
