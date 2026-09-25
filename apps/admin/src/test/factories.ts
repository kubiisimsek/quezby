import type {
  AdminAccount,
  AdminAuditEntry,
  AdminBoardKeysResponse,
  AdminBoardResponse,
  AdminBoardRow,
  AdminContentResponse,
  AdminLeagueGroupResponse,
  AdminLeaguesResponse,
  AdminOverview,
  AdminMe,
  AdminPage,
  AdminPlayerResponse,
  AdminPlayerRow,
  AdminPlayersResponse,
  AdminRunResponse,
  AdminRunRow,
  AdminRunsResponse,
  AdminRunStep,
  AdminSession,
  AdminSuspect,
  AdminSuspectsResponse,
  AdminSystem,
} from '@quezby/types';

/** The signed-in owner the tests act as, unless they say otherwise. */
export function adminMe(overrides: Partial<AdminMe> = {}): AdminMe {
  return {
    id: '01jadmin00000000000000000a',
    name: 'Kubilay Şimşek',
    email: 'kubi@quezby.com',
    role: 'owner',
    mustChangePassword: false,
    lastLoginAt: '2026-09-25T07:00:00.000Z',
    ...overrides,
  };
}

export function adminSession(overrides: Partial<AdminMe> = {}, expiresAt = '2099-01-01T00:00:00.000Z'): AdminSession {
  return { token: 'test-token', expiresAt, admin: adminMe(overrides) };
}


export function page<T>(items: T[], overrides: Partial<AdminPage<T>> = {}): AdminPage<T> {
  return { items, page: 1, perPage: 25, total: items.length, ...overrides };
}

export function playerRow(overrides: Partial<AdminPlayerRow> = {}): AdminPlayerRow {
  return {
    id: '01jplayer00000000000000000a',
    username: 'kerem.35',
    bannedAt: null,
    isAutoUsername: false,
    isGuest: false,
    email: 'kerem@quezby.com',
    platform: 'ios',
    identities: ['apple'],
    best: 250311,
    createdAt: '2026-09-01T09:00:00.000Z',
    lastPlayedAt: '2026-09-25T08:00:00.000Z',
    ...overrides,
  };
}

export function playersPage(rows: AdminPlayerRow[], overrides: Partial<AdminPlayersResponse> = {}): AdminPlayersResponse {
  return { ...page(rows), counts: { all: rows.length, active: rows.length, banned: 0, guest: 0 }, ...overrides };
}

export function runRow(overrides: Partial<AdminRunRow> = {}): AdminRunRow {
  return {
    id: '01jrun000000000000000000ab',
    player: { id: '01jplayer00000000000000000a', username: 'kerem.35', bannedAt: null },
    status: 'ranked',
    mode: 'free',
    dailyKey: null,
    score: 52340,
    reels: 204,
    accuracy: 942,
    avgReactionMs: 412,
    flags: [],
    deviceVerdict: 'pass',
    appVersion: '1.0.0',
    engineVersion: 2,
    startedAt: '2026-09-25T08:00:00.000Z',
    finishedAt: '2026-09-25T08:05:00.000Z',
    ...overrides,
  };
}

export function auditEntry(overrides: Partial<AdminAuditEntry> = {}): AdminAuditEntry {
  return {
    id: 1,
    at: '2026-09-25T08:00:00.000Z',
    via: 'panel',
    actor: { id: '01jadmin00000000000000000a', name: 'Kubilay Şimşek' },
    action: 'player.ban',
    subject: { type: 'player', id: '01jplayer00000000000000000a', label: 'kerem.35' },
    reason: 'Hız hilesi',
    details: null,
    ip: null,
    ...overrides,
  };
}

export function playerResponse(overrides: Partial<AdminPlayerResponse> = {}, player: Partial<AdminPlayerResponse['player']> = {}): AdminPlayerResponse {
  return {
    player: {
      ...playerRow(),
      installId: 'install-1',
      banReason: null,
      sessions: 2,
      lastSeenAt: '2026-09-25T08:30:00.000Z',
      identityDetails: [{ provider: 'apple', email: 'k@privaterelay.appleid.com', emailVerified: true, lastUsedAt: null }],
      ...player,
    },
    season: 2,
    best: { score: 250311, reels: 377, achievedAt: '2026-09-20T10:00:00.000Z', runId: '01jrun000000000000000000ab' },
    ranks: { daily: 3, weekly: 5, monthly: 8, all: 12 },
    stats: {
      runs: 42,
      reels: 3200,
      swipes: 1500,
      likes: 900,
      holds: 400,
      perfects: 120,
      freezes: 300,
      caught: 4,
      misses: 60,
      activeMs: 3_600_000,
      bestReactionMs: 198,
      maxCombo: 2500,
      bonuses: { flawless: 3, lightning: 2, coolHead: 1, comeback: 0 },
    },
    league: { weekKey: '2026-W39', groupId: 7, tier: 'gold', rank: 4, members: 28, points: 912000, zone: 'promote' },
    runs: { ranked: 40, flagged: 2 },
    recentRuns: [runRow()],
    flags: [{ code: 'reaction_cv', severity: 'soft', count: 2 }],
    devices: [],
    sameInstall: [],
    follows: { following: 3, followers: 9 },
    audit: [],
    ...overrides,
  };
}

