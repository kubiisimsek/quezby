/**
 * Every number that decides a run. `docs/product/scoring.md` explains each
 * one; `pnpm engine:simulate` shows what changing it does to real players.
 *
 * Integer arithmetic only — per-mille for ratios, milliseconds for time — so
 * the PHP replay (`apps/api/app/Game/Rules.php`) lands on the same score to
 * the point. The rules are locked (`rules.lock.json`): changing any value is
 * an `ENGINE_VERSION` bump, `pnpm engine:lock`, and a new leaderboard season.
 */
export const ENGINE_VERSION = 2;

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
  freezePercent: 55,
  freezeMin: 500,
  /** How long the hold bar takes to fill, on the same curve as the window. */
  holdFillMax: 1600,
  holdFillMin: 700,
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
  /** Drain in per-mille per second: `base + n · num / den`. It never stops growing. */
  drainBase: 55,
  drainNum: 1,
  drainDen: 5,
  gain: { skip: 80, like: 90, hold: 100, freeze: 90 } as Record<
    ReelKind,
    number
  >,
  perfectGain: 60,
  loss: { timeout: 200, wrong: 200, holdMiss: 120, caught: 250 },

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
   * The level multiplier, per-mille: `1000 + max · ℓ / (ℓ + curve)` with
   * `ℓ = level − 1`. x2 at level 11, never x3 — so a longer run is worth more
   * without one lucky minute outweighing the rest.
   */
  levelBoostMax: 2000,
  levelBoostCurve: 10,
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
  return RULES.drainBase + Math.floor((n * RULES.drainNum) / RULES.drainDen);
}

export function levelFor(n: number): number {
  return 1 + Math.floor(n / RULES.levelEvery);
}

/** The level multiplier on reel `n`, per-mille: 1000 on level 1, approaching 3000. */
export function levelBoostFor(n: number): number {
  const climbed = Math.floor(n / RULES.levelEvery);
  return 1000 + Math.floor((RULES.levelBoostMax * climbed) / (climbed + RULES.levelBoostCurve));
}

/** The combo after a hit, per-mille. */
export function comboAfterHit(combo: number): number {
  return Math.min(RULES.comboMax, combo + RULES.comboStep);
}

/** The combo after a miss: whatever was above x1 is halved. */
export function comboAfterMiss(combo: number): number {
  return RULES.comboStart + Math.floor((combo - RULES.comboStart) / 2);
}

/** A named combo's points on reel `n`. */
export function bonusFor(kind: BonusKind, n: number): number {
  return Math.floor((RULES.bonus[kind] * levelBoostFor(n)) / 1000);
}
