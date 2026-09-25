<?php

namespace App\Services;

use App\Enums\AuditAction;
use App\Enums\RunFlag;
use App\Enums\RunStatus;
use App\Game\Run as Engine;
use App\Models\LeaderboardEntry;
use App\Models\Run;
use App\Models\User;
use App\Services\Admin\AuditLog;
use App\Support\Actor;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * What a moderator can do — for the admin panel, the artisan commands and
 * `POST /ops/moderate` alike: look at held runs, let one rank, throw one out,
 * ban a player. Every change is written to the audit log with who made it,
 * in the same transaction as the change itself.
 */
final class ModerationService
{
    public function __construct(
        private readonly LeaderboardService $leaderboards,
        private readonly PlayerStatsService $playerStats,
        private readonly RunStatsBuilder $statsBuilder,
        private readonly LeagueService $leagues,
        private readonly AuditLog $audit,
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

    /** Lets a held run rank, on the boards of the days it was played. False when it was not held. */
    public function approve(Run $run, Actor $actor): bool
    {
        return DB::transaction(function () use ($run, $actor) {
            $updated = Run::query()->whereKey($run->id)->where('status', RunStatus::Review)
                ->update(['status' => RunStatus::Ranked->value]);
            if ($updated === 0) {
                return false;
            }
            $run->refresh();
            $this->audit->record($actor, AuditAction::RunApprove, $run, details: ['score' => $run->score]);
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

    /** Throws a run out and rebuilds its player's boards from what is left. False when it cannot be. */
    public function reject(Run $run, string $reason, Actor $actor): bool
    {
        if (! in_array($run->status, [RunStatus::Ranked, RunStatus::Review, RunStatus::Flagged], true)) {
            return false;
        }

        DB::transaction(function () use ($run, $reason, $actor) {
            $was = $run->status;
            $flags = $run->flags ?? [];
            $flags[] = ['code' => 'moderator', 'reason' => $reason, 'severity' => 'hard'];
            Run::query()->whereKey($run->id)->update([
                'status' => RunStatus::Rejected->value,
                'flags' => json_encode($flags, JSON_THROW_ON_ERROR),
                'flag_codes' => RunFlag::codesOf($flags),
            ]);
            $this->leaderboards->rebuildFor($run->user);
            $this->audit->record($actor, AuditAction::RunReject, $run, $reason, ['was' => $was->value, 'score' => $run->score]);
        });

        return true;
    }

    /**
     * Silently bans a player: they keep playing, nothing of theirs ranks or
     * shows. False when they were banned already — the first reason stands.
     */
    public function ban(User $user, string $reason, Actor $actor): bool
    {
        if ($user->isBanned()) {
            return false;
        }

        DB::transaction(function () use ($user, $reason, $actor) {
            $user->forceFill(['banned_at' => now(), 'ban_reason' => mb_substr($reason, 0, 191)])->save();
            LeaderboardEntry::query()->where('user_id', $user->id)->delete();
            $this->audit->record($actor, AuditAction::PlayerBan, $user, $reason);
        });

        return true;
    }

    /** Lifts a ban and puts the player's ranked runs back on the boards. False when there was none. */
    public function unban(User $user, Actor $actor): bool
    {
        if (! $user->isBanned()) {
            return false;
        }

        DB::transaction(function () use ($user, $actor) {
            $reason = $user->ban_reason;
            $user->forceFill(['banned_at' => null, 'ban_reason' => null])->save();
            $this->leaderboards->rebuildFor($user);
            $this->audit->record($actor, AuditAction::PlayerUnban, $user, details: ['banReason' => $reason]);
        });

        return true;
    }
}
