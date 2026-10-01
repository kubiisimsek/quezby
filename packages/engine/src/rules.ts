/**
 * Every number that decides a run. `docs/product/scoring.md` explains each
 * one; `pnpm engine:simulate` shows what changing it does to real players.
 *
 * Integer arithmetic only — per-mille for ratios, milliseconds for time — so
 * the PHP replay (`apps/api/app/Game/Rules.php`) lands on the same score to
 * the point. The rules are locked (`rules.lock.json`): changing any value is
 * an `ENGINE_VERSION` bump, `pnpm engine:lock`, and a new leaderboard season.
 * Until the first store release the owner may keep the version and re-seal
 * it in place (`pnpm engine:lock -- --reseal`): staging has no season to keep.
 */
export const ENGINE_VERSION = 3;

export const REEL_KINDS = ['skip', 'like', 'hold', 'freeze'] as const;
export type ReelKind = (typeof REEL_KINDS)[number];

/** The named combos a hit can set off on top of its points. */
export const BONUS_KINDS = ['flawless', 'lightning', 'coolHead', 'comeback'] as const;
export type BonusKind = (typeof BONUS_KINDS)[number];

export const RULES = {
  /** A reel's window shrinks along `min + (max − min) · curve / (curve + n)`. */
  windowMax: 2200,
  windowMin: 600,
  curve: 70,
  /** A double tap costs a second touch, so a friend's post waits a little longer. */
  likeExtra: 250,
  /** How long a freeze reel must be left alone, as a share of the window. */
  freezePercent: 45,
  freezeMin: 400,
  /** How long the hold bar takes to fill, on the same curve as the window. */
  holdFillMax: 1200,
  holdFillMin: 600,
  /** The green zone's width in per-mille of the bar, on the same curve. */
  zoneMax: 200,
  zoneMin: 90,
  zoneCenterMin: 450,
  zoneCenterSpan: 401,
  /** Share of special reels in per-mille: `base + gain · n / (n + curve)`. */
  specialBase: 250,
  specialGain: 250,
  specialCurve: 150,
  /** Of every hundred special reels: like, hold, and the rest freeze. */
  weightLike: 40,
  weightHold: 30,
  /** Never more specials in a row than this — the autopilot needs its feed. */
  maxSpecialRun: 3,
  /**
   * The most holds and freezes any `capWindow` reels in a row may hold, by
   * the reel the run has reached: one each at first, a second freeze from
   * level 9, a second hold from level 17. A pick past its cap, or a freeze
   * right after a freeze, is an ordinary reel: the slow reels never crowd
   * together and the feed keeps its pace.
   */
  capWindow: 10,
  caps: [
    { fromReel: 0, hold: 1, freeze: 1 },
    { fromReel: 160, hold: 1, freeze: 2 },
    { fromReel: 320, hold: 2, freeze: 2 },
  ] as readonly { fromReel: number; hold: number; freeze: number }[],
  intro: [
    'skip',
    'skip',
    'like',
    'skip',
    'hold',
    'skip',
    'freeze',
    'skip',
  ] as readonly ReelKind[],

  /** The dopamine meter, per-mille. */
  meterMax: 1000,
  /**
   * Drain in per-mille per second: `base + n · num / den + n² / quad`. It
   * never stops growing, and by the sixth minute the best thumb cannot keep
   * up: the longest run is about six minutes.
   */
  drainBase: 60,
  drainNum: 1,
  drainDen: 6,
  drainQuad: 3000,
  gain: { skip: 80, like: 90, hold: 100, freeze: 90 } as Record<
    ReelKind,
    number
  >,
  perfectGain: 60,
  loss: { timeout: 250, wrong: 250, holdMiss: 150, caught: 300 },
  /**
   * A blind move: a swipe or a double tap on the wrong post, made sooner than
   * this — too soon to have looked. The first costs the plain loss; each one
   * after it doubles (x2, x4…) until a considered hit, so the third in a row
   * always empties the meter.
   */
  blindMs: 300,

  /** Points before multipliers. */
  base: { skip: 100, like: 120, hold: 150, freeze: 120 } as Record<
    ReelKind,
    number
  >,
  /** Faster than this earns nothing more — no reward for inhuman thumbs. */
  speedFloor: 250,
  precisionBonus: 150,
  /** A hold released this close to the centre (per-mille of the half zone) is perfect. */
  perfectPrecision: 700,
  levelEvery: 20,
  /**
   * The level multiplier, per-mille: `1000 + step · ℓ` with `ℓ = level − 1`.
   * It keeps climbing — x2.8 at level 10, x4.8 at 20 — so the posts of a long,
   * fast run are worth far more than the first ones, and the drain decides
   * how far anyone gets.
   */
  levelBoostStep: 200,
  /** The combo, per-mille: each hit adds a step up to the cap; a miss halves what is above x1. */
  comboStart: 1000,
  comboStep: 50,
  comboMax: 1500,
  /** Named combos, each worth `value · level multiplier / 1000` on top of the reel. */
  bonus: { flawless: 1500, lightning: 500, coolHead: 300, comeback: 1000 } as Record<
    BonusKind,
    number
  >,
  /** Lightning: this many skip and like hits in a row, each decided within its limit. */
  lightningRun: 5,
  lightningMs: { skip: 550, like: 700 },
  /** Comeback: the meter ends a reel below `low`, then a hit takes it back to `high`. */
  comebackLow: 300,
  comebackHigh: 500,
} as const;

