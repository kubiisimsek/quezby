import {
  dativeOf,
  formatCombo,
  formatCountdown,
  formatGap,
  formatList,
  formatPlayTime,
} from '@/lib/format';

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatCombo', () => {
  it('writes a per-mille multiplier with a Turkish decimal comma', () => {
    expect(formatCombo(1_000)).toBe('x1,00');
    expect(formatCombo(1_250)).toBe('x1,25');
    expect(formatCombo(1_500)).toBe('x1,50');
    expect(formatCombo(5_000)).toBe('x5,00');
  });

  it('rounds to hundredths without floating-point drift', () => {
    expect(formatCombo(1_255)).toBe('x1,26');
    expect(formatCombo(1_004)).toBe('x1,00');
    expect(formatCombo(1_005)).toBe('x1,01');
  });
});

describe('formatGap', () => {
  it('groups digits the Turkish way', () => {
    expect(formatGap(1_240)).toBe('1.240');
    expect(formatGap(12)).toBe('12');
    expect(formatGap(1_000_000)).toBe('1.000.000');
  });

  it('is a distance, so the sign is dropped', () => {
    expect(formatGap(-1_240)).toBe('1.240');
  });
});

describe('formatCountdown', () => {
  it('shows days and hours over a day', () => {
    expect(formatCountdown(6 * DAY + 14 * HOUR + 30 * MINUTE)).toBe(
      '6 g 14 sa',
    );
    expect(formatCountdown(DAY)).toBe('1 g 0 sa');
  });

  it('shows hours and minutes over an hour', () => {
    expect(formatCountdown(5 * HOUR + 12 * MINUTE + 30 * SECOND)).toBe(
      '5 sa 12 dk',
    );
    expect(formatCountdown(HOUR)).toBe('1 sa 0 dk');
  });

  it('shows minutes and padded seconds under an hour', () => {
    expect(formatCountdown(12 * MINUTE + 5 * SECOND)).toBe('12 dk 05 sn');
    expect(formatCountdown(HOUR - SECOND)).toBe('59 dk 59 sn');
  });

  it('shows seconds alone in the last minute', () => {
    expect(formatCountdown(42 * SECOND)).toBe('42 sn');
  });

  it('rounds seconds up, so zero means the time is up', () => {
    expect(formatCountdown(12 * MINUTE + 4_200)).toBe('12 dk 05 sn');
    expect(formatCountdown(1)).toBe('1 sn');
    expect(formatCountdown(0)).toBe('0 sn');
    expect(formatCountdown(-5 * SECOND)).toBe('0 sn');
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

describe('formatPlayTime', () => {
  it('shows hours and minutes, then minutes, then seconds', () => {
    expect(formatPlayTime(2 * HOUR + 14 * MINUTE + 25 * SECOND)).toBe('2 sa 14 dk');
    expect(formatPlayTime(14 * MINUTE + 59 * SECOND)).toBe('14 dk');
    expect(formatPlayTime(45 * SECOND + 900)).toBe('45 sn');
    expect(formatPlayTime(0)).toBe('0 sn');
  });

  it('groups the hours of a very long habit', () => {
    expect(formatPlayTime(1_234 * HOUR + 5 * MINUTE)).toBe('1.234 sa 5 dk');
  });
});

describe('formatList', () => {
  it('joins the last two with the conjunction and the rest with commas', () => {
    expect(formatList(['Apple', 'Google', 'e-posta'], 'ya da')).toBe('Apple, Google ya da e-posta');
    expect(formatList(['Apple', 'e-posta'], 've')).toBe('Apple ve e-posta');
  });

  it('leaves one item alone and none empty', () => {
    expect(formatList(['e-posta'], 've')).toBe('e-posta');
    expect(formatList([], 'ya da')).toBe('');
  });
});
