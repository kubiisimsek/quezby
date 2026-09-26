<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One visit of a consenting player: when it began, how long the app was in
 * the foreground, and the screens and moments in order
 * (`App\Services\Analytics\VisitIngest`).
 *
 * @property int $id
 * @property string $user_id
 * @property string $client_id
 * @property string $day
 * @property Carbon $started_at
 * @property int $seconds
 * @property string|null $platform
 * @property string|null $app_version
 * @property list<array{0: string, 1: int}> $journey
 * @property Carbon $created_at
 */
class AnalyticsVisit extends Model
{
    public const UPDATED_AT = null;

    protected $guarded = [];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'seconds' => 'integer',
            'journey' => 'array',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
