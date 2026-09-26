<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One phone a player used — the device registry, kept for every player for
 * support and security (`App\Services\Devices\DeviceRegistry`).
 *
 * @property int $id
 * @property string $user_id
 * @property string $install_id
 * @property string|null $platform
 * @property string|null $os_version
 * @property string|null $model
 * @property string|null $app_version
 * @property string|null $app_build
 * @property Carbon $first_seen_at
 * @property Carbon $last_seen_at
 */
class PlayerDevice extends Model
{
    public $timestamps = false;

    protected $guarded = [];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'first_seen_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
