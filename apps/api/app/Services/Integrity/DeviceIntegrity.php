<?php

namespace App\Services\Integrity;

use App\Enums\DeviceVerdict;
use App\Enums\ErrorCode;
use App\Enums\IntegrityMode;
use App\Enums\Platform;
use App\Exceptions\ApiException;
use App\Models\AppAttestKey;
use App\Models\DeviceCheck;
use App\Models\User;
use App\Support\Timestamp;
use Carbon\CarbonInterface;
use Illuminate\Container\Attributes\Config;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Carbon;

/**
 * A phone vouching for itself: it proves, against a challenge the API issued
 * to its player, that it is a real device running our app unmodified —
 * Play Integrity on Android, App Attest on iOS — and the API keeps the
 * verdict for a while. A run records the verdict standing when it starts.
 *
 * A proof that cannot be read at all is refused (`integrity_invalid`) before
 * its challenge is touched. Otherwise the challenge is used up, and the
 * proof judged: `pass` and `fail` are stored, `unavailable` (no check could
 * be made) is not.
 */
final class DeviceIntegrity
{
    /**
     * @param  array{pass: int, fail: int, unavailable: int}  $ttlMinutes
     */
    public function __construct(
        private readonly DeviceChallenges $challenges,
        private readonly PlayIntegrityVerifier $playIntegrity,
        private readonly AppAttestVerifier $appAttest,
        #[Config('quezby.integrity.verdict_ttl_minutes')]
        private readonly array $ttlMinutes,
    ) {}

    /**
     * An Android phone's Play Integrity token, asked for with the challenge's
     * SHA-256 as its request hash.
     *
     * @throws ApiException integrity_invalid, challenge_invalid
     */
    public function android(User $user, string $challenge, string $token): DeviceCheckAnswer
    {
        PlayIntegrityVerifier::assertReadable($token);
        $this->useChallenge($user, $challenge);
        if (IntegrityMode::current() === IntegrityMode::Off) {
            return $this->record($user, Platform::Android, DeviceCheckResult::unavailable('off'));
        }

        return $this->record($user, Platform::Android, $this->playIntegrity->verify($challenge, $token));
    }

    /**
     * An iPhone's first proof: App Attest's attestation of a new key over the
     * challenge. A key that passes is kept for the player's later assertions.
     *
     * @throws ApiException integrity_invalid, challenge_invalid
     */
    public function attest(User $user, string $challenge, string $keyId, string $attestation): DeviceCheckAnswer
    {
        $keyIdBytes = AppAttestVerifier::keyId($keyId);
        $object = AppAttestVerifier::readAttestation($attestation);
        $this->useChallenge($user, $challenge);
        if (IntegrityMode::current() === IntegrityMode::Off) {
            return $this->record($user, Platform::Ios, DeviceCheckResult::unavailable('off'));
        }

        $outcome = $this->appAttest->attest($challenge, $keyIdBytes, $object);

        return $this->record($user, Platform::Ios, $outcome instanceof AttestedKey ? $this->keep($user, $outcome) : $outcome);
    }

    /**
     * An iPhone's later proof: an assertion over the challenge by a key the
     * player had attested. A key the API does not know for this player is
     * `attest_key_unknown`, and the challenge stays good — the app attests a
     * new key with it.
     *
     * @throws ApiException integrity_invalid, attest_key_unknown, challenge_invalid
     */
    public function assert(User $user, string $challenge, string $keyId, string $assertion): DeviceCheckAnswer
    {
        $keyIdBytes = AppAttestVerifier::keyId($keyId);
        $object = AppAttestVerifier::readAssertion($assertion);
        if (IntegrityMode::current() === IntegrityMode::Off) {
            $this->useChallenge($user, $challenge);

            return $this->record($user, Platform::Ios, DeviceCheckResult::unavailable('off'));
        }

        $key = $user->appAttestKeys()->where('key_id', base64_encode($keyIdBytes))->first()
            ?? throw ApiException::of(ErrorCode::AttestKeyUnknown);
        $this->useChallenge($user, $challenge);

        $result = $this->appAttest->assert($challenge, $key, $object);
        if ($result->verdict === DeviceVerdict::Pass && ! $this->advance($key, (int) $result->details['counter'])) {
            // Another assertion with a counter as high got there first.
            $result = DeviceCheckResult::fail('counter', $result->details);
        }

        return $this->record($user, Platform::Ios, $result);
    }

