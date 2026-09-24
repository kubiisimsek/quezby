<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A key App Attest vouched for: made in the Secure Enclave of a real iPhone,
 * inside one of our apps, for this player. Later checks are assertions
 * signed with it, each with a higher counter than the last.
 *
 * @property int $id
 * @property string $user_id
 * @property string $key_id base64 of the key's 32-byte id
 * @property string $public_key PEM
 * @property int $counter
 * @property string $environment `development` or `production`
 * @property string|null $receipt base64 of Apple's receipt
 * @property Carbon $attested_at
 * @property Carbon|null $last_used_at
 */
#[Fillable(['key_id', 'public_key', 'counter', 'environment', 'receipt', 'attested_at', 'last_used_at'])]
class AppAttestKey extends Model
{
    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'counter' => 'integer',
            'attested_at' => 'datetime',
            'last_used_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
