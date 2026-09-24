<?php

namespace App\Console\Commands;

use App\Enums\RunStatus;
use App\Models\Run;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

/**
 * Closes every run left `started` past its time, as `RunService` does for one
 * player when they start their next run — so the open-run slots do not wait
 * for their owners to come back.
 */
final class ExpireRunsCommand extends Command
{
    protected $signature = 'quezby:runs:expire';

    protected $description = 'Expire every started run older than QUEZBY_RUN_TTL_MINUTES';

    public function handle(): int
    {
        $ttl = (int) config('quezby.runs.ttl_minutes');

        $expired = Run::query()
            ->where('status', RunStatus::Started->value)
            ->where('started_at', '<', now()->subMinutes($ttl))
            ->update(['status' => RunStatus::Expired->value, 'open_user_id' => null]);

        $this->components->info(sprintf('Expired %d %s started more than %d minutes ago.', $expired, Str::plural('run', $expired), $ttl));

        return self::SUCCESS;
    }
}
