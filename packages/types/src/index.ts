/**
 * The contract between `apps/mobile` and `apps/api`.
 *
 * A change here is one commit that also touches the Laravel resource or
 * request it mirrors and `@quezby/sdk` — see `docs/backend/api-contract.md`.
 *
 * Every number a player sees after a run is on this side of the wire: the app
 * runs the engine only to draw the game, and shows what the API answers.
 */

/* ------------------------------------------------------------ identity -- */

export type Platform = 'ios' | 'android';

export type SocialProvider = 'apple' | 'google';

export type UserSettings = {
  haptics: boolean;
};

export type BestScore = {
  score: number;
  reels: number;
  achievedAt: string;
};

export type Me = {
  id: string;
  /** Null until the player picks one; nothing ranked is shown without it. */
  username: string | null;
  /** The email a password sign-in uses, when one is linked. */
  email: string | null;
  /** No email, Apple or Google attached yet — the account lives on this phone. */
  isGuest: boolean;
  /** Apple and Google accounts that can sign in to this player. */
  identities: SocialProvider[];
  settings: UserSettings;
  /** This season's best — see `LeaderboardResponse.season`. */
  best: BestScore | null;
  createdAt: string;
};

export type Ranks = {
  daily: number | null;
  weekly: number | null;
  monthly: number | null;
  all: number | null;
};

export type MeResponse = { user: Me; ranks: Ranks };

export type GuestSignUpRequest = {
  platform: Platform;
  /** A random id minted on first launch, kept until the app is deleted. */
  installId: string;
};

export type LoginRequest = { email: string; password: string };

export type AuthResponse = { token: string; user: Me };

/** A single-use nonce for Sign in with Apple; it must come back inside the identity token. */
export type NonceResponse = { nonce: string; expiresAt: string };

export type AppleSignInRequest = {
  identityToken: string;
  /** The raw nonce from `POST /auth/nonce`; the token carries its SHA-256. */
  nonce: string;
  /** Lets the API revoke Apple's grant when the account is deleted. */
  authorizationCode?: string | null;
  platform: Platform;
  installId: string;
};

export type GoogleSignInRequest = {
  idToken: string;
  platform: Platform;
  installId: string;
};

/** `created` is true when the Apple or Google account was new to Quezby. */
export type SocialAuthResponse = AuthResponse & { created: boolean };

export type AppleLinkRequest = Omit<AppleSignInRequest, 'platform' | 'installId'>;

export type GoogleLinkRequest = Omit<GoogleSignInRequest, 'platform' | 'installId'>;

export type LinkCredentialsRequest = { email: string; password: string };

export type UpdateUsernameRequest = { username: string };

export type UsernameAvailability = {
  username: string;
  available: boolean;
  /** Why it cannot be had; null when available. */
  reason: string | null;
};

export type UpdateSettingsRequest = Partial<UserSettings>;

/* ---------------------------------------------------------------- runs -- */

/** `[gesture, t, d]` — see `@quezby/engine`'s `Action`. */
export type RunAction = [number, number, number];

/** `free`: any number a day. `daily`: "Günün akışı" — one attempt, the same seed for everyone. */
export type RunMode = 'free' | 'daily';

export type StartRunRequest = {
  mode: RunMode;
  /** The engine this build plays with; another one cannot rank. */
  engineVersion: number;
  /** The content catalog this build draws reels from. */
  contentVersion: number;
};

export type StartRunResponse = {
  runId: string;
  seed: number;
  engineVersion: number;
  contentVersion: number;
  mode: RunMode;
  /** The Istanbul day of a daily run, `2026-09-24`; null for a free run. */
  dayKey: string | null;
  startedAt: string;
};

export type FinishRunRequest = {
  actions: RunAction[];
  /** What the app showed, for the API to compare against its own replay. */
  clientScore: number;
  clientReels: number;
};

/**
 * `ranked` counts; `flagged` failed a plausibility check and stays off the
 * boards; `review` is a top score held back until a person looks at it.
 */
export type RunStatus = 'ranked' | 'flagged' | 'review';

export type BonusKind = 'flawless' | 'lightning' | 'coolHead' | 'comeback';

export type BonusCounts = Record<BonusKind, number>;

