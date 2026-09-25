<?php

namespace App\Services\Admin;

use App\Enums\AuditAction;
use App\Models\Admin;
use App\Models\AuditEntry;
use App\Models\Run;
use App\Models\User;
use App\Support\Actor;
use App\Support\Timestamp;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

/**
 * Writes and reads the audit log. Every moderation and admin action lands
 * here, from the panel, the artisan commands and the ops routes alike.
 */
final class AuditLog
{
    /**
     * @param  array<string, mixed>  $details
     */
    public function record(Actor $actor, AuditAction $action, ?Model $subject = null, ?string $reason = null, array $details = []): AuditEntry
    {
        [$type, $id, $label] = $this->subjectOf($subject);

        return AuditEntry::query()->create([
            'admin_id' => $actor->admin?->id,
            'actor_label' => mb_substr($actor->label, 0, 64),
            'via' => $actor->via,
            'action' => $action,
            'subject_type' => $type,
            'subject_id' => $id,
            'subject_label' => $label === null ? null : mb_substr($label, 0, 64),
            'reason' => $reason === null ? null : mb_substr($reason, 0, 191),
            'details' => $details === [] ? null : $details,
            'ip' => $actor->ip,
        ]);
    }

    /**
     * The latest entries about one player, run or admin, newest first.
     *
     * @return Collection<int, AuditEntry>
     */
    public function about(string $type, string $id, int $limit = 20): Collection
    {
        return AuditEntry::query()
            ->where('subject_type', $type)
            ->where('subject_id', $id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    /**
     * `AdminAuditEntry` in `packages/types`. Only an owner sees where an
     * action came from.
     *
     * @return array<string, mixed>
     */
    public function present(AuditEntry $entry, bool $withIp): array
    {
        return [
            'id' => $entry->id,
            'at' => Timestamp::iso($entry->created_at),
            'via' => $entry->via->value,
            'actor' => ['id' => $entry->admin_id, 'name' => $entry->actor_label],
            'action' => $entry->action->value,
            'subject' => ['type' => $entry->subject_type, 'id' => $entry->subject_id, 'label' => $entry->subject_label],
            'reason' => $entry->reason,
            'details' => $entry->details,
            'ip' => $withIp ? $entry->ip : null,
        ];
    }

    /**
     * @return array{0: string, 1: string|null, 2: string|null}
     */
    private function subjectOf(?Model $subject): array
    {
        return match (true) {
            $subject instanceof User => ['player', $subject->id, $subject->username],
            $subject instanceof Run => ['run', $subject->id, $subject->user?->username],
            $subject instanceof Admin => ['admin', $subject->id, $subject->name],
            default => ['system', null, null],
        };
    }
}
