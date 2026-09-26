/**
 * The admin panel's contract — `/api/v1/admin/*`, `docs/backend/admin-api.md`.
 *
 * Staff only: an admin token is refused by every player route and a player
 * token by every admin route. A change here is one commit that also touches
 * the Laravel controller it mirrors, `createAdminClient` in `@quezby/sdk` and
 * the panel screen that reads it.
 *
 * The panel judges nothing: every score, rank, flag and risk it shows is on
 * this side of the wire.
 */

import type {
  LeaderboardBoard,
  LeagueOutcome,
  LeagueTier,
  LeagueZone,
  Platform,
  PlayerStats,
  Ranks,
  RunMode,
  RunStats,
  SocialProvider,
} from './index';

/* -------------------------------------------------------------- admins -- */

/** Sahip: everything · Moderatör: moderation · İzleyici: reads only. */
export type AdminRole = 'owner' | 'moderator' | 'viewer';

export type AdminMe = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  /** A new account or a reset password: nothing else opens until it changes. */
  mustChangePassword: boolean;
  lastLoginAt: string | null;
};

export type AdminLoginRequest = { email: string; password: string };

/** A panel session: the token stops working at `expiresAt`. */
export type AdminSession = { token: string; expiresAt: string; admin: AdminMe };

export type AdminMeResponse = { admin: AdminMe };

export type AdminPasswordRequest = {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
};

export type AdminAccount = AdminMe & { disabledAt: string | null; createdAt: string };

export type AdminAccountsResponse = { admins: AdminAccount[] };

export type AdminCreateRequest = { name: string; email: string; role: AdminRole };

export type AdminUpdateRequest = { name?: string; role?: AdminRole; disabled?: boolean };

/** Shown once, never stored in the clear: the new admin changes it on first sign-in. */
export type AdminTemporaryPassword = { admin: AdminAccount; temporaryPassword: string };

/* -------------------------------------------------------------- paging -- */

export type AdminPageQuery = { page?: number; perPage?: number };

export type AdminPage<T> = { items: T[]; page: number; perPage: number; total: number };

/** `false` when there was nothing to do: already banned, no longer held… */
export type AdminActionResponse = { changed: boolean };

/** Every moderation decision says why; the reason goes to the audit log. */
export type AdminReasonRequest = { reason: string };

/** A player as other rows point at them. */
export type AdminPlayerRef = { id: string; username: string | null; bannedAt: string | null };

/* ------------------------------------------------------------- players -- */

export type AdminPlayerStatus = 'active' | 'banned' | 'guest';

export type AdminPlayerSort = 'newest' | 'oldest' | 'best' | 'lastPlayed';

export type AdminPlayersQuery = AdminPageQuery & {
  /** A username prefix, an email, an exact player id or install id. */
  search?: string;
  status?: AdminPlayerStatus;
  platform?: Platform;
  sort?: AdminPlayerSort;
};

export type AdminPlayerRow = AdminPlayerRef & {
  /** `guest48128742`: a name the player has not picked yet. */
  isAutoUsername: boolean;
  /** No email, Apple or Google attached: the account lives on one phone. */
  isGuest: boolean;
  email: string | null;
  platform: Platform | null;
  identities: SocialProvider[];
  /** This season's best score. */
  best: number | null;
  createdAt: string;
  lastPlayedAt: string | null;
};

export type AdminPlayersResponse = AdminPage<AdminPlayerRow> & {
  /** How many match the search and platform, per status chip. */
  counts: Record<'all' | AdminPlayerStatus, number>;
};

export type AdminIdentity = {
  provider: SocialProvider;
  email: string | null;
  emailVerified: boolean;
  lastUsedAt: string | null;
};

export type AdminDeviceCheck = {
  id: number;
  platform: Platform;
  verdict: 'pass' | 'fail';
  reason: string | null;
  details: Record<string, unknown> | null;
  checkedAt: string;
  expiresAt: string;
};

export type AdminPlayerDetail = AdminPlayerRow & {
  installId: string | null;
  banReason: string | null;
  /** Signed-in devices. A guest's token is its only key. */
  sessions: number;
  lastSeenAt: string | null;
  identityDetails: AdminIdentity[];
};

export type AdminLeagueSeat = {
  weekKey: string;
  groupId: number;
  tier: LeagueTier;
  rank: number;
  members: number;
  points: number;
  zone: LeagueZone;
};

