import { describe, expect, it } from 'vitest';

import { median, playProfile, sameLengthSpread, type Played } from '../balance';
import { ELITE, PROFILES } from '../bot';
import { MAX_DIFFICULTY } from '../difficulty';

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

/**
 * Dereceli's difficulties (`difficulty.ts`), locked the same way: every
 * profile plays the difficulties its rating gives it (four per league), the
 * promise holds there, no step is easier than the one below, and the top
 * takes a real bite out of the best players' runs.
 */
const DIFFICULTY_RUNS = 240;
/**
 * The ±20 % promise is read off the runs within 10 % of the median length:
 * 600 runs leave about 130 of them, enough for a steady p10 and p90 (240
 * leave some 50, and the p90 wanders by a few per cent).
 */
const SPREAD_RUNS = 600;

/** The difficulties each profile's qb settles on (casual ~1100 … pro ~5500, elite past 6000). */
const BAND: Record<string, number[]> = {
  casual: [0, 1, 2],
  average: [4, 5, 6],
  good: [11, 12, 13],
  pro: [15, 16],
  elite: [16],
};

const STEPS = [0, 4, 8, 12, MAX_DIFFICULTY];
const scoreOf = (runs: Played[]) => median(runs.map((run) => run.summary.score));
const lengthOf = (runs: Played[]) => median(runs.map((run) => run.seconds));

describe('difficulty balance', () => {
  const profiles = [...PROFILES, ELITE];

  it.each(profiles.map((profile) => [profile.name, profile] as const))(
    'keeps same-length %s runs within ±20 %% at the difficulties it plays',
    (name, profile) => {
      for (const difficulty of BAND[name]!) {
        const spread = sameLengthSpread(playProfile(profile, SPREAD_RUNS, 1, difficulty), 0.1);
        expect(spread.low, `difficulty ${difficulty}`).toBeGreaterThanOrEqual(0.8);
        expect(spread.high, `difficulty ${difficulty}`).toBeLessThanOrEqual(1.2);
      }
    },
  );

  it.each(profiles.map((profile) => [profile.name, profile] as const))(
    'never makes a harder difficulty pay %s more or last longer',
    (_name, profile) => {
      const played = STEPS.map((difficulty) => playProfile(profile, DIFFICULTY_RUNS, 1, difficulty));
      for (let i = 1; i < played.length; i += 1) {
        expect(scoreOf(played[i]!)).toBeLessThan(scoreOf(played[i - 1]!));
        expect(lengthOf(played[i]!)).toBeLessThan(lengthOf(played[i - 1]!));
      }
    },
  );

  it('takes a fifth to a half off the best runs at the top: hard, never hopeless', () => {
    for (const profile of [PROFILES.at(-1)!, ELITE]) {
      const easy = playProfile(profile, DIFFICULTY_RUNS);
      const hard = playProfile(profile, DIFFICULTY_RUNS, 1, MAX_DIFFICULTY);
      expect(scoreOf(hard)).toBeLessThan(scoreOf(easy) * 0.8);
      expect(scoreOf(hard)).toBeGreaterThan(scoreOf(easy) * 0.5);
      expect(lengthOf(hard)).toBeLessThan(lengthOf(easy) - 90);
    }
  });
});
