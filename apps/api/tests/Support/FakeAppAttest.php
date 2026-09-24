<?php

namespace Tests\Support;

use App\Services\Integrity\AppAttestVerifier;
use OpenSSLAsymmetricKey;
use OpenSSLCertificate;
use RuntimeException;

/**
 * Apple's App Attest, made at test time with PHP's OpenSSL: a root CA the API
 * is configured to pin, an intermediate, and for each attestation a fresh
 * P-256 key certified by the intermediate with the nonce extension — just as
 * Apple's servers do it. A second, rogue chain signs what Apple would not.
 */
final class FakeAppAttest
{
    public const TEAM_ID = 'TEAM123456';

    public const BUNDLE_ID = 'com.kubisimsek.game.quezby';

    public const APP_ID = self::TEAM_ID.'.'.self::BUNDLE_ID;

    /** @var array{root: string, pinned: array{0: OpenSSLCertificate, 1: OpenSSLAsymmetricKey}, rogue: array{0: OpenSSLCertificate, 1: OpenSSLAsymmetricKey}}|null */
    private static ?array $ca = null;

    private function __construct() {}

    /** Pins the test root and points the API's App Attest config at our test team and apps. */
    public static function install(): self
    {
        config([
            'quezby.social.apple.team_id' => self::TEAM_ID,
            'quezby.social.apple.client_ids' => [self::BUNDLE_ID, self::BUNDLE_ID.'.staging'],
            'quezby.integrity.ios.environments' => ['production'],
            'quezby.integrity.ios.root_ca' => self::ca()['root'],
        ]);

        return new self;
    }

