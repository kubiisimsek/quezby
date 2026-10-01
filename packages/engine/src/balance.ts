import { Bot, ErrorBot, type SkillProfile, type Thumb } from './bot';
import { Run, type Action, type RunSummary, type Step } from './run';

/**
 * The measurements behind the balance promise in `docs/product/scoring.md`,
 * shared by `pnpm engine:simulate` and `balance.test.ts`. Tooling only — the
 * floats here never reach a score. Not shipped in the app.
 */

/**
 * The app's pace, so a run's length is what the player sees on the clock:
 * the countdown, how long a verdict stays up, the slide to the next reel and
 * the frame it goes live on. A copy of `@quezby/config`'s PACE, checked
 * against `packages/config/fixtures/pace.json` by `balance.test.ts`.
 */
export const APP_PACE = {
  countdownMs: 1800,
  slideMs: 140,
  exitMs: { skipHit: 0, hit: 100, miss: 200 },
  frameMs: 16,
} as const;

/** What a reel costs on the clock after its verdict, unless it ended the run. */
export function afterMs(step: Step): number {
  if (step.over) return 0;
  const hit = step.verdict === 'hit' || step.verdict === 'perfect';
  const exit = !hit
    ? APP_PACE.exitMs.miss
    : step.reel.kind === 'skip'
      ? APP_PACE.exitMs.skipHit
      : APP_PACE.exitMs.hit;
  return exit + APP_PACE.slideMs + APP_PACE.frameMs;
}

export type Played = { summary: RunSummary; seconds: number };

/** Plays one run to its end (or 5000 reels) with `decide`, on the app's clock. */
function played(run: Run, decide: (run: Run) => Action): Played {
  let between = 0;
  for (let reels = 0; !run.over && reels < 5000; reels += 1) {
    between += afterMs(run.apply(decide(run)));
  }
  const summary = run.summary();
  return { summary, seconds: (APP_PACE.countdownMs + summary.activeMs + between) / 1000 };
}

/**
 * `runs` runs of one profile on seeds `i · 7919`, bot seed `i`, as the
 * simulator plays them — at a Dereceli `difficulty` when one is given.
 */
export function playProfile(profile: SkillProfile, runs: number, firstSeed = 1, difficulty = 0): Played[] {
  const all: Played[] = [];
  for (let i = firstSeed; i < firstSeed + runs; i += 1) {
    const bot = new Bot(profile, i);
    all.push(played(new Run(i * 7919, difficulty), (run) => bot.decide(run)));
  }
  return all;
}

/** `runs` runs of a thumb that errs on a share `err` of the reels (`ErrorBot`), seeds as `playProfile`. */
export function playThumb(thumb: Thumb, err: number, runs: number, firstSeed = 1): Played[] {
  const all: Played[] = [];
  for (let i = firstSeed; i < firstSeed + runs; i += 1) {
    const bot = new ErrorBot(thumb, err, i);
    all.push(played(new Run(i * 7919), (run) => bot.decide(run)));
  }
  return all;
}

const ascending = (values: number[]) => [...values].sort((a, b) => a - b);

export function percentile(sorted: readonly number[], p: number): number {
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[index] ?? 0;
}

export function median(values: number[]): number {
  return percentile(ascending(values), 0.5);
}

export type Spread = {
  /** How many runs fell inside the window. */
  runs: number;
  /** p10 / p50 of their scores. */
  low: number;
  /** p90 / p50 of their scores. */
  high: number;
};

/**
 * The consistency promise: among runs that lasted about as long — within
 * `share` of the profile's median length — how far do scores stray from
 * their median? The rule is `low ≥ 0.8` and `high ≤ 1.2` at `share = 0.1`.
 */
export function sameLengthSpread(played: readonly Played[], share: number): Spread {
  const centre = median(played.map((run) => run.seconds));
  const scores = ascending(
    played
      .filter((run) => Math.abs(run.seconds - centre) <= centre * share)
      .map((run) => run.summary.score),
  );
  const middle = percentile(scores, 0.5);
  return {
    runs: scores.length,
    low: middle === 0 ? 0 : percentile(scores, 0.1) / middle,
    high: middle === 0 ? 0 : percentile(scores, 0.9) / middle,
  };
}

/** How score grows with length: the least-squares slope of ln(score) on ln(seconds). */
export function elasticity(played: readonly Played[]): number {
  const points = played
    .filter((run) => run.summary.score > 0 && run.seconds > 0)
    .map((run) => [Math.log(run.seconds), Math.log(run.summary.score)] as const);
  const n = points.length;
  const meanX = points.reduce((sum, [x]) => sum + x, 0) / n;
  const meanY = points.reduce((sum, [, y]) => sum + y, 0) / n;
  let covariance = 0;
  let variance = 0;
  for (const [x, y] of points) {
    covariance += (x - meanX) * (y - meanY);
    variance += (x - meanX) ** 2;
  }
  return variance === 0 ? 0 : covariance / variance;
}

/** The share of all points that came from named combos. */
export function bonusShare(played: readonly Played[]): number {
  const total = played.reduce((sum, run) => sum + run.summary.score, 0);
  const bonus = played.reduce((sum, run) => sum + run.summary.bonusPoints, 0);
  return total === 0 ? 0 : bonus / total;
}
