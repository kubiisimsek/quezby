/**
 * The app's pace between reels — how long a real run must at least take on
 * the wall clock. `useGame` times the feed with it; the API's `RunVerifier`
 * keeps a copy (`config/quezby.php` › `plausibility.pace`) that is tested
 * against `fixtures/pace.json`. Timers only ever fire late, so this is a
 * lower bound: a log that claims to have been played faster was not.
 */
export const PACE = {
  /** The 3-2-1 before the first reel. */
  countdownStepMs: 600,
  countdownSteps: 3,
  /** The reel sliding away after its verdict. */
  slideMs: 140,
  /** How long a verdict stays on screen before the slide. */
  exitMs: { skipHit: 0, hit: 100, miss: 200 },
} as const;

export type PaceKind = 'skip' | 'like' | 'hold' | 'freeze';

/** The pause after a reel's verdict: none after a swiped ordinary reel, longer after a miss. */
export function exitDelayMs(hit: boolean, kind: PaceKind): number {
  if (!hit) return PACE.exitMs.miss;
  return kind === 'skip' ? PACE.exitMs.skipHit : PACE.exitMs.hit;
}

export function countdownMs(): number {
  return PACE.countdownStepMs * PACE.countdownSteps;
}
