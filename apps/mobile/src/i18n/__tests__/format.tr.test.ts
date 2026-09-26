import { dativeOf } from '@/i18n/grammar/tr';
import { formatsFor } from '@/i18n/format';

/** Turkish, the source language: every number and time exactly as the game has always written them. */
const tr = formatsFor('tr');

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('combo', () => {
  it('writes a per-mille multiplier with a Turkish decimal comma', () => {
    expect(tr.combo(1_000)).toBe('x1,00');
    expect(tr.combo(1_250)).toBe('x1,25');
    expect(tr.combo(1_500)).toBe('x1,50');
    expect(tr.combo(5_000)).toBe('x5,00');
  });

  it('rounds to hundredths without floating-point drift', () => {
    expect(tr.combo(1_255)).toBe('x1,26');
    expect(tr.combo(1_004)).toBe('x1,00');
    expect(tr.combo(1_005)).toBe('x1,01');
  });
});

describe('gap', () => {
  it('groups digits the Turkish way', () => {
    expect(tr.gap(1_240)).toBe('1.240');
    expect(tr.gap(12)).toBe('12');
    expect(tr.gap(1_000_000)).toBe('1.000.000');
  });

  it('is a distance, so the sign is dropped', () => {
    expect(tr.gap(-1_240)).toBe('1.240');
  });
});

describe('countdown', () => {
  it('shows days and hours over a day', () => {
    expect(tr.countdown(6 * DAY + 14 * HOUR + 30 * MINUTE)).toBe(
      '6 g 14 sa',
    );
    expect(tr.countdown(DAY)).toBe('1 g 0 sa');
  });

  it('shows hours and minutes over an hour', () => {
    expect(tr.countdown(5 * HOUR + 12 * MINUTE + 30 * SECOND)).toBe(
      '5 sa 12 dk',
    );
    expect(tr.countdown(HOUR)).toBe('1 sa 0 dk');
  });

  it('shows minutes and padded seconds under an hour', () => {
    expect(tr.countdown(12 * MINUTE + 5 * SECOND)).toBe('12 dk 05 sn');
    expect(tr.countdown(HOUR - SECOND)).toBe('59 dk 59 sn');
  });

  it('shows seconds alone in the last minute', () => {
    expect(tr.countdown(42 * SECOND)).toBe('42 sn');
  });

  it('rounds seconds up, so zero means the time is up', () => {
    expect(tr.countdown(12 * MINUTE + 4_200)).toBe('12 dk 05 sn');
    expect(tr.countdown(1)).toBe('1 sn');
    expect(tr.countdown(0)).toBe('0 sn');
    expect(tr.countdown(-5 * SECOND)).toBe('0 sn');
  });
});

describe('dativeOf', () => {
  it('follows the last vowel and adds a buffer y after a vowel', () => {
    expect(dativeOf('ekin')).toBe("ekin'e");
    expect(dativeOf('burak')).toBe("burak'a");
    expect(dativeOf('ali')).toBe("ali'ye");
    expect(dativeOf('oya')).toBe("oya'ya");
    expect(dativeOf('umut')).toBe("umut'a");
    expect(dativeOf('ali.veli')).toBe("ali.veli'ye");
  });

  it('reads a trailing number as a word', () => {
    expect(dativeOf('kubi.01')).toBe("kubi.01'e");
    expect(dativeOf('nur42')).toBe("nur42'ye");
    expect(dativeOf('kubi.10')).toBe("kubi.10'a");
    expect(dativeOf('ayse6')).toBe("ayse6'ya");
    expect(dativeOf('can100')).toBe("can100'e");
    expect(dativeOf('can2000')).toBe("can2000'e");
    expect(dativeOf('zeki0')).toBe("zeki0'a");
  });

  it('reads a vowelless end letter by letter', () => {
    expect(dativeOf('mrt')).toBe("mrt'ye");
    expect(dativeOf('kk')).toBe("kk'ya");
  });
});

describe('playTime', () => {
  it('shows hours and minutes, then minutes, then seconds', () => {
    expect(tr.playTime(2 * HOUR + 14 * MINUTE + 25 * SECOND)).toBe('2 sa 14 dk');
    expect(tr.playTime(14 * MINUTE + 59 * SECOND)).toBe('14 dk');
    expect(tr.playTime(45 * SECOND + 900)).toBe('45 sn');
    expect(tr.playTime(0)).toBe('0 sn');
  });

  it('groups the hours of a very long habit', () => {
    expect(tr.playTime(1_234 * HOUR + 5 * MINUTE)).toBe('1.234 sa 5 dk');
  });
});

describe('list', () => {
  it('joins the last two with the conjunction and the rest with commas', () => {
    expect(tr.list(['Apple', 'Google', 'e-posta'], 'or')).toBe('Apple, Google ya da e-posta');
    expect(tr.list(['Apple', 'e-posta'], 'and')).toBe('Apple ve e-posta');
  });

  it('leaves one item alone and none empty', () => {
    expect(tr.list(['e-posta'], 'and')).toBe('e-posta');
    expect(tr.list([], 'or')).toBe('');
  });
});