    /** A key as the Secure Enclave makes one. */
    public function newKey(): OpenSSLAsymmetricKey
    {
        return openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_EC, 'curve_name' => 'prime256v1'])
            ?: throw new RuntimeException('OpenSSL could not make an EC key.');
    }

    /** The key's id as `generateKey` hands it out: base64 of the SHA-256 of its public point. */
    public function keyId(OpenSSLAsymmetricKey $key): string
    {
        return base64_encode(hash('sha256', self::point($key), true));
    }

    /**
     * App Attest's attestation of `$key` over `$challenge`, base64, as the app
     * sends it. `$bend` changes one thing Apple would have got right:
     * `appId`, `counter`, `aaguid`, `credentialId`, `fmt`, `nonceOver` (the
     * challenge hashed into the certificate), `ca` (`rogue`), `days` (how
     * long the credential certificate is valid).
     *
     * @param  array<string, mixed>  $bend
     */
    public function attestation(string $challenge, OpenSSLAsymmetricKey $key, array $bend = []): string
    {
        $point = self::point($key);
        $credentialId = $bend['credentialId'] ?? hash('sha256', $point, true);
        $authData = hash('sha256', $bend['appId'] ?? self::APP_ID, true)
            ."\x40"
            .pack('N', $bend['counter'] ?? 0)
            .($bend['aaguid'] ?? AppAttestVerifier::ENVIRONMENTS['production'])
            .pack('n', strlen($credentialId)).$credentialId
            .CborWriter::encode([1 => 2, 3 => -7, -1 => 1, -2 => CborWriter::bytes(substr($point, 1, 32)), -3 => CborWriter::bytes(substr($point, 33, 32))]);
        $nonce = hash('sha256', $authData.hash('sha256', $bend['nonceOver'] ?? $challenge, true), true);

        [$intermediate, $intermediateKey] = self::ca()[$bend['ca'] ?? 'pinned'];
        $credential = self::sign($key, $intermediate, $intermediateKey, $bend['days'] ?? 3, self::nonceExtension($nonce));

        return base64_encode(CborWriter::encode([
            'fmt' => $bend['fmt'] ?? 'apple-appattest',
            'attStmt' => [
                'x5c' => [CborWriter::bytes(self::der($credential)), CborWriter::bytes(self::der($intermediate))],
                'receipt' => CborWriter::bytes('apple-receipt-'.bin2hex(random_bytes(8))),
            ],
            'authData' => CborWriter::bytes($authData),
        ]));
    }

    /**
     * An assertion by `$key` over `$challenge` with counter `$counter`, base64.
     * `$bend`: `appId`, `signedChallenge` (what the signature is really over),
     * `signWith` (another key).
     *
     * @param  array<string, mixed>  $bend
     */
    public function assertion(string $challenge, OpenSSLAsymmetricKey $key, int $counter, array $bend = []): string
    {
        $authenticatorData = hash('sha256', $bend['appId'] ?? self::APP_ID, true)."\x00".pack('N', $counter);
        $nonce = hash('sha256', $authenticatorData.hash('sha256', $bend['signedChallenge'] ?? $challenge, true), true);
        openssl_sign($nonce, $signature, $bend['signWith'] ?? $key, OPENSSL_ALGO_SHA256);

        return base64_encode(CborWriter::encode([
            'signature' => CborWriter::bytes($signature),
            'authenticatorData' => CborWriter::bytes($authenticatorData),
        ]));
    }

    /** The PEM of the key's public half, as the API keeps it. */
    public function publicPem(OpenSSLAsymmetricKey $key): string
    {
        return openssl_pkey_get_details($key)['key'];
    }

    /** The uncompressed point: 0x04 ‖ X ‖ Y. */
    private static function point(OpenSSLAsymmetricKey $key): string
    {
        $ec = openssl_pkey_get_details($key)['ec'];

        return "\x04".str_pad($ec['x'], 32, "\0", STR_PAD_LEFT).str_pad($ec['y'], 32, "\0", STR_PAD_LEFT);
    }

    /** `SEQUENCE { [1] { OCTET STRING nonce } }`, as an OpenSSL config line. */
    private static function nonceExtension(string $nonce): string
    {
        $der = "\x30\x24\xA1\x22\x04\x20".$nonce;

        return AppAttestVerifier::NONCE_EXTENSION.' = DER:'.implode(':', str_split(strtoupper(bin2hex($der)), 2));
    }

    /**
     * The root file the API pins, and each chain's intermediate with its key.
     *
     * @return array{root: string, pinned: array{0: OpenSSLCertificate, 1: OpenSSLAsymmetricKey}, rogue: array{0: OpenSSLCertificate, 1: OpenSSLAsymmetricKey}}
     */
    private static function ca(): array
    {
        if (self::$ca === null) {
            $chain = function (string $name): array {
                $rootKey = self::ecKey('secp384r1');
                $root = self::sign($rootKey, null, $rootKey, 3650, null, "{$name} Root CA");
                $intermediateKey = self::ecKey('secp384r1');
                $intermediate = self::sign($intermediateKey, $root, $rootKey, 3650, null, "{$name} Intermediate CA");

                return [$root, [$intermediate, $intermediateKey]];
            };
            [$root, $pinned] = $chain('Test App Attestation');
            [, $rogue] = $chain('Rogue App Attestation');

            $path = (string) tempnam(sys_get_temp_dir(), 'quezby-attest-');
            openssl_x509_export($root, $pem);
            file_put_contents($path, $pem);
            register_shutdown_function(fn () => is_file($path) && unlink($path));

            self::$ca = ['root' => $path, 'pinned' => $pinned, 'rogue' => $rogue];
        }

        return self::$ca;
    }

    private static function ecKey(string $curve): OpenSSLAsymmetricKey
    {
        return openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_EC, 'curve_name' => $curve])
            ?: throw new RuntimeException('OpenSSL could not make an EC key.');
    }

    /**
     * A certificate for `$key`, signed by `$issuer` (self-signed when null):
     * a CA, or a credential certificate with `$extension`.
     */
    private static function sign(
        OpenSSLAsymmetricKey $key,
        ?OpenSSLCertificate $issuer,
        OpenSSLAsymmetricKey $issuerKey,
        int $days,
        ?string $extension,
        string $name = 'credential',
    ): OpenSSLCertificate {
        $config = (string) tempnam(sys_get_temp_dir(), 'quezby-cnf-');
        file_put_contents($config, implode("\n", [
            '[ req ]',
            'distinguished_name = dn',
            '[ dn ]',
            '[ ca ]',
            'basicConstraints = critical, CA:TRUE',
            'keyUsage = critical, keyCertSign, cRLSign',
            '[ credential ]',
            'basicConstraints = critical, CA:FALSE',
            'keyUsage = critical, digitalSignature',
            (string) $extension,
            '',
        ]));

        try {
            $options = ['config' => $config, 'digest_alg' => 'sha256', 'x509_extensions' => $extension === null ? 'ca' : 'credential'];
            $request = openssl_csr_new(['commonName' => $name], $key, $options);
            $certificate = $request === false ? false : openssl_csr_sign($request, $issuer, $issuerKey, $days, $options, random_int(1, PHP_INT_MAX));
        } finally {
            unlink($config);
        }

        return $certificate ?: throw new RuntimeException('OpenSSL could not sign a certificate.');
    }

    private static function der(OpenSSLCertificate $certificate): string
    {
        openssl_x509_export($certificate, $pem);

        return (string) base64_decode((string) preg_replace('/-----[^-]+-----|\s+/', '', $pem));
    }
}
