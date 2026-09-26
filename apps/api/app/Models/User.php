<?php

namespace App\Models;

use App\Enums\Locale;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property string $id
 * @property string|null $username
 * @property string|null $email
 * @property string|null $password
 * @property string|null $install_id
 * @property string|null $platform
 * @property Locale $locale The language the player plays in: the request's at sign-up, then the phone's (`PUT /me/locale`).
 * @property array<string, mixed> $settings
 * @property Carbon|null $banned_at
 * @property string|null $ban_reason
 * @property Carbon|null $analytics_at When the player said yes to usage analytics.
 * @property Carbon $created_at
 * @property Carbon $updated_at
 */
#[Fillable(['username', 'email', 'password', 'install_id', 'platform', 'locale', 'settings'])]
#[Hidden(['password'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasUlids;

    public const DEFAULT_SETTINGS = ['haptics' => true];

    /**
     * Eloquent does not read the columns' defaults back after an insert, so a
     * new account must carry its own — or `Me` would say `locale: null`.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'locale' => 'tr',
        'settings' => '{"haptics":true}',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'locale' => Locale::class,
            'settings' => 'array',
            'banned_at' => 'datetime',
            'analytics_at' => 'datetime',
        ];
    }

    /** @return HasMany<Run, $this> */
    public function runs(): HasMany
    {
        return $this->hasMany(Run::class);
    }

    /** @return HasMany<LeaderboardEntry, $this> */
    public function leaderboardEntries(): HasMany
    {
        return $this->hasMany(LeaderboardEntry::class);
    }

    /** @return HasMany<SocialIdentity, $this> */
    public function identities(): HasMany
    {
        return $this->hasMany(SocialIdentity::class);
    }

    /** @return HasMany<DeviceCheck, $this> What Play Integrity and App Attest said about this player's phones. */
    public function deviceChecks(): HasMany
    {
        return $this->hasMany(DeviceCheck::class);
    }

    /** @return HasMany<AppAttestKey, $this> */
    public function appAttestKeys(): HasMany
    {
        return $this->hasMany(AppAttestKey::class);
    }

    /** @return HasMany<PlayerDevice, $this> The phones this player used — the device registry. */
    public function devices(): HasMany
    {
        return $this->hasMany(PlayerDevice::class);
    }

    /** @return HasOne<PlayerStat, $this> */
    public function stats(): HasOne
    {
        return $this->hasOne(PlayerStat::class);
    }

    /** @return BelongsToMany<User, $this> Players this one follows. */
    public function following(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'follows', 'follower_id', 'followee_id');
    }

    /** @return BelongsToMany<User, $this> Players who follow this one. */
    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'follows', 'followee_id', 'follower_id');
    }

    /** No email, Apple or Google attached yet — the account lives on one phone. */
    public function isGuest(): bool
    {
        return $this->email === null && ! $this->identities()->exists();
    }

    /** Banned players keep playing; nothing of theirs ranks. */
    public function isBanned(): bool
    {
        return $this->banned_at !== null;
    }

    /**
     * The settings as the app reads them. `analytics` is the consent, kept as
     * its moment (`analytics_at`), never in the settings column.
     *
     * @return array{haptics: bool, analytics: bool}
     */
    public function resolvedSettings(): array
    {
        $settings = array_merge(self::DEFAULT_SETTINGS, $this->settings ?? []);

        return [
            'haptics' => (bool) $settings['haptics'],
            'analytics' => $this->analytics_at !== null,
        ];
    }
}
