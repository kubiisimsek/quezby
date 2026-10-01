import type {
  AdminAccount,
  AdminAnalytics,
  AdminAuditEntry,
  AdminBoardKeysResponse,
  AdminBoardResponse,
  AdminBoardRow,
  AdminCalibrationResponse,
  AdminContentResponse,
  AdminLogEntry,
  AdminLogsResponse,
  AdminLogSummary,
  AdminOverview,
  AdminMe,
  AdminPage,
  AdminPlayerActivity,
  AdminPlayerRating,
  AdminPlayerResponse,
  AdminPlayerRow,
  AdminPlayersResponse,
  AdminRatingChange,
  AdminRatingsResponse,
  AdminReportRow,
  AdminReportsResponse,
  AdminRunRating,
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
    avatarUrl: null,
    isAutoUsername: false,
    isGuest: false,
    email: 'kerem@quezby.com',
    platform: 'ios',
    identities: ['apple'],
    locale: 'tr',
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

export function logEntry(overrides: Partial<AdminLogEntry> = {}): AdminLogEntry {
  return {
    id: 1,
    at: '2026-10-01T09:00:00.000Z',
    level: 'error',
    source: 'external',
    event: 'firebase',
    message: '403 PERMISSION_DENIED: The caller does not have permission',
    status: 403,
    method: 'POST',
    path: 'fcm.googleapis.com/v1/projects/quezby-staging/messages:send',
    durationMs: 182,
    player: { id: '01jplayer00000000000000000a', username: 'kerem.35' },
    platform: 'ios',
    appVersion: null,
    context: { kind: 'vs_invite', device: '…a1b2c3d4', response: { error: { status: 'PERMISSION_DENIED' } } },
    ...overrides,
  };
}

export function logsPage(
  items: AdminLogEntry[],
  { events = ['firebase', 'push.no_device'], hasMore = false, page: at = 1 }: { events?: string[]; hasMore?: boolean; page?: number } = {},
): AdminLogsResponse {
  return { items, page: at, perPage: 25, hasMore, events };
}

export function logSummary(overrides: Partial<AdminLogSummary> = {}): AdminLogSummary {
  return {
    range: '30d',
    buckets: Array.from({ length: 30 }, (_, index) => ({
      key: `2026-09-${String(index + 2).padStart(2, '0')}`.replace('2026-09-31', '2026-10-01'),
      error: index === 29 ? 3 : 0,
      warning: index === 29 ? 5 : 1,
      info: 12,
    })),
    totals: { error: 3, warning: 34, info: 360 },
    top: [
      { source: 'push', event: 'push.sent', level: 'info', total: 340 },
      { source: 'push', event: 'push.no_device', level: 'warning', total: 30 },
      { source: 'external', event: 'firebase', level: 'error', total: 3 },
    ],
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
      analyticsAt: '2026-09-20T10:05:00.000Z',
      ...player,
    },
    season: 2,
    best: { score: 250311, reels: 377, achievedAt: '2026-09-20T10:00:00.000Z', runId: '01jrun000000000000000000ab' },
    ranks: { weekly: 5, monthly: 8, all: 12 },
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
    rating: playerRating(),
    runs: { ranked: 40, flagged: 2 },
    recentRuns: [runRow()],
    flags: [{ code: 'reaction_cv', severity: 'soft', count: 2 }],
    devices: [],
    sameInstall: [],
    installs: [
      {
        installId: 'install-1',
        platform: 'ios',
        osVersion: '18.2',
        model: 'iPhone 15 Pro',
        appVersion: '1.0.0',
        appBuild: '42',
        firstSeenAt: '2026-09-20T10:00:00.000Z',
        lastSeenAt: '2026-09-25T07:00:00.000Z',
        others: [{ id: '01jplayer00000000000000000b', username: 'kerem.yedek', bannedAt: null }],
      },
    ],
    social: { friends: 4, blockedBy: 0 },
    openReports: { photo: 0, name: 0 },
    push: {
      devices: [
        { device: '…a1b2c3d4', platform: 'ios', appVersion: '1.0.4', registeredAt: '2026-09-28T08:00:00.000Z', updatedAt: '2026-09-30T08:00:00.000Z' },
      ],
      settings: { friends: true, vs: true, messages: true },
    },
    audit: [],
    ...overrides,
  };
}

