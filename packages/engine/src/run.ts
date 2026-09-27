import { ReelStream, type Reel } from './reels';
import {
  ENGINE_VERSION,
  RULES,
  bonusFor,
  comboAfterHit,
  comboAfterMiss,
  levelBoostFor,
  type BonusKind,
  type ReelKind,
} from './rules';

/**
 * What the player did on one reel. The app records it, the API replays it.
 *
 *   0 none   — the reel's window ran out untouched
 *   1 up     — swiped up
 *   2 like   — double-tapped
 *   3 hold   — pressed, then let go
 *   4 touch  — touched a freeze reel at all
 */
export const GESTURE = { none: 0, up: 1, like: 2, hold: 3, touch: 4 } as const;
export type Gesture = (typeof GESTURE)[keyof typeof GESTURE];

/**
 * `[gesture, t, d]`: `t` is when the gesture was recognised, in ms since the
 * reel went live on its first drawn frame — a swipe as it passes its
 * threshold, a like's second tap, a hold's press, a freeze reel's first
 * touch; `d` is how long a hold lasted. Both are 0 for `none`, and `d` is 0
 * for everything but `hold`.
 */
export type Action = readonly [gesture: Gesture, t: number, d: number];

export type Verdict =
  | 'hit'
  | 'perfect'
  | 'timeout'
  | 'wrong'
  | 'holdEarly'
  | 'holdLate'
  | 'caught'
  | 'drained';

export type EndReason = 'drained' | 'penalty' | 'quit';

/** A named combo a hit set off, and what it paid on top of the reel. */
export type BonusHit = { kind: BonusKind; points: number };

export type Step = {
  reel: Reel;
  verdict: Verdict;
  /** What the reel itself paid. Named combos are in `bonuses`. */
  points: number;
  /** The combo the points were earned at, per-mille. 0 on a miss. */
  combo: number;
  bonuses: readonly BonusHit[];
  meter: number;
  over: boolean;
};

export type BonusCounts = Record<BonusKind, number>;

export type RunSummary = {
  engineVersion: number;
  seed: number;
  score: number;
  reels: number;
  hits: number;
  misses: number;
  perfects: number;
  maxStreak: number;
  level: number;
  /** Hits per thousand reels. */
  accuracy: number;
  /** Mean decision time on skip and like hits. */
  avgReactionMs: number;
  /** Time spent on reels, transitions excluded. */
  activeMs: number;
  endedBy: EndReason;
  /** The highest combo reached, per-mille. */
  maxCombo: number;
  /** The part of `score` the named combos paid. */
  bonusPoints: number;
  /** How often each named combo went off. */
  bonuses: BonusCounts;
};

export class EngineError extends Error {
  constructor(
    readonly code:
      | 'malformed_action'
      | 'gesture_not_allowed'
      | 'late_action'
      | 'run_over',
    readonly reelIndex: number,
  ) {
    super(`${code} at reel ${reelIndex}`);
    this.name = 'EngineError';
  }
}

const MAX_MS = 60_000;
const NO_BONUSES: readonly BonusHit[] = [];

function isWholeMs(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_MS
  );
}

function allowedOn(kind: ReelKind, gesture: Gesture): boolean {
  if (gesture === GESTURE.none) return true;
  if (kind === 'freeze') return gesture === GESTURE.touch;
  return gesture !== GESTURE.touch;
}

/**
 * One run, one reel at a time. The app drives it live; the API feeds it a
 * finished run's actions and must land on the same summary.
 */
