import type { Locale } from '@quezby/types';

/**
 * The writing systems the game has faces for. The faces are fixed for a
 * launch — every style sheet is built with them once — so which ones a launch
 * uses is decided before the app loads: Arabic by the app's direction
 * (`IS_RTL`), Japanese and Korean by the language the game starts in, which
 * `Boot` reads first (`startIn`). Changing to or from them reloads the game.
 */
export type Script = 'latin' | 'arabic' | 'japanese' | 'korean';

export function scriptOf(locale: Locale): Script {
  switch (locale) {
    case 'ar':
      return 'arabic';
    case 'ja':
      return 'japanese';
    case 'ko':
      return 'korean';
    default:
      return 'latin';
  }
}

let started: Script = 'latin';

/** The language this launch starts in, told once by `Boot` before the app and its style sheets load. */
export function startIn(locale: Locale): void {
  started = scriptOf(locale);
}

/** The script of the language this launch started in. */
export function startedScript(): Script {
  return started;
}

/**
 * Whether speaking `locale` needs other faces than this launch has — a reload.
 * Arabic is left out: turning the app around reloads it already (`needsFlip`).
 */
export function needsNewFaces(locale: Locale): boolean {
  const want = scriptOf(locale);
  return want !== 'arabic' && started !== 'arabic' && want !== started;
}
