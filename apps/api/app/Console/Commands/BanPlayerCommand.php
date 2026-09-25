<?php

namespace App\Console\Commands;

use App\Console\Commands\Concerns\FindsModerationTargets;
use App\Services\ModerationService;
use App\Support\Actor;
use Illuminate\Console\Command;

/** A silent ban: the player keeps playing, nothing of theirs ranks or shows. */
final class BanPlayerCommand extends Command
{
    use FindsModerationTargets;

    protected $signature = 'quezby:user:ban
                            {username : The player to ban}
                            {--reason= : Why — stored on the player}';

    protected $description = 'Ban a player silently: their rows leave every board and later runs are flagged';

    public function handle(ModerationService $moderation): int
    {
        $reason = $this->reason();
        if ($reason === null) {
            return self::INVALID;
        }
        $player = $this->findPlayer((string) $this->argument('username'));
        if ($player === null) {
            return self::FAILURE;
        }

        if ($player->isBanned()) {
            $this->components->warn("{$player->username} has been banned since {$player->banned_at?->toDateTimeString()} ({$player->ban_reason}); nothing changed.");

            return self::SUCCESS;
        }

        $moderation->ban($player, $reason, Actor::cli());
        $this->components->info("{$player->username} is banned: off every board, and every run from now on is flagged.");

        return self::SUCCESS;
    }
}