export class Run {
  readonly seed: number;
  private readonly stream: ReelStream;
  private reel: Reel;
  private meterValue: number = RULES.meterMax;
  private score = 0;
  private reels = 0;
  private hits = 0;
  private misses = 0;
  private perfects = 0;
  private streak = 0;
  private maxStreak = 0;
  private reactionSum = 0;
  private reactionCount = 0;
  private activeMs = 0;
  private ended: EndReason | null = null;
  private combo: number = RULES.comboStart;
  private maxCombo: number = RULES.comboStart;
  /** No miss yet on the level the current reel belongs to. */
  private levelClean = true;
  /** Fast skip and like hits in a row, towards the next lightning. */
  private lightningRun = 0;
  /** The kind of the previous reel when it was a hit. */
  private previousHit: ReelKind | null = null;
  /** The meter ended a reel below `comebackLow` and has not climbed back yet. */
  private lowMeter = false;
  private bonusPoints = 0;
  private readonly bonusCounts: BonusCounts = {
    flawless: 0,
    lightning: 0,
    coolHead: 0,
    comeback: 0,
  };

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.stream = new ReelStream(this.seed);
    this.reel = this.stream.next();
  }

  get current(): Reel {
    return this.reel;
  }

  get meter(): number {
    return this.meterValue;
  }

  get points(): number {
    return this.score;
  }

  get currentStreak(): number {
    return this.streak;
  }

  /** The combo the next hit builds on, per-mille. */
  get currentCombo(): number {
    return this.combo;
  }

  get over(): boolean {
    return this.ended !== null;
  }

  /** Milliseconds of this reel the meter can still pay for. */
  msUntilEmpty(): number {
    return Math.ceil((this.meterValue * 1000) / this.reel.drain);
  }

  /**
   * The hold that has gone on this long has left the zone behind: letting go
   * now can only be late. The app ends a hold here rather than waiting.
   */
  holdFailAfter(): number {
    const { holdFill, zoneCenter, zoneHalf } = this.reel;
    return Math.ceil(((zoneCenter + zoneHalf + 1) * holdFill) / 1000);
  }

  apply(action: Action): Step {
    const reel = this.reel;
    if (this.ended) throw new EngineError('run_over', reel.index);

    if (!Array.isArray(action) || action.length !== 3) {
      throw new EngineError('malformed_action', reel.index);
    }
    const [gesture, t, d] = action;
    if (
      ![0, 1, 2, 3, 4].includes(gesture) ||
      !isWholeMs(t) ||
      !isWholeMs(d) ||
      (gesture !== GESTURE.hold && d !== 0) ||
      (gesture === GESTURE.none && t !== 0)
    ) {
      throw new EngineError('malformed_action', reel.index);
    }
    if (!allowedOn(reel.kind, gesture)) {
      throw new EngineError('gesture_not_allowed', reel.index);
    }
    if (gesture !== GESTURE.none && t >= reel.window) {
      throw new EngineError('late_action', reel.index);
    }

    const active =
      gesture === GESTURE.none
        ? reel.window
        : gesture === GESTURE.hold
          ? t + d
          : t;

    const untilEmpty = this.msUntilEmpty();
    if (active >= untilEmpty) {
      this.activeMs += untilEmpty;
      this.meterValue = 0;
      this.ended = 'drained';
      return this.step(reel, 'drained', 0, 0, NO_BONUSES);
    }

    this.activeMs += active;
    this.meterValue -= Math.floor((reel.drain * active) / 1000);

    const verdict = judge(reel, gesture, d);
    if (verdict === 'hit' || verdict === 'perfect') {
      return this.hit(reel, verdict, gesture, t, d);
    }
    return this.miss(reel, verdict);
  }

  /** The player left: whatever was on screen is not judged. */
  quit(): void {
    if (!this.ended) this.ended = 'quit';
  }

  summary(): RunSummary {
    return {
      engineVersion: ENGINE_VERSION,
      seed: this.seed,
      score: this.score,
      reels: this.reels,
      hits: this.hits,
      misses: this.misses,
      perfects: this.perfects,
      maxStreak: this.maxStreak,
      level: this.reels === 0 ? 1 : 1 + Math.floor((this.reels - 1) / RULES.levelEvery),
      accuracy:
        this.reels === 0 ? 0 : Math.floor((this.hits * 1000) / this.reels),
      avgReactionMs:
        this.reactionCount === 0
          ? 0
          : Math.floor(this.reactionSum / this.reactionCount),
      activeMs: this.activeMs,
      endedBy: this.ended ?? 'quit',
      maxCombo: this.maxCombo,
      bonusPoints: this.bonusPoints,
      bonuses: {
        flawless: this.bonusCounts.flawless,
        lightning: this.bonusCounts.lightning,
        coolHead: this.bonusCounts.coolHead,
        comeback: this.bonusCounts.comeback,
      },
    };
  }

  private hit(
    reel: Reel,
    verdict: 'hit' | 'perfect',
    gesture: Gesture,
    t: number,
    d: number,
  ): Step {
    this.streak += 1;
    this.maxStreak = Math.max(this.maxStreak, this.streak);
    this.hits += 1;
    if (verdict === 'perfect') this.perfects += 1;

    this.combo = comboAfterHit(this.combo);
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const base = RULES.base[reel.kind];
    let bonus = 0;
    if (gesture === GESTURE.up || gesture === GESTURE.like) {
      const floor = RULES.speedFloor;
      const clamped = Math.min(Math.max(t, floor), reel.window);
      bonus = Math.floor((base * (reel.window - clamped)) / (reel.window - floor));
      this.reactionSum += t;
      this.reactionCount += 1;
    } else if (gesture === GESTURE.hold) {
      bonus = Math.floor((RULES.precisionBonus * precisionOf(reel, d)) / 1000);
    }

    const points = Math.floor(
      ((base + bonus) * levelBoostFor(reel.index) * this.combo) / 1_000_000,
    );
    this.score += points;
    this.meterValue = Math.min(
      RULES.meterMax,
      this.meterValue +
        RULES.gain[reel.kind] +
        (verdict === 'perfect' ? RULES.perfectGain : 0),
    );
    const bonuses = this.namedCombos(reel, t);
    this.previousHit = reel.kind;
    if (this.meterValue < RULES.comebackLow) this.lowMeter = true;
    return this.advance(reel, verdict, points, this.combo, bonuses);
  }

  /** The named combos this hit sets off, in the order they are checked. */
  private namedCombos(reel: Reel, t: number): readonly BonusHit[] {
    const bonuses: BonusHit[] = [];
    const award = (kind: BonusKind) => {
      const points = bonusFor(kind, reel.index);
      this.bonusCounts[kind] += 1;
      this.bonusPoints += points;
      this.score += points;
      bonuses.push({ kind, points });
    };

    if (this.levelClean && reel.index % RULES.levelEvery === RULES.levelEvery - 1) {
      award('flawless');
    }
    if (reel.kind === 'skip' || reel.kind === 'like') {
      if (t <= RULES.lightningMs[reel.kind]) {
        this.lightningRun += 1;
        if (this.lightningRun === RULES.lightningRun) {
          award('lightning');
          this.lightningRun = 0;
        }
      } else {
        this.lightningRun = 0;
      }
    }
    if (reel.kind === 'freeze' && (this.previousHit === 'like' || this.previousHit === 'hold')) {
      award('coolHead');
    }
    if (this.lowMeter && this.meterValue >= RULES.comebackHigh) {
      award('comeback');
      this.lowMeter = false;
    }
    return bonuses.length === 0 ? NO_BONUSES : bonuses;
  }

  private miss(reel: Reel, verdict: Verdict): Step {
    this.streak = 0;
    this.misses += 1;
    this.combo = comboAfterMiss(this.combo);
    this.levelClean = false;
    this.lightningRun = 0;
    this.previousHit = null;
    const loss =
      verdict === 'timeout'
        ? RULES.loss.timeout
        : verdict === 'caught'
          ? RULES.loss.caught
          : verdict === 'holdEarly' || verdict === 'holdLate'
            ? RULES.loss.holdMiss
            : RULES.loss.wrong;
    this.meterValue -= loss;
    if (this.meterValue <= 0) {
      this.meterValue = 0;
      this.ended = 'penalty';
    }
    if (this.meterValue < RULES.comebackLow) this.lowMeter = true;
    return this.advance(reel, verdict, 0, 0, NO_BONUSES);
  }

  private advance(
    reel: Reel,
    verdict: Verdict,
    points: number,
    combo: number,
    bonuses: readonly BonusHit[],
  ): Step {
    this.reels += 1;
    if (!this.ended) {
      this.reel = this.stream.next();
      if (this.reel.index % RULES.levelEvery === 0) this.levelClean = true;
    }
    return this.step(reel, verdict, points, combo, bonuses);
  }

  private step(
    reel: Reel,
    verdict: Verdict,
    points: number,
    combo: number,
    bonuses: readonly BonusHit[],
  ): Step {
    return {
      reel,
      verdict,
      points,
      combo,
      bonuses,
      meter: this.meterValue,
      over: this.ended !== null,
    };
  }
}

