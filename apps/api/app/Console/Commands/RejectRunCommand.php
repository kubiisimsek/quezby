<?php

namespace App\Console\Commands;

use App\Console\Commands\Concerns\FindsModerationTargets;
use App\Services\ModerationService;
use Illuminate\Console\Command;

final class RejectRunCommand extends Command
{
    use FindsModerationTargets;

    protected $signature = 'quezby:run:reject
                            {run : The run id, as quezby:review lists it}
                            {--reason= : Why — stored on the run}';

    protected $description = "Throw a run out and rebuild its player's boards from the runs they have left";

    public function handle(ModerationService $moderation): int
    {
        $reason = $this->reason();
        if ($reason === null) {
            return self::INVALID;
        }
        $run = $this->findRun((string) $this->argument('run'));
        if ($run === null) {
            return self::FAILURE;
        }

        if (! $moderation->reject($run, $reason)) {
            $this->components->error("Run {$run->id} cannot be rejected: it is {$run->status->value}.");

            return self::FAILURE;
        }

        $this->components->info("Run {$run->id} is rejected; {$run->user->username}'s boards were rebuilt from the runs they have left.");

        return self::SUCCESS;
    }
}