export function runsPage(rows: AdminRunRow[], overrides: Partial<AdminRunsResponse> = {}): AdminRunsResponse {
  return { ...page(rows), counts: { ranked: rows.length }, ...overrides };
}

export function runStep(overrides: Partial<AdminRunStep> = {}): AdminRunStep {
  return {
    index: 0,
    kind: 'skip',
    level: 1,
    window: 1500,
    gesture: 'up',
    t: 420,
    d: 0,
    verdict: 'hit',
    points: 100,
    bonusPoints: 0,
    combo: 1000,
    meter: 900,
    ...overrides,
  };
}

export function runResponse(overrides: Partial<AdminRunResponse> = {}, run: Partial<AdminRunResponse['run']> = {}): AdminRunResponse {
  return {
    run: {
      ...runRow(),
      seed: 4242,
      contentVersion: 1,
      hits: 200,
      misses: 4,
      perfects: 12,
      maxStreak: 88,
      maxCombo: 2500,
      bonusPoints: 3000,
      level: 11,
      activeMs: 252_000,
      endedBy: 'drained',
      clientScore: 52340,
      clientReels: 204,
      stats: null,
      ...run,
    },
    timeline: [
      runStep(),
      runStep({ index: 1, kind: 'like', gesture: 'like', t: 180, verdict: 'hit' }),
      runStep({ index: 2, kind: 'hold', gesture: 'hold', t: 300, d: 900, verdict: 'perfect', points: 400, bonusPoints: 50 }),
      runStep({ index: 3, kind: 'freeze', gesture: 'touch', t: 90, verdict: 'caught', points: 0 }),
    ],
    timelineUnavailable: null,
    audit: [],
    ...overrides,
  };
}

export function suspect(overrides: Partial<AdminSuspect> = {}): AdminSuspect {
  return {
    player: { id: '01jplayer00000000000000000a', username: 'bot.35', bannedAt: null, platform: 'android', createdAt: '2026-09-01T09:00:00.000Z' },
    risk: 22,
    runs: { flagged: 2, review: 1, rejected: 0, signalled: 0 },
    codes: [
      { code: 'wall_clock', severity: 'hard', count: 2 },
      { code: 'reaction_cv', severity: 'soft', count: 1 },
    ],
    deviceFails: 1,
    sharedInstall: 1,
    topScore: 99000,
    lastFlagAt: '2026-09-25T07:00:00.000Z',
    ...overrides,
  };
}

export function suspectsPage(rows: AdminSuspect[], overrides: Partial<AdminSuspectsResponse> = {}): AdminSuspectsResponse {
  return { ...page(rows), days: 30, ...overrides };
}

export function overview(overrides: Partial<AdminOverview> = {}): AdminOverview {
  const days = Array.from({ length: 30 }, (_, index) => `2026-09-${String(index + 1).padStart(2, '0')}`).slice(0, 30);
  return {
    serverTime: '2026-09-25T09:00:00.000Z',
    season: 2,
    today: '2026-09-25',
    dailyNumber: 2,
    kpis: {
      players: 1234,
      newToday: 12,
      activeToday: 345,
      runsToday: 1450,
      rankedToday: 1400,
      flaggedToday: 7,
      review: 3,
      banned: 5,
      dailyPlayers: 210,
    },
    series: {
      days,
      newPlayers: days.map((_, index) => index % 5),
      activePlayers: days.map((_, index) => 100 + index),
      runs: days.map((_, index) => 1000 + index * 10),
      flagged: days.map((_, index) => index % 3),
    },
    topFlags: [
      { code: 'wall_clock', severity: 'hard', count: 9 },
      { code: 'reaction_cv', severity: 'soft', count: 4 },
    ],
    queue: [runRow({ status: 'review', score: 99000 })],
    ...overrides,
  };
}

export function boardRow(overrides: Partial<AdminBoardRow> = {}): AdminBoardRow {
  return {
    rank: 1,
    player: { id: '01jplayer00000000000000000a', username: 'kerem.35', bannedAt: null },
    score: 250311,
    reels: 377,
    achievedAt: '2026-09-25T08:00:00.000Z',
    run: { id: '01jrun000000000000000000ab', status: 'ranked', flags: [], deviceVerdict: 'pass' },
    ...overrides,
  };
}