/** How close to the zone's centre a hold of `d` ms let go, per-mille. */
export function precisionOf(reel: Reel, d: number): number {
  const fill = Math.floor((d * 1000) / reel.holdFill);
  const off = Math.abs(fill - reel.zoneCenter);
  return Math.max(0, 1000 - Math.floor((off * 1000) / reel.zoneHalf));
}

function judge(reel: Reel, gesture: Gesture, d: number): Verdict {
  if (reel.kind === 'freeze') {
    return gesture === GESTURE.none ? 'hit' : 'caught';
  }
  if (gesture === GESTURE.none) return 'timeout';
  if (reel.kind === 'skip') return gesture === GESTURE.up ? 'hit' : 'wrong';
  if (reel.kind === 'like') return gesture === GESTURE.like ? 'hit' : 'wrong';
  if (gesture !== GESTURE.hold) return 'wrong';

  const fill = Math.floor((d * 1000) / reel.holdFill);
  const off = fill - reel.zoneCenter;
  if (off < -reel.zoneHalf) return 'holdEarly';
  if (off > reel.zoneHalf) return 'holdLate';
  return precisionOf(reel, d) >= RULES.perfectPrecision ? 'perfect' : 'hit';
}

/**
 * A finished run, replayed from its seed. Throws `EngineError` on a log the
 * app could not have produced. A log that stops before the run ended is a run
 * the player quit.
 */
export function replay(seed: number, actions: readonly Action[]): RunSummary {
  const run = new Run(seed);
  for (const action of actions) {
    run.apply(action);
  }
  run.quit();
  return run.summary();
}
