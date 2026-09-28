<?php

namespace App\Services\Integrity;

use App\Services\Google\ServiceAccountToken;
use Illuminate\Container\Attributes\Config;

/**
 * The API's Google Cloud service account, as far as the Play Integrity API
 * needs it: its access token for the Play Integrity scope. Without
 * credentials, or when Google says no, there is no token — logged, never
 * thrown: the check is `unavailable`.
 */
final class GoogleServiceAccount
{
    public const TOKEN_URL = ServiceAccountToken::TOKEN_URL;

    public const SCOPE = 'https://www.googleapis.com/auth/playintegrity';

    private readonly ServiceAccountToken $token;

    public function __construct(
        #[Config('quezby.integrity.android.credentials')]
        ?string $credentialsPath,
        #[Config('quezby.integrity.android.access_token_ttl_seconds')]
        int $ttlSeconds,
    ) {
        $this->token = new ServiceAccountToken($credentialsPath, self::SCOPE, $ttlSeconds, 'play-integrity', 'GOOGLE_PLAY_INTEGRITY_CREDENTIALS');
    }

    /** A bearer token for the Play Integrity API; null when there is none to be had. */
    public function accessToken(): ?string
    {
        return $this->token->accessToken();
    }

    /** Drops the token handed out last — Google no longer takes it. */
    public function forget(): void
    {
        $this->token->forget();
    }
}
