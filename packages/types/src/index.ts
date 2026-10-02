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

/**
 * The eight languages the game speaks (`LOCALES` in `@quezby/config`, in this
 * order). A request says which one it wants in `Accept-Language`; the API
 * answers its messages and share texts in it.
 */
export type Locale = 'tr' | 'en' | 'de' | 'ar' | 'fr' | 'es' | 'ja' | 'ko';

export type UserSettings = {
  haptics: boolean;
  /** A push when a friend request comes or is accepted. */
  pushFriends: boolean;
  /** A push when a friend sends a VS, and when one you sent ends. */
  pushVs: boolean;
  /** A push when a friend sends a phrase. */
  pushMessages: boolean;
  /**
   * Consent to count how the app is used — visits, screens, a few moments
   * (`docs/product/analytics.md`). Off until the player says yes; saying no
   * later deletes what was kept about them.
   */
  analytics: boolean;
};

export type BestScore = {
  score: number;
  reels: number;
  achievedAt: string;
};

export type Me = {
  id: string;
  /**
   * Given when the account is made — `guest48128742` until the player picks
   * one (`isAutoUsername` in `@quezby/config`). Picked once, it never changes
   * (`canPickUsername`); only a moderator's reset gives back an automatic name
   * and one more pick. Null only on accounts from before automatic names;
   * nothing ranked is shown without it.
   */
  username: string | null;
  /** The player's profile photo; null for none (`PUT /me/avatar`). */
  avatarUrl: string | null;
  /** The email a password sign-in uses, when one is linked. */
  email: string | null;
  /** No email, Apple or Google attached yet — the account lives on this phone. */
  isGuest: boolean;
  /** Apple and Google accounts that can sign in to this player. */
  identities: SocialProvider[];
  settings: UserSettings;
  /**
   * The language the player plays in: the request's when the account was
   * made, then whatever the phone last wrote (`PUT /me/locale`). A phone
   * signing in to this account takes it; accounts from before languages
   * are `tr`.
   */
  locale: Locale;
  /** This season's best — see `LeaderboardResponse.season`. */
  best: BestScore | null;
  createdAt: string;
};

