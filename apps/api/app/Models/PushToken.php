<?php

namespace App\Models;

use App\Support\Timestamp;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A phone's Firebase Cloud Messaging token (`PushService`).
 *
 * @property int $id
 * @property string $user_id
 * @property string $token
 * @property string $platform
 * @property string|null $app_version
 */
#[Fillable(['user_id', 'token', 'platform', 'app_version'])]
class PushToken extends Model
{
    protected $dateFormat = Timestamp::STORAGE_FORMAT;

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
