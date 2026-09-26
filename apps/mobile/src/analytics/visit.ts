import { ANALYTICS, sha256Hex } from '@quezby/config';
import type { AnalyticsCode, AnalyticsEvent, AnalyticsScreen, AnalyticsVisit } from '@quezby/types';

/**
 * One visit being recorded: a stretch of the app in the foreground, summed
 * up on the phone — never a request per tap. Kept in AsyncStorage while it
 * lasts, so a visit the app never got to close is still sent next time.
 */
export type OpenVisit = {
  id: string;
  /** Whose token was in use: `ownerOf(token)`; null before there is an account. */
  owner: string | null;
  startedAt: number;
  /** When the current stretch in the foreground began; null while paused. */
  activeSince: number | null;
  /** Foreground milliseconds of the stretches before it. */
  activeMs: number;
  appVersion: string;
  journey: Array<[AnalyticsCode, number]>;
  counts: Partial<Record<AnalyticsCode, number>>;
  /** The screen on show, so seeing it again adds no step. */
  screen: AnalyticsScreen | null;
  /** The last moment anything happened — where a visit the app never closed ends. */
  touchedAt: number;
};

/** A finished visit, waiting to be sent. */
export type ClosedVisit = { owner: string | null; endedAt: number; visit: AnalyticsVisit };

/** 32 random lower-case hex characters: a visit sent twice is kept once by the API. */
export function newVisitId(): string {
  return Array.from({ length: 4 }, () =>
    Math.floor(Math.random() * 0x100000000)
      .toString(16)
      .padStart(8, '0'),
  ).join('');
}

/** A token's short fingerprint — enough to tell accounts apart, never the token. */
export function ownerOf(token: string | null): string | null {
  return token ? sha256Hex(token).slice(0, 16) : null;
}

export function openVisit(now: number, owner: string | null, appVersion: string, id = newVisitId()): OpenVisit {
  return {
    id,
    owner,
    startedAt: now,
    activeSince: now,
    activeMs: 0,
    appVersion,
    journey: [],
    counts: {},
    screen: null,
    touchedAt: now,
  };
}

/** A screen came up: a step unless it is the one on show, and one more view. */
export function seeScreen(visit: OpenVisit, screen: AnalyticsScreen, now: number): OpenVisit {
  if (visit.screen === screen) return visit;
  return { ...step(visit, screen, now), screen };
}

/** A moment worth counting happened: a step, and one more of it. */
export function noteEvent(visit: OpenVisit, event: AnalyticsEvent, now: number): OpenVisit {
  return step(visit, event, now);
}

export function pauseVisit(visit: OpenVisit, now: number): OpenVisit {
  if (visit.activeSince === null) return visit;
  return {
    ...visit,
    activeSince: null,
    activeMs: visit.activeMs + Math.max(0, now - visit.activeSince),
    touchedAt: now,
  };
}

export function resumeVisit(visit: OpenVisit, now: number): OpenVisit {
  if (visit.activeSince !== null) return visit;
  return { ...visit, activeSince: now, touchedAt: now };
}

/** The visit as the API takes it; null when it was too short to count. */
export function closeVisit(visit: OpenVisit, now: number): ClosedVisit | null {
  const paused = pauseVisit(visit, Math.max(now, visit.startedAt));
  const seconds = Math.min(Math.round(paused.activeMs / 1000), ANALYTICS.maxVisitSeconds);
  if (seconds < 1) return null;
  return {
    owner: visit.owner,
    endedAt: paused.touchedAt,
    visit: {
      id: visit.id,
      startedAt: new Date(visit.startedAt).toISOString(),
      seconds,
      appVersion: visit.appVersion,
      journey: visit.journey,
      counts: visit.counts,
    },
  };
}

function step(visit: OpenVisit, code: AnalyticsCode, now: number): OpenVisit {
  const at = Math.max(0, Math.round((now - visit.startedAt) / 1000));
  const journey =
    visit.journey.length < ANALYTICS.journeySteps ? [...visit.journey, [code, at] as [AnalyticsCode, number]] : visit.journey;
  return {
    ...visit,
    journey,
    counts: { ...visit.counts, [code]: Math.min((visit.counts[code] ?? 0) + 1, ANALYTICS.maxCount) },
    touchedAt: now,
  };
}
