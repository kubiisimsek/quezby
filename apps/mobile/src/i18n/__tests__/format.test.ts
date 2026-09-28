import { formatsFor } from '@/i18n/format';

describe('formatsFor', () => {
  const tr = formatsFor('tr');
  const en = formatsFor('en');
  const de = formatsFor('de');
  const fr = formatsFor('fr');
  const es = formatsFor('es');
  const ar = formatsFor('ar');

  it('writes Turkish exactly as the game always has', () => {
    expect(tr.score(12345)).toBe('12.345');
    expect(tr.rank(1204)).toBe('#1.204');
    expect(tr.rank(null)).toBe('—');
    expect(tr.perMille(942)).toBe('%94,2');
    expect(tr.combo(1250)).toBe('x1,25');
    expect(tr.playTime(2 * 3_600_000 + 14 * 60_000)).toBe('2 sa 14 dk');
    expect(tr.playTime(45_000)).toBe('45 sn');
    expect(tr.countdown(6 * 86_400_000 + 14 * 3_600_000)).toBe('6 g 14 sa');
    expect(tr.countdown(12 * 60_000 + 5_000)).toBe('12 dk 05 sn');
    expect(tr.list(['Apple', 'Google', 'e-posta'], 'or')).toBe('Apple, Google ya da e-posta');
    expect(tr.list(['Apple', 'e-posta'], 'and')).toBe('Apple ve e-posta');
    expect(tr.rankChange(null, 4)).toBe('yeni');
    expect(tr.rankChange(12, 4)).toBe('▲8');
    expect(tr.compact(1234)).toBe('1,2 B');
  });

  it('groups and marks decimals the way each language does', () => {
    expect([en, de, fr, es, ar].map((f) => f.score(12345))).toEqual([
      '12,345',
      '12.345',
      '12 345',
      '12.345',
      '12,345',
    ]);
    expect(es.score(1234)).toBe('1234');
    expect(en.perMille(942)).toBe('94.2%');
    expect(de.perMille(942)).toBe('94,2 %');
    expect(en.combo(1250)).toBe('x1.25');
    expect(fr.combo(1250)).toBe('x1,25');
  });

  it('reads a clock in each language’s short units', () => {
    const ms = 5 * 3_600_000 + 12 * 60_000;
    expect(en.countdown(ms)).toBe('5h 12m');
    expect(de.countdown(ms)).toBe('5 Std. 12 Min.');
    expect(fr.countdown(ms)).toBe('5 h 12 min');
    expect(es.countdown(ms)).toBe('5 h 12 min');
    expect(ar.countdown(ms)).toBe('5 س 12 د');
    expect(en.playTime(45_000)).toBe('45s');
  });

  it('joins a list with the language’s own words', () => {
    const items = ['Apple', 'Google', 'email'];
    expect(en.list(items, 'or')).toBe('Apple, Google or email');
    expect(de.list(items, 'and')).toBe('Apple, Google und email');
    expect(ar.list(items, 'and')).toBe('Apple، Google و email');
    expect(es.list(['Apple', 'iCloud'], 'and')).toBe('Apple e iCloud');
    expect(es.list(['Google', 'otro'], 'or')).toBe('Google u otro');
  });

  it('shortens a like count the way each language does', () => {
    expect([en, de, fr, es, ar].map((f) => f.compact(1234))).toEqual([
      '1.2K',
      '1,2 Tsd.',
      '1,2 k',
      '1,2 mil',
      '1.2 ألف',
    ]);
    expect(en.compact(842)).toBe('842');
  });

  it('writes a fake post’s per cents and prices each language’s way', () => {
    expect([tr, en, de, fr, es, ar].map((f) => f.percent(97))).toEqual([
      '%97',
      '97%',
      '97 %',
      '97 %',
      '97 %',
      '97%',
    ]);
    expect([tr, en, de, fr, es, ar].map((f) => f.price(123450))).toEqual([
      '1.234,50',
      '1,234.50',
      '1.234,50',
      '1 234,50',
      '1234,50',
      '1,234.50',
    ]);
    expect(en.price(5)).toBe('0.05');
  });

  it('says a rank is new in each language', () => {
    expect([en, de, fr, es, ar].map((f) => f.rankChange(null, 3))).toEqual([
      'new',
      'neu',
      'nouveau',
      'nuevo',
      'جديد',
    ]);
  });
});

describe('in an app reading right to left', () => {
  it('keeps a name, a rank and a move whole inside Arabic lines', () => {
    jest.isolateModules(() => {
      jest.doMock('@/i18n/native', () => ({ ...jest.requireActual('@/i18n/native'), IS_RTL: true }));
      const format = require('@/i18n/format') as typeof import('@/i18n/format');
      const ar = format.formatsFor('ar');

      expect(format.handle('ekin')).toBe('‎@ekin‎');
      expect(ar.rank(12)).toBe('‎#12‎');
      expect(ar.rankChange(12, 4)).toBe('‎▲8‎');
    });
  });

  it('leaves them as they are when the app reads left to right', () => {
    const format = jest.requireActual('@/i18n/format') as typeof import('@/i18n/format');
    expect(format.handle('ekin')).toBe('@ekin');
  });
});
