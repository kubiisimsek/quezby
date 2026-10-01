import { Rng } from './rng';
import {
  RULES,
  capsFor,
  drainFor,
  holdFillFor,
  levelFor,
  specialShareFor,
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
 * before it, and the PHP replay cannot drift out of step. It is the same
 * feed at every Dereceli difficulty: difficulty only tightens the meter
 * (`difficulty.ts`), never what comes on screen. Its caps go by the reel,
 * never the score, so everyone on a seed sees the same reels.
 */
export class ReelStream {
  private readonly rng: Rng;
  private index = 0;
  private previous: ReelKind | null = null;
  private specialRun = 0;
  /** The kinds of the last `capWindow − 1` reels, oldest first. */
  private readonly recent: ReelKind[] = [];

  constructor(seed: number) {
    this.rng = new Rng(seed);
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
      special >= specialShareFor(n) ||
      this.specialRun >= RULES.maxSpecialRun
    ) {
      kind = 'skip';
    } else if (pick < RULES.weightLike) {
      kind = 'like';
    } else {
      kind = pick < RULES.weightLike + RULES.weightHold ? 'hold' : 'freeze';
      if (!this.allows(kind, n)) kind = 'skip';
    }

    this.specialRun = kind === 'skip' ? 0 : this.specialRun + 1;
    this.previous = kind;
    this.recent.push(kind);
    if (this.recent.length >= RULES.capWindow) this.recent.shift();
    this.index += 1;

    const isHold = kind === 'hold';
    return {
      index: n,
      kind,
      window: windowFor(kind, n),
      holdFill: isHold ? holdFillFor(n) : 0,
      zoneCenter: isHold ? RULES.zoneCenterMin + center : 0,
      zoneHalf: isHold ? Math.floor(zoneWidthFor(n) / 2) : 0,
      drain: drainFor(n),
      level: levelFor(n),
    };
  }

  /** Whether a hold or a freeze may come on reel `n`: never a freeze after a freeze, never past its cap. */
  private allows(kind: 'hold' | 'freeze', n: number): boolean {
    if (kind === 'freeze' && this.previous === 'freeze') return false;
    let seen = 0;
    for (const recent of this.recent) if (recent === kind) seen += 1;
    return seen < capsFor(n)[kind];
  }
}
