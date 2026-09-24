<?php

namespace Tests\Support;

use App\Enums\SocialProvider;
use App\Models\SocialIdentity;
use App\Models\User;
use App\Services\Identity\AppleTokenRevoker;
use App\Services\Identity\JwksCache;
use App\Services\Identity\NonceService;
use Closure;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use stdClass;

/**
 * Apple and Google as the API sees them, behind `Http::fake`: each publishes
 * a JWKS, signs identity tokens with the keys in it, and Apple answers its
 * token and revoke endpoints. Nothing reaches the network.
 */
final class FakeIdentityProvider
{
    public const APPLE_BUNDLE_ID = 'com.kubisimsek.game.quezby';

    public const APPLE_STAGING_BUNDLE_ID = 'com.kubisimsek.game.quezby.staging';

    public const APPLE_SUBJECT = '001234.5e8f0a7c1d2b4e6f8a9b0c1d2e3f4a5b.1234';

    public const APPLE_EMAIL = 'kubi@privaterelay.appleid.com';

    public const APPLE_TEAM_ID = 'TEAM123456';

    public const APPLE_KEY_ID = 'KEY1234567';

    public const APPLE_REFRESH_TOKEN = 'r.apple-refresh-token';

    public const GOOGLE_WEB_CLIENT_ID = '1234567890-web.apps.googleusercontent.com';

    public const GOOGLE_IOS_CLIENT_ID = '1234567890-ios.apps.googleusercontent.com';

    public const GOOGLE_SUBJECT = '110248495921238986420';

    public const GOOGLE_EMAIL = 'kubi@gmail.com';

    /** The key both providers publish unless a test says otherwise. */
    public const KEY = 'key-1';

    /** @var array<string, string> RSA private keys (PEM) by kid, made once per process */
    private static array $rsaKeys = [];

    private static ?string $appleKeyPath = null;

    private static ?string $applePublicKey = null;

    /** @var list<string> */
    private array $published = [self::KEY];

    /** @var array<string, int> requests by URL, those that never got an answer too */
    private array $attempts = [];

    private ?Closure $jwksAnswer = null;

    private Closure $appleToken;

    private Closure $appleRevoke;

    private function __construct()
    {
        $this->appleToken = fn () => Http::response([
            'access_token' => 'a.apple-access-token',
            'token_type' => 'Bearer',
            'expires_in' => 3600,
            'refresh_token' => self::APPLE_REFRESH_TOKEN,
            'id_token' => 'apple-id-token',
        ]);
        $this->appleRevoke = fn () => Http::response();
    }

    /**
     * Fakes both providers and addresses the API's config to them. Apple's
     * key for trading and revoking tokens is left out; see `withAppleKey()`.
     */
    public static function install(): self
    {
        $provider = new self;

        config([
            'quezby.social.apple.client_ids' => [self::APPLE_BUNDLE_ID, self::APPLE_STAGING_BUNDLE_ID],
            'quezby.social.apple.team_id' => null,
            'quezby.social.apple.key_id' => null,
            'quezby.social.apple.private_key_path' => null,
            'quezby.social.google.client_ids' => [self::GOOGLE_WEB_CLIENT_ID, self::GOOGLE_IOS_CLIENT_ID],
        ]);

        Http::preventStrayRequests();
        Http::fake(function (Request $request) use ($provider) {
            $provider->attempts[$request->url()] = ($provider->attempts[$request->url()] ?? 0) + 1;

            return match ($request->url()) {
                JwksCache::URLS['apple'], JwksCache::URLS['google'] => $provider->jwksAnswer !== null
                    ? ($provider->jwksAnswer)($request)
                    : Http::response($provider->jwks()),
                AppleTokenRevoker::TOKEN_URL => ($provider->appleToken)($request),
                AppleTokenRevoker::REVOKE_URL => ($provider->appleRevoke)($request),
                default => null,
            };
        });

        return $provider;
    }

