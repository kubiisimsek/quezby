import { RULES, drainFor, specialShareFor } from './rules';

/**
 * Dereceli's difficulty ("Zorluk", 0–16). The API picks a rated run's
 * difficulty from the player's Elo when it hands out the seed; the app and
 * the PHP replay (`apps/api/app/Game/Difficulty.php`) play the run at it.
 * `docs/product/scoring.md` → "Dereceli zorluğu".
 *
 * Difficulty 0 is engine v3 exactly as `RULES` has it: every Normal, Günlük,
 * VS and practice run, every placement run and every rated run below 1000
 * Elo. The others only move four numbers, each a little more every step:
 *
 *   special  per-mille added to the special-reel share — more obstacles
 *   freeze   points of every hundred special reels moved from like to freeze
 *   penalty  per-mille the meter's losses are multiplied by
 *   drain    per-mille the meter's drain is multiplied by — it empties faster
 *
 * The table is sealed apart from the rules (`difficulty.lock.json`):
 * changing a row is a `DIFFICULTY_VERSION` bump and a new Elo target table,
 * never a new season.
 */
export const DIFFICULTY_VERSION = 1;

export type DifficultyRules = {
  special: number;
  freeze: number;
  penalty: number;
  drain: number;
};

/**
 * Row `z`: special `15·z`, freeze `⌊5·z / 8⌋`, penalty `1000 + 30·z`,
 * drain `1000 + ⌊3·z² / 2⌋` — gentle in Gümüş, steep in Elmas.
 */
export const DIFFICULTIES: readonly DifficultyRules[] = [
  { special: 0, freeze: 0, penalty: 1000, drain: 1000 },
  { special: 15, freeze: 0, penalty: 1030, drain: 1001 },
  { special: 30, freeze: 1, penalty: 1060, drain: 1006 },
  { special: 45, freeze: 1, penalty: 1090, drain: 1013 },
  { special: 60, freeze: 2, penalty: 1120, drain: 1024 },
  { special: 75, freeze: 3, penalty: 1150, drain: 1037 },
  { special: 90, freeze: 3, penalty: 1180, drain: 1054 },
  { special: 105, freeze: 4, penalty: 1210, drain: 1073 },
  { special: 120, freeze: 5, penalty: 1240, drain: 1096 },
  { special: 135, freeze: 5, penalty: 1270, drain: 1121 },
  { special: 150, freeze: 6, penalty: 1300, drain: 1150 },
  { special: 165, freeze: 6, penalty: 1330, drain: 1181 },
  { special: 180, freeze: 7, penalty: 1360, drain: 1216 },
  { special: 195, freeze: 8, penalty: 1390, drain: 1253 },
  { special: 210, freeze: 8, penalty: 1420, drain: 1294 },
  { special: 225, freeze: 9, penalty: 1450, drain: 1337 },
  { special: 240, freeze: 10, penalty: 1480, drain: 1384 },
];

export const MAX_DIFFICULTY = DIFFICULTIES.length - 1;

/** A difficulty's row. Anything but a whole number in `[0, MAX_DIFFICULTY]` is refused. */
export function difficultyRules(difficulty: number): DifficultyRules {
  const rules = Number.isInteger(difficulty) ? DIFFICULTIES[difficulty] : undefined;
  if (rules === undefined) throw new RangeError(`no difficulty ${difficulty}`);
  return rules;
}

/** The special-reel share on reel `n` at `difficulty`, per-mille. */
export function specialShareAt(n: number, difficulty: number): number {
  return specialShareFor(n) + difficultyRules(difficulty).special;
}

/** How many of every hundred special reels are likes at `difficulty`; the freeze reels take the rest. */
export function likeWeightAt(difficulty: number): number {
  return RULES.weightLike - difficultyRules(difficulty).freeze;
}

/** Meter lost per second on reel `n` at `difficulty`, per-mille. */
export function drainAt(n: number, difficulty: number): number {
  return Math.floor((drainFor(n) * difficultyRules(difficulty).drain) / 1000);
}

/** A miss's loss at `difficulty`, before a blind move doubles it. */
export function lossAt(loss: number, difficulty: number): number {
  return Math.floor((loss * difficultyRules(difficulty).penalty) / 1000);
}
