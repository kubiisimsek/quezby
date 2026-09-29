<?php

namespace App\Models;

use App\Enums\EmailCodePurpose;
use App\Enums\Locale;
use App\Support\Timestamp;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * A code emailed to prove an address (`EmailCodes`).
 *
 * @property int $id
 * @property EmailCodePurpose $purpose
 * @property string $email
 * @property string|null $user_id
 * @property string|null $password
 * @property string $code
 * @property int $attempts
 * @property Locale $locale
 * @property string|null $platform
 * @property string|null $install_id
 * @property Carbon $sent_at
 * @property Carbon $expires_at
 */
#[Fillable(['purpose', 'email', 'user_id', 'password', 'locale', 'platform', 'install_id'])]
#[Hidden(['password', 'code'])]
class EmailCode extends Model
{
    protected $dateFormat = Timestamp::STORAGE_FORMAT;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'purpose' => EmailCodePurpose::class,
            'password' => 'hashed',
            'attempts' => 'integer',
            'locale' => Locale::class,
            'sent_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }
}
