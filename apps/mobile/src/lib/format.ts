/*
 * Numbers, times and lists are written the player's language's way by the
 * catalog — `t.fmt` from `useT()` (`src/i18n/format.ts`). What is left here
 * reads the same in every language.
 */

/** `154000` ms → `2:34`. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Up to two letters for an avatar — a username has no spaces, so its start. */
export function initialsOf(name: string): string {
  const letters = name.replace(/[^a-z0-9]/gi, '');
  return (letters.slice(0, 2) || '?').toUpperCase();
}