export type Ranks = {
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

/**
 * The first half of an email sign-up: the account is made only once the
 * code emailed in the request's language comes back (`VerifyEmailRequest`).
 */
export type RegisterRequest = LoginRequest & GuestSignUpRequest;

/** `202` from every call that emails a code: where it went, when a new one may be asked for, when this one ends. */
export type CodeSentResponse = { email: string; resendIn: number; expiresAt: string };

/** The code of an email sign-up: the account is made and signed in. */
export type VerifyEmailRequest = { email: string; code: string };

/** A new code for a sign-up waiting, or a code to reset a forgotten password. */
export type EmailRequest = { email: string };

/** The code of a forgotten password and the new password: every other phone is signed out. */
export type ResetPasswordRequest = { email: string; code: string; password: string };

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

/** `PUT /me/locale` → `{ user: Me }`. */
export type UpdateLocaleRequest = { locale: Locale };

/* ---------------------------------------------------------------- runs -- */

/** `[gesture, t, d]` — see `@quezby/engine`'s `Action`. */
export type RunAction = [number, number, number];

/**
 * `free` (Normal): any number a day. `daily` (Günlük): "Günün akışı" — one
 * attempt, the same seed for everyone. Both climb the score boards (Zirve).
 * `rated` (Dereceli): any number a day, at the difficulty of the player's
 * Elo, and the only runs that play for Elo — never on a score board; open
 * once `RatingResponse.unlock` is null. `vs`: a friend's VS — one attempt
 * each at one seed; it never ranks anywhere.
 */
export type RunMode = 'free' | 'daily' | 'rated' | 'vs';

export type StartRunRequest = {
  mode: RunMode;
  /** The engine this build plays with; another one cannot rank. */
  engineVersion: number;
  /** The content catalog this build draws reels from. */
  contentVersion: number;
  /**
   * Dereceli's difficulty table this build plays (`DIFFICULTY_VERSION` of
   * `@quezby/engine`). A rated run from a build without it, or with
   * another, is refused with `engine_outdated`.
   */
  difficultyVersion?: number;
  /** A VS against this friend, on a new seed — the challenger plays first. */
  opponent?: string;
  /** The VS a friend sent, answered on its seed. */
  duel?: string;
};

export type StartRunResponse = {
  runId: string;
  seed: number;
  engineVersion: number;
  contentVersion: number;
  /**
   * The difficulty the run is played at — `new Run(seed, difficulty)`: the
   * one the player's Elo gives a rated run (0–16), 0 for every other run.
   */
  difficulty: number;
  mode: RunMode;
  /** The Istanbul day of a daily run, `2026-09-24`; null otherwise. */
  dayKey: string | null;
  /** The VS a `vs` run plays; null otherwise. */
  duelId: string | null;
  startedAt: string;
};

export type FinishRunRequest = {
  actions: RunAction[];
  /** What the app showed, for the API to compare against its own replay. */
  clientScore: number;
  clientReels: number;
  /**
   * The receipts the API signed at this run's checkpoints, in order. A run
   * that could not check in (no network) sends none; the API only counts
   * that against a score that would reach the top.
   */
  checkpoints?: string[];
};

/**
 * A few times in a ranked run (`CHECKPOINTS.marksMs` in `@quezby/config`)
 * the app tells the API how far it has played: how many reels, and the
 * SHA-256 of exactly those moves (`prefixHash`). The API stamps the time it
 * saw it — that is what shows a slowed-down game at the finish.
 */
export type CheckpointRequest = {
  /** Reels played so far — the length of the log the hash covers. */
  reel: number;
  /** `prefixHash(actions, reel)`: lower-case hex SHA-256. */
  prefixHash: string;
};

/** An opaque, signed receipt; the finish hands it back untouched. */
export type CheckpointResponse = { receipt: string };

/**
 * `ranked` counts; `flagged` failed a plausibility check and stays off the
 * boards; `review` is a top score held back until a person looks at it;
 * `played` is a clean VS run — it settles its VS and counts nowhere else.
 */
export type RunStatus = 'ranked' | 'flagged' | 'review' | 'played';

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
  /**
   * Why a `flagged` run is off the boards, when the player can be told:
   * `device` — this phone failed Google's or Apple's integrity check (rooted,
   * an emulator, a changed app), so its runs never rank. Null otherwise; the
   * other checks are not explained to the player.
   */
  flagReason: 'device' | null;
};

export type RankChange = { before: number | null; after: number | null };

/** Someone this run overtook on this week's board. */
export type PassedPlayer = { username: string; avatarUrl: string | null; score: number; isFriend: boolean };

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

/**
 * The six leagues, lowest first: a thousand rating points each —
 * `master` (MasterClass) is 5000 and up. A player's league is their rating's,
 * ranked by Elo and never reset (`GET /ratings?scope=league`).
 */
export type LeagueTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master';

/**
 * How far Dereceli still is: `remaining` of `required` free and daily runs —
 * ranked, and scoring — still to play, and the `placement` rated runs that
 * set the Elo once it opens. Once a player has played a rated run, it stays
 * open to them.
 */
export type LeagueUnlock = { required: number; remaining: number; placement: number };

/* -------------------------------------------------------------- rating -- */

/** How far a player's placement runs have got. */
export type RatingPlacement = { played: number; required: number };

/**
 * What a finished run did to the rating. `placement`: one of the first runs
 * (the last one places the player — `after` is set); `run`: against its
 * target; `forfeit`: rated as the full loss (played in a way that flagged
 * it); `void`: did not count (a banned player's, a failed phone's, given up
 * in the countdown); `pending`: held for review, counted if let through.
 */
