import type {
  AnalyticsVisitsRequest,
  AnalyticsVisitsResponse,
  AndroidIntegrityRequest,
  AppConfigResponse,
  AppLogRequest,
  AppleLinkRequest,
  AppleSignInRequest,
  AuthResponse,
  CodeSentResponse,
  BlocksResponse,
  CheckpointRequest,
  CheckpointResponse,
  DailyResponse,
  DeviceChallengeResponse,
  DeviceCheckResponse,
  DuelResponse,
  EmailRequest,
  FinishRunRequest,
  FinishRunResponse,
  FriendListResponse,
  FriendRequestsResponse,
  FriendsResponse,
  GoogleLinkRequest,
  GoogleSignInRequest,
  GuestSignUpRequest,
  InboxSummary,
  IosAssertionRequest,
  IosAttestationRequest,
  LeaderboardBoard,
  LeaderboardResponse,
  LeaderboardScope,
  LinkCredentialsRequest,
  Locale,
  LoginRequest,
  Me,
  MeResponse,
  NonceResponse,
  NotificationsResponse,
  Platform,
  PlayerResponse,
  RatingBoardResponse,
  RatingBoardScope,
  RegisterRequest,
  ResetPasswordRequest,
  RatingResponse,
  Phrase,
  Pulse,
  PushTokenRequest,
  RelationResponse,
  ReportReason,
  RunDetailResponse,
  RunHistoryResponse,
  RunMode,
  SocialAuthResponse,
  SocialProvider,
  StartRunRequest,
  StartRunResponse,
  SendPhraseResponse,
  StatsResponse,
  ThreadResponse,
  UpdateLocaleRequest,
  UpdateSettingsRequest,
  UsernameAvailability,
  UserSearchResponse,
  UserSettings,
  VerifyEmailRequest,
} from '@quezby/types';
import { createRequest, type UnreachedRequest } from './http';

export { ApiError, type RequestOptions, type UnreachedRequest } from './http';

/**
 * The phone the app runs on, as every call tells the API (`X-Device`): the
 * device registry the API keeps for support and security, consent or not —
 * no names, no IP, nothing about how the game is played.
 */
export type ClientDevice = {
  /** The random id this install minted on its first launch. */
  installId: string;
  platform: Platform;
  /** The system's version, `18.2`. */
  os: string;
  model: string;
  /** The app's build number. */
  build: string;
};

/**
 * `install=…; platform=ios; os=18.2; model=iPhone%2015; build=42` — every
 * value URI-encoded, so no `;`, `=` or line break can slip into the header.
 */
export function deviceHeader(device: ClientDevice): string {
  const fields: Array<[string, string]> = [
    ['install', device.installId],
    ['platform', device.platform],
    ['os', device.os],
    ['model', device.model],
    ['build', device.build],
  ];
  return fields.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('; ');
}

export type ApiClientOptions = {
  /** The API's origin, e.g. `https://api.quezby.com` — no `/api` suffix. */
  baseUrl: string;
  getToken?: () => string | null;
  /** Called on any 401 from an authenticated request. */
  onUnauthorized?: () => void;
  /** Called when a request never got an answer — no network, or past the deadline. */
  onUnreached?: (failure: UnreachedRequest) => void;
  /** Hard deadline per request. A dead network must not hang a screen. */
  timeoutMs?: number;
  /** Sent as `X-App-Version` so the API can tell builds apart. */
  appVersion?: string;
  /** The phone, sent as `X-Device` with every call once it is known. */
  device?: () => ClientDevice | null;
  /**
   * The language the app speaks, sent as `Accept-Language` with every call:
   * the API's messages and share texts come back in it, and an account made
   * by the call is born with it.
   */
  locale?: () => Locale | null;
};

/**
 * The player API, `/api/v1`. The admin panel's client is a separate entry,
 * `@quezby/sdk/admin`, so none of it ships in the app.
 */
