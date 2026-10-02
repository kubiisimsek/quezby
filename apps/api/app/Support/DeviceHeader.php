<?php

namespace App\Support;

use App\Enums\Platform;
use Illuminate\Http\Request;

/**
 * The phone a request comes from, as the app says in `X-Device`:
 * `install=…; platform=ios; os=18.2; brand=Apple; model=iPhone%2015; build=42`,
 * every value URI-encoded (`deviceHeader` in `@quezby/sdk`). The phone's word
 * is only a label here — nothing ranks or unlocks on it — so each value is
 * trimmed to printable ASCII and a length, and a header without a sound
 * install id is no header at all.
 */
final class DeviceHeader
{
    public const NAME = 'X-Device';

    private const INSTALL = '/^[A-Za-z0-9-]{8,100}$/';

    private function __construct(
        public readonly string $installId,
        public readonly ?Platform $platform,
        public readonly ?string $os,
        public readonly ?string $brand,
        public readonly ?string $model,
        public readonly ?string $build,
    ) {}

    public static function from(Request $request): ?self
    {
        return self::parse($request->header(self::NAME));
    }

    public static function parse(mixed $header): ?self
    {
        if (! is_string($header) || $header === '' || strlen($header) > 1024) {
            return null;
        }

        $fields = [];
        foreach (explode(';', $header) as $part) {
            $pair = explode('=', trim($part), 2);
            if (count($pair) === 2 && $pair[0] !== '') {
                $fields[strtolower($pair[0])] = rawurldecode($pair[1]);
            }
        }

        $install = $fields['install'] ?? '';
        if (preg_match(self::INSTALL, $install) !== 1) {
            return null;
        }

        return new self(
            installId: $install,
            platform: Platform::tryFrom($fields['platform'] ?? ''),
            os: self::label($fields['os'] ?? null, 32),
            brand: self::brand(self::label($fields['brand'] ?? null, 32)),
            model: self::label($fields['model'] ?? null, 64),
            build: self::label($fields['build'] ?? null, 16),
        );
    }

    /**
     * The maker as one name, however the system spells it: Android's
     * `samsung` and `motorola` capitalised, `Xiaomi` and `HUAWEI` left as they
     * are, and the library's `unknown` nothing at all.
     */
    private static function brand(?string $brand): ?string
    {
        if ($brand === null || strtolower($brand) === 'unknown') {
            return null;
        }

        return $brand === strtolower($brand) ? ucwords($brand) : $brand;
    }

    /** Printable ASCII only, squeezed and cut to the column's length; null when nothing is left. */
    private static function label(?string $value, int $length): ?string
    {
        if ($value === null) {
            return null;
        }
        $clean = trim((string) preg_replace('/\s+/', ' ', (string) preg_replace('/[^\x20-\x7E]/', '', $value)));

        return $clean === '' ? null : substr($clean, 0, $length);
    }
}