export type RunRatingKind = 'placement' | 'run' | 'forfeit' | 'void' | 'pending';

export type RunRating = {
  kind: RunRatingKind;
  /** Null before placement. */
  before: number | null;
  after: number | null;
  delta: number;
  tierBefore: LeagueTier | null;
  tier: LeagueTier | null;
  /** The score the run had to reach to win rating; null in placement. */
  target: number | null;
  /** The next run's target; null until placed. */
  nextTarget: number | null;
  /** Set while placing, and on the run that placed the player. */
  placement: RatingPlacement | null;
  /** A fresh promotion held the player in their league. */
  shielded: boolean;
  /** The difficulty the run was played at. */
  difficulty: number;
  /** The difficulty of the next rated run, from the rating now; null until placed. */
  nextDifficulty: number | null;
};

/**
 * Why the rating moved: a run, a placement, a forfeit, a moderator's
 * reversal, or an owner setting it by hand from the panel (`adjust`).
 */
export type RatingChangeKind = 'placement' | 'run' | 'forfeit' | 'void' | 'reversal' | 'adjust';

export type RatingChange = {
  kind: RatingChangeKind;
  delta: number;
  before: number | null;
  after: number | null;
  score: number | null;
  /** The target the run played against, as the player saw it. */
  target: number | null;
  tier: LeagueTier | null;
  runId: string | null;
  at: string;
};

/** `GET /rating`. */
export type RatingResponse = {
  /** How far Dereceli still is; null once it is open. */
  unlock: LeagueUnlock | null;
  /** False until the placement runs are played; everything but `unlock` and `placement` is null until then. */
  placed: boolean;
  rating: number | null;
  tier: LeagueTier | null;
  /** The league's first rating… */
  floor: number | null;
  /** …and the next league's; null in MasterClass, which has no top. */
  ceil: number | null;
  /** How far into the league, per-mille; null in MasterClass. */
  progress: number | null;
  /** The score the next run must reach to win rating. */
  target: number | null;
  /**
   * The difficulty the next rated run is played at, 0–16 (`MAX_DIFFICULTY`):
   * one more every 250 Elo from 1000. Null until placed.
   */
  difficulty: number | null;
  peak: number | null;
  placement: RatingPlacement | null;
  /** A fresh promotion's protection: `runs` more runs cannot drop the player out of `tier`. */
  shield: { tier: LeagueTier; runs: number } | null;
  /** Latest changes, newest first — runs that did not count are left out. */
  history: RatingChange[];
};

export type RatingEntry = {
  rank: number;
  username: string;
  avatarUrl: string | null;
  rating: number;
  tier: LeagueTier;
  /**
   * The player's best rated score this season in the league they are in
   * now; null before they have counted a run in it (fresh from a promotion).
   */
  leagueBest: number | null;
  isMe: boolean;
  isFriend: boolean;
  /** Rating to pass the row above; null for the first. */
  gap: number | null;
};

/**
 * Where an Elo board looks: everyone, your friends and you, or your own
 * league — empty before placement.
 */
export type RatingBoardScope = LeaderboardScope | 'league';

/** `GET /ratings?scope=`: the highest ratings of the players with a rated run in the last two weeks. */
export type RatingBoardResponse = {
  scope: RatingBoardScope;
  entries: RatingEntry[];
  /** The caller's row, wherever it is; null when they are not on the board. */
  me: RatingEntry | null;
  players: number;
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
  /** What a rated run did to the rating; null after any other run. */
  rating: RunRating | null;
  /**
   * After a free or daily run, how far Dereceli still is — `remaining: 0` on
   * the very run that opened it; null otherwise.
   */
  leagueUnlock: LeagueUnlock | null;
  /** What "Paylaş" sends, written by the API from its own numbers; null after a VS, which is between two friends. */
  shareText: string | null;
  /** The VS a `vs` run played, as it stands now; null otherwise. */
  duel: DuelView | null;
};

