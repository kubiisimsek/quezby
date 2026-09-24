<?php

namespace App\Services\Integrity;

use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use App\Models\AppAttestKey;
use App\Support\Cbor;
use App\Support\Der;
use Illuminate\Container\Attributes\Config;
use Illuminate\Support\Facades\Log;
use OpenSSLCertificate;
use UnexpectedValueException;

/**
 * Apple's App Attest, checked step by step as Apple's "Validating apps that
 * connect to your server" lays it out. Once per install the app has a key
 * attested: Apple certifies — in a chain up to its App Attestation Root CA,
 * pinned in `resources/certs` — that the key lives in the Secure Enclave of
 * a real device, inside one of our apps, and hashes our challenge into the
 * certificate. The API keeps the public key. From then on the app signs
 * challenges with it (assertions), each with a counter that only goes up.
 */
final class AppAttestVerifier
{
    /** The credential certificate's extension holding `SHA-256(authData ‖ SHA-256(challenge))`. */
    public const NONCE_EXTENSION = '1.2.840.113635.100.8.2';

    /** The AAGUID in an attestation's authenticator data, by App Attest environment. */
    public const ENVIRONMENTS = [
        'development' => 'appattestdevelop',
        'production' => "appattest\0\0\0\0\0\0\0",
    ];

    /**
     * @param  list<string>  $bundleIds  our apps: a key is for `{team id}.{bundle id}`
     * @param  list<string>  $environments  the App Attest environments a key may come from
     */
    public function __construct(
        #[Config('quezby.social.apple.team_id')]
        private readonly ?string $teamId,
        #[Config('quezby.social.apple.client_ids')]
        private readonly array $bundleIds,
        #[Config('quezby.integrity.ios.environments')]
        private readonly array $environments,
        #[Config('quezby.integrity.ios.root_ca')]
        private readonly ?string $rootCa,
    ) {}

    /**
     * The 32 bytes of a key id, which `generateKey` hands out as base64.
     *
     * @throws ApiException integrity_invalid
     */
    public static function keyId(string $keyId): string
    {
        $bytes = self::base64($keyId);
        if ($bytes === null || strlen($bytes) !== 32) {
            throw self::unreadable('the key id is not 32 bytes of base64');
        }

        return $bytes;
    }

    /**
     * An attestation (base64 of CBOR), taken apart but not yet checked.
     *
     * @throws ApiException integrity_invalid when it is not an attestation object at all
     */
    public static function readAttestation(string $attestation): AttestationObject
    {
        $object = self::cbor($attestation);
        $statement = is_array($object['attStmt'] ?? null) ? $object['attStmt'] : [];
        $certificates = $statement['x5c'] ?? null;
        $receipt = $statement['receipt'] ?? null;
        $authData = $object['authData'] ?? null;
        if (
            ! is_string($object['fmt'] ?? null)
            || ! is_array($certificates) || ! array_is_list($certificates) || count($certificates) < 2
            || array_filter($certificates, fn (mixed $der) => ! is_string($der) || self::certificate($der) === null) !== []
            || ($receipt !== null && ! is_string($receipt))
            || ! is_string($authData)
        ) {
            throw self::unreadable('not an attestation object');
        }

        try {
            $authenticator = AuthenticatorData::parse($authData, attested: true);
        } catch (UnexpectedValueException $e) {
            throw self::unreadable($e->getMessage());
        }

        return new AttestationObject($object['fmt'], $certificates, $receipt, $authData, $authenticator);
    }

    /**
     * An assertion (base64 of CBOR), taken apart but not yet checked.
     *
     * @throws ApiException integrity_invalid when it is not an assertion at all
     */
    public static function readAssertion(string $assertion): AssertionObject
    {
        $object = self::cbor($assertion);
        $signature = $object['signature'] ?? null;
        $authenticatorData = $object['authenticatorData'] ?? null;
        if (! is_string($signature) || $signature === '' || ! is_string($authenticatorData)) {
            throw self::unreadable('not an assertion');
        }

        try {
            $authenticator = AuthenticatorData::parse($authenticatorData, attested: false);
        } catch (UnexpectedValueException $e) {
            throw self::unreadable($e->getMessage());
        }

        return new AssertionObject($signature, $authenticatorData, $authenticator);
    }

