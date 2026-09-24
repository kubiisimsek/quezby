<?php

namespace App\Services\Identity;

use App\Models\SocialIdentity;
use Firebase\JWT\JWT;
use Illuminate\Container\Attributes\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Apple's side of an account's life (App Store guideline 5.1.1(v)): the
 * authorization code of a sign-in is traded for a refresh token, and that
 * token is revoked when the player deletes their account or unlinks Apple.
 * Both need a Sign in with Apple key — team id, key id and the `.p8` file.
 * Without one, or when Apple answers an error, this logs and carries on:
 * neither signing in nor deleting an account ever waits on Apple.
 */
final class AppleTokenRevoker
{
    public const TOKEN_URL = 'https://appleid.apple.com/auth/token';

    public const REVOKE_URL = 'https://appleid.apple.com/auth/revoke';

    private const AUDIENCE = 'https://appleid.apple.com';

    /**
     * @param  list<string>  $clientIds  the bundle ids of our apps
     */
    public function __construct(
        #[Config('quezby.social.apple.client_ids')]
        private readonly array $clientIds,
        #[Config('quezby.social.apple.team_id')]
        private readonly ?string $teamId,
        #[Config('quezby.social.apple.key_id')]
        private readonly ?string $keyId,
        #[Config('quezby.social.apple.private_key_path')]
        private readonly ?string $privateKeyPath,
    ) {}

    /** The refresh token Apple trades for the authorization code of a sign-in to `$clientId`; null when it does not. */
    public function exchange(string $authorizationCode, string $clientId): ?string
    {
        try {
            $privateKey = $this->privateKey();
            if ($privateKey === null) {
                return null;
            }

            $response = Http::asForm()->timeout(5)->post(self::TOKEN_URL, [
                'client_id' => $clientId,
                'client_secret' => $this->clientSecret($clientId, $privateKey),
                'code' => $authorizationCode,
                'grant_type' => 'authorization_code',
            ]);
            $token = $response->successful() ? $response->json('refresh_token') : null;
            if (is_string($token) && $token !== '') {
                return $token;
            }
            $failure = ['status' => $response->status(), 'error' => $response->json('error')];
        } catch (Throwable $e) {
            $failure = ['reason' => $e->getMessage()];
        }

        Log::warning('Apple did not trade an authorization code for a refresh token.', ['client_id' => $clientId, ...$failure]);

        return null;
    }

    /**
     * Revokes the grant behind an Apple identity's refresh token. Never
     * throws: a failure is logged, and whatever the caller does next goes on.
     */
    public function revoke(SocialIdentity $identity): void
    {
        try {
            $failures = $this->revokeAsEveryApp($identity);
        } catch (Throwable $e) {
            $failures = ['reason' => $e->getMessage()];
        }

        if ($failures !== []) {
            Log::warning('Apple did not revoke a refresh token.', ['identity' => $identity->id, 'failures' => $failures]);
        }
    }

    /**
     * The table does not keep which of our apps a refresh token was issued
     * to, so it is revoked as each configured bundle id; Apple only acts on
     * it for its own app.
     *
     * @return array<string, mixed> why it was not revoked; empty when it was, or when there was nothing to revoke
     */
    private function revokeAsEveryApp(SocialIdentity $identity): array
    {
        $token = $identity->apple_refresh_token;
        $privateKey = $token === null || $token === '' ? null : $this->privateKey();
        if ($privateKey === null) {
            return [];
        }

        $revoked = false;
        $failures = [];
        foreach ($this->clientIds as $clientId) {
            try {
                $response = Http::asForm()->timeout(5)->post(self::REVOKE_URL, [
                    'client_id' => $clientId,
                    'client_secret' => $this->clientSecret($clientId, $privateKey),
                    'token' => $token,
                    'token_type_hint' => 'refresh_token',
                ]);
                $revoked = $revoked || $response->successful();
                if (! $response->successful()) {
                    $failures[$clientId] = ['status' => $response->status(), 'error' => $response->json('error')];
                }
            } catch (Throwable $e) {
                $failures[$clientId] = ['reason' => $e->getMessage()];
            }
        }

        return $revoked ? [] : ($failures ?: ['reason' => 'APPLE_BUNDLE_IDS is empty']);
    }

    /** The ES256 JWT Apple takes as the client secret, good for five minutes. */
    private function clientSecret(string $clientId, string $privateKey): string
    {
        $now = now()->getTimestamp();

        return JWT::encode([
            'iss' => $this->teamId,
            'iat' => $now,
            'exp' => $now + 300,
            'aud' => self::AUDIENCE,
            'sub' => $clientId,
        ], $privateKey, 'ES256', $this->keyId);
    }

    /** The `.p8` key; null, logged, when no Sign in with Apple key is configured or it cannot be read. */
    private function privateKey(): ?string
    {
        $path = (string) $this->privateKeyPath;
        if ((string) $this->teamId === '' || (string) $this->keyId === '' || $path === '') {
            Log::info('Apple tokens are neither traded nor revoked: set APPLE_TEAM_ID, APPLE_KEY_ID and APPLE_PRIVATE_KEY_PATH.');

            return null;
        }

        $path = str_starts_with($path, '/') ? $path : base_path($path);
        $key = is_file($path) && is_readable($path) ? file_get_contents($path) : false;
        if ($key === false || $key === '') {
            Log::warning('The Sign in with Apple key cannot be read.', ['path' => $path]);

            return null;
        }

        return $key;
    }
}
