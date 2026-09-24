<?php

namespace App\Services\Integrity;

/**
 * An App Attest assertion, read: `{signature, authenticatorData}`. Nothing in
 * it is checked yet — see `AppAttestVerifier::assert`.
 */
final readonly class AssertionObject
{
    public function __construct(
        /** ECDSA over the nonce, DER. */
        public string $signature,
        /** The raw bytes, which the nonce is taken over. */
        public string $authenticatorData,
        public AuthenticatorData $authenticator,
    ) {}
}
