<?php

namespace App\Models;

use App\Enums\ReportReason;
use App\Enums\ReportStatus;
use App\Support\Timestamp;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A player's report about another's photo or name (`ReportService`).
 *
 * @property int $id
 * @property string $reporter_id
 * @property string $reported_id
 * @property ReportReason $reason
 * @property string $subject The photo's file or the name, as it was reported.
 * @property ReportStatus $status
 * @property string|null $resolved_by
 * @property Carbon|null $resolved_at
 * @property Carbon $created_at
 */
#[Fillable(['reporter_id', 'reported_id', 'reason', 'subject', 'status', 'resolved_by', 'resolved_at', 'created_at'])]
class Report extends Model
{
    public const UPDATED_AT = null;

    protected $dateFormat = Timestamp::STORAGE_FORMAT;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'reason' => ReportReason::class,
            'status' => ReportStatus::class,
            'resolved_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function reported(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_id');
    }
}