/** A change of a rating: by default a run that beat its target. */
export function ratingChange(overrides: Partial<AdminRatingChange> = {}): AdminRatingChange {
  return {
    id: 40,
    kind: 'run',
    delta: 42,
    before: 2408,
    after: 2450,
    score: 140000,
    target: 120000,
    tier: 'gold',
    runId: '01jrun000000000000000000ab',
    at: '2026-09-25T08:05:00.000Z',
    performance: 2560,
    width: 800,
    shielded: false,
    engineVersion: 2,
    counted: true,
    ...overrides,
  };
}

/** A placed player in Altın, with a run, a gain a moderator took back, a run that did not count and a loss behind them. */
export function playerRating(overrides: Partial<AdminPlayerRating> = {}): AdminPlayerRating {
  return {
    rating: 2450,
    tier: 'gold',
    peak: 2610,
    target: 128000,
    difficulty: 6,
    placement: null,
    provisionalLeft: 0,
    shield: null,
    ratedRuns: 36,
    ratedAt: '2026-09-25T08:05:00.000Z',
    history: [
      ratingChange(),
      ratingChange({ id: 39, kind: 'reversal', delta: -30, before: 2438, after: 2408, score: null, target: null, runId: '01jrun000000000000000000ae', performance: null, width: null }),
      ratingChange({ id: 38, kind: 'void', delta: 0, before: 2438, after: 2438, score: 0, target: null, runId: '01jrun000000000000000000ac', performance: null, width: null, counted: false }),
      ratingChange({ id: 37, kind: 'run', delta: -18, before: 2456, after: 2438, score: 90000, target: 118000, runId: '01jrun000000000000000000ad', performance: 2180 }),
    ],
    ...overrides,
  };
}

/** What a run did to the rating: by default the run that beat its target, never reversed. */
export function runRating(overrides: Partial<AdminRunRating> = {}): AdminRunRating {
  return { ...ratingChange(), reversedBy: null, ...overrides };
}

export function ratingsOverview(overrides: Partial<AdminRatingsResponse> = {}): AdminRatingsResponse {
  return {
    tiers: { bronze: 120, silver: 340, gold: 210, platinum: 64, diamond: 12, master: 2 },
    active: { bronze: 40, silver: 200, gold: 150, platinum: 50, diamond: 10, master: 2 },
    placing: 57,
    top: [
      { player: { id: '01jplayer00000000000000000a', username: 'kerem.35', bannedAt: null }, rating: 5120, tier: 'master', difficulty: 16, peak: 5200, ratedAt: '2026-09-25T08:05:00.000Z' },
      { player: { id: '01jplayer00000000000000000b', username: 'ekin', bannedAt: null }, rating: 4890, tier: 'diamond', difficulty: 16, peak: null, ratedAt: '2026-09-24T08:05:00.000Z' },
    ],
    rules: {
      engineVersion: 2,
      maxDelta: 100,
      width: 800,
      provisionalWidth: 400,
      provisionalRuns: 15,
      placementRuns: 5,
      placementMin: 1200,
      placementMax: 1800,
      shieldRuns: 3,
      bronzeLossPercent: 50,
      activeDays: 14,
      unlockRuns: 20,
      difficultyVersion: 1,
      difficultyFrom: 1000,
      difficultyStep: 250,
      maxDifficulty: 16,
      targets: [
        { rating: 0, score: 8000 },
        { rating: 1000, score: 31600 },
        { rating: 2000, score: 74100 },
      ],
      placementTargets: [
        { rating: 0, score: 8000 },
        { rating: 1000, score: 34000 },
        { rating: 2000, score: 100000 },
      ],
    },
    ...overrides,
  };
}

export function calibration(overrides: Partial<AdminCalibrationResponse> = {}): AdminCalibrationResponse {
  return {
    engineVersion: 2,
    difficultyVersion: 1,
    days: 30,
    minRuns: 10,
    players: 200,
    shares: { bronze: 20, silver: 35, gold: 25, platinum: 13, diamond: 6, master: 1 },
    settled: { bronze: 60, silver: 70, gold: 40, platinum: 20, diamond: 8, master: 2 },
    anchors: [
      { rating: 0, current: 8000, proposed: 9500 },
      { rating: 1000, current: 34000, proposed: 31000 },
      { rating: 2000, current: 100000, proposed: null },
    ],
    ...overrides,
  };
}

