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
  AnalyticsCode,
  AnalyticsEvent,
  AnalyticsScreen,
  DuelStatus,
  LeaderboardBoard,
  LeagueTier,
  Locale,
  Platform,
  PlayerStats,
  RatingChange,
  RatingPlacement,
  Ranks,
  ReportReason,
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
  /** The player's profile photo, as players see it; null for none. */
  avatarUrl: string | null;
  /** `guest48128742`: a name the player has not picked yet. */
  isAutoUsername: boolean;
  /** No email, Apple or Google attached: the account lives on one phone. */
  isGuest: boolean;
  email: string | null;
  platform: Platform | null;
  identities: SocialProvider[];
  /** The language the player plays in (`Me.locale`). */
  locale: Locale;
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
  /** When the player said yes to usage analytics; null while they have not. */
  analyticsAt: string | null;
};

/**
 * One phone the player used, from the device registry — kept for every
 * player, consent or not, for support and security (`docs/product/analytics.md`).
 */
export type AdminPlayerDevice = {
  installId: string;
  platform: Platform | null;
  osVersion: string | null;
  model: string | null;
  appVersion: string | null;
  appBuild: string | null;
  firstSeenAt: string;
  /** The day it was last seen: the registry writes once a day. */
  lastSeenAt: string;
  /** Other accounts seen on the same install. */
  others: AdminPlayerRef[];
};

/** One change of a rating as the panel shows it: why, by how much, and the runs that did not count too. */
export type AdminRatingChange = RatingChange & {
  id: number;
  /** The rating whose typical score the run's was. */
  performance: number | null;
  /** The width the run was measured with: smaller while provisional. */
  width: number | null;
  shielded: boolean;
  engineVersion: number | null;
  /** False for a run that did not count (`void`). */
  counted: boolean;
};

/** A player's rating — null in `AdminPlayerResponse` for a player never rated. */
export type AdminPlayerRating = {
  rating: number | null;
  tier: LeagueTier | null;
  peak: number | null;
  /** The next run's target. */
  target: number | null;
  /** The difficulty the next rated run is played at; null until placed. */
  difficulty: number | null;
  placement: RatingPlacement | null;
  provisionalLeft: number;
  shield: { tier: LeagueTier; runs: number } | null;
  ratedRuns: number;
  ratedAt: string | null;
  /** The last thirty changes, newest first. */
  history: AdminRatingChange[];
};

/** What a run did to its player's rating, and what a moderator's reject took back. */
export type AdminRunRating = AdminRatingChange & { reversedBy: number | null };

export type AdminPlayerResponse = {
  player: AdminPlayerDetail;
  season: number;
  best: { score: number; reels: number; achievedAt: string; runId: string | null } | null;
  ranks: Ranks;
  stats: PlayerStats;
  rating: AdminPlayerRating | null;
  /** Every run the player ever started, by status. */
  runs: Partial<Record<AdminRunStatus, number>>;
  recentRuns: AdminRunRow[];
  /** Flag codes on the player's runs of the last 30 days. */
  flags: Array<{ code: RunFlagCode; severity: RunFlagSeverity; count: number }>;
  devices: AdminDeviceCheck[];
  /** Other accounts made on the same install. */
  sameInstall: AdminPlayerRef[];
  /** The phones the player used, most recently seen first. */
  installs: AdminPlayerDevice[];
  /** Friends who are not banned, and how many players have blocked this one — a sign worth a look. */
  social: { friends: number; blockedBy: number };
  /** Reports still open about the player's photo and name. */
  openReports: { photo: number; name: number };
  audit: AdminAuditEntry[];
};

export type AdminRenameResponse = AdminActionResponse & { username: string };

/**
 * `POST /admin/players/{id}/rating`: sets the player's rating (qb) by hand.
 * It places a player not placed yet and opens Dereceli to them; the player
 * sees it as an `adjust` in their history.
 */
export type AdminSetRatingRequest = AdminReasonRequest & { rating: number };

export type AdminSetRatingResponse = AdminActionResponse & { rating: number; tier: LeagueTier };

/** `confirm` is the player's username, typed out. */
export type AdminDeletePlayerRequest = AdminReasonRequest & { confirm: string };

/* ---------------------------------------------------------------- runs -- */

export type AdminRunStatus =
  | 'started'
  | 'ranked'
  | 'flagged'
  | 'review'
  /** A clean VS run: it settled its VS and ranks nowhere. */
  | 'played'
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

