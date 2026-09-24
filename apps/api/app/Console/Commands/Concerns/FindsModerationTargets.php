<?php

namespace App\Console\Commands\Concerns;

use App\Models\Run;
use App\Models\User;
use App\Services\PlayerDirectory;
use Illuminate\Console\Command;

/**
 * The lookups and the `--reason` every moderation command shares. Each one
 * says what went wrong itself, so a command only has to return FAILURE.
 *
 * @mixin Command
 */
trait FindsModerationTargets
{
    private function findRun(string $id): ?Run
    {
        $run = Run::query()->with('user')->find(strtolower(trim($id)));
        if ($run === null) {
            $this->components->error("There is no run {$id}.");
        }

        return $run;
    }

    private function findPlayer(string $username): ?User
    {
        $player = app(PlayerDirectory::class)->named($username);
        if ($player === null) {
            $this->components->error("There is no player called {$username}.");
        }

        return $player;
    }

    /** The `--reason`, which is stored with the decision and so cannot be left out. */
    private function reason(): ?string
    {
        $reason = trim((string) $this->option('reason'));
        if ($reason === '') {
            $this->components->error('Say why: --reason="…" is stored with the decision.');

            return null;
        }
        if (mb_strlen($reason) > 191) {
            $this->components->error('The reason can be at most 191 characters.');

            return null;
        }

        return $reason;
    }
}
