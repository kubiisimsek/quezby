<?php

namespace App\Services\Identity;

use App\Enums\SocialProvider;
use App\Exceptions\ApiException;
use Illuminate\Container\Attributes\Config;

/**
 * Checks a Google ID token: Google signed it for one of our client ids (the
 * web client the apps ask for tokens with, or a platform client), and it has
 * not expired. An email Google has not verified is dropped.
 */
final class GoogleIdentityVerifier
{
    public const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

    /**
     * @param  list<string>  $clientIds
     */
    public function __construct(
        private readonly IdentityTokenDecoder $decoder,
        #[Config('quezby.social.google.client_ids')]
        private readonly array $clientIds,
    ) {}

    /**
     * @throws ApiException identity_invalid
     */
    public function verify(string $idToken): VerifiedIdentity
    {
        $claims = $this->decoder->decode(SocialProvider::Google, $idToken, self::ISSUERS, $this->clientIds);
        $email = IdentityTokenDecoder::emailVerified($claims) ? IdentityTokenDecoder::email($claims) : null;

        return new VerifiedIdentity(
            provider: SocialProvider::Google,
            subject: $claims['sub'],
            email: $email,
            emailVerified: $email !== null,
            clientId: $claims['aud'],
        );
    }
}
