<?php

namespace App\Console\Commands;

use App\Console\Commands\Concerns\FindsModerationTargets;
use App\Services\ModerationService;
use App\Support\Actor;
use Illuminate\Console\Command;

final class UnbanPlayerCommand extends Command
{
    use FindsModerationTargets;

    protected $signature = 'quezby:user:unban {username : The player to unban}';

    protected $description = "Lift a ban and put the player's ranked runs back on the boards";

    public function handle(ModerationService $moderation): int
    {
        $player = $this->findPlayer((string) $this->argument('username'));
        if ($player === null) {
            return self::FAILURE;
        }

        if (! $player->isBanned()) {
            $this->components->warn("{$player->username} is not banned; nothing changed.");

            return self::SUCCESS;
        }

        $moderation->unban($player, Actor::cli());
        $this->components->info("{$player->username} is unbanned; their ranked runs are back on the boards.");

        return self::SUCCESS;
    }
}
