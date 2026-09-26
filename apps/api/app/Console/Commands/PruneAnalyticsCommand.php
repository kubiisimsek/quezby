<?php

namespace App\Console\Commands;

use App\Services\Analytics\Upkeep;
use Illuminate\Console\Command;

/**
 * Deletes every analytics row and registry phone past its keep, all at once —
 * what the API otherwise does a chunk an hour by itself. Scheduled daily
 * where the host has a cron; the admin panel's system page runs it too.
 */
final class PruneAnalyticsCommand extends Command
{
    protected $signature = 'quezby:analytics:prune';

    protected $description = 'Delete analytics visits, player days and registry phones past their keep';

    public function handle(Upkeep $upkeep): int
    {
        $pruned = $upkeep->prune();

        $this->components->info(sprintf(
            'Pruned %d visits, %d player days and %d phones (kept: visits %d days, player days %d days, phones %d days unseen).',
            $pruned['visits'],
            $pruned['days'],
            $pruned['devices'],
            config('quezby.analytics.keep_visits_days'),
            config('quezby.analytics.keep_days_days'),
            config('quezby.devices.keep_days'),
        ));

        return self::SUCCESS;
    }
}