    /**
     * Stores a `pass` or `fail` — good for `verdict_ttl_minutes` — and says
     * until when the app may rely on it, and whether a `fail` costs the player
     * anything (only when verdicts are enforced). `unavailable` is not
     * stored; the app just tries again sooner.
     */
    public function record(User $user, Platform $platform, DeviceCheckResult $result): DeviceCheckAnswer
    {
        $now = Carbon::now('UTC');
        $enforced = IntegrityMode::current() === IntegrityMode::Enforce;
        if ($result->verdict === DeviceVerdict::Unavailable) {
            return new DeviceCheckAnswer($result->verdict, $now->copy()->addMinutes($this->ttlMinutes['unavailable']), $enforced);
        }

        $check = $user->deviceChecks()->create([
            'platform' => $platform,
            'verdict' => $result->verdict,
            'reason' => $result->reason,
            'details' => $result->details === [] ? null : $result->details,
            'checked_at' => $now,
            'expires_at' => $now->copy()->addMinutes($this->ttlMinutes[$result->verdict->value]),
        ]);

        // A verdict that ran out a month ago is no use to anyone.
        DeviceCheck::query()
            ->where('user_id', $user->id)
            ->where('expires_at', '<', $now->copy()->subDays(30)->format(Timestamp::STORAGE_FORMAT))
            ->delete();

        return new DeviceCheckAnswer($check->verdict, $check->expires_at, $enforced);
    }

    /** The verdict a run started at `$at` records: the player's latest one still standing then, or null. */
    public function verdictAt(User $user, CarbonInterface $at): ?DeviceVerdict
    {
        $at = Carbon::instance($at)->utc()->format(Timestamp::STORAGE_FORMAT);

        return DeviceCheck::query()
            ->where('user_id', $user->id)
            ->where('checked_at', '<=', $at)
            ->where('expires_at', '>', $at)
            ->orderByDesc('checked_at')
            ->orderByDesc('id')
            ->first()
            ?->verdict;
    }

    /** @throws ApiException challenge_invalid */
    private function useChallenge(User $user, string $challenge): void
    {
        if (! $this->challenges->consume($user, $challenge)) {
            throw ApiException::of(ErrorCode::ChallengeInvalid);
        }
    }

    /**
     * Keeps an attested key for its player. A key id is attested once — Apple
     * never attests a key twice — so one the API already has is a replay.
     */
    private function keep(User $user, AttestedKey $key): DeviceCheckResult
    {
        $details = ['keyId' => base64_encode($key->keyId), 'environment' => $key->environment];
        if (AppAttestKey::query()->where('key_id', $details['keyId'])->exists()) {
            return DeviceCheckResult::fail('key_reused', $details);
        }

        try {
            $user->appAttestKeys()->create([
                'key_id' => base64_encode($key->keyId),
                'public_key' => $key->publicKey,
                'counter' => 0,
                'environment' => $key->environment,
                'receipt' => $key->receipt === null ? null : base64_encode($key->receipt),
                'attested_at' => now(),
            ]);
        } catch (UniqueConstraintViolationException) {
            return DeviceCheckResult::fail('key_reused', $details);
        }

        return DeviceCheckResult::pass($details);
    }

    /** Moves the key's counter up to `$counter`, unless it is already there — one statement, so replays lose. */
    private function advance(AppAttestKey $key, int $counter): bool
    {
        return AppAttestKey::query()
            ->whereKey($key->getKey())
            ->where('counter', '<', $counter)
            ->update(['counter' => $counter, 'last_used_at' => now()]) === 1;
    }
}
