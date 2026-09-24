<?php

namespace App\Services\Integrity;

use App\Enums\ErrorCode;
use App\Exceptions\ApiException;
use Illuminate\Container\Attributes\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * An Android phone's Play Integrity token (a standard request), read through
 * Google — the token is encrypted for Google, so only its decode endpoint can
 * open it — and what it is worth: a pass only for one of our apps as Google
 * Play knows it, on a device Google trusts, asked for with this challenge's
 * hash in the last few minutes. When Google cannot be asked (no credentials,
 * an error, no answer) the check is `unavailable`, which is never held
 * against the player.
 */
final class PlayIntegrityVerifier
{
    public const DECODE_URL = 'https://playintegrity.googleapis.com/v1/%s:decodeIntegrityToken';

    /**
     * @param  list<string>  $packages  our apps, in the order Google is asked to decode for them
     */
    public function __construct(
        private readonly GoogleServiceAccount $google,
        #[Config('quezby.integrity.android.packages')]
        private readonly array $packages,
        #[Config('quezby.integrity.android.token_max_age_seconds')]
        private readonly int $maxAgeSeconds,
    ) {}

    /**
     * Refuses what cannot be a token at all before Google is bothered with it.
     *
     * @throws ApiException integrity_invalid
     */
    public static function assertReadable(string $token): void
    {
        if (preg_match('/^[A-Za-z0-9_\-.=+\/]+$/', $token) !== 1) {
            throw self::unreadable('not a token');
        }
    }

    /**
     * The verdict on a token. Google decodes it for the app it belongs to,
     * so each of our packages is tried in turn until one takes it.
     *
     * @throws ApiException integrity_invalid when Google cannot read it for any of our apps
     */
    public function verify(string $challenge, string $token): DeviceCheckResult
    {
        $accessToken = $this->packages === [] ? null : $this->google->accessToken();
        if ($accessToken === null) {
            return DeviceCheckResult::unavailable('no_credentials');
        }

        $refused = [];
        foreach ($this->packages as $package) {
            try {
                $response = Http::withToken($accessToken)->acceptJson()->timeout(5)
                    ->post(sprintf(self::DECODE_URL, $package), ['integrity_token' => $token]);
            } catch (Throwable $e) {
                return self::googleDown(['reason' => $e->getMessage()]);
            }

            $payload = $response->json('tokenPayloadExternal');
            if ($response->successful() && is_array($payload)) {
                return $this->judge($payload, $challenge);
            }
            if ($response->status() === 401) {
                // The access token went bad before its time; the next check gets a new one.
                $this->google->forget();
            }
            if (! in_array($response->status(), [400, 403, 404], true)) {
                return self::googleDown(['status' => $response->status(), 'error' => $response->json('error.status')]);
            }
            $refused[$package] = $response->status();
        }

        // 400 for every one of our apps: not a token Google can read. Anything else is a setup problem on our side.
        if (array_diff($refused, [400]) === []) {
            throw self::unreadable('Google could not decode it for '.implode(', ', array_keys($refused)));
        }

        return self::googleDown(['refused' => $refused]);
    }

    /**
     * Pass or fail, from what Google read in the token.
     *
     * @param  array<mixed>  $payload  `tokenPayloadExternal`
     */
    private function judge(array $payload, string $challenge): DeviceCheckResult
    {
        $request = self::section($payload, 'requestDetails');
        $app = self::section($payload, 'appIntegrity');
        $device = self::section($payload, 'deviceIntegrity');
        $account = self::section($payload, 'accountDetails');

        $labels = is_array($device['deviceRecognitionVerdict'] ?? null)
            ? array_values(array_filter($device['deviceRecognitionVerdict'], 'is_string'))
            : [];
        $timestamp = $request['timestampMillis'] ?? null;
        $ageMs = is_int($timestamp) || (is_string($timestamp) && ctype_digit($timestamp))
            ? now()->getTimestampMs() - (int) $timestamp
            : null;
        $details = array_filter([
            'package' => self::text($request['requestPackageName'] ?? null),
            'app' => self::text($app['appRecognitionVerdict'] ?? null),
            'device' => $labels,
            'licensing' => self::text($account['appLicensingVerdict'] ?? null),
            'ageMs' => $ageMs,
        ], fn (mixed $value) => $value !== null);

        $hash = $request['requestHash'] ?? null;
        $reason = match (true) {
            ! is_string($hash) || ! hash_equals(hash('sha256', $challenge), strtolower($hash)) => 'hash',
            ! in_array($details['package'] ?? null, $this->packages, true) => 'package',
            $ageMs === null || abs($ageMs) > $this->maxAgeSeconds * 1000 => 'stale',
            ($details['app'] ?? null) !== 'PLAY_RECOGNIZED' => 'app',
            ! in_array('MEETS_DEVICE_INTEGRITY', $labels, true) => 'device',
            default => null,
        };

        return $reason === null ? DeviceCheckResult::pass($details) : DeviceCheckResult::fail($reason, $details);
    }

    /**
     * @param  array<mixed>  $payload
     * @return array<mixed>
     */
    private static function section(array $payload, string $name): array
    {
        return is_array($payload[$name] ?? null) ? $payload[$name] : [];
    }

    private static function text(mixed $value): ?string
    {
        return is_string($value) && $value !== '' ? mb_substr($value, 0, 64) : null;
    }

    /** @param  array<string, mixed>  $context */
    private static function googleDown(array $context): DeviceCheckResult
    {
        Log::warning('Google Play Integrity could not decode a token.', $context);

        return DeviceCheckResult::unavailable('google');
    }

    /** Why a token was refused goes to the log, never to the client. */
    private static function unreadable(string $reason): ApiException
    {
        Log::info("Play Integrity token refused: {$reason}.");

        return ApiException::of(ErrorCode::IntegrityInvalid);
    }
}
