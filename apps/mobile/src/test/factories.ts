import type { LeaderboardEntry, Me, Ranks } from '@quezby/types';

/** A named guest with a season best. Override only what a test is about. */
export function buildMe(overrides: Partial<Me> = {}): Me {
  return {
    id: 'player-1',
    username: 'ekin',
    email: null,
    isGuest: true,
    identities: [],
    settings: { haptics: true },
    best: { score: 12_345, reels: 87, achievedAt: '2026-09-24T09:30:00.000Z' },
    createdAt: '2026-09-01T12:00:00.000Z',
    ...overrides,
  };
}

export function buildRanks(overrides: Partial<Ranks> = {}): Ranks {
  return { daily: 44, weekly: 120, monthly: 310, all: 1_204, ...overrides };
}

/** One row of a board: fourth place, 1.240 behind the row above. */
export function buildEntry(
  overrides: Partial<LeaderboardEntry> = {},
): LeaderboardEntry {
  return {
    rank: 4,
    username: 'deniz',
    score: 9_870,
    reels: 64,
    isMe: false,
    isFollowing: false,
    gap: 1_240,
    ...overrides,
  };
}

const NAMES = [
  'ekin',
  'mert',
  'oya',
  'deniz',
  'burak',
  'zeynep',
  'kubi.01',
  'elif',
];

/**
 * `count` rows from rank `from` down, each `step` points under the last.
 * `gap` is what the API sends — the points to pass the row above, where a
 * tie goes to whoever got there first, so the difference plus one — and
 * null at #1. `me` marks one rank as the caller's.
 */
export function buildEntries(
  count: number,
  {
    from = 1,
    top = 24_000,
    step = 1_240,
    me,
  }: { from?: number; top?: number; step?: number; me?: number } = {},
): LeaderboardEntry[] {
  return Array.from({ length: count }, (_, index) => {
    const rank = from + index;
    const name = NAMES[index % NAMES.length] ?? 'oyuncu';
    const lap = Math.floor(index / NAMES.length);
    return buildEntry({
      rank,
      username: lap > 0 ? `${name}${lap}` : name,
      score: top - index * step,
      reels: Math.max(1, 120 - index * 3),
      isMe: rank === me,
      gap: rank === 1 ? null : step + 1,
    });
  });
}