/** What the server's replay counted, reel by reel. */
export type RunStats = {
  swipes: number;
  likes: number;
  holds: number;
  perfects: number;
  /** Freeze reels left alone. */
  freezes: number;
  misses: {
    timeout: number;
    wrong: number;
    holdEarly: number;
    holdLate: number;
    caught: number;
  };
  /** Mean decision time on swipes and likes, ms. */
  avgReactionMs: number;
  bestReactionMs: number | null;
  /** Misses per 20-reel level, in order — the share grid. */
  levelMisses: number[];
};

export type RunBreakdown = {
  /** What the reels paid. */
  reelPoints: number;
  /** What the named combos paid, together. */
  bonusPoints: number;
  /** Each named combo: how often it went off and what it paid. */
  bonuses: Record<BonusKind, { count: number; points: number }>;
};

export type RunResult = {
  runId: string;
  mode: RunMode;
  status: RunStatus;
  score: number;
  reels: number;
  hits: number;
  misses: number;
  perfects: number;
  maxStreak: number;
  level: number;
  accuracy: number;
  avgReactionMs: number;
  activeMs: number;
  endedBy: 'drained' | 'penalty' | 'quit';
  /** The highest combo reached, per-mille (1500 = x1,50). */
  maxCombo: number;
  breakdown: RunBreakdown;
  stats: RunStats;
};

export type RankChange = { before: number | null; after: number | null };

/** Someone this run overtook on today's board. */
export type PassedPlayer = { username: string; score: number; isFollowing: boolean };

export type DailyResult = {
  dayKey: string;
  /** "Günün akışı #17": days since the first one. */
  number: number;
  rank: number | null;
  players: number;
  /** One square per level: 🟩 no miss, 🟨 one or two, 🟥 more, ⬛ where the run ended. */
  grid: string;
  shareText: string;
};

export type LeagueTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export type LeagueZone = 'promote' | 'stay' | 'demote';

export type LeagueStanding = {
  tier: LeagueTier;
  rank: number;
  members: number;
  zone: LeagueZone;
  points: number;
};

export type FinishRunResponse = {
  run: RunResult;
  /** This season's best, after this run. */
  best: BestScore | null;
  isNewBest: boolean;
  ranks: Ranks;
  rankChanges: Record<LeaderboardPeriod, RankChange>;
  passed: PassedPlayer[];
  /** Set for a daily run. */
  daily: DailyResult | null;
  /** Where this week's league stands after the run; null when it did not rank. */
  league: LeagueStanding | null;
  /** What "Paylaş" sends, written by the API from its own numbers. */
  shareText: string;
};

/* --------------------------------------------------------- leaderboard -- */

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all';

/** A period, or `challenge`: today's "Günün akışı" board. */
export type LeaderboardBoard = LeaderboardPeriod | 'challenge';

export type LeaderboardScope = 'everyone' | 'friends';

export type LeaderboardEntry = {
  rank: number;
  username: string;
  score: number;
  reels: number;
  isMe: boolean;
  isFollowing: boolean;
  /** Points needed to pass the row above (ties go to whoever got there first). Null at #1. */
  gap: number | null;
};

export type LeaderboardResponse = {
  board: LeaderboardBoard;
  /** `2026-09-24`, `2026-W39`, `2026-09` or `all`, in Europe/Istanbul. */
  periodKey: string;
  /** The engine version the board belongs to; a rules change starts a new season. */
  season: number;
  scope: LeaderboardScope;
  startsAt: string | null;
  /** When the period turns over; null for all time. Count down with `serverTime`, not the phone's clock. */
  endsAt: string | null;
  serverTime: string;
  entries: LeaderboardEntry[];
  /** The caller's own row, also when it is outside `entries`. */
  me: LeaderboardEntry | null;
  /** Two rows above the caller, the caller, two below. */
  neighbors: LeaderboardEntry[];
  /** The player right above the caller and the points needed to pass them. */
  rival: { entry: LeaderboardEntry; gap: number } | null;
  /** How far the caller's score is towards passing the rival, per-mille. */
  nextRankProgress: number | null;
  players: number;
};

/* --------------------------------------------------------------- daily -- */