export type AdminPlayerResponse = {
  player: AdminPlayerDetail;
  season: number;
  best: { score: number; reels: number; achievedAt: string; runId: string | null } | null;
  ranks: Ranks;
  stats: PlayerStats;
  league: AdminLeagueSeat | null;
  /** Every run the player ever started, by status. */
  runs: Partial<Record<AdminRunStatus, number>>;
  recentRuns: AdminRunRow[];
  /** Flag codes on the player's runs of the last 30 days. */
  flags: Array<{ code: RunFlagCode; severity: RunFlagSeverity; count: number }>;
  devices: AdminDeviceCheck[];
  /** Other accounts made on the same install. */
  sameInstall: AdminPlayerRef[];
  follows: { following: number; followers: number };
  audit: AdminAuditEntry[];
};

export type AdminRenameResponse = AdminActionResponse & { username: string };

/** `confirm` is the player's username, typed out. */
export type AdminDeletePlayerRequest = AdminReasonRequest & { confirm: string };

/* ---------------------------------------------------------------- runs -- */

export type AdminRunStatus =
  | 'started'
  | 'ranked'
  | 'flagged'
  | 'review'
  | 'rejected'
  | 'abandoned'
  | 'expired';

/**
 * Every signal the API can put on a run — `docs/product/scoring.md` → "Hile
 * koruması". Hard ones keep a run off every board; soft ones only hold a top
 * score for review.
 */
export type RunFlagCode =
  | 'wall_clock'
  | 'fast_decisions'
  | 'hold_bounds'
  | 'client_mismatch'
  | 'banned'
  | 'checkpoint_forged'
  | 'checkpoint_mismatch'
  | 'slow_motion'
  | 'device_integrity'
  | 'engine_error'
  | 'moderator'
  | 'reaction_cv'
  | 'floor_hugging'
  | 'perfect_share'
  | 'slow_timing'
  | 'checkpoint_missing'
  | 'device_unverified'
  | 'score_jump'
  | 'daily_shared_install';

export type RunFlagSeverity = 'hard' | 'soft';

export type AdminRunFlag = {
  code: RunFlagCode;
  severity: RunFlagSeverity;
  /** What the check measured, as stored: `elapsedMs`, `neededMs`, `reason`… */
  details: Record<string, string | number | boolean | null>;
};

export type AdminDeviceVerdict = 'pass' | 'fail';

export type AdminRunRow = {
  id: string;
  player: AdminPlayerRef;
  status: AdminRunStatus;
  mode: RunMode;
  dailyKey: string | null;
  score: number | null;
  reels: number | null;
  /** Per-mille. */
  accuracy: number | null;
  avgReactionMs: number | null;
  flags: AdminRunFlag[];
  deviceVerdict: AdminDeviceVerdict | null;
  appVersion: string | null;
  engineVersion: number;
  startedAt: string;
  finishedAt: string | null;
};

export type AdminRunSort = 'newest' | 'score';

export type AdminRunsQuery = AdminPageQuery & {
  status?: AdminRunStatus;
  mode?: RunMode;
  flag?: RunFlagCode;
  /** A player id. */
  player?: string;
  /** Istanbul days, `Y-m-d`, both inclusive. */
  from?: string;
  to?: string;
  sort?: AdminRunSort;
};

export type AdminRunsResponse = AdminPage<AdminRunRow> & {
  /** How many match the other filters, per status. */
  counts: Partial<Record<AdminRunStatus, number>>;
};

export type AdminGesture = 'none' | 'up' | 'like' | 'hold' | 'touch';

export type AdminVerdict =
  | 'hit'
  | 'perfect'
  | 'timeout'
  | 'wrong'
  | 'holdEarly'
  | 'holdLate'
  | 'caught'
  | 'drained';

export type AdminPostKind = 'skip' | 'like' | 'hold' | 'freeze';

/** One post of a run as the API's replay judged it. */
export type AdminRunStep = {
  index: number;
  kind: AdminPostKind;
  level: number;
  /** Milliseconds to act — or, on a freeze post, to keep hands off. */
  window: number;
  gesture: AdminGesture;
  /** When the player acted, ms after the post went live. */
  t: number;
  /** How long a hold lasted, ms. */
  d: number;
  verdict: AdminVerdict;
  points: number;
  bonusPoints: number;
  /** Per-mille. */
  combo: number;
  meter: number;
};

/** Why a run has no timeline: nothing to replay, another season's rules, or a log the engine refused. */
export type AdminTimelineUnavailable = 'no_log' | 'other_engine' | 'engine_error';

