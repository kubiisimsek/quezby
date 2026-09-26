<?php

namespace App\Enums;

use Illuminate\Http\Request;

/**
 * The six languages the game speaks, in the order the language picker lists
 * them — `Locale` in `packages/types` and `LOCALES` in `@quezby/config`,
 * tested against `packages/config/fixtures/locales.json`
 * (`tests/Unit/LocaleParityTest.php`). Each has its lines in `lang/{locale}`.
 */
enum Locale: string
{
    case Tr = 'tr';
    case En = 'en';
    case De = 'de';
    case Ar = 'ar';
    case Fr = 'fr';
    case Es = 'es';

    /**
     * The first of the request's `Accept-Language` tags the game speaks, by
     * its primary subtag — `de-AT` → `de`, `ar_SA` → `ar`, `zh-Hant-TW` →
     * none — in the header's order of preference (`bestLocale` in
     * `@quezby/config`); null when none of them is one of the six.
     * `getPreferredLanguage()` will not do: it answers the first language
     * offered when nothing matches.
     */
    public static function fromHeader(Request $request): ?self
    {
        foreach ($request->getLanguages() as $tag) {
            $primary = preg_split('/[-_]/', strtolower(trim($tag)))[0] ?? '';
            if (($locale = self::tryFrom($primary)) !== null) {
                return $locale;
            }
        }

        return null;
    }

    /** The language this request speaks (`ResolveLocale`); Turkish outside a player request. */
    public static function current(): self
    {
        return self::tryFrom(app()->getLocale()) ?? self::Tr;
    }

    /** Arabic is the one language read right to left. */
    public function isRtl(): bool
    {
        return $this === self::Ar;
    }

    /**
     * An integer as a reader of this language groups it: `12345` → `12.345`
     * (tr, de, es), `12,345` (en, ar), `12 345` with a no-break space (fr).
     * Spanish leaves four digits whole: `1234`. The sign stays in front —
     * `groupDigits` in `@quezby/config` writes the same.
     */
    public function group(int $value): string
    {
        $digits = ltrim((string) $value, '-');
        $sign = $value < 0 ? '-' : '';
        if (strlen($digits) < ($this === self::Es ? 5 : 4)) {
            return $sign.$digits;
        }

        $separator = match ($this) {
            self::Tr, self::De, self::Es => '.',
            self::En, self::Ar => ',',
            // The narrow no-break space (U+202F) is not in the game's fonts.
            self::Fr => "\u{00A0}",
        };

        return $sign.preg_replace('/\B(?=(\d{3})+(?!\d))/', $separator, $digits);
    }
}
