<?php

namespace App\Models;

use App\Enums\DeviceVerdict;
use App\Enums\Platform;
use App\Support\Timestamp;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * What Play Integrity or App Attest said about a player's phone: it vouched
 * for it (`pass`) or spoke against it (`fail`), and for how long that
 * stands. A run records the latest one still standing when it starts.
 *
 * @property int $id
 * @property string $user_id
 * @property Platform $platform
 * @property DeviceVerdict $verdict
 * @property string|null $reason
 * @property array<string, mixed>|null $details
 * @property Carbon $checked_at
 * @property Carbon $expires_at
 */
#[Fillable(['platform', 'verdict', 'reason', 'details', 'checked_at', 'expires_at'])]
class DeviceCheck extends Model
{
    public $timestamps = false;

    protected $dateFormat = Timestamp::STORAGE_FORMAT;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'platform' => Platform::class,
            'verdict' => DeviceVerdict::class,
            'details' => 'array',
            'checked_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
