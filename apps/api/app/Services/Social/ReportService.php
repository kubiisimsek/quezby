<?php

namespace App\Services\Social;

use App\Enums\AuditAction;
use App\Enums\ReportReason;
use App\Enums\ReportStatus;
use App\Models\Report;
use App\Models\User;
use App\Services\Admin\AuditLog;
use App\Services\Avatars\AvatarService;
use App\Support\Actor;
use App\Support\Timestamp;
use Illuminate\Support\Facades\DB;

/**
 * Reports about what players make that others see — a photo, a name — and
 * what moderators do about them. A player reports each photo or name of
 * another once; a new photo or name can be reported afresh. Removing a photo
 * or resetting a name closes the reports about it; dismissing lets the
 * player's open reports go. Every moderator's act is on the audit log.
 */
final class ReportService
{
    public function __construct(
        private readonly AvatarService $avatars,
        private readonly AuditLog $audit,
    ) {}

    /** Files a report — at most one per reporter, player, reason and photo or name. A player with no photo has none to report. */
    public function report(User $reporter, User $reported, ReportReason $reason): void
    {
        $subject = $reason === ReportReason::Photo ? $reported->avatar : $reported->username;
        if ($reporter->is($reported) || $subject === null) {
            return;
        }

        Report::query()->insertOrIgnore([
            'reporter_id' => $reporter->id,
            'reported_id' => $reported->id,
            'reason' => $reason->value,
            'subject' => mb_substr($subject, 0, 64),
            'status' => ReportStatus::Open->value,
            'created_at' => now()->format(Timestamp::STORAGE_FORMAT),
        ]);
    }

    /**
     * Takes a player's photo down and closes the reports about it. False
     * when they had none.
     */
    public function removeAvatar(User $player, string $reason, Actor $actor): bool
    {
        $file = $player->avatar;
        if ($file === null) {
            return false;
        }

        DB::transaction(function () use ($player, $file, $reason, $actor) {
            $player->forceFill(['avatar' => null])->save();
            $this->close($player, ReportReason::Photo, ReportStatus::Resolved, $actor);
            $this->audit->record($actor, AuditAction::AvatarRemove, $player, $reason, ['file' => $file]);
        });
        $this->avatars->forget($file);

        return true;
    }

    /** Closes the reports about a player's name — once a moderator has reset it. */
    public function nameReset(User $player, Actor $actor): void
    {
        $this->close($player, ReportReason::Name, ReportStatus::Resolved, $actor);
    }

    /** Lets a player's open reports go. The number dismissed; none is audited as nothing. */
    public function dismiss(User $player, string $reason, Actor $actor): int
    {
        return DB::transaction(function () use ($player, $reason, $actor) {
            $count = $this->close($player, null, ReportStatus::Dismissed, $actor);
            if ($count > 0) {
                $this->audit->record($actor, AuditAction::ReportsDismiss, $player, $reason, ['reports' => $count]);
            }

            return $count;
        });
    }

    /**
     * @return array{photo: int, name: int}
     */
    public function openOf(User $player): array
    {
        $counts = Report::query()->where('reported_id', $player->id)->where('status', ReportStatus::Open)
            ->toBase()->selectRaw('reason, count(*) as reports')->groupBy('reason')->pluck('reports', 'reason');

        return ['photo' => (int) ($counts['photo'] ?? 0), 'name' => (int) ($counts['name'] ?? 0)];
    }

    private function close(User $player, ?ReportReason $reason, ReportStatus $status, Actor $actor): int
    {
        return Report::query()
            ->where('reported_id', $player->id)
            ->where('status', ReportStatus::Open)
            ->when($reason !== null, fn ($query) => $query->where('reason', $reason))
            ->update([
                'status' => $status->value,
                'resolved_by' => $actor->admin?->id,
                'resolved_at' => now()->format(Timestamp::STORAGE_FORMAT),
            ]);
    }
}
