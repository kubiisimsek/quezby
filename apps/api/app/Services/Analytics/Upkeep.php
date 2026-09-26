<?php

namespace App\Services\Analytics;

use Closure;
use Illuminate\Container\Attributes\Config;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Keeps analytics from growing, with no cron: what outlived its keep is
 * deleted a few hundred rows at a time. The API does a round by itself at
 * most once an hour, after a response has gone (`defer`), so no player
 * waits on it; `php artisan quezby:analytics:prune` and the admin panel's
 * system page do it all at once.
 */
final class Upkeep
{
    /** The one cache key upkeep ever writes: a single file on a shared host, whatever the traffic. */
    private const KEY = 'analytics:upkeep';

    public function __construct(
        private readonly Analytics $analytics,
        #[Config('quezby.analytics.keep_visits_days')]
        private readonly int $keepVisits,
        #[Config('quezby.analytics.keep_days_days')]
        private readonly int $keepDays,
        #[Config('quezby.devices.keep_days')]
        private readonly int $keepDevices,
        #[Config('quezby.analytics.upkeep_every_minutes')]
        private readonly int $everyMinutes,
        #[Config('quezby.analytics.upkeep_chunk')]
        private readonly int $chunk,
    ) {}

    /** At most once every so often: one round of pruning, once the response is out. */
    public function tick(): void
    {
        if (! Cache::add(self::KEY, true, $this->everyMinutes * 60)) {
            return;
        }
        defer(fn () => $this->prune(1));
    }

    /**
     * Deletes what outlived its keep: `$rounds` statements of at most
     * `upkeep_chunk` rows per layer.
     *
     * @return array{visits: int, days: int, devices: int}
     */
    public function prune(int $rounds = PHP_INT_MAX): array
    {
        $now = now();
        $visitsBefore = $now->copy()->subDays($this->keepVisits)->format('Y-m-d H:i:s');
        $daysBefore = Analytics::shift($this->analytics->today(), -$this->keepDays);
        $devicesBefore = $now->copy()->subDays($this->keepDevices)->format('Y-m-d H:i:s');

        return [
            'visits' => $this->inChunks($rounds, fn () => DB::table('analytics_visits')
                ->where('started_at', '<', $visitsBefore)
                ->orderBy('id')
                ->limit($this->chunk)
                ->delete()),
            'days' => $this->inChunks($rounds, fn () => DB::table('analytics_player_days')
                ->where('day', '<', $daysBefore)
                ->orderBy('day')
                ->limit($this->chunk)
                ->delete()),
            'devices' => $this->inChunks($rounds, fn () => DB::table('player_devices')
                ->where('last_seen_at', '<', $devicesBefore)
                ->orderBy('id')
                ->limit($this->chunk)
                ->delete()),
        ];
    }

    /** @param  Closure(): int  $delete */
    private function inChunks(int $rounds, Closure $delete): int
    {
        $total = 0;
        for ($round = 0; $round < $rounds; $round++) {
            $deleted = $delete();
            $total += $deleted;
            if ($deleted < $this->chunk) {
                break;
            }
        }

        return $total;
    }
}
