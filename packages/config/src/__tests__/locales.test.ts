import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildLocales } from '../fixtures';
import {
  LOCALES,
  LOCALE_NAMES,
  bestLocale,
  decimalMark,
  groupDigits,
  isLocale,
  isRtl,
  pluralCategory,
} from '../locales';

describe('languages', () => {
  it('lists the six in the picker order, each named in its own words', () => {
    expect(LOCALES).toEqual(['tr', 'en', 'de', 'ar', 'fr', 'es']);
    expect(LOCALE_NAMES).toEqual({
      tr: 'Türkçe',
      en: 'English',
      de: 'Deutsch',
      ar: 'العربية',
      fr: 'Français',
      es: 'Español',
    });
  });

  it('reads only Arabic right to left', () => {
    expect(LOCALES.filter(isRtl)).toEqual(['ar']);
  });

  it('tells its own codes from anything else', () => {
    expect(isLocale('de')).toBe(true);
    expect(isLocale('DE')).toBe(false);
    expect(isLocale('pt')).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});

describe('bestLocale', () => {
  it.each([
    [['tr-TR'], 'tr'],
    [['de-AT', 'en-US'], 'de'],
    [['ar_SA'], 'ar'],
    [['EN'], 'en'],
    [['zh-Hant-TW', 'fr-CA'], 'fr'],
    [['pt-BR', 'es-419'], 'es'],
    [['ja-JP'], null],
    [[], null],
  ])('%j → %s', (tags, expected) => {
    expect(bestLocale(tags)).toBe(expected);
  });
});

describe('groupDigits', () => {
  it.each([
    ['tr', 12345, '12.345'],
    ['tr', 1234, '1.234'],
    ['tr', 999, '999'],
    ['en', 1234567, '1,234,567'],
    ['de', 12345, '12.345'],
    ['ar', 12345, '12,345'],
    ['fr', 12345, '12 345'],
    ['es', 1234, '1234'],
    ['es', 12345, '12.345'],
    ['en', -12345, '-12,345'],
    ['tr', 1234.6, '1.235'],
  ] as const)('%s %d → %s', (locale, value, expected) => {
    expect(groupDigits(value, locale)).toBe(expected);
  });

  it('marks decimals with a comma except in English and Arabic', () => {
    expect(LOCALES.map(decimalMark)).toEqual([',', '.', ',', '.', ',', ',']);
  });
});

describe('pluralCategory', () => {
  it('counts one and the rest in Turkish, English and German', () => {
    for (const locale of ['tr', 'en', 'de'] as const) {
      expect(pluralCategory(locale, 1)).toBe('one');
      expect(pluralCategory(locale, 0)).toBe('other');
      expect(pluralCategory(locale, 2)).toBe('other');
    }
  });

  it('counts zero with one in French', () => {
    expect(pluralCategory('fr', 0)).toBe('one');
    expect(pluralCategory('fr', 1)).toBe('one');
    expect(pluralCategory('fr', 2)).toBe('other');
    expect(pluralCategory('fr', 1_000_000)).toBe('many');
    expect(pluralCategory('es', 1_000_000)).toBe('many');
    expect(pluralCategory('es', 0)).toBe('other');
  });

  it.each([
    [0, 'zero'],
    [1, 'one'],
    [2, 'two'],
    [3, 'few'],
    [10, 'few'],
    [103, 'few'],
    [11, 'many'],
    [99, 'many'],
    [111, 'many'],
    [100, 'other'],
    [101, 'other'],
    [102, 'other'],
  ] as const)('Arabic %d is %s', (count, expected) => {
    expect(pluralCategory('ar', count)).toBe(expected);
  });
});

describe('fixtures', () => {
  it('are up to date with the code (run `pnpm --filter @quezby/config fixtures`)', () => {
    const committed = JSON.parse(
      readFileSync(join(__dirname, '..', '..', 'fixtures', 'locales.json'), 'utf8'),
    );
    expect(committed).toEqual(JSON.parse(JSON.stringify(buildLocales())));
  });
});
