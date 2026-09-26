<?php

namespace App\Support;

use Illuminate\Encryption\Encrypter;

/**
 * Whether the API has `APP_KEY` as its running configuration holds it — the
 * key checkpoint receipts are signed with and Apple's refresh tokens are
 * encrypted with. Only ever what is wrong with it, never the key itself.
 */
final class AppKey
{
    /** @return 'missing'|'malformed'|null */
    public static function problem(): ?string
    {
        return self::check(config('app.key'), (string) config('app.cipher'));
    }

    /**
     * `base64:` keys are read the way Laravel reads them, but strictly: a key
     * that does not decode is malformed, not a shorter key.
     *
     * @return 'missing'|'malformed'|null
     */
    public static function check(mixed $key, string $cipher): ?string
    {
        if (! is_string($key) || trim($key) === '') {
            return 'missing';
        }
        if (str_starts_with($key, 'base64:')) {
            $key = base64_decode(substr($key, strlen('base64:')), true);
            if ($key === false) {
                return 'malformed';
            }
        }

        return Encrypter::supported($key, $cipher) ? null : 'malformed';
    }
}
