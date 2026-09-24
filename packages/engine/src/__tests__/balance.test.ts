import { describe, expect, it } from 'vitest';

import { median, playProfile, sameLengthSpread } from '../balance';
import { PROFILES } from '../bot';

/**
 * The promise in `docs/product/scoring.md`, locked as a test: the same skill
 * over the same length lands within ±20 % — runs that lasted within 10 % of
 * the profile's median score between 0.8× and 1.2× their median (p10/p90) —
 * better players score more, and runs last as long as the owner asked.
 */
const RUNS = 400;

/** Median run length per profile, seconds (the transition between reels included). */
const LENGTH: Record<string, [number, number]> = {
  casual: [100, 145],
  average: [170, 240],
  good: [280, 370],
  pro: [400, 500],
};

const played = PROFILES.map((profile) => ({ profile, runs: playProfile(profile, RUNS) }));

describe('balance', () => {
  it.each(played.map(({ profile, runs }) => [profile.name, runs] as const))(
    'keeps same-length %s runs within ±20 %%',
    (_name, runs) => {
      const spread = sameLengthSpread(runs, 0.1);
      expect(spread.runs).toBeGreaterThan(RUNS / 10);
      expect(spread.low).toBeGreaterThanOrEqual(0.8);
      expect(spread.high).toBeLessThanOrEqual(1.2);
    },
  );

  it.each(played.map(({ profile, runs }) => [profile.name, runs] as const))(
    'lets %s runs last as long as the targets say',
    (name, runs) => {
      const [shortest, longest] = LENGTH[name]!;
      const seconds = median(runs.map((run) => run.seconds));
      expect(seconds).toBeGreaterThanOrEqual(shortest);
      expect(seconds).toBeLessThanOrEqual(longest);
    },
  );

  it('pays better players more', () => {
    const medians = played.map(({ runs }) => median(runs.map((run) => run.summary.score)));
    for (let i = 1; i < medians.length; i += 1) {
      expect(medians[i]!).toBeGreaterThan(medians[i - 1]! * 1.5);
    }
  });
});
