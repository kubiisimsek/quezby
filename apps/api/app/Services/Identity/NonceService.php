<?php

namespace App\Services\Identity;

use Carbon\CarbonInterface;
use Illuminate\Container\Attributes\Config;
use Illuminate\Support\Facades\DB;

/**
 * Single-use nonces for Sign in with Apple. The app asks for one, hands Apple
 * its SHA-256, and sends the raw nonce back with the identity token. A token
 * only counts with a nonce this API issued, that has not expired and that
 * nobody used — so a token that leaked cannot be replayed.
 */
final class NonceService
{
    public function __construct(
        #[Config('quezby.social.nonce_ttl_minutes')]
        private readonly int $ttlMinutes,
    ) {}

    /**
     * 32 random bytes, hex. Expired nonces are forgotten on the way: they can
     * never be used again anyway.
     *
     * @return array{nonce: string, expiresAt: CarbonInterface}
     */
    public function issue(): array
    {
        $nonce = bin2hex(random_bytes(32));
        $expiresAt = now()->addMinutes($this->ttlMinutes)->startOfSecond();

        DB::table('auth_nonces')->where('expires_at', '<=', now())->delete();
        DB::table('auth_nonces')->insert(['nonce' => $nonce, 'expires_at' => $expiresAt, 'created_at' => now()]);

        return ['nonce' => $nonce, 'expiresAt' => $expiresAt];
    }

    /** Uses the nonce up. False when it was never issued, is used, or has expired. */
    public function consume(string $nonce): bool
    {
        return DB::table('auth_nonces')
            ->where('nonce', $nonce)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->update(['used_at' => now()]) === 1;
    }
}
