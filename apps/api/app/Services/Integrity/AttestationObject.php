<?php

namespace App\Services\Integrity;

/**
 * An App Attest attestation, read: `{fmt, attStmt: {x5c, receipt}, authData}`.
 * Nothing in it is checked yet — see `AppAttestVerifier::attest`.
 */
final readonly class AttestationObject
{
    /**
     * @param  list<string>  $certificates  DER: the credential certificate, then the intermediate
     */
    public function __construct(
        public string $format,
        public array $certificates,
        public ?string $receipt,
        /** The raw bytes, which the nonce is taken over. */
        public string $authData,
        public AuthenticatorData $authenticator,
    ) {}
}
