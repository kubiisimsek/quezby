import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ANALYTICS,
  ANALYTICS_EVENTS,
  ANALYTICS_MILESTONES,
  ANALYTICS_SCREENS,
  isAnalyticsCode,
  isAnalyticsEvent,
  isAnalyticsScreen,
} from '../analytics';
import { buildAnalytics } from '../fixtures';

describe('analytics catalog', () => {
  it('names every screen and moment once, and never the same code twice', () => {
    const codes = [...ANALYTICS_SCREENS, ...ANALYTICS_EVENTS];
    expect(new Set(codes).size).toBe(codes.length);
    expect(ANALYTICS_SCREENS).toHaveLength(13);
    expect(ANALYTICS_EVENTS).toHaveLength(13);
  });

  it('keeps codes short, lower-case and safe as a total bucket', () => {
    for (const code of [...ANALYTICS_SCREENS, ...ANALYTICS_EVENTS]) {
      expect(code).toMatch(/^[a-z_]{1,24}$/);
    }
  });

  it('only counts events as milestones', () => {
    for (const milestone of ANALYTICS_MILESTONES) {
      expect(isAnalyticsEvent(milestone)).toBe(true);
    }
  });

  it('tells its own codes from anything else', () => {
    expect(isAnalyticsScreen('leaderboard')).toBe(true);
    expect(isAnalyticsScreen('share_result')).toBe(false);
    expect(isAnalyticsEvent('share_result')).toBe(true);
    expect(isAnalyticsCode('daily')).toBe(true);
    expect(isAnalyticsCode('toString')).toBe(false);
    expect(isAnalyticsCode('Home')).toBe(false);
    expect(isAnalyticsCode('')).toBe(false);
  });

  it('holds a phone to a few requests and small rows', () => {
    expect(ANALYTICS.visitsPerBatch).toBeLessThanOrEqual(ANALYTICS.outbox);
    expect(ANALYTICS.journeySteps).toBe(40);
    expect(ANALYTICS.maxAgeDays * 86_400_000).toBeGreaterThan(ANALYTICS.pauseMs);
  });
});

describe('fixtures', () => {
  it('are up to date with the code (run `pnpm --filter @quezby/config fixtures`)', () => {
    const committed: unknown = JSON.parse(
      readFileSync(join(__dirname, '..', '..', 'fixtures', 'analytics.json'), 'utf8'),
    );
    expect(committed).toEqual(JSON.parse(JSON.stringify(buildAnalytics())));
  });
});
