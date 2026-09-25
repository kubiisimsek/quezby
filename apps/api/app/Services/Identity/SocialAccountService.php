<?php

namespace App\Services\Identity;

use App\Enums\ErrorCode;
use App\Enums\Platform;
use App\Enums\SocialProvider;
use App\Exceptions\ApiException;
use App\Models\SocialIdentity;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * Which player an Apple or Google account belongs to. The account signs in to
 * the player it is attached to, or becomes a new player — it is never matched
 * to anyone by email. A player always keeps at least one way in.
 */
final class SocialAccountService
{
    public function __construct(
        private readonly AppleTokenRevoker $apple,
        private readonly GuestNames $names,
    ) {}

    /**
     * The player the account belongs to, or a new one on this phone, playing
     * as `guest48128742` until they pick a name. When two first sign-ins of
     * one account race, the loser signs in to the player the winner created;
     * a new player whose drawn name was just taken draws again.
     *
     * @return array{user: User, created: bool}
     */
    public function signIn(VerifiedIdentity $identity, Platform $platform, string $installId, ?string $authorizationCode = null): array
    {
        $refreshToken = $this->appleRefreshToken($identity, $authorizationCode);
        $signIn = fn () => DB::transaction(fn () => $this->signInExisting($identity, $refreshToken)
            ?? $this->signUp($identity, $platform, $installId, $refreshToken));

        try {
            return $signIn();
        } catch (UniqueConstraintViolationException) {
            return $signIn();
        }
    }

    /** Attaches the account to a player who is signed in some other way. */
    public function link(User $user, VerifiedIdentity $identity, ?string $authorizationCode = null): void
    {
        $this->refuseLink($user, $identity);
        $refreshToken = $this->appleRefreshToken($identity, $authorizationCode);

        try {
            $this->attach($user, $identity, $refreshToken);
        } catch (UniqueConstraintViolationException) {
            $this->refuseLink($user, $identity);

            throw ApiException::of(ErrorCode::AlreadyLinked);
        }
    }

    /**
     * Detaches the player's account of that provider, revoking Apple's grant
     * with it. Refused when it is the last way in: no email and password, and
     * no other provider. Nothing to detach is not an error.
     */
    public function unlink(User $user, SocialProvider $provider): void
    {
        $identity = DB::transaction(function () use ($user, $provider) {
            $locked = User::query()->whereKey($user->getKey())->lockForUpdate()->firstOrFail();
            $identity = $locked->identities()->where('provider', $provider)->first();
            if ($identity === null) {
                return null;
            }

            $otherWayIn = ($locked->email !== null && $locked->password !== null)
                || $locked->identities()->where('provider', '!=', $provider)->exists();
            if (! $otherWayIn) {
                throw ApiException::of(ErrorCode::LastSignInMethod);
            }
            $identity->delete();

            return $identity;
        });

        if ($identity?->provider === SocialProvider::Apple) {
            $this->apple->revoke($identity);
        }
    }

    /** @return array{user: User, created: bool}|null */
    private function signInExisting(VerifiedIdentity $identity, ?string $refreshToken): ?array
    {
        $existing = SocialIdentity::query()
            ->where('provider', $identity->provider)
            ->where('subject', $identity->subject)
            ->first();
        if ($existing === null) {
            return null;
        }

        $existing->forceFill(['last_used_at' => now()]);
        if ($identity->email !== null) {
            $existing->forceFill(['email' => $identity->email, 'email_verified' => $identity->emailVerified]);
        }
        if ($refreshToken !== null) {
            $existing->forceFill(['apple_refresh_token' => $refreshToken]);
        }
        $existing->save();

        return ['user' => $existing->user, 'created' => false];
    }

    /** @return array{user: User, created: bool} */
    private function signUp(VerifiedIdentity $identity, Platform $platform, string $installId, ?string $refreshToken): array
    {
        $user = User::create([
            'username' => $this->names->mint(),
            'platform' => $platform->value,
            'install_id' => $installId,
        ]);
        $this->attach($user, $identity, $refreshToken);

        return ['user' => $user, 'created' => true];
    }

    private function attach(User $user, VerifiedIdentity $identity, ?string $refreshToken): void
    {
        $user->identities()->create([
            'provider' => $identity->provider,
            'subject' => $identity->subject,
            'email' => $identity->email,
            'email_verified' => $identity->emailVerified,
            'apple_refresh_token' => $refreshToken,
            'last_used_at' => now(),
        ]);
    }

    /** 409 when another player has the account, or this one already has an account of the provider. */
    private function refuseLink(User $user, VerifiedIdentity $identity): void
    {
        $owner = SocialIdentity::query()
            ->where('provider', $identity->provider)
            ->where('subject', $identity->subject)
            ->value('user_id');
        if ($owner !== null && $owner !== $user->getKey()) {
            throw ApiException::of(ErrorCode::IdentityTaken);
        }
        if ($user->identities()->where('provider', $identity->provider)->exists()) {
            throw ApiException::of(ErrorCode::AlreadyLinked);
        }
    }

    private function appleRefreshToken(VerifiedIdentity $identity, ?string $authorizationCode): ?string
    {
        if ($identity->provider !== SocialProvider::Apple || $authorizationCode === null || $authorizationCode === '') {
            return null;
        }

        return $this->apple->exchange($authorizationCode, $identity->clientId);
    }
}
