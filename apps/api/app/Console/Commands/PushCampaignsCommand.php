<?php

namespace App\Console\Commands;

use App\Services\Push\PushCampaigns;
use Illuminate\Console\Command;

/**
 * Moves every push from the panel still going out one batch of phones on —
 * so a campaign finishes even when nobody keeps the Push bildirimi page open.
 */
final class PushCampaignsCommand extends Command
{
    protected $signature = 'quezby:push:campaigns';

    protected $description = 'Send the next batch of every push campaign still going out';

    public function handle(PushCampaigns $campaigns): int
    {
        $stepped = $campaigns->stepAll();
        $this->components->info(sprintf('Stepped %d push %s.', $stepped, $stepped === 1 ? 'campaign' : 'campaigns'));

        return self::SUCCESS;
    }
}