/** A profile photo's address, as the API serves it. */
export const AVATAR_URL = 'http://api.quezby.test/api/v1/media/avatars/0123456789abcdef01234567.jpg';

export function reportRow(overrides: Partial<AdminReportRow> = {}): AdminReportRow {
  return {
    player: { id: '01jplayer00000000000000000a', username: 'kerem.35', bannedAt: null },
    avatarUrl: AVATAR_URL,
    reasons: { photo: 2, name: 1 },
    reports: 3,
    firstAt: '2026-09-24T08:00:00.000Z',
    lastAt: '2026-09-25T08:00:00.000Z',
    ...overrides,
  };
}

export function reportsPage(rows: AdminReportRow[], overrides: Partial<AdminReportsResponse> = {}): AdminReportsResponse {
  return { ...page(rows), ...overrides };
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
      difficulty: 0,
      difficultyVersion: null,
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
      duel: null,
      rating: null,
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
    board: 'weekly',
    key: '2026-W39',
    season: 2,
    seasons: [2],
    number: null,
    startsAt: '2026-09-20T21:00:00.000Z',
    endsAt: '2026-09-27T21:00:00.000Z',
    ...overrides,
  };
}

export function boardKeys(overrides: Partial<AdminBoardKeysResponse> = {}): AdminBoardKeysResponse {
  return {
    board: 'weekly',
    season: 2,
    keys: [
      { key: '2026-W39', players: 40, number: null, topScore: 250311, topPlayer: { id: '01jplayer00000000000000000a', username: 'kerem.35', bannedAt: null }, attempts: null },
      { key: '2026-W38', players: 31, number: null, topScore: 99000, topPlayer: null, attempts: null },
    ],
    ...overrides,
  };
}

/** The first page of a long catalog: three posts on it, the top fives ranked by the API over all of them. */
export function contentResponse(overrides: Partial<AdminContentResponse> = {}): AdminContentResponse {
  const coffee = { contentId: 'skip-003', kind: 'skip', shows: 1000, likes: 0, misses: 400, likeRate: 0, missRate: 400 } as const;
  const cat = { contentId: 'like-001', kind: 'like', shows: 200, likes: 150, misses: 50, likeRate: 750, missRate: 250 } as const;
  const diamond = { contentId: 'hold-001', kind: 'hold', shows: 0, likes: 0, misses: 0, likeRate: null, missRate: null } as const;
  return {
    ...page([coffee, cat, diamond], { perPage: 3, total: 323 }),
    contentVersion: 1,
    totals: { shows: 1200, likes: 150, misses: 450 },
    topMissed: [coffee, cat],
    topLiked: [cat],
    ...overrides,
  };
}

export function adminAccount(overrides: Partial<AdminAccount> = {}): AdminAccount {
  return { ...adminMe(), disabledAt: null, createdAt: '2026-09-20T09:00:00.000Z', ...overrides };
}

export function system(overrides: Partial<AdminSystem> = {}): AdminSystem {
  return {
    environment: 'production',
    version: '1.00.00.12',
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
    appKey: true,
    gd: true,
    push: true,
    cached: { config: true, routes: true },
    pendingMigrations: [],
    runs: { open: 4, stale: 1 },
    limits: { reviewTopAll: 10, reviewTopWeekly: 3, leagueUnlockRuns: 20, runTtlMinutes: 120, adminTokenHours: 12 },
    ...overrides,
  };
}

