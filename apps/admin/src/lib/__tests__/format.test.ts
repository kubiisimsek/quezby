import { describe, expect, it } from 'vitest';

import {
  AUDIT_ACTION,
  dayKeyOf,
  formatDate,
  formatDateTime,
  formatChallenge,
  formatChallengeDay,
  formatDayKey,
  formatDelta,
  formatDuration,
  formatMonthKey,
  formatMs,
  formatNumber,
  formatPercent,
  formatPerMille,
  formatPeriodKey,
  formatRatingMove,
  formatRelative,
  formatTime,
  formatWeekKey,
  FUNNEL_STEP,
  LEAGUE_TIER,
  LEAGUE_TIERS,
  MILESTONE,
  playerName,
  RATING_KIND,
  REPORT_REASON,
  REPORT_STATUS,
  RUN_FLAG,
  RUN_MODE,
  RUN_STATUS,
  shortId,
  VERDICT,
} from '@/lib/format';

describe('numbers', () => {
  it('groups thousands the Turkish way and dashes what is missing', () => {
    expect(formatNumber(1234567)).toBe('1.234.567');
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(null)).toBe('—');
  });

  it('reads per-mille as a Turkish percentage', () => {
    expect(formatPerMille(942)).toBe('%94,2');
    expect(formatPerMille(1000)).toBe('%100');
    expect(formatPerMille(undefined)).toBe('—');
  });

  it('signs a move with a real minus sign, and leaves none on nothing', () => {
    expect(formatDelta(42)).toBe('+42');
    expect(formatDelta(-18)).toBe('\u221218');
    expect(formatDelta(-1018)).toBe('−1.018');
    expect(formatDelta(0)).toBe('0');
    expect(formatDelta(null)).toBe('—');
    expect(formatDelta(-18)).not.toContain('-');
  });

  it('reads a per cent value the Turkish way', () => {
    expect(formatPercent(20)).toBe('%20');
    expect(formatPercent(12.5)).toBe('%12,5');
    expect(formatPercent(null)).toBe('—');
  });

  it('writes a rating before and after, a side not yet set as a dash', () => {
    expect(formatRatingMove(2408, 2450)).toBe('2.408 → 2.450');
    expect(formatRatingMove(null, 1500)).toBe('— → 1.500');
    expect(formatRatingMove(null, null)).toBe('—');
  });

  it('writes milliseconds and durations', () => {
    expect(formatMs(430)).toBe('430 ms');
    expect(formatDuration(42_000)).toBe('42 sn');
    expect(formatDuration(252_000)).toBe('4 dk 12 sn');
    expect(formatDuration(300_000)).toBe('5 dk');
    expect(formatDuration(3_900_000)).toBe('1 sa 5 dk');
  });
});

describe('times on the game clock', () => {
  it('shows an instant in Istanbul time', () => {
    expect(formatTime('2026-09-25T21:30:00.000Z')).toBe('00:30');
    expect(formatDate('2026-09-25T21:30:00.000Z')).toBe('26 Eyl 2026');
    expect(formatDateTime('2026-09-25T11:05:00.000Z')).toBe('25 Eyl 2026 14:05');
    expect(formatDate(null)).toBe('—');
  });

  it('keys a day the way the daily boards do: Istanbul midnight turns it', () => {
    expect(dayKeyOf(new Date('2026-09-25T20:59:59.999Z'))).toBe('2026-09-25');
    expect(dayKeyOf(new Date('2026-09-25T21:00:00.000Z'))).toBe('2026-09-26');
  });

  it('says how long ago, in words', () => {
    const now = new Date('2026-09-25T12:00:00.000Z');
    expect(formatRelative('2026-09-25T11:59:30.000Z', now)).toBe('az önce');
    expect(formatRelative('2026-09-25T11:48:00.000Z', now)).toBe('12 dk önce');
    expect(formatRelative('2026-09-25T09:00:00.000Z', now)).toBe('3 sa önce');
    expect(formatRelative('2026-09-24T11:05:00.000Z', now)).toBe('dün 14:05');
    expect(formatRelative('2026-09-21T11:05:00.000Z', now)).toBe('4 gün önce');
    expect(formatRelative('2026-08-01T11:05:00.000Z', now)).toBe('1 Ağu 2026');
  });
});

describe('period keys', () => {
  it('reads each board\'s key', () => {
    expect(formatDayKey('2026-09-25')).toBe('25 Eyl Cum');
    expect(formatChallenge(1234)).toBe('#1.234');
    expect(formatChallenge(null)).toBe('—');
    expect(formatChallengeDay({ key: '2026-09-25', number: 2 })).toBe('#2 · 25 Eyl Cum');
    expect(formatChallengeDay({ key: '2026-09-23', number: null })).toBe('23 Eyl Çar');
    expect(formatWeekKey('2026-W39')).toBe('21 Eyl – 27 Eyl');
    expect(formatWeekKey('2026-W01')).toBe('29 Ara – 4 Oca');
    expect(formatMonthKey('2026-09')).toBe('Eylül 2026');
    expect(formatPeriodKey('all', 'all')).toBe('Tüm zamanlar');
    expect(formatPeriodKey('challenge', '2026-09-25')).toBe('25 Eyl Cum');
  });
});

