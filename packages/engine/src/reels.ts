import { difficultyRules, drainAt, likeWeightAt, specialShareAt } from './difficulty';
import { Rng } from './rng';
import {
  RULES,
  holdFillFor,
  levelFor,
  windowFor,
  zoneWidthFor,
  type ReelKind,
} from './rules';

/** One reel as the rules see it. What it looks like is the app's business. */
export type Reel = {
  index: number;
  kind: ReelKind;
  /** Milliseconds to act — or, for a freeze reel, to keep your hands off. */
  window: number;
  /** Milliseconds for the hold bar to fill. Zero on every other kind. */
  holdFill: number;
  /** Centre of the green zone, per-mille of the bar. */
  zoneCenter: number;
  /** Half the zone's width, per-mille of the bar. */
  zoneHalf: number;
  /** Meter lost per second while this reel is up. */
  drain: number;
  level: number;
};

/**
 * The feed. Every reel costs exactly three draws — whether they are used or
 * not — so reel `n` always reads the same bits of the seed, whatever came
 * before it, and the PHP replay cannot drift out of step. A Dereceli
 * `difficulty` (`difficulty.ts`) only moves the thresholds the draws are
 * held against, and the drain; 0 is the feed of every other run.
 */
export class ReelStream {
  private readonly rng: Rng;
  private readonly difficulty: number;
  private readonly likeWeight: number;
  private index = 0;
  private previous: ReelKind | null = null;
  private specialRun = 0;

  constructor(seed: number, difficulty = 0) {
    difficultyRules(difficulty);
    this.rng = new Rng(seed);
    this.difficulty = difficulty;
    this.likeWeight = likeWeightAt(difficulty);
  }

  next(): Reel {
    const n = this.index;
    const special = this.rng.int(1000);
    const pick = this.rng.int(100);
    const center = this.rng.int(RULES.zoneCenterSpan);

    let kind: ReelKind;
    const intro = RULES.intro[n];
    if (intro !== undefined) {
      kind = intro;
    } else if (
      special >= specialShareAt(n, this.difficulty) ||
      this.specialRun >= RULES.maxSpecialRun
    ) {
      kind = 'skip';
    } else if (pick < this.likeWeight) {
      kind = 'like';
    } else if (pick < this.likeWeight + RULES.weightHold) {
      kind = 'hold';
    } else {
      kind = this.previous === 'freeze' ? 'like' : 'freeze';
    }

    this.specialRun = kind === 'skip' ? 0 : this.specialRun + 1;
    this.previous = kind;
    this.index += 1;

    const isHold = kind === 'hold';
    return {
      index: n,
      kind,
      window: windowFor(kind, n),
      holdFill: isHold ? holdFillFor(n) : 0,
      zoneCenter: isHold ? RULES.zoneCenterMin + center : 0,
      zoneHalf: isHold ? Math.floor(zoneWidthFor(n) / 2) : 0,
      drain: drainAt(n, this.difficulty),
      level: levelFor(n),
    };
  }
}