export type DailyAttempt = {
  /** `unfinished` while the run is open; `void` when it was abandoned, expired or rejected. */
  status: RunStatus | 'unfinished' | 'void';
  score: number | null;
  rank: number | null;
  grid: string | null;
  shareText: string | null;
};

export type DailyResponse = {
  dayKey: string;
  number: number;
  endsAt: string;
  serverTime: string;
  /** Null until today's one attempt is started. */
  attempt: DailyAttempt | null;
  top: LeaderboardEntry[];
  me: LeaderboardEntry | null;
  players: number;
};

/* -------------------------------------------------------------- league -- */

export type LeagueMember = {
  rank: number;
  username: string;
  /** The sum of the player's best score of each day this week. */
  points: number;
  daysPlayed: number;
  isMe: boolean;
  isFollowing: boolean;
  zone: LeagueZone;
  gap: number | null;
};

export type LeagueOutcome = 'promoted' | 'stayed' | 'demoted';

export type LeagueResponse = {
  season: number;
  /** `2026-W39`, Europe/Istanbul. */
  weekKey: string;
  tier: LeagueTier;
  endsAt: string;
  serverTime: string;
  /** False until the week's first ranked run seats the player in a group. */
  joined: boolean;
  members: LeagueMember[];
  me: LeagueMember | null;
  promoteCount: number;
  demoteCount: number;
  /** Points that would take the caller into the promotion zone; null when already in it or there is no way up. */
  promotionGap: number | null;
  /** How far the caller's points are towards passing the member above, per-mille. */
  nextRankProgress: number | null;
  lastWeek: {
    weekKey: string;
    tier: LeagueTier;
    rank: number;
    members: number;
    outcome: LeagueOutcome;
    newTier: LeagueTier;
  } | null;
};

/* --------------------------------------------------------------- social -- */

export type PlayerSummary = {
  username: string;
  best: number | null;
  league: LeagueTier | null;
  isFollowing: boolean;
};

export type PlayerCard = {
  username: string;
  createdAt: string;
  best: BestScore | null;
  league: LeagueTier | null;
  ranks: { weekly: number | null; all: number | null };
  stats: { runs: number; reels: number; likes: number; perfects: number };
  followers: number;
  following: number;
  isFollowing: boolean;
  followsMe: boolean;
  isMe: boolean;
};

export type PlayerResponse = { player: PlayerCard };

export type UserSearchResponse = { users: PlayerSummary[] };

export type FollowListResponse = { users: PlayerSummary[]; nextCursor: string | null };

/* ---------------------------------------------------------------- stats -- */

export type PlayerStats = {
  runs: number;
  reels: number;
  swipes: number;
  likes: number;
  holds: number;
  perfects: number;
  freezes: number;
  caught: number;
  misses: number;
  activeMs: number;
  bestReactionMs: number | null;
  maxCombo: number;
  bonuses: BonusCounts;
};

export type StatsResponse = {
  stats: PlayerStats;
  /** The posts of the feed this player liked most; the app knows them by id. */
  topLiked: Array<{ contentId: string; likes: number }>;
};

/* ---------------------------------------------------------------- app -- */

export type AppStatus = 'ok' | 'update_available' | 'update_required';

export type AppConfigResponse = {
  status: AppStatus;
  /** The engine the API replays with; an app on another one cannot rank. */
  engineVersion: number;
  /** The newest content catalog the API knows. */
  contentVersion: number;
  latestVersion: string;
  minVersion: string;
  storeUrl: string | null;
};

/* ------------------------------------------------------------- errors -- */

export type ApiErrorCode =
  | 'validation_failed'
  | 'unauthenticated'
  | 'not_found'
  | 'username_invalid'
  | 'username_taken'
  | 'invalid_credentials'
  | 'email_taken'
  | 'already_linked'
  | 'identity_invalid'
  | 'identity_taken'
  | 'last_sign_in_method'
  | 'run_already_finished'
  | 'run_expired'
  | 'run_rejected'
  | 'engine_outdated'
  | 'daily_already_played'
  | 'cannot_follow_self'
  | 'follow_limit'
  | 'too_many_requests'
  | 'server_error';

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    fields?: Record<string, string[]>;
  };
};