export type AdminRunDetail = AdminRunRow & {
  seed: number;
  contentVersion: number;
  hits: number | null;
  misses: number | null;
  perfects: number | null;
  maxStreak: number | null;
  /** Per-mille. */
  maxCombo: number | null;
  bonusPoints: number | null;
  level: number | null;
  activeMs: number | null;
  endedBy: 'drained' | 'penalty' | 'quit' | null;
  /** What the app said it scored; the API's own replay is `score`. */
  clientScore: number | null;
  clientReels: number | null;
  stats: RunStats | null;
};

export type AdminRunResponse = {
  run: AdminRunDetail;
  timeline: AdminRunStep[] | null;
  timelineUnavailable: AdminTimelineUnavailable | null;
  audit: AdminAuditEntry[];
};

/* ------------------------------------------------------------ suspects -- */

export type AdminSuspectWindow = 7 | 30;

export type AdminSuspectsQuery = AdminPageQuery & {
  days?: AdminSuspectWindow;
  includeBanned?: boolean;
};

export type AdminSuspect = {
  player: AdminPlayerRef & { platform: Platform | null; createdAt: string };
  /** The weighted sum of the player's signals in the window — `admin-api.md`. */
  risk: number;
  runs: {
    flagged: number;
    review: number;
    rejected: number;
    /** Ranked runs that carried a soft signal. */
    signalled: number;
  };
  codes: Array<{ code: RunFlagCode; severity: RunFlagSeverity; count: number }>;
  /** Device checks that failed in the window. */
  deviceFails: number;
  /** Other accounts on the same install. */
  sharedInstall: number;
  topScore: number | null;
  lastFlagAt: string | null;
};

export type AdminSuspectsResponse = AdminPage<AdminSuspect> & { days: AdminSuspectWindow };

/* ------------------------------------------------------------ overview -- */

export type AdminCounts = { review: number };

export type AdminOverview = {
  serverTime: string;
  season: number;
  /** The Istanbul day, `Y-m-d`. */
  today: string;
  /** Today's "Günün akışı" number. */
  dailyNumber: number;
  kpis: {
    players: number;
    newToday: number;
    activeToday: number;
    runsToday: number;
    rankedToday: number;
    flaggedToday: number;
    review: number;
    banned: number;
    dailyPlayers: number;
  };
  /** The last 30 Istanbul days, oldest first; every list is as long as `days`. */
  series: {
    days: string[];
    newPlayers: number[];
    activePlayers: number[];
    runs: number[];
    flagged: number[];
  };
  /** Flag codes on the runs of the last 7 days, most frequent first. */
  topFlags: Array<{ code: RunFlagCode; severity: RunFlagSeverity; count: number }>;
  /** Runs held for review, best first. */
  queue: AdminRunRow[];
};

/* -------------------------------------------------------------- boards -- */

export type AdminBoardQuery = AdminPageQuery & {
  board: LeaderboardBoard;
  /** `2026-09-24`, `2026-W39`, `2026-09` or `all`; the current period when left out. */
  key?: string;
  season?: number;
};

export type AdminBoardRow = {
  rank: number;
  player: AdminPlayerRef;
  score: number;
  reels: number;
  achievedAt: string;
  run: {
    id: string;
    status: AdminRunStatus;
    flags: AdminRunFlag[];
    deviceVerdict: AdminDeviceVerdict | null;
  } | null;
};

export type AdminBoardResponse = AdminPage<AdminBoardRow> & {
  board: LeaderboardBoard;
  key: string;
  season: number;
  /** Every season with rows, newest first. */
  seasons: number[];
  /** "Günün akışı #N" on the challenge board; none before its first day. */
  number: number | null;
  startsAt: string | null;
  endsAt: string | null;
};

export type AdminBoardKeysQuery = { board: LeaderboardBoard; season?: number; limit?: number };

export type AdminBoardKey = {
  key: string;
  players: number;
  /** "Günün akışı #N" — challenge only, and none before its first day. */
  number: number | null;
  topScore: number | null;
  topPlayer: AdminPlayerRef | null;
  /** Daily runs started that day, whatever became of them — challenge only. */
  attempts: number | null;
};

export type AdminBoardKeysResponse = {
  board: LeaderboardBoard;
  season: number;
  keys: AdminBoardKey[];
};

/* ------------------------------------------------------------- leagues -- */

export type AdminLeaguesQuery = AdminPageQuery & {
  /** `2026-W39`; this week when left out. */
  week?: string;
  tier?: LeagueTier;
};

