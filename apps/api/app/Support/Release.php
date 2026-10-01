<?php

namespace App\Support;

/**
 * The release the API was deployed as — `1.00.00.01`: major, minor, patch,
 * minipatch. `scripts/deploy.mjs` writes it to `version.json` next to
 * `artisan` on every deploy; a checkout that was never deployed has none.
 */
final class Release
{
    public const PATTERN = '/^\d+\.\d{2,}\.\d{2,}\.\d{2,}$/';

    private static ?string $file = null;

    private static ?string $read = null;

    private static bool $loaded = false;

    public static function version(): ?string
    {
        if (! self::$loaded) {
            self::$read = self::readFrom(self::$file ?? base_path('version.json'));
            self::$loaded = true;
        }

        return self::$read;
    }

    public static function readFrom(string $path): ?string
    {
        if (! is_file($path)) {
            return null;
        }
        $data = json_decode((string) file_get_contents($path), true);
        $version = is_array($data) ? ($data['version'] ?? null) : null;

        return is_string($version) && preg_match(self::PATTERN, $version) === 1 ? $version : null;
    }

    /** Points the API at another file — tests only; null goes back to `version.json`. */
    public static function useFile(?string $path): void
    {
        self::$file = $path;
        self::$read = null;
        self::$loaded = false;
    }
}
