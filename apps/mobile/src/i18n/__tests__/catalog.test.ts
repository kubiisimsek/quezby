import { LOCALES } from '@quezby/config';

import { CATALOGS } from '@/i18n/messages';
import { plural } from '@/i18n/plural';

type Line = { path: string; text: string; call: boolean };

/**
 * Every line of a catalog, functions called with small numbers — the words a
 * screen can show. `fmt` is code, not words, and is tested on its own.
 */
function linesOf(value: unknown, path: string, out: Line[] = []): Line[] {
  if (typeof value === 'string') {
    out.push({ path, text: value, call: false });
  } else if (typeof value === 'function') {
    try {
      const text: unknown = value(...Array.from({ length: value.length }, () => 2));
      if (typeof text === 'string') out.push({ path, text, call: true });
    } catch {
      // A line built from something richer than a number is checked by its screen's tests.
    }
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (path === '' && (key === 'fmt' || key === 'locale')) continue;
      linesOf(child, path ? `${path}.${key}` : key, out);
    }
  }
  return out;
}

/** Letters only Turkish writes — a sign of a line left untranslated. */
const TURKISH_ONLY = /[ğĞşŞıİ]/;

/** Lines that name Turkish letters on purpose: the rule against them in usernames. */
const NAMES_TURKISH_LETTERS = new Set(['usernameRules.problems.turkish_char']);

describe('the catalogs', () => {
  it.each(LOCALES.filter((locale) => locale !== 'tr'))(
    '%s leaves no line empty that Turkish fills',
    (locale) => {
      const turkish = new Map(linesOf(CATALOGS.tr, '').map((line) => [line.path, line.text]));
      const empty = linesOf(CATALOGS[locale], '').filter(
        (line) => !line.call && line.text.trim() === '' && (turkish.get(line.path) ?? '').trim() !== '',
      );
      expect(empty.map((line) => line.path)).toEqual([]);
    },
  );

  it.each(LOCALES.filter((locale) => locale !== 'tr'))(
    '%s has no Turkish left in it',
    (locale) => {
      const left = linesOf(CATALOGS[locale], '').filter(
        (line) => TURKISH_ONLY.test(line.text) && !NAMES_TURKISH_LETTERS.has(line.path),
      );
      expect(left.map((line) => `${line.path}: ${line.text}`)).toEqual([]);
    },
  );

  it('has no line that is still the Turkish one in another language', () => {
    const turkish = new Map(linesOf(CATALOGS.tr, '').map((line) => [line.path, line.text]));
    for (const locale of LOCALES.filter((l) => l !== 'tr')) {
      const same = linesOf(CATALOGS[locale], '').filter(
        (line) =>
          line.text.length > 12 && turkish.get(line.path) === line.text && /[a-zçğıöşü]{4}/i.test(line.text),
      );
      expect({ locale, same: same.map((line) => line.path) }).toEqual({ locale, same: [] });
    }
  });

  it('keeps the dock’s words short enough for their slot in every language', () => {
    for (const locale of LOCALES) {
      for (const word of Object.values(CATALOGS[locale].nav.tabs)) {
        expect({ locale, word, fits: word.length <= 10 }).toEqual({ locale, word, fits: true });
      }
    }
  });

  it('has no Latin ribbon left in the Arabic lines', () => {
    const latinCapitals = linesOf(CATALOGS.ar, '').filter((line) => /^[A-Z]{3,}/.test(line.text));
    expect(latinCapitals.map((line) => line.path)).toEqual([]);
  });

  it.each(LOCALES)('%s calls the rating qb, never Elo', (locale) => {
    const elo = linesOf(CATALOGS[locale], '').filter((line) => /\belo\b|إيلو/i.test(line.text));
    expect(elo.map((line) => `${line.path}: ${line.text}`)).toEqual([]);

    const row = CATALOGS[locale].board.row({
      rank: 2,
      name: 'deniz',
      isMe: false,
      score: 2340,
      gap: 12,
      unit: 'elo',
    });
    expect(row).toContain('qb');
    expect(row).not.toMatch(/\belo\b/i);
  });
});

describe('plural', () => {
  it('picks the form the count needs, and `other` when a language has no such form', () => {
    const forms = { zero: 'z', one: 'o', two: 't', few: 'f', many: 'm', other: 'x' };
    expect([0, 1, 2, 3, 11, 100].map((n) => plural('ar', n, forms))).toEqual(['z', 'o', 't', 'f', 'm', 'x']);
    expect([0, 1, 2].map((n) => plural('fr', n, forms))).toEqual(['o', 'o', 'x']);
    expect([0, 1, 2].map((n) => plural('en', n, { one: 'one', other: 'many' }))).toEqual(['many', 'one', 'many']);
    expect(plural('ar', 2, { one: 'o', other: 'x' })).toBe('x');
  });
});