    /**
     * An Apple or Google account attached to `$user`, as an earlier sign-in left it.
     *
     * @param  array<string, mixed>  $attributes
     */
    public static function attach(User $user, SocialProvider $provider, array $attributes = []): SocialIdentity
    {
        return $user->identities()->create([
            'provider' => $provider,
            'subject' => $provider === SocialProvider::Apple ? self::APPLE_SUBJECT : self::GOOGLE_SUBJECT,
            ...$attributes,
        ]);
    }

    /** A player with an email and password to fall back on, whose Apple identity holds a refresh token. */
    public static function playerWithAppleGrant(): User
    {
        $player = User::factory()->withUsername()->linked()->create();
        self::attach($player, SocialProvider::Apple, ['apple_refresh_token' => self::APPLE_REFRESH_TOKEN]);

        return $player;
    }

    /** How many requests went to `$url`, answered or not — `Http::assertSent` misses failed connections. */
    public function attempts(string $url): int
    {
        return $this->attempts[$url] ?? 0;
    }

    /** Configures a Sign in with Apple key (an EC P-256 `.p8`), so tokens are traded and revoked. */
    public function withAppleKey(): self
    {
        if (self::$appleKeyPath === null) {
            $key = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_EC, 'curve_name' => 'prime256v1']);
            if ($key === false || ! openssl_pkey_export($key, $pem)) {
                throw new RuntimeException('OpenSSL could not make an EC key.');
            }
            $path = (string) tempnam(sys_get_temp_dir(), 'quezby-apple-');
            file_put_contents($path, $pem);
            register_shutdown_function(fn () => is_file($path) && unlink($path));

