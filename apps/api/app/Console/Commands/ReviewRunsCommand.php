<?php

namespace App\Console\Commands;

use App\Models\Run;
use App\Services\ModerationService;
use Illuminate\Console\Command;

/** The runs held for review — top scores with a soft warning — best first. */
final class ReviewRunsCommand extends Command
{
    protected $signature = 'quezby:review {--limit=50 : How many held runs to list}';

    protected $description = 'List the runs held for review, best first';

    public function handle(ModerationService $moderation): int
    {
        $runs = $moderation->held(max(1, (int) $this->option('limit')));
        if ($runs->isEmpty()) {
            $this->components->info('No runs are waiting for review.');

            return self::SUCCESS;
        }

        $timezone = (string) config('quezby.leaderboard.timezone');
        $this->table(
            ['Run', 'Player', 'Score', 'Reels', 'Signals', 'Finished ('.$timezone.')'],
            $runs->map(fn (Run $run) => [
                $run->id,
                $run->user->username,
                number_format((int) $run->score, 0, ',', '.'),
                $run->reels,
                implode(', ', array_column($run->flags ?? [], 'code')),
                $run->finished_at?->setTimezone($timezone)->format('Y-m-d H:i'),
            ])->all(),
        );
        $this->line('  Approve: php artisan quezby:run:approve <run> · Reject: php artisan quezby:run:reject <run> --reason="…"');

        return self::SUCCESS;
    }
}