    /**
     * Apple's nine steps for an attestation of the key `$keyId` over the
     * challenge. A key that passes comes back ready to keep; anything else is
     * a failed check, or `unavailable` when this API cannot check keys.
     */
    public function attest(string $challenge, string $keyId, AttestationObject $attestation): AttestedKey|DeviceCheckResult
    {
        $root = $this->root();
        if ($root === null || ! $this->knowsOurApps()) {
            return DeviceCheckResult::unavailable('not_configured');
        }

        [$credential, $intermediate] = $attestation->certificates;
        $authenticator = $attestation->authenticator;
        $nonce = hash('sha256', $attestation->authData.hash('sha256', $challenge, true), true);
        $publicKey = self::publicKey($credential);
        $environment = array_search($authenticator->aaguid, self::ENVIRONMENTS, true);
        $details = ['keyId' => base64_encode($keyId), 'environment' => is_string($environment) ? $environment : null];

        $reason = match (true) {
            $attestation->format !== 'apple-appattest' => 'format',
            ! self::chains($credential, $intermediate, $root) => 'chain',
            ! hash_equals($nonce, (string) self::nonceOf($credential)) => 'nonce',
            $publicKey === null || ! hash_equals($keyId, hash('sha256', $publicKey['point'], true)) => 'key_id',
            ! $this->isOurApp($authenticator->rpIdHash) => 'app_id',
            $authenticator->counter !== 0 => 'counter',
            ! is_string($environment) || ! in_array($environment, $this->environments, true) => 'environment',
            ! hash_equals($keyId, (string) $authenticator->credentialId) => 'credential_id',
            default => null,
        };
        if ($reason !== null || $publicKey === null || ! is_string($environment)) {
            return DeviceCheckResult::fail($reason ?? 'key_id', array_filter($details));
        }

        return new AttestedKey($keyId, $publicKey['pem'], $environment, $attestation->receipt);
    }

    /**
     * An assertion by a key the player had attested, over the challenge: its
     * signature, our app, and a counter past the last one. A pass carries the
     * new counter in its details.
     */
    public function assert(string $challenge, AppAttestKey $key, AssertionObject $assertion): DeviceCheckResult
    {
        if (! $this->knowsOurApps()) {
            return DeviceCheckResult::unavailable('not_configured');
        }

        $authenticator = $assertion->authenticator;
        $nonce = hash('sha256', $assertion->authenticatorData.hash('sha256', $challenge, true), true);
        $details = ['keyId' => $key->key_id, 'counter' => $authenticator->counter];

        $reason = match (true) {
            openssl_verify($nonce, $assertion->signature, $key->public_key, OPENSSL_ALGO_SHA256) !== 1 => 'signature',
            ! $this->isOurApp($authenticator->rpIdHash) => 'app_id',
            $authenticator->counter <= $key->counter => 'counter',
            default => null,
        };

        return $reason === null ? DeviceCheckResult::pass($details) : DeviceCheckResult::fail($reason, $details);
    }

    /**
     * The nonce Apple put in a credential certificate: the one OCTET STRING
     * in `SEQUENCE { [1] { OCTET STRING } }`, the value of extension
     * 1.2.840.113635.100.8.2. Null when the certificate has no such thing.
     */
    public static function nonceOf(string $certificateDer): ?string
    {
        try {
            $tbs = Der::elements(Der::expect($certificateDer, Der::SEQUENCE))[0] ?? null;
            if ($tbs === null || $tbs['tag'] !== Der::SEQUENCE) {
                return null;
            }
            foreach (Der::elements($tbs['value']) as $field) {
                if ($field['tag'] !== Der::context(3)) {
                    continue;
                }
                foreach (Der::elements(Der::expect($field['value'], Der::SEQUENCE)) as $extension) {
                    // Extension ::= SEQUENCE { extnID, critical BOOLEAN DEFAULT FALSE, extnValue OCTET STRING }
                    $parts = Der::elements($extension['value']);
                    $id = $parts[0] ?? null;
                    $value = $parts[count($parts) - 1] ?? null;
                    if ($id === null || $value === null || $id['tag'] !== Der::OBJECT_IDENTIFIER
                        || Der::oid($id['value']) !== self::NONCE_EXTENSION || $value['tag'] !== Der::OCTET_STRING) {
                        continue;
                    }
                    foreach (Der::elements(Der::expect($value['value'], Der::SEQUENCE)) as $item) {
                        if ($item['tag'] === Der::context(1)) {
                            return Der::expect($item['value'], Der::OCTET_STRING);
                        }
                    }
                }
            }
        } catch (UnexpectedValueException) {
            return null;
        }

        return null;
    }

