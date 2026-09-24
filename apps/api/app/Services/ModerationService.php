<?php

namespace App\Services;

use App\Enums\RunStatus;
use App\Game\Run as Engine;
use App\Models\LeaderboardEntry;
use App\Models\Run;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * What a moderator can do, for the artisan commands and `POST /ops/moderate`
 * alike: look at held runs, let one rank, throw one out, ban a player.
 */
final class ModerationService
{
    public function __construct(
        private readonly LeaderboardService $leaderboards,
        private readonly PlayerStatsService $playerStats,
        private readonly RunStatsBuilder $statsBuilder,
        private readonly LeagueService $leagues,
    ) {}

    /**
     * Runs held for review, best first.
     *
     * @return Collection<int, Run>
     */
    public function held(int $limit = 50): Collection
    {
        return Run::query()
            ->with('user')
            ->where('status', RunStatus::Review)
            ->orderByDesc('score')
            ->limit($limit)
            ->get();
    }

    /** Lets a held run rank, on the boards of the days it was played. */
    public function approve(Run $run): bool
    {
        return DB::transaction(function () use ($run) {
            $updated = Run::query()->whereKey($run->id)->where('status', RunStatus::Review)
                ->update(['status' => RunStatus::Ranked->value]);
            if ($updated === 0) {
                return false;
            }
            $run->refresh();
            if ($run->user->isBanned() || (int) $run->score === 0) {
                return true;
            }

            $replay = Engine::replay($run->seed, $run->actions ?? []);
            $this->playerStats->add($run->user, $replay->summary, $this->statsBuilder->build($replay, $run->seed, $run->content_version));
            $this->leaderboards->record($run);
            $this->leagues->join($run);

            return true;
        });
    }

    /** Throws a run out and rebuilds its player's boards from what is left. */
    public function reject(Run $run, string $reason): bool
    {
        if (! in_array($run->status, [RunStatus::Ranked, RunStatus::Review, RunStatus::Flagged], true)) {
            return false;
        }

        DB::transaction(function () use ($run, $reason) {
            $flags = $run->flags ?? [];
            $flags[] = ['code' => 'moderator', 'reason' => $reason, 'severity' => 'hard'];
            Run::query()->whereKey($run->id)->update([
                'status' => RunStatus::Rejected->value,
                'flags' => json_encode($flags, JSON_THROW_ON_ERROR),
            ]);
            $this->leaderboards->rebuildFor($run->user);
        });

        return true;
    }

    /** Silently bans a player: they keep playing, nothing of theirs ranks or shows. */
    public function ban(User $user, string $reason): void
    {
        DB::transaction(function () use ($user, $reason) {
            $user->forceFill(['banned_at' => now(), 'ban_reason' => mb_substr($reason, 0, 191)])->save();
            LeaderboardEntry::query()->where('user_id', $user->id)->delete();
        });
    }

    /** Lifts a ban and puts the player's ranked runs back on the boards. */
    public function unban(User $user): void
    {
        $user->forceFill(['banned_at' => null, 'ban_reason' => null])->save();
        $this->leaderboards->rebuildFor($user);
    }
}
