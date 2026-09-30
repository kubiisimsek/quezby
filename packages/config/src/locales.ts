import type { Locale } from '@quezby/types';

/**
 * The eight languages the game speaks, in the order the language picker lists
 * them. The API's twin is `App\Enums\Locale`, tested against
 * `fixtures/locales.json` (`tests/Unit/LocaleParityTest.php`).
 */
export const LOCALES: readonly Locale[] = ['tr', 'en', 'de', 'ar', 'fr', 'es', 'ja', 'ko'];

/** Each language in its own words — how the picker names it, whatever the game speaks. */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = {
  tr: 'Türkçe',
  en: 'English',
  de: 'Deutsch',
  ar: 'العربية',
  fr: 'Français',
  es: 'Español',
  ja: '日本語',
  ko: '한국어',
};

/** Arabic is the one language read right to left. */
export function isRtl(locale: Locale): boolean {
  return locale === 'ar';
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * The first of the phone's languages the game speaks, by its primary subtag
 * — `de-AT` → `de`, `ar_SA` → `ar`, `zh-Hant-TW` → none — in the phone's order
 * of preference; null when none of them is one of the six.
 */
export function bestLocale(tags: readonly string[]): Locale | null {
  for (const tag of tags) {
    const primary = tag.trim().toLowerCase().split(/[-_]/)[0] ?? '';
    if (isLocale(primary)) return primary;
  }
  return null;
}

/**
 * What separates groups of three digits. French takes a no-break space
 * (U+00A0 — the narrow one, U+202F, is not in the game's fonts); Arabic
 * writes Latin digits, grouped with a comma, as Japanese and Korean do.
 */
const GROUP: Readonly<Record<Locale, string>> = {
  tr: '.',
  en: ',',
  de: '.',
  ar: ',',
  fr: ' ',
  es: '.',
  ja: ',',
  ko: ',',
};

/** Spanish leaves four digits whole (`1234`) and groups from five (`12.345`). */
const MIN_GROUPED_DIGITS: Readonly<Record<Locale, number>> = {
  tr: 4,
  en: 4,
  de: 4,
  ar: 4,
  fr: 4,
  es: 5,
  ja: 4,
  ko: 4,
};

/** The decimal mark: a comma in tr, de, fr and es, a point in en, ar, ja and ko. */
const DECIMAL: Readonly<Record<Locale, string>> = {
  tr: ',',
  en: '.',
  de: ',',
  ar: '.',
  fr: ',',
  es: ',',
  ja: '.',
  ko: '.',
};

export function decimalMark(locale: Locale): string {
  return DECIMAL[locale];
}

/**
 * An integer as a reader of `locale` groups it: `12345` → `12.345` (tr),
 * `12,345` (en), `12 345` (fr), `1234` but `12.345` (es). Rounds first; the
 * sign stays in front. The API's `Locale::group()` writes the same.
 */
export function groupDigits(value: number, locale: Locale): string {
  const rounded = Math.round(value);
  const digits = Math.abs(rounded).toString();
  const sign = rounded < 0 ? '-' : '';
  if (digits.length < MIN_GROUPED_DIGITS[locale]) return `${sign}${digits}`;
  return `${sign}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP[locale])}`;
}

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/**
 * The CLDR plural category of a whole number. Turkish says `3 oyun` as it says
 * `1 oyun`, but keeps `one` so a sentence can still read differently for one;
 * French counts 0 with 1; Arabic has six forms. Only whole numbers are ever
 * counted in the game.
 */
export function pluralCategory(locale: Locale, count: number): PluralCategory {
  const n = Math.abs(Math.trunc(count));
  switch (locale) {
    case 'ar': {
      const tail = n % 100;
      if (n === 0) return 'zero';
      if (n === 1) return 'one';
      if (n === 2) return 'two';
      if (tail >= 3 && tail <= 10) return 'few';
      if (tail >= 11 && tail <= 99) return 'many';
      return 'other';
    }
    case 'fr':
      if (n === 0 || n === 1) return 'one';
      return n !== 0 && n % 1_000_000 === 0 ? 'many' : 'other';
    case 'es':
      if (n === 1) return 'one';
      return n !== 0 && n % 1_000_000 === 0 ? 'many' : 'other';
    case 'tr':
    case 'en':
    case 'de':
      return n === 1 ? 'one' : 'other';
    // Japanese and Korean say a count the same way whatever it is.
    case 'ja':
    case 'ko':
      return 'other';
  }
}