/** Thirty days of a game in use: 40 players a day, rising, a few new ones each. */
export function analytics(overrides: Partial<AdminAnalytics> = {}): AdminAnalytics {
  const days = Array.from({ length: 30 }, (_, index) => `2026-09-${String(index + 1).padStart(2, '0')}`);
  return {
    serverTime: '2026-09-30T09:00:00.000Z',
    today: '2026-09-30',
    days: 30,
    collecting: { enabled: true, sample: 1000 },
    consent: { players: 1200, granted: 900, rate: 750, newPlayers: 200, newGranted: 170, newRate: 850 },
    now: { online: 17, active: 69, weekly: 240, monthly: 610, stickiness: 113 },
    series: {
      days,
      active: days.map((_, index) => 40 + index),
      newcomers: days.map((_, index) => index % 4),
      returning: days.map((_, index) => 40 + index - (index % 4)),
      visits: days.map((_, index) => 80 + index * 2),
      minutes: days.map((_, index) => 300 + index * 5),
      avgVisitSeconds: days.map((_, index) => (index === 0 ? null : 240 + index)),
    },
    retention: [
      { week: '2026-W40', players: 12, d1: 500, d3: null, d7: null, d14: null, d30: null },
      { week: '2026-W39', players: 20, d1: 450, d3: 300, d7: 150, d14: null, d30: null },
      { week: '2026-W38', players: 0, d1: null, d3: null, d7: null, d14: null, d30: null },
    ],
    funnel: [
      { step: 'joined', players: 170, rate: 1000 },
      { step: 'tutorial', players: 150, rate: 882 },
      { step: 'named', players: 120, rate: 706 },
      { step: 'protected', players: 40, rate: 235 },
      { step: 'first_run', players: 110, rate: 647 },
      { step: 'league', players: 60, rate: 353 },
      { step: 'returned', players: 70, rate: 438 },
    ],
    screens: [
      { screen: 'game', views: 900 },
      { screen: 'home', views: 800 },
      { screen: 'leaderboard', views: 300 },
    ],
    events: [
      { event: 'share_result', count: 40 },
      { event: 'rival', count: 25 },
      { event: 'unsent_run', count: 3 },
    ],
    devices: {
      total: 300,
      versions: [
        { platform: 'ios', value: '1.0.0', devices: 200, share: 667 },
        { platform: 'android', value: '1.0.0', devices: 100, share: 333 },
      ],
      systems: [
        { platform: 'ios', value: '18', devices: 180, share: 600 },
        { platform: 'android', value: '14', devices: 100, share: 333 },
        { platform: 'ios', value: '17', devices: 20, share: 67 },
      ],
      models: [
        { platform: 'ios', value: 'iPhone 15 Pro', devices: 90, share: 300 },
        { platform: 'android', value: 'Pixel 8', devices: 40, share: 133 },
      ],
    },
    storage: {
      visits: { rows: 5400, oldest: '2026-09-01T05:00:00.000Z', keepDays: 30 },
      days: { rows: 1800, oldest: '2026-07-03T21:00:00.000Z', keepDays: 90 },
      totals: { rows: 2100, oldest: '2026-06-01T21:00:00.000Z', keepDays: null },
      devices: { rows: 320, oldest: '2026-04-01T09:00:00.000Z', keepDays: 180 },
      milestones: 700,
      dropped: 4,
    },
    ...overrides,
  };
}

/** A player who said yes: two visits, a few active days and their firsts. */
export function playerActivity(overrides: Partial<AdminPlayerActivity> = {}): AdminPlayerActivity {
  const days = Array.from({ length: 30 }, (_, index) => `2026-09-${String(index + 1).padStart(2, '0')}`);
  return {
    status: 'tracked',
    consentAt: '2026-09-20T10:05:00.000Z',
    summary: { activeDays: 3, visits: 4, seconds: 1500, avgVisitSeconds: 375, firstDay: '2026-09-20', lastDay: '2026-09-25' },
    days: days.map((day) => ({
      day,
      visits: day === '2026-09-25' ? 2 : day === '2026-09-20' ? 1 : 0,
      seconds: day === '2026-09-25' ? 900 : day === '2026-09-20' ? 300 : 0,
    })),
    visits: [
      {
        id: 12,
        startedAt: '2026-09-25T08:00:00.000Z',
        seconds: 600,
        platform: 'ios',
        appVersion: '1.0.0',
        journey: [
          { code: 'home', at: 0 },
          { code: 'game', at: 10 },
          { code: 'share_result', at: 400 },
          { code: 'leaderboard', at: 420 },
        ],
      },
      { id: 11, startedAt: '2026-09-20T10:00:00.000Z', seconds: 300, platform: 'ios', appVersion: '1.0.0', journey: [] },
    ],
    milestones: [
      { milestone: 'joined', at: '2026-09-20T10:00:00.000Z' },
      { milestone: 'tutorial_done', at: '2026-09-20T10:03:00.000Z' },
      { milestone: 'first_run', at: '2026-09-20T10:10:00.000Z' },
    ],
    ...overrides,
  };
}