    /**
     * The credential certificate chains to the pinned root: each certificate
     * signed by the next, and all of them valid now.
     */
    private static function chains(string $credentialDer, string $intermediateDer, OpenSSLCertificate $root): bool
    {
        $credential = self::certificate($credentialDer);
        $intermediate = self::certificate($intermediateDer);
        if ($credential === null || $intermediate === null) {
            return false;
        }

        $now = now()->getTimestamp();
        foreach ([$credential, $intermediate, $root] as $certificate) {
            $validity = openssl_x509_parse($certificate);
            if (! is_array($validity) || $now < ($validity['validFrom_time_t'] ?? PHP_INT_MAX) || $now > ($validity['validTo_time_t'] ?? 0)) {
                return false;
            }
        }

        return openssl_x509_verify($credential, $intermediate) === 1 && openssl_x509_verify($intermediate, $root) === 1;
    }

    /**
     * The credential certificate's key: a P-256 point, uncompressed (65
     * bytes), whose SHA-256 is the key id — and the key as PEM, to keep.
     *
     * @return array{pem: string, point: string}|null
     */
    private static function publicKey(string $certificateDer): ?array
    {
        $key = openssl_pkey_get_public(self::pem($certificateDer));
        $details = $key === false ? false : openssl_pkey_get_details($key);
        if (! is_array($details) || $details['type'] !== OPENSSL_KEYTYPE_EC || ($details['ec']['curve_name'] ?? null) !== 'prime256v1') {
            return null;
        }

        try {
            $spki = Der::elements(Der::expect((string) base64_decode(preg_replace('/-----[^-]+-----|\s+/', '', $details['key']) ?? ''), Der::SEQUENCE));
        } catch (UnexpectedValueException) {
            return null;
        }
        $bits = $spki[1] ?? null;
        if ($bits === null || $bits['tag'] !== Der::BIT_STRING || strlen($bits['value']) !== 66 || $bits['value'][0] !== "\0" || $bits['value'][1] !== "\x04") {
            return null;
        }

        return ['pem' => $details['key'], 'point' => substr($bits['value'], 1)];
    }

    /** Whether the authenticator data is for `{team id}.{bundle id}` of one of our apps. */
    private function isOurApp(string $rpIdHash): bool
    {
        foreach ($this->bundleIds as $bundleId) {
            if (hash_equals(hash('sha256', $this->teamId.'.'.$bundleId, true), $rpIdHash)) {
                return true;
            }
        }

        return false;
    }

    /** Without a team id there is no App ID to check keys against. */
    private function knowsOurApps(): bool
    {
        if ((string) $this->teamId !== '' && $this->bundleIds !== []) {
            return true;
        }
        Log::info('App Attest proofs are not checked: set APPLE_TEAM_ID (and APPLE_BUNDLE_IDS).');

        return false;
    }

    /** The pinned App Attestation Root CA; null, logged, when it cannot be read. */
    private function root(): ?OpenSSLCertificate
    {
        $path = (string) $this->rootCa;
        $path = $path === '' || str_starts_with($path, '/') ? $path : base_path($path);
        $pem = $path !== '' && is_file($path) && is_readable($path) ? file_get_contents($path) : false;
        $root = $pem === false ? false : @openssl_x509_read($pem);
        if ($root === false) {
            Log::warning('The App Attest root certificate cannot be read.', ['path' => $path]);

            return null;
        }

        return $root;
    }

    /**
     * A base64 CBOR map.
     *
     * @return array<int|string, mixed>
     *
     * @throws ApiException integrity_invalid
     */
    private static function cbor(string $base64): array
    {
        $bytes = self::base64($base64) ?? throw self::unreadable('not base64');
        try {
            $object = Cbor::decode($bytes);
        } catch (UnexpectedValueException $e) {
            throw self::unreadable($e->getMessage());
        }
        if (! is_array($object)) {
            throw self::unreadable('not a CBOR map');
        }

        return $object;
    }

    /** Base64, or the URL-safe kind; null when it is neither. */
    private static function base64(string $value): ?string
    {
        $bytes = base64_decode(strtr($value, '-_', '+/'), true);

        return $bytes === false || $bytes === '' ? null : $bytes;
    }

    /** A DER certificate PHP's OpenSSL functions can take; null when it is not one. */
    private static function certificate(string $der): ?OpenSSLCertificate
    {
        $certificate = @openssl_x509_read(self::pem($der));

        return $certificate === false ? null : $certificate;
    }

    private static function pem(string $der): string
    {
        return "-----BEGIN CERTIFICATE-----\n".chunk_split(base64_encode($der), 64, "\n")."-----END CERTIFICATE-----\n";
    }

    /** Why a proof was refused goes to the log, never to the client. */
    private static function unreadable(string $reason): ApiException
    {
        Log::info("App Attest proof refused: {$reason}.");

        return ApiException::of(ErrorCode::IntegrityInvalid);
    }
}