export function board(rows: AdminBoardRow[], overrides: Partial<AdminBoardResponse> = {}): AdminBoardResponse {
  return {
    ...page(rows),
    board: 'daily',
    key: '2026-09-25',
    season: 2,
    seasons: [2],
    number: null,
    startsAt: '2026-09-24T21:00:00.000Z',
    endsAt: '2026-09-25T21:00:00.000Z',
    ...overrides,
  };
}

export function boardKeys(overrides: Partial<AdminBoardKeysResponse> = {}): AdminBoardKeysResponse {
  return {
    board: 'daily',
    season: 2,
    keys: [
      { key: '2026-09-25', players: 40, number: null, topScore: 250311, topPlayer: { id: '01jplayer00000000000000000a', username: 'kerem.35', bannedAt: null }, attempts: null },
      { key: '2026-09-24', players: 31, number: null, topScore: 99000, topPlayer: null, attempts: null },
    ],
    ...overrides,
  };
}

export function leaguesWeek(overrides: Partial<AdminLeaguesResponse> = {}): AdminLeaguesResponse {
  return {
    ...page([
      { id: 7, tier: 'gold', members: 28, settled: false, createdAt: '2026-09-21T08:00:00.000Z' },
      { id: 3, tier: 'bronze', members: 30, settled: true, createdAt: '2026-09-21T07:00:00.000Z' },
    ]),
    season: 2,
    weekKey: '2026-W39',
    weeks: ['2026-W39', '2026-W38'],
    tiers: { bronze: 30, silver: 0, gold: 28, platinum: 0, diamond: 0 },
    ...overrides,
  };
}

export function leagueGroup(overrides: Partial<AdminLeagueGroupResponse> = {}): AdminLeagueGroupResponse {
  return {
    group: {
      id: 7,
      tier: 'gold',
      members: 3,
      settled: false,
      createdAt: '2026-09-21T08:00:00.000Z',
      season: 2,
      weekKey: '2026-W39',
      startsAt: '2026-09-20T21:00:00.000Z',
      endsAt: '2026-09-27T21:00:00.000Z',
    },
    promoteCount: 1,
    demoteCount: 1,
    standings: [
      { rank: 1, player: { id: '01jplayer00000000000000000a', username: 'kerem.35', bannedAt: null }, points: 912000, daysPlayed: 5, zone: 'promote', finalRank: null, outcome: null },
      { rank: 2, player: { id: '01jplayer00000000000000000b', username: 'ekin', bannedAt: null }, points: 500000, daysPlayed: 3, zone: 'stay', finalRank: null, outcome: null },
      { rank: 3, player: { id: '01jplayer00000000000000000c', username: 'deniz', bannedAt: null }, points: 1000, daysPlayed: 1, zone: 'demote', finalRank: null, outcome: null },
    ],
    banned: [],
    ...overrides,
  };
}

export function contentResponse(overrides: Partial<AdminContentResponse> = {}): AdminContentResponse {
  return {
    contentVersion: 1,
    items: [
      { contentId: 'skip-003', kind: 'skip', shows: 1000, likes: 0, misses: 400, likeRate: 0, missRate: 400 },
      { contentId: 'like-001', kind: 'like', shows: 200, likes: 150, misses: 50, likeRate: 750, missRate: 250 },
      { contentId: 'hold-001', kind: 'hold', shows: 0, likes: 0, misses: 0, likeRate: null, missRate: null },
    ],
    totals: { shows: 1200, likes: 150, misses: 450 },
    ...overrides,
  };
}

export function adminAccount(overrides: Partial<AdminAccount> = {}): AdminAccount {
  return { ...adminMe(), disabledAt: null, createdAt: '2026-09-20T09:00:00.000Z', ...overrides };
}

export function system(overrides: Partial<AdminSystem> = {}): AdminSystem {
  return {
    environment: 'production',
    php: '8.3.12',
    laravel: '13.33.0',
    database: 'mysql',
    timezone: 'Europe/Istanbul',
    serverTime: '2026-09-25T09:00:00.000Z',
    season: 2,
    engineVersion: 2,
    contentVersion: 1,
    integrityMode: 'enforce',
    dailyEpoch: '2026-09-24',
    apps: { ios: { min: '1.0.0', latest: '1.1.0' }, android: { min: '1.0.0', latest: '1.1.0' } },
    tokens: { ops: false, moderation: false },
    cached: { config: true, routes: true },
    pendingMigrations: [],
    runs: { open: 4, stale: 1 },
    limits: { reviewTopAll: 10, reviewTopWeekly: 3, leagueGroupSize: 30, leagueUnlockRuns: 3, runTtlMinutes: 120, adminTokenHours: 12 },
    ...overrides,
  };
}