export type AdminLeagueGroupRow = {
  id: number;
  tier: LeagueTier;
  members: number;
  settled: boolean;
  createdAt: string;
};

export type AdminLeaguesResponse = AdminPage<AdminLeagueGroupRow> & {
  season: number;
  weekKey: string;
  /** Weeks with groups this season, newest first. */
  weeks: string[];
  /** Seated players this week, per tier. */
  tiers: Record<LeagueTier, number>;
};

export type AdminLeagueStanding = {
  rank: number;
  player: AdminPlayerRef;
  points: number;
  daysPlayed: number;
  zone: LeagueZone;
  finalRank: number | null;
  outcome: LeagueOutcome | null;
};

export type AdminLeagueGroupResponse = {
  group: AdminLeagueGroupRow & { season: number; weekKey: string; startsAt: string; endsAt: string };
  promoteCount: number;
  demoteCount: number;
  standings: AdminLeagueStanding[];
  /** Seated, but banned: off the standings. */
  banned: AdminPlayerRef[];
};

/* ------------------------------------------------------------- content -- */

export type AdminContentSort = 'shows' | 'likeRate' | 'missRate';

export type AdminContentQuery = { kind?: AdminPostKind; sort?: AdminContentSort };

export type AdminContentRow = {
  /** `like-007` — the panel labels it from `@quezby/config`'s catalog. */
  contentId: string;
  kind: AdminPostKind;
  shows: number;
  likes: number;
  misses: number;
  /** Per-mille of shows; null before the post was ever shown. */
  likeRate: number | null;
  missRate: number | null;
};

export type AdminContentResponse = {
  contentVersion: number;
  items: AdminContentRow[];
  totals: { shows: number; likes: number; misses: number };
};

/* --------------------------------------------------------------- audit -- */

/** Where an action came from: the panel, `php artisan`, the ops routes, or the API itself. */
export type AdminAuditVia = 'panel' | 'cli' | 'ops' | 'system';

export type AdminAuditAction =
  | 'auth.login'
  | 'auth.password_changed'
  | 'player.ban'
  | 'player.unban'
  | 'player.rename'
  | 'player.sign_out'
  | 'player.delete'
  | 'run.approve'
  | 'run.reject'
  | 'admin.create'
  | 'admin.update'
  | 'admin.reset_password'
  | 'system.migrate'
  | 'system.optimize'
  | 'system.expire_runs';

export type AdminAuditSubjectType = 'player' | 'run' | 'admin' | 'system';

export type AdminAuditEntry = {
  id: number;
  at: string;
  via: AdminAuditVia;
  /** The admin who acted — or who the CLI and ops routes stand for. */
  actor: { id: string | null; name: string };
  action: AdminAuditAction;
  subject: { type: AdminAuditSubjectType; id: string | null; label: string | null };
  reason: string | null;
  details: Record<string, unknown> | null;
  /** Only an owner sees it. */
  ip: string | null;
};

export type AdminAuditQuery = AdminPageQuery & {
  action?: AdminAuditAction;
  via?: AdminAuditVia;
  /** An admin id. */
  admin?: string;
  subjectType?: AdminAuditSubjectType;
  subjectId?: string;
};

/* -------------------------------------------------------------- system -- */

export type AdminSystem = {
  environment: string;
  php: string;
  laravel: string;
  database: string;
  timezone: string;
  serverTime: string;
  season: number;
  engineVersion: number;
  contentVersion: number;
  integrityMode: 'off' | 'log' | 'enforce';
  dailyEpoch: string;
  apps: Record<Platform, { min: string; latest: string }>;
  /** Whether each shared secret is set — never the secret itself. */
  tokens: { ops: boolean; moderation: boolean };
  /**
   * Whether APP_KEY is set and well-formed — never the key. Checkpoint
   * receipts are signed and Apple's refresh tokens encrypted with it: without
   * it every player request answers 500, while the panel stays open.
   */
  appKey: boolean;
  cached: { config: boolean; routes: boolean };
  pendingMigrations: string[];
  runs: { open: number; stale: number };
  limits: {
    reviewTopAll: number;
    reviewTopWeekly: number;
    leagueGroupSize: number;
    leagueUnlockRuns: number;
    runTtlMinutes: number;
    adminTokenHours: number;
  };
};

export type AdminSystemAction = 'migrate' | 'optimize' | 'expire-runs';

export type AdminSystemActionResponse = { output: string };
