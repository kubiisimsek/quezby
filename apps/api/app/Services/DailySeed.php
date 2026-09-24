<?php

namespace App\Services;

use Illuminate\Container\Attributes\Config;

/**
 * "Günün akışı": the one seed everyone plays on a given Istanbul day. Keyed
 * with a server secret, so nobody can know tomorrow's feed today; the engine
 * version is in the message, so a new season never replays an old day.
 */
final class DailySeed
{
    public function __construct(
        #[Config('quezby.daily.secret')]
        private readonly ?string $secret,
        #[Config('app.key')]
        private readonly ?string $appKey,
    ) {}

    public function for(string $dayKey, int $engineVersion): int
    {
        $key = ($this->secret ?? '') !== '' ? (string) $this->secret : (string) $this->appKey;
        $seed = (int) hexdec(substr(hash_hmac('sha256', "quezby-daily|{$dayKey}|{$engineVersion}", $key), 0, 8));

        return $seed === 0 ? 1 : $seed;
    }
}