describe('names', () => {
  it('writes a player by their handle, or says they have none', () => {
    expect(playerName('kerem.35')).toBe('@kerem.35');
    expect(playerName(null)).toBe('Adsız oyuncu');
  });

  it('shortens a run id to what people read', () => {
    expect(shortId('01jrun000000000000000000ab')).toBe('000000AB');
  });

  it('has words for every anti-cheat signal', () => {
    for (const flag of Object.values(RUN_FLAG)) {
      expect(flag.label).not.toBe('');
      expect(flag.hint).not.toBe('');
    }
  });
});

describe('runs', () => {
  it('says what every status means for the boards, never in the action magenta', () => {
    for (const status of Object.values(RUN_STATUS)) {
      expect(status.label).not.toBe('');
      expect(status.hint).not.toBe('');
      expect(status.tone).not.toBe('primary');
    }
  });

  it('calls a clean VS run played, in green, and says it counts nowhere', () => {
    expect(RUN_MODE.vs).toBe('VS');
    expect(RUN_STATUS.played).toMatchObject({ label: 'Oynandı', tone: 'ok' });
    expect(RUN_STATUS.played.hint).toMatch(/VS turu.*hiçbir tabloya, lige ya da istatistiğe sayılmaz/);
  });
});

describe('reports', () => {
  it('names what is reported and what became of it', () => {
    expect(REPORT_REASON).toEqual({ photo: 'Fotoğraf', name: 'Kullanıcı adı' });
    expect(Object.values(REPORT_STATUS).map((status) => status.label)).toEqual(['Açık', 'Giderildi', 'Kapatıldı']);
    expect(REPORT_STATUS.open.tone).toBe('warn');
  });

  it('has words for what a moderator did about a photo and the reports', () => {
    expect(AUDIT_ACTION['player.avatar_remove']).toEqual({ tone: 'warn', label: 'Fotoğrafı kaldırdı' });
    expect(AUDIT_ACTION['player.reports_dismiss']).toEqual({ tone: 'neutral', label: 'Bildirimleri kapattı' });
  });
});

describe('verdicts', () => {
  it('colours a hit and a perfect green, a miss red, and none of them in the action magenta', () => {
    expect(VERDICT.hit.tone).toBe('ok');
    expect(VERDICT.perfect.tone).toBe('ok');
    expect([VERDICT.timeout.tone, VERDICT.wrong.tone, VERDICT.caught.tone]).toEqual(['bad', 'bad', 'bad']);
    for (const { tone } of Object.values(VERDICT)) expect(tone).not.toBe('primary');
  });

  it('never gives a perfect the tone of a failure', () => {
    const failures = Object.entries(VERDICT).filter(([verdict]) => verdict !== 'hit' && verdict !== 'perfect');
    expect(failures).toHaveLength(6);
    for (const [, { tone }] of failures) expect(tone).not.toBe(VERDICT.perfect.tone);
  });
});

describe('ratings', () => {
  it('names six leagues, MasterClass on top', () => {
    expect(LEAGUE_TIERS).toEqual(['master', 'diamond', 'platinum', 'gold', 'silver', 'bronze']);
    expect(LEAGUE_TIER.master).toBe('MasterClass');
    expect(LEAGUE_TIERS.map((tier) => LEAGUE_TIER[tier])).toEqual(['MasterClass', 'Elmas', 'Platin', 'Altın', 'Gümüş', 'Bronz']);
  });

  it('says a player is in a league once their placement games are played, in the funnel and in their firsts', () => {
    expect(FUNNEL_STEP.league).toEqual({ label: 'Yerleşti', hint: 'Yerleşme oyunlarını bitirip bir lige girdi' });
    expect(MILESTONE.league).toBe('Yerleşti');
  });

  it('says why a rating moved, never in the action magenta', () => {
    expect(Object.fromEntries(Object.entries(RATING_KIND).map(([kind, { label }]) => [kind, label]))).toEqual({
      placement: 'Yerleşme',
      run: 'Tur',
      forfeit: 'Hükmen',
      void: 'Sayılmadı',
      reversal: 'Geri alındı',
    });
    for (const kind of Object.values(RATING_KIND)) {
      expect(kind.hint).not.toBe('');
      expect(kind.tone).not.toBe('primary');
    }
    expect(RATING_KIND.forfeit.tone).toBe('bad');
    expect(RATING_KIND.reversal.tone).toBe('warn');
  });
});