/** The VS a `vs` run belongs to: who sent it, who answered, and how it stands. */
export type AdminRunDuel = {
  id: string;
  status: DuelStatus;
  challenger: AdminPlayerRef;
  opponent: AdminPlayerRef;
  /** Null until that side has played, and for a run left unfinished. */
  challengerScore: number | null;
  opponentScore: number | null;
  /** Null until it is finished, and for a draw. */
  winnerId: string | null;
};

export type AdminRunDetail = AdminRunRow & {
  seed: number;
  contentVersion: number;
  /** The Dereceli difficulty the run was played and replayed at; 0 for every run but a rated one. */
  difficulty: number;
  /** The difficulty table a rated run was played on; null for any other run, and rated runs from before it. */
  difficultyVersion: number | null;
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
  /** Set for a `vs` run; null for any other. */
  duel: AdminRunDuel | null;
  /** Null for a run that never reached the rating: a VS, one still open or held for review. */
  rating: AdminRunRating | null;
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

/** What the sidebar's badges count: runs held for review, and players with a report still open. */
export type AdminCounts = { review: number; reports: number };

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

/* ------------------------------------------------------------- reports -- */

export type AdminReportStatus = 'open' | 'resolved' | 'dismissed';

export type AdminReportsQuery = AdminPageQuery & { status?: AdminReportStatus };

/** A player others reported: a row per player, the newest trouble first. */
export type AdminReportRow = {
  player: AdminPlayerRef | null;
  /** Their photo as it is now; null when they have none left. */
  avatarUrl: string | null;
  /** Reports about the photo and about the name. */
  reasons: Record<ReportReason, number>;
  reports: number;
  firstAt: string;
  lastAt: string;
};

export type AdminReportsResponse = AdminPage<AdminReportRow>;

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

/* ------------------------------------------------------------- ratings -- */

export type AdminRatingRow = {
  player: AdminPlayerRef;
  rating: number;
  tier: LeagueTier;
  /** The Dereceli difficulty the rating plays at, 0–16. */
  difficulty: number;
  peak: number | null;
  ratedAt: string | null;
};

/** `GET /admin/ratings`. */
export type AdminRatingsResponse = {
  /** Placed players per league, banned ones left out… */
  tiers: Record<LeagueTier, number>;
  /** …and those of them with a counted run in the last two weeks. */
  active: Record<LeagueTier, number>;
  /** Players still in their placement runs. */
  placing: number;
  /** The highest fifty. */
  top: AdminRatingRow[];
  /** The rules the ratings run on (`config/quezby.php` › `rating`). */
  rules: {
    engineVersion: number;
    maxDelta: number;
    width: number;
    provisionalWidth: number;
    provisionalRuns: number;
    placementRuns: number;
    placementMin: number;
    placementMax: number;
    shieldRuns: number;
    bronzeLossPercent: number;
    /** A player counts as active — on the Elo board, in `active` — with a counted run in this many days. */
    activeDays: number;
    /** Counted free and daily runs before Dereceli opens. */
    unlockRuns: number;
    /** Dereceli's difficulty table (`@quezby/engine`'s `DIFFICULTY_VERSION`). */
    difficultyVersion: number;
    /** Difficulty 0 below this rating, then one more every `difficultyStep` Elo, up to `maxDifficulty`. */
    difficultyFrom: number;
    difficultyStep: number;
    maxDifficulty: number;
    /** Rating → the score a player of it typically makes at the difficulty that rating plays. */
    targets: Array<{ rating: number; score: number }>;
    /** Rating → the typical score at difficulty 0, what the placement runs are measured with. */
    placementTargets: Array<{ rating: number; score: number }>;
  };
};

export type AdminCalibrationQuery = { days?: number };

/**
 * `GET /admin/ratings/calibration`: how the target table fits the players
 * who played enough in the window, and the anchors that would hold the
 * leagues' shares. Nothing is changed: a new table is a config change.
 */
export type AdminCalibrationResponse = {
  engineVersion: number;
  /** The difficulty table whose targets are calibrated, from the rated runs played on it. */
  difficultyVersion: number;
  days: number;
  minRuns: number;
  /** Players with `minRuns` counted runs in the window. */
  players: number;
  /** The share each league should hold, per cent. */
  shares: Record<LeagueTier, number>;
  /** Where those players' medians settle with today's table. */
  settled: Record<LeagueTier, number>;
  anchors: Array<{ rating: number; current: number | null; proposed: number | null }>;
};

/* ------------------------------------------------------------- content -- */

export type AdminContentSort = 'shows' | 'likeRate' | 'missRate';

export type AdminContentQuery = AdminPageQuery & { kind?: AdminPostKind; sort?: AdminContentSort };

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

/**
 * A page of the catalog's posts, shown or not. `totals` and the two top
 * fives cover every post of the kind asked for, not just this page.
 */
export type AdminContentResponse = AdminPage<AdminContentRow> & {
  contentVersion: number;
  totals: { shows: number; likes: number; misses: number };
  /** The five highest miss rates among the posts ever missed. */
  topMissed: AdminContentRow[];
  /** The five highest like rates among the posts ever liked. */
  topLiked: AdminContentRow[];
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
  /** A moderator took a player's photo down. */
  | 'player.avatar_remove'
  /** A moderator let a player's open reports go. */
  | 'player.reports_dismiss'
  /** An owner set a player's rating (qb) by hand; `details` holds `from`, `to` and the leagues. */
  | 'player.rating'
  | 'run.approve'
  | 'run.reject'
  | 'admin.create'
  | 'admin.update'
  | 'admin.reset_password'
  | 'system.migrate'
  | 'system.optimize'
  | 'system.expire_runs'
  | 'system.analytics_prune'
  /** An owner sent a push to the players a filter picked; `details`: `campaign`, `title`, `body`, `filters`, `players`, `devices`. */
  | 'push.campaign'
  /** An owner stopped a push still going out; `details`: `campaign`, `sent`, `failed`, `devices`. */
  | 'push.campaign_stop';

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

/* ---------------------------------------------------------------- push -- */

/**
 * Who a push from the panel's Push bildirimi page goes to. Every filter
 * narrows; a banned player is never picked; only a player with a phone
 * registered for pushes gets one.
 */
export type AdminPushFilters = {
  /** One player, by name (`@` optional). */
  username?: string;
  /** Dereceli leagues; `none` — players with no league yet. */
  tiers?: Array<LeagueTier | 'none'>;
  /** Today's Günün akışı. */
  daily?: 'played' | 'not_played';
  /** Started a run in the last N days (1–365). */
  playedWithinDays?: number;
  /** No run in the last N days, never counts too (1–365). */
  notPlayedForDays?: number;
  /** An account made in the last N days. */
  joinedWithinDays?: number;
  platform?: Platform;
  locales?: Locale[];
  /** `guest`: no email, no Apple or Google; `registered`: one of them. */
  account?: 'guest' | 'registered';
};

/** `POST /admin/push/audience` `{ filters }` (owner): how many it picks; changes nothing. */
export type AdminPushAudience = {
  players: number;
  /** Of them, with a phone registered for pushes. */
  reachable: number;
  devices: number;
  ios: number;
  android: number;
};

/** `POST /admin/push/campaigns` (owner): a title of at most 60 characters, words of at most 240. */
export type AdminPushCampaignRequest = { title: string; body: string; filters: AdminPushFilters };

export type AdminPushCampaignStatus = 'sending' | 'done' | 'stopped';

/**
 * A push from the panel. It goes out a batch of phones at a time
 * (`POST …/{id}/step`, by the open page or by cron) until none are left.
 */
export type AdminPushCampaign = {
  id: number;
  title: string;
  body: string;
  filters: AdminPushFilters;
  status: AdminPushCampaignStatus;
  /** Players and phones the filter found when it was sent. */
  players: number;
  devices: number;
  /** Phones Firebase took, and refused; `dropped` — of the refused, ones Firebase no longer knows (taken off). */
  sent: number;
  failed: number;
  dropped: number;
  /** What Firebase said, the most frequent first. */
  errors: Array<{ error: string; count: number }>;
  admin: string;
  createdAt: string;
  finishedAt: string | null;
};

/* ---------------------------------------------------------------- logs -- */

export type AdminLogLevel = 'error' | 'warning' | 'info';

/**
 * Where a row comes from: `api` — an API answer of 400 or more (not a 401 or
 * a 404) or an exception; `external` — a failed call to Firebase, Google or
 * Apple; `push` — what a push did, sent or why not; `app` — an error a phone
 * sent in (`POST /me/logs`).
 */
export type AdminLogSource = 'api' | 'external' | 'push' | 'app';

export type AdminLogEntry = {
  id: number;
  at: string;
  level: AdminLogLevel;
  source: AdminLogSource;
  /**
   * `validation_failed`, `exception` (api); `firebase`, `google_oauth`,
   * `google_keys`, `play_integrity`, `apple` or a host (external);
   * `push.sent`, `push.no_device`, `push.muted`, `push.disabled`,
   * `push.not_configured`, `push.no_access_token`, `push.token_dropped`
   * (push); whatever the phone named it (app).
   */
  event: string;
  message: string;
  status: number | null;
  method: string | null;
  /** The API's path, or an outside call's host and path — never a query string. */
  path: string | null;
  durationMs: number | null;
  /** Who asked, or whom a push was for; `username` is null once the account is gone. */
  player: { id: string; username: string | null } | null;
  platform: string | null;
  appVersion: string | null;
  /** What else is known: a service's answer, validation fields, a stack's first frames — secrets hidden. */
  context: Record<string, unknown> | null;
};

export type AdminLogsQuery = AdminPageQuery & {
  level?: AdminLogLevel;
  source?: AdminLogSource;
  event?: string;
  /** A player id. */
  player?: string;
  status?: number;
};

/**
 * `GET /admin/logs` (moderator): rows newest first, kept by level — an error
 * 90 days, a warning 14, an info 3 (`quezby.logs.keep_days`). Paged without a
 * total (the table can hold millions): `hasMore` says whether a next page is
 * there.
 */
export type AdminLogsResponse = {
  items: AdminLogEntry[];
  page: number;
  perPage: number;
  hasMore: boolean;
  /** The events of the days rows are kept — of the source asked for, when one is. */
  events: string[];
};

/** `30d`: a bucket a day for thirty days; `12m`: a bucket a month for twelve. */
export type AdminLogRange = '30d' | '12m';

export type AdminLogCounts = { error: number; warning: number; info: number };

/**
 * `GET /admin/logs/summary?range=` (moderator): what the daily counts
 * (`system_log_days`, kept for good, dropped rows counted too) say.
 */
export type AdminLogSummary = {
  range: AdminLogRange;
  /** Oldest first; `key` is `2026-10-01` by day, `2026-10` by month — the game's days. */
  buckets: Array<{ key: string } & AdminLogCounts>;
  totals: AdminLogCounts;
  /** The twenty events seen most in the range, the most first. */
  top: Array<{ source: AdminLogSource; event: string; level: AdminLogLevel; total: number }>;
};

/* -------------------------------------------------------------- system -- */

export type AdminSystem = {
  environment: string;
  /** The release the API was deployed as (`1.00.00.01`); null when it was never deployed. */
  version: string | null;
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
  /** Whether PHP's GD extension is there: profile photos are re-encoded with it. */
  gd: boolean;
  /** Whether pushes can go out: switched on, with the Firebase project and its key. */
  push: boolean;
  cached: { config: boolean; routes: boolean };
  pendingMigrations: string[];
  runs: { open: number; stale: number };
  limits: {
    reviewTopAll: number;
    reviewTopWeekly: number;
    leagueUnlockRuns: number;
    runTtlMinutes: number;
    adminTokenHours: number;
  };
};

export type AdminSystemAction = 'migrate' | 'optimize' | 'expire-runs' | 'analytics-prune';

export type AdminSystemActionResponse = { output: string };

/* ----------------------------------------------------------- analytics -- */

/** How many Istanbul days the analytics page covers. */
export type AdminAnalyticsWindow = 30 | 90;

export type AdminAnalyticsQuery = { days?: AdminAnalyticsWindow };

/** A new player's first steps, in the order they usually come. */
export type AdminFunnelStep =
  | 'joined'
  | 'tutorial'
  | 'named'
  | 'protected'
  | 'first_run'
  | 'league'
  | 'returned';

/** One kept layer of analytics: how many rows, since when, and how long rows stay (null: for good). */
export type AdminStorageTier = { rows: number; oldest: string | null; keepDays: number | null };

/** Devices of one kind — an app version, a system, a model — and their share of all, per-mille. */
export type AdminDeviceSlice = {
  platform: Platform | null;
  value: string | null;
  devices: number;
  share: number;
};

/**
 * `GET /admin/analytics` — how the game is used. Everything but `now.online`
 * and `devices` counts only the players who said yes to usage analytics.
 */
export type AdminAnalytics = {
  serverTime: string;
  /** The Istanbul day, `Y-m-d`. */
  today: string;
  days: AdminAnalyticsWindow;
  /** Whether the API keeps analytics at all, and for how many of every 1000 consenting players. */
  collecting: { enabled: boolean; sample: number };
  /** Who said yes: of every player, and of those who joined in the window — rates per-mille. */
  consent: {
    players: number;
    granted: number;
    rate: number | null;
    newPlayers: number;
    newGranted: number;
    newRate: number | null;
  };
  now: {
    /** Players whose app talked to the API in the last few minutes — everyone, consent or not. */
    online: number;
    /** Players active today, and over the last 7 and 30 days, rolling. */
    active: number;
    weekly: number;
    monthly: number;
    /** Today's active over the last 30 days', per-mille. */
    stickiness: number | null;
  };
  /** One entry per Istanbul day of the window, oldest first; every list is as long as `days`. */
  series: {
    days: string[];
    active: number[];
    /** Active on the day they joined. */
    newcomers: number[];
    returning: number[];
    visits: number[];
    /** Time in the foreground, whole minutes. */
    minutes: number[];
    avgVisitSeconds: Array<number | null>;
  };
  /**
   * Weekly cohorts of players active on the day they joined, newest first:
   * how many of them came back on day N, per-mille — null until day N has
   * passed for someone in the cohort.
   */
  retention: Array<{
    week: string;
    players: number;
    d1: number | null;
    d3: number | null;
    d7: number | null;
    d14: number | null;
    d30: number | null;
  }>;
  /**
   * Players who joined in the window and were active on their first day:
   * how many took each step, and the share of those who could have — per-mille.
   */
  funnel: Array<{ step: AdminFunnelStep; players: number; rate: number | null }>;
  /** How often each screen was opened in the window, most first. */
  screens: Array<{ screen: AnalyticsScreen; views: number }>;
  /** How often each moment happened in the window, most first. */
  events: Array<{ event: AnalyticsEvent; count: number }>;
  /** Every player's phones seen in the last 7 days — the device registry, consent or not. */
  devices: {
    total: number;
    versions: AdminDeviceSlice[];
    systems: AdminDeviceSlice[];
    models: AdminDeviceSlice[];
  };
  /** What analytics keeps, so its growth shows. */
  storage: {
    visits: AdminStorageTier;
    days: AdminStorageTier;
    totals: AdminStorageTier;
    devices: AdminStorageTier;
    milestones: number;
    /** Visits and codes turned away in the last 7 days: stale, unknown, over a limit. */
    dropped: number;
  };
};

/**
 * Why a player's activity shows or not: kept; they have not said yes;
 * outside the share of players kept; analytics switched off.
 */
export type AdminActivityStatus = 'tracked' | 'no_consent' | 'not_sampled' | 'disabled';

/** A first in a player's life, from the app (with consent) or from what the API already knows. */
export type AdminMilestone =
  | 'joined'
  | 'tutorial_done'
  | 'nickname_skip'
  | 'protect_skip'
  | 'protect_reminder'
  | 'protected'
  | 'first_run'
  | 'league';

/** One visit: when, how long, and where the player went, in order. */
export type AdminVisit = {
  id: number;
  startedAt: string;
  seconds: number;
  platform: Platform | null;
  appVersion: string | null;
  /** Screens and moments, each with the seconds since the visit began. */
  journey: Array<{ code: AnalyticsCode; at: number }>;
};

/** `GET /admin/players/{id}/activity`. */
export type AdminPlayerActivity = {
  status: AdminActivityStatus;
  consentAt: string | null;
  /** The last 30 Istanbul days. */
  summary: {
    activeDays: number;
    visits: number;
    seconds: number;
    avgVisitSeconds: number | null;
    firstDay: string | null;
    lastDay: string | null;
  };
  /** The last 30 Istanbul days, oldest first. */
  days: Array<{ day: string; visits: number; seconds: number }>;
  /** The latest visits, newest first — at most 20. */
  visits: AdminVisit[];
  /** Oldest first. */
  milestones: Array<{ milestone: AdminMilestone; at: string }>;
};
