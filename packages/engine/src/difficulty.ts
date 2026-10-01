import { RULES } from './rules';

/**
 * Dereceli's difficulty ("Zorluk", 0–16). The API picks a rated run's
 * difficulty from the player's qb when it hands out the seed; the app and
 * the PHP replay (`apps/api/app/Game/Difficulty.php`) play the run at it.
 * `docs/product/scoring.md` → "Dereceli zorluğu".
 *
 * Difficulty 0 is engine v3 exactly as `RULES` has it: every Normal, Günlük,
 * VS and practice run, every placement run and every rated run below 1000
 * qb. The feed is the same at every difficulty — the same reels, the same
 * windows, the same drain — and only the meter's economy tightens:
 *
 *   gain     per-mille a hit's dopamine is multiplied by — a perfect's extra
 *            is left whole, so precision pays back what difficulty takes
 *   penalty  per-mille a miss's loss is multiplied by
 *
 * The table is sealed apart from the rules (`difficulty.lock.json`):
 * changing a row is a `DIFFICULTY_VERSION` bump and a new qb target table,
 * never a new season. Version 1 also thickened the feed with holds and
 * freezes; a MasterClass run turned into waiting, so version 2 leaves the
 * feed alone.
 */
export const DIFFICULTY_VERSION = 2;

export type DifficultyRules = {
  gain: number;
  penalty: number;
};

/** Row `z`: gain `1000 − 12·z`, penalty `1000 + 40·z` — ×0.81 and ×1.64 at the top. */
export const DIFFICULTIES: readonly DifficultyRules[] = Array.from({ length: 17 }, (_, z) => ({
  gain: 1000 - 12 * z,
  penalty: 1000 + 40 * z,
}));

export const MAX_DIFFICULTY = DIFFICULTIES.length - 1;

/** A difficulty's row. Anything but a whole number in `[0, MAX_DIFFICULTY]` is refused. */
export function difficultyRules(difficulty: number): DifficultyRules {
  const rules = Number.isInteger(difficulty) ? DIFFICULTIES[difficulty] : undefined;
  if (rules === undefined) throw new RangeError(`no difficulty ${difficulty}`);
  return rules;
}

/** A hit's dopamine at `difficulty`, before a perfect's extra is added. */
export function gainAt(gain: number, difficulty: number): number {
  return Math.floor((gain * difficultyRules(difficulty).gain) / 1000);
}

/** A miss's loss at `difficulty`, before a blind move doubles it. */
export function lossAt(loss: number, difficulty: number): number {
  return Math.floor((loss * difficultyRules(difficulty).penalty) / 1000);
}

/** Every reel kind's gain at `difficulty` — the fixtures' and the docs' view of a row. */
export function gainsAt(difficulty: number): Record<keyof typeof RULES.gain, number> {
  return {
    skip: gainAt(RULES.gain.skip, difficulty),
    like: gainAt(RULES.gain.like, difficulty),
    hold: gainAt(RULES.gain.hold, difficulty),
    freeze: gainAt(RULES.gain.freeze, difficulty),
  };
}