/* -------------------------------------------------------------- history -- */

/**
 * A VS run's VS, from the player's side, with who it was against. Deleting
 * either account deletes the VS, so such a run comes back with `duel: null`.
 */
export type RunDuel = DuelBrief & { opponent: string | null };

/** A past game in the player's history: a run played to its end, as the replay found it. */
export type RunSummary = {
  runId: string;
  mode: RunMode;
  status: RunStatus;
  score: number;
  reels: number;
  level: number;
  activeMs: number;
  finishedAt: string;
  /** The run behind this season's best. */
  isBest: boolean;
  /** "Günün akışı #17" of a daily run; null otherwise. */
  dailyNumber: number | null;
  duel: RunDuel | null;
};

/** `GET /me/runs?mode=`: thirty a page, the newest first. */
export type RunHistoryResponse = { runs: RunSummary[]; nextCursor: string | null };

/** `GET /me/runs/{runId}`: one past game with everything its replay counted. */
export type RunDetailResponse = { summary: RunSummary; run: RunResult };

/* --------------------------------------------------------- leaderboard -- */

/** The boards a player climbs, in Europe/Istanbul. There is no day board. */
export type LeaderboardPeriod = 'weekly' | 'monthly' | 'all';

/** A period, or `challenge`: today's "Günün akışı" board. */
export type LeaderboardBoard = LeaderboardPeriod | 'challenge';

export type LeaderboardScope = 'everyone' | 'friends';

export type LeaderboardEntry = {
  rank: number;
  username: string;
  avatarUrl: string | null;
  score: number;
  reels: number;
  isMe: boolean;
  isFriend: boolean;
  /** Points needed to pass the row above (ties go to whoever got there first). Null at #1. */
  gap: number | null;
};

