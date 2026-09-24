<?php

namespace App\Services\Integrity;

/** A key App Attest vouched for, ready to be kept for the player's later assertions. */
final readonly class AttestedKey
{
    public function __construct(
        /** The key id's 32 bytes. */
        public string $keyId,
        /** PEM. */
        public string $publicKey,
        /** `development` or `production`. */
        public string $environment,
        public ?string $receipt,
    ) {}
}
