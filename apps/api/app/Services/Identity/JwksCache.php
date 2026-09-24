<?php

namespace App\Services\Identity;

use App\Enums\ErrorCode;
use App\Enums\SocialProvider;
use App\Exceptions\ApiException;
use Firebase\JWT\JWK;
use Firebase\JWT\Key;
use Illuminate\Container\Attributes\Config;
use Illuminate\Http\Client\HttpClientException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use LogicException;
use UnexpectedValueException;

/**
 * The keys Apple and Google sign identity tokens with, cached as published.
 * Providers rotate keys, so a token signed with a key the cached set does not
 * know refetches the set — at most once every five minutes per provider, so
 * made-up key ids cannot make the API hammer Apple or Google.
 */
final class JwksCache
{
    public const URLS = [
        'apple' => 'https://appleid.apple.com/auth/keys',
        'google' => 'https://www.googleapis.com/oauth2/v3/certs',
    ];

    private const REFETCH_COOLDOWN_SECONDS = 300;

    public function __construct(
        #[Config('quezby.social.jwks_ttl_seconds')]
        private readonly int $ttlSeconds,
    ) {}

    /**
     * The provider's signing keys by key id; a `$kid` the cached set does not
     * know refetches it first.
     *
     * @return array<string, Key>
     *
     * @throws ApiException identity_invalid when no key set can be had
     */
    public function keys(SocialProvider $provider, string $kid): array
    {
        $keys = self::parse(Cache::remember(self::cacheKey($provider), $this->ttlSeconds, fn () => $this->fetch($provider)));

        if (! array_key_exists($kid, $keys) && Cache::add(self::cacheKey($provider).':refetched', true, self::REFETCH_COOLDOWN_SECONDS)) {
            $keys = $this->refetch($provider) ?? $keys;
        }

        return $keys;
    }

    /**
     * @return array<string, Key>|null null when the provider could not be reached; the cached set stays
     */
    private function refetch(SocialProvider $provider): ?array
    {
        try {
            $set = $this->fetch($provider);
        } catch (ApiException) {
            return null;
        }
        Cache::put(self::cacheKey($provider), $set, $this->ttlSeconds);

        return self::parse($set);
    }

    /**
     * The raw key set — only one that parses, so a broken answer is never cached.
     *
     * @return array<mixed>
     */
    private function fetch(SocialProvider $provider): array
    {
        try {
            $set = Http::timeout(5)->acceptJson()->get(self::URLS[$provider->value])->throw()->json();
            $set = is_array($set) ? $set : [];
            JWK::parseKeySet($set, 'RS256');
        } catch (HttpClientException|LogicException|UnexpectedValueException $e) {
            Log::warning("{$provider->name}'s signing keys could not be fetched.", ['reason' => $e->getMessage()]);

            throw ApiException::of(ErrorCode::IdentityInvalid);
        }

        return $set;
    }

    /**
     * @param  array<mixed>  $set
     * @return array<string, Key>
     */
    private static function parse(array $set): array
    {
        try {
            return JWK::parseKeySet($set, 'RS256');
        } catch (LogicException|UnexpectedValueException) {
            throw ApiException::of(ErrorCode::IdentityInvalid);
        }
    }

    private static function cacheKey(SocialProvider $provider): string
    {
        return "jwks:{$provider->value}";
    }
}
