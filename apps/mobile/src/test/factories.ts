import type {
  DuelBrief,
  DuelView,
  FriendThread,
  InboxMessage,
  InboxSummary,
  NotificationItem,
  LeaderboardEntry,
  Me,
  PlayerCard,
  PlayerSummary,
  Ranks,
  RatingResponse,
  RunRating,
  RunSummary,
  WaitingDuel,
} from '@quezby/types';

/** A named guest with a season best. Override only what a test is about. */
export function buildMe(overrides: Partial<Me> = {}): Me {
  return {
    id: 'player-1',
    username: 'ekin',
    avatarUrl: null,
    email: null,
    isGuest: true,
    identities: [],
    settings: { haptics: true, analytics: false, pushFriends: true, pushVs: true, pushMessages: true },
    locale: 'tr',
    best: { score: 12_345, reels: 87, achievedAt: '2026-09-24T09:30:00.000Z' },
    createdAt: '2026-09-01T12:00:00.000Z',
    ...overrides,
  };
}

export function buildRanks(overrides: Partial<Ranks> = {}): Ranks {
  return { weekly: 120, monthly: 310, all: 1_204, ...overrides };
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
    avatarUrl: null,
    isMe: false,
    isFriend: false,
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

/** A player in a list: a stranger in Gümüş with a season best. */
export function buildSummary(overrides: Partial<PlayerSummary> = {}): PlayerSummary {
  return {
    username: 'deniz',
    avatarUrl: null,
    best: 9_870,
    league: 'silver',
    relation: 'none',
    ...overrides,
  };
}

/** A stranger's card. */
export function buildCard(overrides: Partial<PlayerCard> = {}): PlayerCard {
  return {
    username: 'deniz',
    avatarUrl: null,
    createdAt: '2026-09-01T12:00:00.000Z',
    best: { score: 9_870, reels: 64, achievedAt: '2026-09-20T18:00:00.000Z' },
    league: 'silver',
    rating: 1_640,
    ranks: { weekly: 12, all: 340 },
    stats: { runs: 42, reels: 2_310, likes: 510, perfects: 88 },
    friends: 7,
    relation: 'none',
    isMe: false,
    ...overrides,
  };
}

/** A VS waiting for the friend: sent by the viewer, their score hidden from the friend. */
export function buildBrief(overrides: Partial<DuelBrief> = {}): DuelBrief {
  return {
    id: '01jduel0000000000000000000',
    status: 'waiting',
    turn: 'them',
    you: { score: 12_450, valid: true },
    them: null,
    outcome: null,
    expiresAt: '2026-09-26T09:00:00.000Z',
    ...overrides,
  };
}

export function buildDuel(overrides: Partial<DuelView> = {}): DuelView {
  return {
    ...buildBrief(),
    sent: true,
    opponent: buildSummary({ username: 'deniz', relation: 'friend' }),
    h2h: { wins: 0, losses: 0, draws: 0 },
    serverTime: '2026-09-24T09:00:00.000Z',
    ...overrides,
  };
}

/** A VS waiting for the viewer: @deniz sent it, 24 hours left. */
export function buildWaiting(overrides: Partial<WaitingDuel> = {}): WaitingDuel {
  return {
    id: '01jduel0000000000000000001',
    opponent: buildSummary({ username: 'deniz', relation: 'friend' }),
    expiresAt: '2026-09-25T09:00:00.000Z',
    ...overrides,
  };
}

/** What the badges count: nothing waiting, three friends. */
export function buildInbox(overrides: Partial<InboxSummary> = {}): InboxSummary {
  return {
    requests: 0,
    threads: 0,
    yourTurn: 0,
    friends: 3,
    waiting: [],
    notifications: 0,
    serverTime: '2026-09-24T09:00:00.000Z',
    ...overrides,
  };
}

/** A notice on the bell's list: @deniz's VS, waiting for the viewer, not seen yet. */
export function buildNotification(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: 'message:7',
    kind: 'vs_invite',
    player: buildSummary({ username: 'deniz', relation: 'friend' }),
    duel: buildBrief({ id: '01jduel0000000000000000001', turn: 'you', you: null }),
    createdAt: '2026-09-24T08:55:00.000Z',
    unseen: true,
    ...overrides,
  };
}

/** A line of a conversation: the friend's phrase. */
export function buildMessage(overrides: Partial<InboxMessage> = {}): InboxMessage {
  return {
    id: 1,
    kind: 'phrase',
    mine: false,
    phrase: 'gg',
    duel: null,
    createdAt: '2026-09-24T08:55:00.000Z',
    ...overrides,
  };
}

/** A friend in the inbox, with one unread phrase. */
export function buildThread(overrides: Partial<FriendThread> = {}): FriendThread {
  return {
    player: buildSummary({ relation: 'friend' }),
    friendsSince: '2026-09-20T10:00:00.000Z',
    lastActivityAt: '2026-09-24T08:55:00.000Z',
    last: buildMessage(),
    unread: 1,
    duel: null,
    ...overrides,
  };
}

/** A free run from the history, ranked. */
export function buildRunSummary(overrides: Partial<RunSummary> = {}): RunSummary {
  return {
    runId: '01jrun00000000000000000000',
    mode: 'free',
    status: 'ranked',
    score: 12_345,
    reels: 87,
    level: 5,
    activeMs: 184_000,
    finishedAt: '2026-09-24T09:30:00.000Z',
    isBest: false,
    dailyNumber: null,
    duel: null,
    ...overrides,
  };
}

/** A placed player's rating: Gümüş, 1.640, a run from Altın. */
export function buildRating(overrides: Partial<RatingResponse> = {}): RatingResponse {
  return {
    unlock: null,
    placed: true,
    rating: 1_640,
    tier: 'silver',
    floor: 1_000,
    ceil: 2_000,
    progress: 640,
    target: 72_400,
    peak: 1_702,
    placement: null,
    provisional: false,
    shield: null,
    history: [
      {
        kind: 'run',
        delta: 42,
        before: 1_598,
        after: 1_640,
        score: 98_120,
        target: 66_100,
        tier: 'silver',
        runId: 'run-1',
        at: '2026-10-01T09:00:00.000Z',
      },
    ],
    ...overrides,
  };
}

/** A rating still placing: `played` of five runs in. */
export function buildPlacing(played = 2): RatingResponse {
  return buildRating({
    placed: false,
    rating: null,
    tier: null,
    floor: null,
    ceil: null,
    progress: null,
    target: null,
    peak: null,
    placement: { played, required: 3 },
    history: [],
  });
}

/** Dereceli still shut: `remaining` of twenty Normal and Günlük games to go. */
export function buildLocked(remaining = 12): RatingResponse {
  return {
    ...buildPlacing(0),
    unlock: { required: 20, remaining, placement: 3 },
    placement: { played: 0, required: 3 },
  };
}

/** What a counted run did to the rating: +42 in Gümüş. */
export function buildRunRating(overrides: Partial<RunRating> = {}): RunRating {
  return {
    kind: 'run',
    before: 1_598,
    after: 1_640,
    delta: 42,
    tierBefore: 'silver',
    tier: 'silver',
    target: 66_100,
    nextTarget: 72_400,
    placement: null,
    shielded: false,
    ...overrides,
  };
}
