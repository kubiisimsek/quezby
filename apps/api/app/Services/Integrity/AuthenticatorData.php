<?php

namespace App\Services\Integrity;

use UnexpectedValueException;

/**
 * App Attest's authenticator data, laid out as WebAuthn's: the SHA-256 of
 * the App ID it is for, flags, a signature counter — and, in an attestation,
 * the authenticator's AAGUID (which tells development from production) and
 * the credential id, which is the key id.
 */
final readonly class AuthenticatorData
{
    public function __construct(
        /** SHA-256 of `{team id}.{bundle id}`. */
        public string $rpIdHash,
        public int $flags,
        public int $counter,
        /** 16 bytes; attestations only. */
        public ?string $aaguid = null,
        /** The key id's bytes; attestations only. */
        public ?string $credentialId = null,
    ) {}

    /**
     * @param  bool  $attested  whether the attested credential data follows the counter, as in an attestation
     *
     * @throws UnexpectedValueException when the bytes are too few for that
     */
    public static function parse(string $bytes, bool $attested): self
    {
        $length = strlen($bytes);
        if ($length < 37 || ($attested && $length < 55)) {
            throw new UnexpectedValueException('The authenticator data is too short.');
        }

        $rpIdHash = substr($bytes, 0, 32);
        $flags = ord($bytes[32]);
        $counter = self::bigEndian(substr($bytes, 33, 4));
        if (! $attested) {
            return new self($rpIdHash, $flags, $counter);
        }

        $idLength = self::bigEndian(substr($bytes, 53, 2));
        if ($length < 55 + $idLength) {
            throw new UnexpectedValueException('The authenticator data is too short for its credential id.');
        }

        return new self($rpIdHash, $flags, $counter, substr($bytes, 37, 16), substr($bytes, 55, $idLength));
    }

    private static function bigEndian(string $bytes): int
    {
        $value = 0;
        foreach (str_split($bytes) as $byte) {
            $value = ($value << 8) | ord($byte);
        }

        return $value;
    }
}
