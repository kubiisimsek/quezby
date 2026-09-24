<?php

namespace App\Services\Integrity;

use Firebase\JWT\JWT;
use Illuminate\Container\Attributes\Config;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * The API's Google Cloud service account, as far as the Play Integrity API
 * needs it: a short JWT signed with the account's key is traded for an
 * access token (OAuth 2.0 for server-to-server applications), which is kept
 * until shortly before it runs out. Without credentials, or when Google says
 * no, there is no token — logged, never thrown: the check is `unavailable`.
 */
final class GoogleServiceAccount
{
    public const TOKEN_URL = 'https://oauth2.googleapis.com/token';

    public const SCOPE = 'https://www.googleapis.com/auth/playintegrity';

    /** The cache key of the token handed out last, so `forget()` drops that one. */
    private ?string $cacheKey = null;

    public function __construct(
        #[Config('quezby.integrity.android.credentials')]
        private readonly ?string $credentialsPath,
        #[Config('quezby.integrity.android.access_token_ttl_seconds')]
        private readonly int $ttlSeconds,
    ) {}

    /** A bearer token for the Play Integrity API; null when there is none to be had. */
    public function accessToken(): ?string
    {
        $account = $this->account();
        if ($account === null) {
            return null;
        }

        $this->cacheKey = 'play-integrity:access-token:'.hash('sha256', $account['client_email']);
        $cached = Cache::get($this->cacheKey);
        if (is_string($cached) && $cached !== '') {
            return $cached;
        }

        try {
            $response = Http::asForm()->acceptJson()->timeout(5)->post(self::TOKEN_URL, [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $this->assertion($account),
            ]);
            $token = $response->successful() ? $response->json('access_token') : null;
            if (is_string($token) && $token !== '') {
                $lifetime = (int) ($response->json('expires_in') ?? 3600);
                Cache::put($this->cacheKey, $token, max(60, min($this->ttlSeconds, $lifetime - 300)));

                return $token;
            }
            $failure = ['status' => $response->status(), 'error' => $response->json('error')];
        } catch (Throwable $e) {
            $failure = ['reason' => $e->getMessage()];
        }

        Log::warning('Google did not hand out a Play Integrity access token.', $failure);

        return null;
    }

    /** Drops the token handed out last — Google no longer takes it. */
    public function forget(): void
    {
        if ($this->cacheKey !== null) {
            Cache::forget($this->cacheKey);
        }
    }

    /**
     * The JWT Google trades for an access token: the account asks for the
     * Play Integrity scope, for the next hour.
     *
     * @param  array{client_email: string, private_key: string, private_key_id: string|null}  $account
     */
    private function assertion(array $account): string
    {
        $now = now()->getTimestamp();

        return JWT::encode([
            'iss' => $account['client_email'],
            'scope' => self::SCOPE,
            'aud' => self::TOKEN_URL,
            'iat' => $now,
            'exp' => $now + 3600,
        ], $account['private_key'], 'RS256', $account['private_key_id']);
    }

    /**
     * The service account's JSON key file; null, logged, when none is
     * configured or it cannot be read.
     *
     * @return array{client_email: string, private_key: string, private_key_id: string|null}|null
     */
    private function account(): ?array
    {
        $path = (string) $this->credentialsPath;
        if ($path === '') {
            Log::info('Play Integrity tokens are not checked: set GOOGLE_PLAY_INTEGRITY_CREDENTIALS.');

            return null;
        }

        $path = str_starts_with($path, '/') ? $path : base_path($path);
        $json = is_file($path) && is_readable($path) ? json_decode((string) file_get_contents($path), true) : null;
        $email = is_array($json) ? ($json['client_email'] ?? null) : null;
        $key = is_array($json) ? ($json['private_key'] ?? null) : null;
        if (! is_string($email) || $email === '' || ! is_string($key) || $key === '') {
            Log::warning('The Play Integrity service account cannot be read.', ['path' => $path]);

            return null;
        }

        $keyId = $json['private_key_id'] ?? null;

        return [
            'client_email' => $email,
            'private_key' => $key,
            'private_key_id' => is_string($keyId) && $keyId !== '' ? $keyId : null,
        ];
    }
}