function onCurve(n: number, min: number, max: number): number {
  return min + Math.floor(((max - min) * RULES.curve) / (RULES.curve + n));
}

/** Milliseconds the player has to act on reel `n`. */
export function baseWindow(n: number): number {
  return onCurve(n, RULES.windowMin, RULES.windowMax);
}

export function windowFor(kind: ReelKind, n: number): number {
  const base = baseWindow(n);
  if (kind === 'like') return base + RULES.likeExtra;
  if (kind === 'freeze') {
    return Math.max(
      RULES.freezeMin,
      Math.floor((base * RULES.freezePercent) / 100),
    );
  }
  return base;
}

export function holdFillFor(n: number): number {
  return onCurve(n, RULES.holdFillMin, RULES.holdFillMax);
}

export function zoneWidthFor(n: number): number {
  return onCurve(n, RULES.zoneMin, RULES.zoneMax);
}

export function specialShareFor(n: number): number {
  return (
    RULES.specialBase +
    Math.floor((RULES.specialGain * n) / (n + RULES.specialCurve))
  );
}

/** Meter lost per second on reel `n`, in per-mille. */
export function drainFor(n: number): number {
  return (
    RULES.drainBase +
    Math.floor((n * RULES.drainNum) / RULES.drainDen) +
    Math.floor((n * n) / RULES.drainQuad)
  );
}

/** The most holds and freezes the `capWindow` reels ending at reel `n` may hold. */
export function capsFor(n: number): { hold: number; freeze: number } {
  let caps = RULES.caps[0]!;
  for (const tier of RULES.caps) {
    if (n >= tier.fromReel) caps = tier;
  }
  return caps;
}

export function levelFor(n: number): number {
  return 1 + Math.floor(n / RULES.levelEvery);
}

/** The level multiplier on reel `n`, per-mille: 1000 on level 1, `levelBoostStep` more each level. */
export function levelBoostFor(n: number): number {
  return 1000 + RULES.levelBoostStep * Math.floor(n / RULES.levelEvery);
}

/** The combo after a hit, per-mille. */
export function comboAfterHit(combo: number): number {
  return Math.min(RULES.comboMax, combo + RULES.comboStep);
}

/** The combo after a miss: whatever was above x1 is halved. */
export function comboAfterMiss(combo: number): number {
  return RULES.comboStart + Math.floor((combo - RULES.comboStart) / 2);
}

/**
 * What a blind move multiplies its loss by: 1 for the first in a row, then
 * 2, 4… — `blind` is how many blind moves in a row this one makes, 0 for a
 * miss that was not blind.
 */
export function blindFactor(blind: number): number {
  return 2 ** Math.max(0, blind - 1);
}

/** What a miss costs the meter: `loss`, times its blind factor. */
export function penaltyFor(loss: number, blind: number): number {
  return loss * blindFactor(blind);
}

/** A named combo's points on reel `n`. */
export function bonusFor(kind: BonusKind, n: number): number {
  return Math.floor((RULES.bonus[kind] * levelBoostFor(n)) / 1000);
}
