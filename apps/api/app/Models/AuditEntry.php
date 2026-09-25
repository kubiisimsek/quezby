<?php

namespace App\Models;

use App\Enums\AuditAction;
use App\Enums\AuditVia;
use App\Support\Timestamp;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use LogicException;

/**
 * One line of the audit log: who did what to whom, from where, and why.
 * Written once and never changed or removed — not even when the player it
 * names is deleted.
 *
 * @property int $id
 * @property string|null $admin_id
 * @property string $actor_label
 * @property AuditVia $via
 * @property AuditAction $action
 * @property string $subject_type
 * @property string|null $subject_id
 * @property string|null $subject_label
 * @property string|null $reason
 * @property array<string, mixed>|null $details
 * @property string|null $ip
 * @property Carbon $created_at
 */
#[Fillable(['admin_id', 'actor_label', 'via', 'action', 'subject_type', 'subject_id', 'subject_label', 'reason', 'details', 'ip'])]
class AuditEntry extends Model
{
    public const UPDATED_AT = null;

    protected $dateFormat = Timestamp::STORAGE_FORMAT;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'via' => AuditVia::class,
            'action' => AuditAction::class,
            'details' => 'array',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException('The audit log is append-only.'));
        static::deleting(fn () => throw new LogicException('The audit log is append-only.'));
    }

    /** @return BelongsTo<Admin, $this> */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(Admin::class);
    }
}
