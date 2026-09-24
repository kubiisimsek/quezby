<?php

namespace Tests\Support;

use App\Services\Integrity\GoogleServiceAccount;
use Closure;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use stdClass;

/**
 * Google as the Play Integrity check sees it, behind `Http::fake`: an OAuth
 * endpoint that trades the service account's JWT for an access token, and
 * `decodeIntegrityToken`, which reads out the verdict a test packed into the
 * token. The API is configured with a real service-account key file (made
 * once per process). Nothing reaches the network.
 */
final class FakePlayIntegrity
{
    public const PACKAGE = 'com.kubisimsek.game.quezby';

    /** A second app the list of packages may name. */
    public const OTHER_PACKAGE = 'com.kubisimsek.game.quezby.beta';

    public const CLIENT_EMAIL = 'play-integrity@quezby-test.iam.gserviceaccount.com';

    public const ACCESS_TOKEN = 'ya29.fake-play-integrity-token';

    private static ?string $privateKey = null;

    private static ?string $credentialsPath = null;

    /** @var list<Request> */
    public array $tokenRequests = [];

    /** @var list<array{package: string, request: Request}> */
    public array $decodeRequests = [];

    /** Google decodes a token only for the app it was made for, as the real one does. */
    public bool $strictPackages = false;

    private ?Closure $tokenAnswer = null;

    private ?Closure $decodeAnswer = null;

    private function __construct() {}

    /** Fakes Google and points the API's Play Integrity config at it: our app and a second one, and a key file. */
    public static function install(): self
    {
        $google = new self;
        config([
            'quezby.integrity.android.credentials' => self::credentialsPath(),
            'quezby.integrity.android.packages' => [self::PACKAGE, self::OTHER_PACKAGE],
        ]);

        Http::preventStrayRequests();
        Http::fake(function (Request $request) use ($google) {
            if ($request->url() === GoogleServiceAccount::TOKEN_URL) {
                $google->tokenRequests[] = $request;

                return $google->tokenAnswer !== null
                    ? ($google->tokenAnswer)($request)
                    : Http::response(['access_token' => self::ACCESS_TOKEN, 'expires_in' => 3599, 'token_type' => 'Bearer']);
            }
            if (preg_match('#^https://playintegrity\.googleapis\.com/v1/([^/:]+):decodeIntegrityToken$#', $request->url(), $match) === 1) {
                $google->decodeRequests[] = ['package' => $match[1], 'request' => $request];

                return $google->decodeAnswer !== null
                    ? ($google->decodeAnswer)($request, $match[1])
                    : $google->decode($request, $match[1]);
            }

            return null;
        });

        return $google;
    }

    /**
     * A token as the app gets it from Play Integrity for `$challenge` — here
     * with the verdict Google will read out of it in plain sight: a real app
     * from Play on a real phone, changed by `$set` (dot paths; null removes).
     *
     * @param  array<string, mixed>  $set
     */
    public function token(string $challenge, array $set = [], string $package = self::PACKAGE): string
    {
        $payload = [
            'requestDetails' => [
                'requestPackageName' => $package,
                'timestampMillis' => (string) now()->getTimestampMs(),
                'requestHash' => hash('sha256', $challenge),
            ],
            'appIntegrity' => [
                'appRecognitionVerdict' => 'PLAY_RECOGNIZED',
                'packageName' => $package,
                'certificateSha256Digest' => ['pnpa8e8eCArtvmaf49bJE1f5iG5-XLSU6w1U9ZvI96g'],
                'versionCode' => '1',
            ],
            'deviceIntegrity' => ['deviceRecognitionVerdict' => ['MEETS_DEVICE_INTEGRITY']],
            'accountDetails' => ['appLicensingVerdict' => 'LICENSED'],
        ];
        foreach ($set as $path => $value) {
            $value === null ? Arr::forget($payload, $path) : Arr::set($payload, $path, $value);
        }

        return 'fake.'.JWT::urlsafeB64Encode((string) json_encode($payload)).'.signature';
    }

    /** How the token endpoint answers from now on: a status code, or a closure (`Http::failedConnection()`). */
    public function tokenAnswers(int|Closure $with): self
    {
        $this->tokenAnswer = is_int($with) ? fn () => Http::response(['error' => 'invalid_grant'], $with) : $with;

        return $this;
    }

    /** How the decode endpoint answers from now on: a status code, or a closure; null for the real reading again. */
    public function decodeAnswers(int|Closure|null $with): self
    {
        $this->decodeAnswer = is_int($with)
            ? fn () => Http::response(['error' => ['code' => $with, 'status' => 'UNAVAILABLE']], $with)
            : $with;

        return $this;
    }

    /**
     * The header and claims of the JWT the API traded for the access token
     * last, checked against the service account's public key.
     *
     * @return array{0: array<string, mixed>, 1: array<string, mixed>}
     */
    public function assertion(): array
    {
        $request = end($this->tokenRequests) ?: throw new RuntimeException('No token was asked for.');
        $public = openssl_pkey_get_details(openssl_pkey_get_private((string) self::$privateKey))['key'];
        $header = new stdClass;
        // Judged at the test's time, as Google would judge it on arrival.
        [$timestamp, JWT::$timestamp] = [JWT::$timestamp, now()->getTimestamp()];
        try {
            $claims = JWT::decode($request['assertion'], new Key($public, 'RS256'), $header);
        } finally {
            JWT::$timestamp = $timestamp;
        }

        return [(array) $header, (array) $claims];
    }

    /** Google's decode: the payload inside a fake token, or 400 for anything else. */
    private function decode(Request $request, string $package): mixed
    {
        if ($request->header('Authorization') !== ['Bearer '.self::ACCESS_TOKEN]) {
            return Http::response(['error' => ['code' => 401, 'status' => 'UNAUTHENTICATED']], 401);
        }

        $parts = explode('.', (string) $request['integrity_token']);
        $payload = count($parts) === 3 && $parts[0] === 'fake'
            ? json_decode((string) JWT::urlsafeB64Decode($parts[1]), true)
            : null;
        $owner = is_array($payload) ? ($payload['requestDetails']['requestPackageName'] ?? null) : null;
        if (! is_array($payload) || ($this->strictPackages && $owner !== $package)) {
            return Http::response(['error' => ['code' => 400, 'status' => 'INVALID_ARGUMENT']], 400);
        }

        return Http::response(['tokenPayloadExternal' => $payload]);
    }

    /** A service-account key file, as Google Cloud hands it out, with a key made once per process. */
    private static function credentialsPath(): string
    {
        if (self::$credentialsPath === null) {
            $key = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_RSA, 'private_key_bits' => 2048]);
            if ($key === false || ! openssl_pkey_export($key, $pem)) {
                throw new RuntimeException('OpenSSL could not make an RSA key.');
            }
            $path = (string) tempnam(sys_get_temp_dir(), 'quezby-play-');
            file_put_contents($path, json_encode([
                'type' => 'service_account',
                'project_id' => 'quezby-test',
                'private_key_id' => 'key-1',
                'private_key' => $pem,
                'client_email' => self::CLIENT_EMAIL,
                'client_id' => '1234567890',
                'token_uri' => GoogleServiceAccount::TOKEN_URL,
            ]));
            register_shutdown_function(fn () => is_file($path) && unlink($path));

            self::$privateKey = $pem;
            self::$credentialsPath = $path;
        }

        return self::$credentialsPath;
    }
}