export type LeaderboardResponse = {
  board: LeaderboardBoard;
  /** `2026-W39`, `2026-09`, `all` — or the day, `2026-09-24`, of a challenge board — in Europe/Istanbul. */
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
  /**
   * `unfinished` while the run is open; `void` when it was abandoned, expired
   * or rejected. Never `played`: that is a VS run's.
   */
  status: Exclude<RunStatus, 'played'> | 'unfinished' | 'void';
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

/* --------------------------------------------------------------- social -- */

/**
 * What another player is to the one asking. `requested`: your request waits
 * for them; `incoming`: theirs waits for you; `blocked`: you blocked them.
 * Nobody is told they were blocked — to them, the blocker is not there.
 */
export type PlayerRelation = 'none' | 'friend' | 'requested' | 'incoming' | 'blocked';

export type PlayerSummary = {
  username: string;
  /** Their profile photo, cached by its address for good; null for none. */
  avatarUrl: string | null;
  best: number | null;
  league: LeagueTier | null;
  relation: PlayerRelation;
};

export type PlayerCard = {
  username: string;
  avatarUrl: string | null;
  createdAt: string;
  best: BestScore | null;
  /** Their rating's league; null until placed. */
  league: LeagueTier | null;
  rating: number | null;
  ranks: { weekly: number | null; all: number | null };
  stats: { runs: number; reels: number; likes: number; perfects: number };
  /** Friends who are not banned. */
  friends: number;
  relation: PlayerRelation;
  isMe: boolean;
};

export type PlayerResponse = { player: PlayerCard };

export type UserSearchResponse = { users: PlayerSummary[] };

/** `PUT|DELETE /users/{username}/friend` and `…/block`: where the two stand afterwards. */
export type RelationResponse = { relation: PlayerRelation };

export type FriendRequest = { player: PlayerSummary; requestedAt: string };

/** `GET /me/friend-requests`: the newest hundred each way. */
export type FriendRequestsResponse = { incoming: FriendRequest[]; outgoing: FriendRequest[] };

/* ------------------------------------------------------------------ VS -- */

/**
 * `playing`: the challenger is on their run — the friend knows nothing yet.
 * `waiting`: sent; it waits for the friend until `expiresAt`. `finished`:
 * both played. `declined`, `expired` (nobody answered in time — it counts for
 * nobody), `cancelled` (the two stopped being friends), `void` (the
 * challenger's run was not clean, so it was never sent).
 */
export type DuelStatus = 'playing' | 'waiting' | 'finished' | 'declined' | 'expired' | 'cancelled' | 'void';

export type DuelOutcome = 'won' | 'lost' | 'draw';

/** One side's run: its score (null when it was left unfinished) and whether it was clean — one that was not loses. */
export type DuelSide = { score: number | null; valid: boolean };

/** A VS from the viewer's side, as short as a line in the inbox needs it. */
export type DuelBrief = {
  id: string;
  status: DuelStatus;
  /** Who plays next: `you`, `them`, or null once it is over. */
  turn: 'you' | 'them' | null;
  /** The viewer's run; null until they have played. */
  you: DuelSide | null;
  /** The other run — hidden (null) until the viewer has played too, and for good if they never do. */
  them: DuelSide | null;
  /** Set once it is `finished`. */
  outcome: DuelOutcome | null;
  /** When the friend's chance to answer runs out; only while `waiting`. Count down with `serverTime`. */
  expiresAt: string | null;
};

/** How two friends stand over every VS they finished, from the viewer's side. */
export type HeadToHead = { wins: number; losses: number; draws: number };

export type DuelView = DuelBrief & {
  /** True when the viewer sent it — and so played first. */
  sent: boolean;
  opponent: PlayerSummary;
  h2h: HeadToHead;
  serverTime: string;
};

/** `GET /duels/{id}`, `POST /duels/{id}/decline`. */
export type DuelResponse = { duel: DuelView };

/* --------------------------------------------------------------- inbox -- */

/**
 * A line of a conversation between two friends. `friends`: the request was
 * accepted; `phrase`: one of `Phrase`; `vs_invite` / `vs_result` /
 * `vs_declined` / `vs_expired`: a VS was sent, ended, turned down or ran out.
 */
export type MessageKind = 'friends' | 'phrase' | 'vs_invite' | 'vs_result' | 'vs_declined' | 'vs_expired';

export type InboxMessage = {
  id: number;
  kind: MessageKind;
  /** The viewer's own line. */
  mine: boolean;
  phrase: Phrase | null;
  /** The VS a `vs_*` line is about, as it stands now. */
  duel: DuelBrief | null;
  createdAt: string;
};

/** A friend in the inbox, the one last heard from first. */
export type FriendThread = {
  player: PlayerSummary;
  friendsSince: string;
  lastActivityAt: string;
  /** The conversation's newest line; null once old lines were pruned. */
  last: InboxMessage | null;
  /** Their lines the viewer has not read. */
  unread: number;
  /** The VS open between the two that the viewer knows of. */
  duel: DuelBrief | null;
};

/** `GET /me/threads/{username}`: thirty lines a page, oldest first; `nextBefore` fetches the older ones. */
export type ThreadResponse = {
  player: PlayerSummary;
  h2h: HeadToHead;
  /** The VS open between the two that the viewer knows of. */
  duel: DuelView | null;
  messages: InboxMessage[];
  nextBefore: number | null;
};

/** A VS waiting for the viewer to play, as the lobby shows it. */
export type WaitingDuel = {
  id: string;
  /** The friend who sent it and played first. */
  opponent: PlayerSummary;
  /** When the chance to answer runs out. Count down with `InboxSummary.serverTime`. */
  expiresAt: string;
};

/**
 * `GET /me/inbox`: what the badges count — requests waiting, and friends whose
 * conversation wants a look (a line unread, or a VS waiting for the viewer) —
 * with the player's friend count and the VS waiting for them.
 */
export type InboxSummary = {
  requests: number;
  threads: number;
  yourTurn: number;
  /** The player's friends who are not banned. */
  friends: number;
  /** The VS waiting for the player, the one running out first first; at most three (`yourTurn` counts them all). */
  waiting: WaitingDuel[];
  /** Notifications the player has not seen yet — the bell's badge (`GET /me/notifications`). */
  notifications: number;
  serverTime: string;
};

/**
 * What happened to the player among friends, as the bell lists it:
 * `friend_request` — a request waits for them; `friends` — their request was
 * accepted; `vs_invite` — a friend sent them a VS; `vs_result` — the friend
 * they challenged played it; `vs_declined` — turned it down; `vs_expired` —
 * let it run out. Phrases are not here: they are the inbox's.
 */
export type NotificationKind = 'friend_request' | 'friends' | 'vs_invite' | 'vs_result' | 'vs_declined' | 'vs_expired';

export type NotificationItem = {
  /** `request:{username}` for a request, `message:{id}` for the rest. */
  id: string;
  kind: NotificationKind;
  /** Who it is about, as the player sees them. */
  player: PlayerSummary;
  /** The VS a `vs_*` notification is about, as it stands now. */
  duel: DuelBrief | null;
  createdAt: string;
  /** Newer than the last time the player opened the list. */
  unseen: boolean;
};

/** `GET /me/notifications`: the newest fifty, newest first. */
export type NotificationsResponse = { notifications: NotificationItem[]; unseen: number };

/**
 * `GET /me/pulse`: a number that moves whenever the player's inbox does — a
 * request, a friendship, a line, a VS (one whose time ran out included). The
 * app asks for it every few seconds and fetches its lists only when it moved.
 */
export type Pulse = { stamp: number };

export type SendPhraseRequest = { phrase: Phrase };

export type SendPhraseResponse = { message: InboxMessage };

/** `GET /me/friends`: fifty a page. */
export type FriendsResponse = { friends: FriendThread[]; nextCursor: string | null };

/**
 * `GET /users/{username}/friends`: a player's friends A to Z, fifty a page —
 * only to that player and their friends. `relation` is each one's to the viewer.
 */
export type FriendListResponse = {
  friends: PlayerSummary[];
  /** Everyone in the list, every page together. */
  total: number;
  nextCursor: string | null;
};

/**
 * The words one player can send a friend — never typed, always one of these
 * (`PHRASES` in `@quezby/config`). Each phone says them in its own language;
 * the API's push says them in the receiver's.
 */
export type Phrase =
  | 'hi'
  | 'whats_up'
  | 'gg'
  | 'gg_wp'
  | 'rematch'
  | 'your_turn'
  | 'beat_that'
  | 'ready'
  | 'wow'
  | 'close_one'
  | 'clutch'
  | 'ez'
  | 'bot'
  | 'nerf'
  | 'lucky'
  | 'lag'
  | 'warming_up'
  | 'rage_quit'
  | 'respect'
  | 'afk'
  | 'daily'
  | 'thanks'
  | 'next_time'
  | 'bye';

export type BlockedPlayer = { username: string; avatarUrl: string | null; blockedAt: string };

/** What about a player is reported: their photo or their name — the only things a player makes that others see. */
export type ReportReason = 'photo' | 'name';

/** `POST /users/{username}/report` → `204`, whatever becomes of it. */
export type ReportRequest = { reason: ReportReason };

/** `PUT` / `DELETE /me/push-token` → `204`: the phone's Firebase Cloud Messaging token. */
export type PushTokenRequest = { token: string; platform: Platform };

/** How bad a log row is — the admin panel's Loglar page. */
export type LogLevel = 'error' | 'warning' | 'info';

/**
 * An error the app swallowed, for the admin panel's Loglar page: a push
 * token Firebase would not give, a request that never reached the API, a
 * crash. `event` is dotted lower-case (`push.token`); `context` is flat, at
 * most twenty short values, and never holds a secret — the API hides any
 * `token`, `password` or key there anyway.
 */
export type AppLogEntry = {
  level: LogLevel;
  event: string;
  /** At most 500 characters. */
  message: string;
  context?: Record<string, string | number | boolean | null>;
  /** When it happened, by the phone's clock. */
  at?: string;
};

/** `POST /me/logs` → `204`: at most twenty entries at once, ten calls a minute. */
export type AppLogRequest = { entries: AppLogEntry[] };

/**
 * What a push tells a phone besides its words: which kind of news, the friend
 * it is about and — for a VS — which one. Tapping it opens that conversation.
 */
export type PushData = {
  kind: 'friend_request' | 'friends' | 'vs_invite' | 'vs_result' | 'phrase';
  username: string;
  duelId?: string;
};

/**
 * `PUT /me/avatar` → `{ user: Me }`: a square photo as base64 — at most 100
 * KB decoded (`AVATAR` in `@quezby/config`). The API keeps its own JPEG of it,
 * without the photo's metadata.
 */
export type UpdateAvatarRequest = { image: string };

/** `GET /me/blocks`: everyone you blocked, the latest first. */
export type BlocksResponse = { users: BlockedPlayer[] };

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

/* ----------------------------------------------------------- analytics -- */

/** A screen a visit's journey names — the app's routes, lower-case (`@quezby/config` › ANALYTICS_SCREENS). */
export type AnalyticsScreen =
  | 'welcome'
  | 'login'
  | 'tutorial'
  | 'username'
  | 'protect'
  | 'home'
  | 'leaderboard'
  | 'league'
  | 'search'
  | 'profile'
  | 'game'
  | 'help'
  | 'daily'
  /** The Mesajlar tab: the inbox (until 2026-09-29 it held the requests too). `search` is finding a player. */
  | 'friends'
  | 'thread'
  | 'history'
  | 'avatar'
  /** A new player's step that asks whether the game may send notifications. */
  | 'notifications'
  /** A friend list: yours with the requests waiting, or a friend's. */
  | 'friend_list'
  /** Ayarlar → Hesap bilgileri: the name, the ways in, deleting the account. */
  | 'account'
  /** The bell on the lobby: requests, VS and what became of them. */
  | 'alerts';

/** A moment worth counting that the API cannot see by itself (`@quezby/config` › ANALYTICS_EVENTS). */
export type AnalyticsEvent =
  | 'share_result'
  | 'share_daily'
  | 'rival'
  | 'player_card'
  | 'offline_run'
  | 'outdated_run'
  | 'unsent_run'
  | 'offline_gate'
  | 'update_gate'
  | 'tutorial_done'
  | 'nickname_skip'
  | 'protect_skip'
  | 'protect_reminder';

export type AnalyticsCode = AnalyticsScreen | AnalyticsEvent;

/**
 * One stretch of the app in the foreground, summed up on the phone and sent
 * once it ends — only with the player's consent (`UserSettings.analytics`).
 */
export type AnalyticsVisit = {
  /** 32 lower-case hex characters, minted on the phone: a visit sent twice counts once. */
  id: string;
  startedAt: string;
  /** Seconds in the foreground. */
  seconds: number;
  appVersion: string;
  /** Screens and moments in order, each with the seconds since the start — at most 40. */
  journey: Array<[AnalyticsCode, number]>;
  /** How often each screen was opened and each moment happened over the whole visit. */
  counts: Partial<Record<AnalyticsCode, number>>;
};

export type AnalyticsVisitsRequest = {
  /** The phone's clock as it sends: the API moves every `startedAt` by its difference to its own. */
  sentAt: string;
  platform: Platform;
  visits: AnalyticsVisit[];
};

/**
 * `record: false` — keep nothing for a day: analytics is switched off, the
 * player has not said yes, or they are outside the share of players kept.
 */
export type AnalyticsVisitsResponse = { record: boolean };

/* ---------------------------------------------------- device integrity -- */

/**
 * How far the API trusts the phone a run is played on:
 * `pass` — Google Play Integrity (Android) or App Attest (iOS) vouched for a
 * real device running this app, unmodified; `fail` — the check came back
 * against it (rooted, an emulator, a changed app): its runs never rank;
 * `unavailable` — no check could be made (no Google services, an old phone,
 * the service down): its runs rank, but a top score waits for review.
 */
export type DeviceVerdict = 'pass' | 'fail' | 'unavailable';

/** A one-time challenge for a device check; used once, within minutes. */
export type DeviceChallengeResponse = { challenge: string; expiresAt: string };

/**
 * Android: a Play Integrity standard token requested with
 * `requestHash = sha256Hex(challenge)` (lower-case hex).
 */
export type AndroidIntegrityRequest = { challenge: string; token: string };

/**
 * iOS, first time on this install: App Attest's attestation (base64) of a new
 * key (`keyId`, base64 as Apple returns it) over `clientDataHash =
 * SHA-256(UTF-8 challenge)`.
 */
export type IosAttestationRequest = { challenge: string; keyId: string; attestation: string };

/** iOS, after that: an assertion (base64) by the attested key over `SHA-256(UTF-8 challenge)`. */
export type IosAssertionRequest = { challenge: string; keyId: string; assertion: string };

export type DeviceCheckResponse = {
  verdict: DeviceVerdict;
  /** Until when this verdict stands; the app checks again after it. */
  validUntil: string;
  /**
   * Whether a `fail` keeps this device's runs off the boards right now. False
   * while the API only records verdicts (`QUEZBY_INTEGRITY_MODE=log`, local
   * and staging) — the app must not tell the player otherwise.
   */
  enforced: boolean;
};

/* ------------------------------------------------------------- errors -- */

export type ApiErrorCode =
  | 'validation_failed'
  | 'unauthenticated'
  | 'not_found'
  | 'username_invalid'
  | 'username_taken'
  /** The player picked their name already: a picked name never changes. */
  | 'username_locked'
  | 'invalid_credentials'
  | 'email_taken'
  /** An email sign-up never verified: the code went to the email (a new one once the last is a minute old) — ask for it. */
  | 'email_unverified'
  /** A wrong emailed code. */
  | 'code_invalid'
  /** An emailed code that expired, was used up by wrong tries, or was never sent: ask for a new one. */
  | 'code_expired'
  | 'already_linked'
  | 'identity_invalid'
  | 'identity_taken'
  | 'last_sign_in_method'
  | 'run_already_finished'
  | 'run_expired'
  | 'run_rejected'
  | 'engine_outdated'
  | 'daily_already_played'
  /** Dereceli is not open yet: `RatingResponse.unlock` says how far it is. */
  | 'rated_locked'
  | 'cannot_befriend_self'
  /** Your friend list is full — checked on whoever asks or accepts. */
  | 'friend_limit'
  /** Too many of your requests wait for an answer. */
  | 'request_limit'
  /** Only between friends: a message, a VS. */
  | 'not_friends'
  /** A player's friend list is shown to them and their friends only. */
  | 'friends_hidden'
  /** Too many phrases to one friend today. */
  | 'message_limit'
  /** The VS was answered, declined, expired or is already open between you two. */
  | 'duel_unavailable'
  /** Too many of your VS wait for an answer. */
  | 'duel_limit'
  /** A profile photo the API could not use. */
  | 'photo_invalid'
  /** A device-check challenge that is unknown, used or expired. */
  | 'challenge_invalid'
  /** A device-check proof the API could not read at all. */
  | 'integrity_invalid'
  /** An App Attest key the API has never seen: attest a new one. */
  | 'attest_key_unknown'
  | 'too_many_requests'
  /** Signed in, but the role may not do this — the admin panel only. */
  | 'forbidden'
  | 'server_error';

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    fields?: Record<string, string[]>;
  };
};

/* -------------------------------------------------------------- admin -- */

export type * from './admin';
