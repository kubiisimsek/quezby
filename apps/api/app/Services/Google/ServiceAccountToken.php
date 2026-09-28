<?php

namespace App\Services\Google;

use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * A Google service account's access token for one scope: a short JWT signed
 * with the account's key is traded for a token (OAuth 2.0 for
 * server-to-server applications), kept until shortly before it runs out.
 * Without credentials, or when Google says no, there is no token — logged,
 * never thrown: whatever needed it simply does not happen.
 */
final class ServiceAccountToken
{
    public const TOKEN_URL = 'https://oauth2.googleapis.com/token';

    /** The cache key of the token handed out last, so `forget()` drops that one. */
    private ?string $cacheKey = null;

    public function __construct(
        private readonly ?string $credentialsPath,
        private readonly string $scope,
        private readonly int $ttlSeconds,
        /** What the token is for, in logs and its cache key: `play-integrity`, `fcm`. */
        private readonly string $name,
        /** The variable that points at the key, named in the log when it is missing. */
        private readonly string $env,
    ) {}

    /** A bearer token for the scope; null when there is none to be had. */
    public function accessToken(): ?string
    {
        $account = $this->account();
        if ($account === null) {
            return null;
        }

        $this->cacheKey = "{$this->name}:access-token:".hash('sha256', $account['client_email']);
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

        Log::warning("Google did not hand out a {$this->name} access token.", $failure);

        return null;
    }

    /** Drops the token handed out last — Google no longer takes it. */
    public function forget(): void
    {
        if ($this->cacheKey !== null) {
            Cache::forget($this->cacheKey);
        }
    }

    /** Whether a key file is configured and readable — for the admin panel's system page. */
    public function isConfigured(): bool
    {
        return $this->account(quiet: true) !== null;
    }

    /**
     * The JWT Google trades for an access token: the account asks for the
     * scope, for the next hour.
     *
     * @param  array{client_email: string, private_key: string, private_key_id: string|null}  $account
     */
    private function assertion(array $account): string
    {
        $now = now()->getTimestamp();

        return JWT::encode([
            'iss' => $account['client_email'],
            'scope' => $this->scope,
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
    private function account(bool $quiet = false): ?array
    {
        $path = (string) $this->credentialsPath;
        if ($path === '') {
            if (! $quiet) {
                Log::info("No {$this->name} access token: set {$this->env}.");
            }

            return null;
        }

        $path = str_starts_with($path, '/') ? $path : base_path($path);
        $json = is_file($path) && is_readable($path) ? json_decode((string) file_get_contents($path), true) : null;
        $email = is_array($json) ? ($json['client_email'] ?? null) : null;
        $key = is_array($json) ? ($json['private_key'] ?? null) : null;
        if (! is_string($email) || $email === '' || ! is_string($key) || $key === '') {
            if (! $quiet) {
                Log::warning("The {$this->name} service account cannot be read.", ['path' => $path]);
            }

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
