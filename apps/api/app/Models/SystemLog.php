<?php

namespace App\Models;

use App\Enums\LogLevel;
use App\Enums\LogSource;
use App\Support\Timestamp;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One row of the panel's Loglar page — written by `SystemLogger`, never
 * changed, pruned after `quezby.logs.keep_days`.
 *
 * @property int $id
 * @property LogLevel $level
 * @property LogSource $source
 * @property string $event
 * @property string $message
 * @property int|null $status
 * @property string|null $method
 * @property string|null $path
 * @property int|null $duration_ms
 * @property string|null $user_id
 * @property string|null $platform
 * @property string|null $app_version
 * @property array<string, mixed>|null $context
 * @property Carbon $created_at
 */
#[Fillable(['level', 'source', 'event', 'message', 'status', 'method', 'path', 'duration_ms', 'user_id', 'platform', 'app_version', 'context', 'created_at'])]
class SystemLog extends Model
{
    public const UPDATED_AT = null;

    protected $dateFormat = Timestamp::STORAGE_FORMAT;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'level' => LogLevel::class,
            'source' => LogSource::class,
            'context' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
