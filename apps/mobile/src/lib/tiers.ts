import type { LeagueTier } from '@quezby/types';

/** The leagues, lowest first, as the API ranks them. */
export const TIERS: readonly LeagueTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master'];

/** Which way the API moved a player between two leagues; null when it did not. */
export function tierMove(before: LeagueTier | null, after: LeagueTier | null): 'up' | 'down' | null {
  if (before === null || after === null || before === after) return null;
  return TIERS.indexOf(after) > TIERS.indexOf(before) ? 'up' : 'down';
}
