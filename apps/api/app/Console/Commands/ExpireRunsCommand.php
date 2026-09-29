<?php

namespace App\Console\Commands;

use App\Enums\RunStatus;
use App\Models\Run;
use App\Services\RunCloser;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

/**
 * Closes every run left `started` past its time, as `RunService` does for one
 * player when they start their next run — so the open-run slots do not wait
 * for their owners to come back. Each is a forfeit on its player's rating.
 */
final class ExpireRunsCommand extends Command
{
    protected $signature = 'quezby:runs:expire';

    protected $description = 'Expire every started run older than QUEZBY_RUN_TTL_MINUTES';

    public function handle(RunCloser $closer): int
    {
        $ttl = (int) config('quezby.runs.ttl_minutes');
        $now = now();

        $expired = 0;
        Run::query()
            ->with('user')
            ->where('status', RunStatus::Started->value)
            ->where('started_at', '<', $now->copy()->subMinutes($ttl))
            ->chunkById(200, function ($runs) use ($closer, $now, &$expired) {
                foreach ($runs as $run) {
                    $expired += $closer->closeUnfinished($run, RunStatus::Expired, $now) ? 1 : 0;
                }
            });

        $this->components->info(sprintf('Expired %d %s started more than %d minutes ago.', $expired, Str::plural('run', $expired), $ttl));

        return self::SUCCESS;
    }
}
