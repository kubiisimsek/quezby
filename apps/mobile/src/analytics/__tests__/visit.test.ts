import { ANALYTICS, sha256Hex } from '@quezby/config';

import {
  closeVisit,
  newVisitId,
  noteEvent,
  openVisit,
  ownerOf,
  pauseVisit,
  resumeVisit,
  seeScreen,
  type OpenVisit,
} from '@/analytics/visit';

const T0 = Date.parse('2026-09-26T09:00:00.000Z');
const at = (seconds: number) => T0 + seconds * 1000;

describe('a visit', () => {
  it('begins in the foreground, with nothing in it', () => {
    expect(openVisit(T0, 'owner', '1.0.0', 'a'.repeat(32))).toEqual({
      id: 'a'.repeat(32),
      owner: 'owner',
      startedAt: T0,
      activeSince: T0,
      activeMs: 0,
      appVersion: '1.0.0',
      journey: [],
      counts: {},
      screen: null,
      touchedAt: T0,
    });
  });

  it('names each new screen once, with the seconds since it began, and counts every moment', () => {
    let visit = openVisit(T0, null, '1.0.0');
    visit = seeScreen(visit, 'home', at(0));
    visit = seeScreen(visit, 'home', at(3));
    visit = seeScreen(visit, 'game', at(12));
    visit = noteEvent(visit, 'share_result', at(230));
    visit = noteEvent(visit, 'share_result', at(240));
    visit = seeScreen(visit, 'home', at(250));

    expect(visit.journey).toEqual([
      ['home', 0],
      ['game', 12],
      ['share_result', 230],
      ['share_result', 240],
      ['home', 250],
    ]);
    expect(visit.counts).toEqual({ home: 2, game: 1, share_result: 2 });
    expect(visit.touchedAt).toBe(at(250));
  });

  it('stops the journey at its limit, and keeps counting after it', () => {
    let visit = openVisit(T0, null, '1.0.0');
    for (let index = 0; index < ANALYTICS.journeySteps + 5; index += 1) {
      visit = noteEvent(visit, 'rival', at(index));
    }

    expect(visit.journey).toHaveLength(ANALYTICS.journeySteps);
    expect(visit.counts.rival).toBe(ANALYTICS.journeySteps + 5);
  });

  it('never counts past the most one code may', () => {
    let visit: OpenVisit = { ...openVisit(T0, null, '1.0.0'), counts: { rival: ANALYTICS.maxCount } };
    visit = noteEvent(visit, 'rival', at(1));

    expect(visit.counts.rival).toBe(ANALYTICS.maxCount);
  });

  it('counts only the time in the foreground', () => {
    let visit = openVisit(T0, null, '1.0.0');
    visit = pauseVisit(visit, at(60));
    visit = pauseVisit(visit, at(90));
    visit = resumeVisit(visit, at(600));
    visit = resumeVisit(visit, at(610));

    expect(closeVisit(visit, at(640))?.visit.seconds).toBe(100);
  });

  it('closes into what the API takes', () => {
    const visit = seeScreen(openVisit(T0, 'owner', '1.2.0', 'b'.repeat(32)), 'home', at(0));

    expect(closeVisit(visit, at(42))).toEqual({
      owner: 'owner',
      endedAt: at(42),
      visit: {
        id: 'b'.repeat(32),
        startedAt: '2026-09-26T09:00:00.000Z',
        seconds: 42,
        appVersion: '1.2.0',
        journey: [['home', 0]],
        counts: { home: 1 },
      },
    });
  });

  it('is too short to count under a second, and never longer than the API takes', () => {
    expect(closeVisit(openVisit(T0, null, '1.0.0'), T0 + 400)).toBeNull();
    expect(closeVisit(openVisit(T0, null, '1.0.0'), at(ANALYTICS.maxVisitSeconds + 500))?.visit.seconds).toBe(
      ANALYTICS.maxVisitSeconds,
    );
  });
});

describe('ids and owners', () => {
  it('mints 32 lower-case hex characters, new every time', () => {
    const one = newVisitId();
    expect(one).toMatch(/^[0-9a-f]{32}$/);
    expect(newVisitId()).not.toBe(one);
  });

  it('names an account by a fingerprint of its token, never the token', () => {
    expect(ownerOf('secret-token')).toBe(sha256Hex('secret-token').slice(0, 16));
    expect(ownerOf('secret-token')).not.toContain('secret');
    expect(ownerOf(null)).toBeNull();
  });
});
