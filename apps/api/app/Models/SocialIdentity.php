<?php

namespace App\Models;

use App\Enums\SocialProvider;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * An Apple or Google account attached to a player. `subject` is the
 * provider's stable id for the person; the email is kept for support only and
 * never used to merge accounts.
 *
 * @property int $id
 * @property string $user_id
 * @property SocialProvider $provider
 * @property string $subject
 * @property string|null $email
 * @property bool $email_verified
 * @property string|null $apple_refresh_token
 * @property Carbon|null $last_used_at
 */
#[Fillable(['provider', 'subject', 'email', 'email_verified', 'apple_refresh_token', 'last_used_at'])]
#[Hidden(['apple_refresh_token'])]
class SocialIdentity extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'provider' => SocialProvider::class,
            'email_verified' => 'boolean',
            'apple_refresh_token' => 'encrypted',
            'last_used_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
