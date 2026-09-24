<?php

namespace App\Services\Identity;

use App\Enums\SocialProvider;
use App\Exceptions\ApiException;
use Illuminate\Container\Attributes\Config;

/**
 * Checks a Sign in with Apple identity token: Apple signed it for one of our
 * apps, it has not expired, and it carries the SHA-256 of a nonce this API
 * issued — which it then uses up, so the token counts once.
 */
final class AppleIdentityVerifier
{
    public const ISSUER = 'https://appleid.apple.com';

    /**
     * @param  list<string>  $clientIds  the bundle ids of our apps
     */
    public function __construct(
        private readonly IdentityTokenDecoder $decoder,
        private readonly NonceService $nonces,
        #[Config('quezby.social.apple.client_ids')]
        private readonly array $clientIds,
    ) {}

    /**
     * @throws ApiException identity_invalid
     */
    public function verify(string $identityToken, string $rawNonce): VerifiedIdentity
    {
        $claims = $this->decoder->decode(SocialProvider::Apple, $identityToken, [self::ISSUER], $this->clientIds);

        $nonce = $claims['nonce'] ?? null;
        if (! is_string($nonce) || ! hash_equals(hash('sha256', $rawNonce), strtolower($nonce))) {
            throw IdentityTokenDecoder::refused(SocialProvider::Apple, 'nonce mismatch');
        }
        if (! $this->nonces->consume($rawNonce)) {
            throw IdentityTokenDecoder::refused(SocialProvider::Apple, 'nonce not issued, used or expired');
        }

        return new VerifiedIdentity(
            provider: SocialProvider::Apple,
            subject: $claims['sub'],
            email: IdentityTokenDecoder::email($claims),
            emailVerified: IdentityTokenDecoder::emailVerified($claims),
            clientId: $claims['aud'],
        );
    }
}