            self::$appleKeyPath = $path;
            self::$applePublicKey = openssl_pkey_get_details($key)['key'];
        }

        config([
            'quezby.social.apple.team_id' => self::APPLE_TEAM_ID,
            'quezby.social.apple.key_id' => self::APPLE_KEY_ID,
            'quezby.social.apple.private_key_path' => self::$appleKeyPath,
        ]);

        return $this;
    }

    /**
     * How Apple answers `/auth/token` and `/auth/revoke` from now on: a status
     * code for an error, or a `Http::failedConnection()`.
     */
    public function appleAnswers(int|Closure|null $token = null, int|Closure|null $revoke = null): self
    {
        $answer = fn (int|Closure $with) => $with instanceof Closure
            ? $with
            : fn () => Http::response(['error' => 'invalid_grant'], $with);

        if ($token !== null) {
            $this->appleToken = $answer($token);
        }
        if ($revoke !== null) {
            $this->appleRevoke = $answer($revoke);
        }

        return $this;
    }

    /**
     * How both JWKS endpoints answer from now on: a status code, a
     * `Http::failedConnection()`, or null for the published keys again.
     */
    public function jwksAnswers(int|Closure|null $with): self
    {
        $this->jwksAnswer = is_int($with) ? fn () => Http::response('Unavailable', $with) : $with;

        return $this;
    }

    /** The keys both JWKS endpoints publish from now on — a provider rotating its keys. */
    public function publish(string ...$kids): self
    {
        $this->published = array_values($kids);

        return $this;
    }

    /** A nonce issued by the API, as `POST /auth/nonce` would. */
    public function nonce(): string
    {
        return app(NonceService::class)->issue()['nonce'];
    }

    /**
     * An Apple identity token for `$rawNonce`. A claim set to null is left out.
     *
     * @param  array<string, mixed>  $claims
     */
    public function appleToken(string $rawNonce, array $claims = [], string $kid = self::KEY): string
    {
        return $this->sign([
            'iss' => 'https://appleid.apple.com',
            'aud' => self::APPLE_BUNDLE_ID,
            'exp' => now()->addMinutes(10)->getTimestamp(),
            'iat' => now()->getTimestamp(),
            'sub' => self::APPLE_SUBJECT,
            'nonce' => hash('sha256', $rawNonce),
            'c_hash' => 'c-hash',
            'email' => self::APPLE_EMAIL,
            'email_verified' => true,
            'is_private_email' => true,
            'auth_time' => now()->getTimestamp(),
            'nonce_supported' => true,
            ...$claims,
        ], $kid);
    }

    /**
     * A Google ID token, as the apps get it for the web client. A claim set to null is left out.
     *
     * @param  array<string, mixed>  $claims
     */
    public function googleToken(array $claims = [], string $kid = self::KEY): string
    {
        return $this->sign([
            'iss' => 'https://accounts.google.com',
            'azp' => self::GOOGLE_IOS_CLIENT_ID,
            'aud' => self::GOOGLE_WEB_CLIENT_ID,
            'sub' => self::GOOGLE_SUBJECT,
            'email' => self::GOOGLE_EMAIL,
            'email_verified' => true,
            'name' => 'Kubi',
            'iat' => now()->getTimestamp(),
            'exp' => now()->addHour()->getTimestamp(),
            ...$claims,
        ], $kid);
    }

    /**
     * A `POST /auth/apple` body.
     *
     * @param  array<string, mixed>  $claims
     * @param  array<string, mixed>  $body
     * @return array<string, mixed>
     */
    public function appleSignIn(?string $rawNonce = null, array $claims = [], array $body = []): array
    {
        $rawNonce ??= $this->nonce();

        return [
            'identityToken' => $this->appleToken($rawNonce, $claims),
            'nonce' => $rawNonce,
            'platform' => 'ios',
            'installId' => 'install-apple',
            ...$body,
        ];
    }

    /**
     * A `POST /auth/google` body.
     *
     * @param  array<string, mixed>  $claims
     * @param  array<string, mixed>  $body
     * @return array<string, mixed>
     */
    public function googleSignIn(array $claims = [], array $body = []): array
    {
        return [
            'idToken' => $this->googleToken($claims),
            'platform' => 'android',
            'installId' => 'install-google',
            ...$body,
        ];
    }

    /**
     * The token with its claims changed and its signature kept — no longer
     * what the provider signed.
     *
     * @param  array<string, mixed>  $claims
     */
    public function tamper(string $token, array $claims): string
    {
        [$header, $payload, $signature] = explode('.', $token);
        $changed = [...json_decode(JWT::urlsafeB64Decode($payload), true), ...$claims];

        return implode('.', [$header, JWT::urlsafeB64Encode((string) json_encode($changed)), $signature]);
    }

    /**
     * The header and claims of a client secret the API sent Apple, checked against the `.p8` key.
     *
     * @return array{0: array<string, mixed>, 1: array<string, mixed>}
     */
    public function clientSecret(string $jwt): array
    {
        $header = new stdClass;
        $claims = JWT::decode($jwt, new Key((string) self::$applePublicKey, 'ES256'), $header);

        return [(array) $header, (array) $claims];
    }

    /** @return array{keys: list<array<string, string>>} */
    private function jwks(): array
    {
        return ['keys' => array_map(function (string $kid) {
            $rsa = openssl_pkey_get_details(openssl_pkey_get_private(self::rsaKey($kid)))['rsa'];

            return [
                'kty' => 'RSA',
                'kid' => $kid,
                'use' => 'sig',
                'alg' => 'RS256',
                'n' => JWT::urlsafeB64Encode($rsa['n']),
                'e' => JWT::urlsafeB64Encode($rsa['e']),
            ];
        }, $this->published)];
    }

    /** @param  array<string, mixed>  $claims */
    private function sign(array $claims, string $kid): string
    {
        return JWT::encode(array_filter($claims, fn ($value) => $value !== null), self::rsaKey($kid), 'RS256', $kid);
    }

    private static function rsaKey(string $kid): string
    {
        if (! isset(self::$rsaKeys[$kid])) {
            $key = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_RSA, 'private_key_bits' => 2048]);
            if ($key === false || ! openssl_pkey_export($key, $pem)) {
                throw new RuntimeException('OpenSSL could not make an RSA key.');
            }
            self::$rsaKeys[$kid] = $pem;
        }

        return self::$rsaKeys[$kid];
    }
}
