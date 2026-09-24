<?php

namespace App\Console\Commands;

use App\Console\Commands\Concerns\FindsModerationTargets;
use App\Services\ModerationService;
use Illuminate\Console\Command;

final class ApproveRunCommand extends Command
{
    use FindsModerationTargets;

    protected $signature = 'quezby:run:approve {run : The run id, as quezby:review lists it}';

    protected $description = 'Let a run held for review rank, on the boards of the day it was played';

    public function handle(ModerationService $moderation): int
    {
        $run = $this->findRun((string) $this->argument('run'));
        if ($run === null) {
            return self::FAILURE;
        }

        if (! $moderation->approve($run)) {
            $this->components->error("Run {$run->id} is not waiting for review: it is {$run->status->value}.");

            return self::FAILURE;
        }

        $this->components->info("Run {$run->id} by {$run->user->username} is ranked: ".number_format((int) $run->score, 0, ',', '.').' points.');

        return self::SUCCESS;
    }
}
