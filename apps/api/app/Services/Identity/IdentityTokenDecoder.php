<?php

namespace App\Services\Identity;

use App\Enums\ErrorCode;
use App\Enums\SocialProvider;
use App\Exceptions\ApiException;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Log;
use LogicException;
use UnexpectedValueException;

/**
 * Opens an Apple or Google identity token: an RS256 signature by one of the
 * provider's published keys, a lifetime that has not run out (a minute of
 * leeway for clocks that disagree), the expected issuer and one of our apps
 * as its audience. Anything else about it is the caller's to check.
 */
final class IdentityTokenDecoder
{
    private const LEEWAY_SECONDS = 60;

    public function __construct(private readonly JwksCache $jwks) {}

    /**
     * The token's claims; `aud` and `sub` are non-empty strings.
     *
     * @param  list<string>  $issuers
     * @param  list<string>  $audiences
     * @return array<string, mixed>
     *
     * @throws ApiException identity_invalid
     */
    public function decode(SocialProvider $provider, string $token, array $issuers, array $audiences): array
    {
        $keys = $this->jwks->keys($provider, self::keyId($provider, $token));

        [$leeway, $timestamp] = [JWT::$leeway, JWT::$timestamp];
        JWT::$leeway = self::LEEWAY_SECONDS;
        JWT::$timestamp = now()->getTimestamp();
        try {
            $claims = (array) JWT::decode($token, $keys);
        } catch (LogicException|UnexpectedValueException $e) {
            throw self::refused($provider, $e->getMessage());
        } finally {
            JWT::$leeway = $leeway;
            JWT::$timestamp = $timestamp;
        }

        $problem = match (true) {
            ! isset($claims['exp']) => 'no expiry',
            ! in_array($claims['iss'] ?? null, $issuers, true) => 'wrong issuer',
            ! is_string($claims['aud'] ?? null) || ! in_array($claims['aud'], $audiences, true) => 'wrong audience',
            ! is_string($claims['sub'] ?? null) || $claims['sub'] === '' => 'no subject',
            default => null,
        };
        if ($problem !== null) {
            throw self::refused($provider, $problem);
        }

        return $claims;
    }

    /**
     * The token's email, when it has one the database can hold.
     *
     * @param  array<string, mixed>  $claims
     */
    public static function email(array $claims): ?string
    {
        $email = $claims['email'] ?? null;

        return is_string($email) && $email !== '' && mb_strlen($email) <= 191 ? $email : null;
    }

    /** @param  array<string, mixed>  $claims */
    public static function emailVerified(array $claims): bool
    {
        return in_array($claims['email_verified'] ?? false, [true, 'true'], true);
    }

    /** Why a token was refused goes to the log, never to the client. */
    public static function refused(SocialProvider $provider, string $reason): ApiException
    {
        Log::info("{$provider->name} identity token refused: {$reason}.");

        return ApiException::of(ErrorCode::IdentityInvalid);
    }

    /** The id of the key the token says it is signed with. Only RS256 is accepted. */
    private static function keyId(SocialProvider $provider, string $token): string
    {
        $segments = explode('.', $token);
        $header = count($segments) === 3
            ? json_decode((string) base64_decode(strtr($segments[0], '-_', '+/'), true), true)
            : null;

        if (! is_array($header) || ($header['alg'] ?? null) !== 'RS256' || ! is_string($header['kid'] ?? null) || $header['kid'] === '') {
            throw self::refused($provider, 'malformed header');
        }

        return $header['kid'];
    }
}
