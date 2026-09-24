<?php

namespace App\Services\Integrity;

use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Container\Attributes\Config;
use Illuminate\Support\Facades\DB;

/**
 * One-time challenges a phone proves itself against. Play Integrity hashes
 * one into its token, App Attest into its attestation or assertion — so a
 * proof counts once, for the player it was asked for, within minutes, and a
 * proof taken from someone else's phone is worth nothing. Only the SHA-256 of
 * a challenge is stored.
 */
final class DeviceChallenges
{
    public function __construct(
        #[Config('quezby.integrity.challenge_ttl_seconds')]
        private readonly int $ttlSeconds,
    ) {}

    /**
     * 32 random bytes, base64url without padding. Expired challenges are
     * forgotten on the way: they can never be used again anyway.
     *
     * @return array{challenge: string, expiresAt: CarbonInterface}
     */
    public function issue(User $user): array
    {
        $challenge = rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
        $expiresAt = now()->addSeconds($this->ttlSeconds)->startOfSecond();

        DB::table('device_challenges')->where('expires_at', '<=', now())->delete();
        DB::table('device_challenges')->insert([
            'hash' => hash('sha256', $challenge),
            'user_id' => $user->id,
            'expires_at' => $expiresAt,
            'created_at' => now(),
        ]);

        return ['challenge' => $challenge, 'expiresAt' => $expiresAt];
    }

    /**
     * Uses the challenge up, in one statement, so that two requests cannot
     * both have it. False when it was never issued to this player, is used,
     * or has expired.
     */
    public function consume(User $user, string $challenge): bool
    {
        return DB::table('device_challenges')
            ->where('hash', hash('sha256', $challenge))
            ->where('user_id', $user->id)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->update(['used_at' => now()]) === 1;
    }
}