export function createApiClient({ device, ...options }: ApiClientOptions) {
  const request = createRequest({
    ...options,
    prefix: '/api/v1',
    device: () => {
      const phone = device?.();
      return phone ? deviceHeader(phone) : null;
    },
  });

  return {
    request,
    app: {
      config: (platform: Platform, version: string) =>
        request<AppConfigResponse>('/app/config', {
          auth: false,
          query: { platform, version },
        }),
    },
    auth: {
      guest: (input: GuestSignUpRequest) =>
        request<AuthResponse>('/auth/guest', {
          method: 'POST',
          body: input,
          auth: false,
        }),
      login: (input: LoginRequest) =>
        request<AuthResponse>('/auth/login', {
          method: 'POST',
          body: input,
          auth: false,
        }),
      /** Emails a code; nothing is made until it comes back — `409 email_taken` when the email has an account. */
      register: (input: RegisterRequest) =>
        request<CodeSentResponse>('/auth/register', {
          method: 'POST',
          body: input,
          auth: false,
        }),
      /** A new code for the sign-up waiting, no sooner than a minute after the last. */
      resendRegistration: (input: EmailRequest) =>
        request<CodeSentResponse>('/auth/register/resend', {
          method: 'POST',
          body: input,
          auth: false,
        }),
      /** The sign-up's code: the account is made and signed in. */
      verifyRegistration: (input: VerifyEmailRequest) =>
        request<AuthResponse>('/auth/register/verify', {
          method: 'POST',
          body: input,
          auth: false,
        }),
      /** A code to reset a forgotten password; the same answer whether the email has an account or not. */
      forgotPassword: (input: EmailRequest) =>
        request<CodeSentResponse>('/auth/password/forgot', {
          method: 'POST',
          body: input,
          auth: false,
        }),
      /** The reset code and the new password: every other phone is signed out, this one in. */
      resetPassword: (input: ResetPasswordRequest) =>
        request<AuthResponse>('/auth/password/reset', {
          method: 'POST',
          body: input,
          auth: false,
        }),
      logout: () => request<void>('/auth/logout', { method: 'POST' }),
      /** A single-use nonce for Sign in with Apple. */
      nonce: () => request<NonceResponse>('/auth/nonce', { method: 'POST', auth: false }),
      apple: (input: AppleSignInRequest) =>
        request<SocialAuthResponse>('/auth/apple', {
          method: 'POST',
          body: input,
          auth: false,
        }),
      google: (input: GoogleSignInRequest) =>
        request<SocialAuthResponse>('/auth/google', {
          method: 'POST',
          body: input,
          auth: false,
        }),
    },
    me: {
      get: () => request<MeResponse>('/me'),
      updateUsername: (username: string) =>
        request<{ user: Me }>('/me/username', {
          method: 'PUT',
          body: { username },
        }),
      updateSettings: (input: UpdateSettingsRequest) =>
        request<{ settings: UserSettings }>('/me/settings', {
          method: 'PUT',
          body: input,
        }),
      /** The language the phone plays in, written to the account. */
      updateLocale: (locale: Locale) =>
        request<{ user: Me }>('/me/locale', {
          method: 'PUT',
          body: { locale } satisfies UpdateLocaleRequest,
        }),
      /** Emails a code to the address; it is attached once the code comes back (`verifyCredentials`). */
      linkCredentials: (input: LinkCredentialsRequest) =>
        request<CodeSentResponse>('/me/credentials', {
          method: 'POST',
          body: input,
        }),
      resendCredentials: () => request<CodeSentResponse>('/me/credentials/resend', { method: 'POST' }),
      verifyCredentials: (code: string) =>
        request<{ user: Me }>('/me/credentials/verify', {
          method: 'POST',
          body: { code },
        }),
      linkApple: (input: AppleLinkRequest) =>
        request<{ user: Me }>('/me/identities/apple', {
          method: 'POST',
          body: input,
        }),
      linkGoogle: (input: GoogleLinkRequest) =>
        request<{ user: Me }>('/me/identities/google', {
          method: 'POST',
          body: input,
        }),
      unlink: (provider: SocialProvider) =>
        request<{ user: Me }>(`/me/identities/${provider}`, { method: 'DELETE' }),
      stats: () => request<StatsResponse>('/me/stats'),
      /** The player's past games, the newest first; thirty a page, of one mode or all. */
      runs: ({ cursor, mode }: { cursor?: string; mode?: RunMode } = {}) =>
        request<RunHistoryResponse>('/me/runs', { query: { cursor, mode } }),
      run: (runId: string) => request<RunDetailResponse>(`/me/runs/${encodeURIComponent(runId)}`),
      /** A square JPEG as base64, at most 100 KB decoded (`AVATAR` in `@quezby/config`). */
      updateAvatar: (image: string) =>
        request<{ user: Me }>('/me/avatar', { method: 'PUT', body: { image } }),
      removeAvatar: () => request<{ user: Me }>('/me/avatar', { method: 'DELETE' }),
      /** This phone takes the player's pushes — its Firebase Cloud Messaging token. */
      registerPushToken: (input: PushTokenRequest) =>
        request<void>('/me/push-token', { method: 'PUT', body: input }),
      /** This phone takes no more of the player's pushes — before signing out. */
      unregisterPushToken: (token: string) =>
        request<void>('/me/push-token', { method: 'DELETE', body: { token } }),
      /** Errors the app swallowed, for the admin panel's Loglar page. */
      sendLogs: (input: AppLogRequest) => request<void>('/me/logs', { method: 'POST', body: input }),
      /** The player's friends, the one last heard from first; fifty a page. */
      friends: (cursor?: string) =>
        request<FriendsResponse>('/me/friends', { query: { cursor } }),
      /** The requests waiting for the player, and the ones they sent. */
      friendRequests: () => request<FriendRequestsResponse>('/me/friend-requests'),
      blocks: () => request<BlocksResponse>('/me/blocks'),
      /** What the badges count: requests waiting, conversations wanting a look. */
      inbox: () => request<InboxSummary>('/me/inbox'),
      /** What happened among friends, newest first — the bell's list. */
      notifications: () => request<NotificationsResponse>('/me/notifications'),
      /** The player has looked at the list: the bell's badge goes back to zero. */
      seeNotifications: () => request<void>('/me/notifications/seen', { method: 'POST' }),
      /** A number that moves whenever the inbox does: asked every few seconds, it says when to fetch the lists. */
      pulse: () => request<Pulse>('/me/pulse'),
      /** The conversation with a friend; `before` a message id fetches older lines. */
      thread: (username: string, before?: number) =>
        request<ThreadResponse>(`/me/threads/${encodeURIComponent(username)}`, { query: { before } }),
      readThread: (username: string) =>
        request<void>(`/me/threads/${encodeURIComponent(username)}/read`, { method: 'POST' }),
      sendPhrase: (username: string, phrase: Phrase) =>
        request<SendPhraseResponse>(`/me/threads/${encodeURIComponent(username)}/messages`, {
          method: 'POST',
          body: { phrase },
        }),
      delete: () => request<void>('/me', { method: 'DELETE' }),
    },
    usernames: {
      check: (username: string) =>
        request<UsernameAvailability>('/usernames/check', {
          query: { username },
        }),
    },
    /**
     * The phone vouching for itself — Play Integrity on Android, App Attest
     * on iOS — against a one-time challenge. The verdict decides whether this
     * device's runs can rank.
     */
    device: {
      challenge: () =>
        request<DeviceChallengeResponse>('/device/challenge', { method: 'POST' }),
      android: (input: AndroidIntegrityRequest) =>
        request<DeviceCheckResponse>('/device/android', { method: 'POST', body: input }),
      iosAttest: (input: IosAttestationRequest) =>
        request<DeviceCheckResponse>('/device/ios/attest', { method: 'POST', body: input }),
      iosAssert: (input: IosAssertionRequest) =>
        request<DeviceCheckResponse>('/device/ios/assert', { method: 'POST', body: input }),
    },
    runs: {
      start: (input: StartRunRequest) =>
        request<StartRunResponse>('/runs', { method: 'POST', body: input }),
      /** Stamps a ranked run's progress; the receipt goes back with the finish. */
      checkpoint: (runId: string, input: CheckpointRequest) =>
        request<CheckpointResponse>(`/runs/${encodeURIComponent(runId)}/checkpoint`, {
          method: 'POST',
          body: input,
        }),
      finish: (runId: string, input: FinishRunRequest) =>
        request<FinishRunResponse>(`/runs/${encodeURIComponent(runId)}/finish`, {
          method: 'POST',
          body: input,
        }),
      /** Gives up a run in its countdown — for nothing within seconds of its start, a forfeit after. */
      cancel: (runId: string) =>
        request<void>(`/runs/${encodeURIComponent(runId)}/cancel`, { method: 'POST' }),
    },
    /** VS between two friends: started through `runs.start({ mode: 'vs', … })`. */
    duels: {
      get: (duelId: string) => request<DuelResponse>(`/duels/${encodeURIComponent(duelId)}`),
      decline: (duelId: string) =>
        request<DuelResponse>(`/duels/${encodeURIComponent(duelId)}/decline`, { method: 'POST' }),
    },
    leaderboards: {
      get: (
        board: LeaderboardBoard,
        { scope = 'everyone', limit = 50 }: { scope?: LeaderboardScope; limit?: number } = {},
      ) =>
        request<LeaderboardResponse>(`/leaderboards/${board}`, {
          query: { scope, limit },
        }),
    },
    daily: {
      /** Today's "Günün akışı": the one attempt and the top of the board. */
      get: () => request<DailyResponse>('/daily'),
    },
    /** Elo: the player's rating and league, and the highest ratings — everyone's, friends', or their league's. */
    rating: {
      current: () => request<RatingResponse>('/rating'),
      board: (scope: RatingBoardScope = 'everyone') =>
        request<RatingBoardResponse>('/ratings', { query: { scope } }),
    },
    analytics: {
      /**
       * Finished visits, only with the player's consent. `record: false`
       * means keep nothing for a day.
       */
      send: (input: AnalyticsVisitsRequest) =>
        request<AnalyticsVisitsResponse>('/analytics/visits', { method: 'POST', body: input }),
    },
    users: {
      search: (query: string) =>
        request<UserSearchResponse>('/users', { query: { search: query } }),
      get: (username: string) => request<PlayerResponse>(`/users/${encodeURIComponent(username)}`),
      /** A player's friends, A to Z — theirs and their friends' to see (`friends_hidden` otherwise). */
      friends: (username: string, cursor?: string) =>
        request<FriendListResponse>(`/users/${encodeURIComponent(username)}/friends`, { query: { cursor } }),
      /** Sends a friend request — or accepts theirs, when it waits. */
      addFriend: (username: string) =>
        request<RelationResponse>(`/users/${encodeURIComponent(username)}/friend`, { method: 'PUT' }),
      /** Takes a request back, turns one down, or ends a friendship. */
      removeFriend: (username: string) =>
        request<RelationResponse>(`/users/${encodeURIComponent(username)}/friend`, { method: 'DELETE' }),
      block: (username: string) =>
        request<RelationResponse>(`/users/${encodeURIComponent(username)}/block`, { method: 'PUT' }),
      unblock: (username: string) =>
        request<RelationResponse>(`/users/${encodeURIComponent(username)}/block`, { method: 'DELETE' }),
      /** Reports a player's photo or name to the moderators. */
      report: (username: string, reason: ReportReason) =>
        request<void>(`/users/${encodeURIComponent(username)}/report`, {
          method: 'POST',
          body: { reason },
        }),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
