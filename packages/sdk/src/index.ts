import type {
  AndroidIntegrityRequest,
  AppConfigResponse,
  AppleLinkRequest,
  AppleSignInRequest,
  AuthResponse,
  CheckpointRequest,
  CheckpointResponse,
  DailyResponse,
  DeviceChallengeResponse,
  DeviceCheckResponse,
  FinishRunRequest,
  FinishRunResponse,
  FollowListResponse,
  GoogleLinkRequest,
  GoogleSignInRequest,
  GuestSignUpRequest,
  IosAssertionRequest,
  IosAttestationRequest,
  LeaderboardBoard,
  LeaderboardResponse,
  LeaderboardScope,
  LeagueResponse,
  LinkCredentialsRequest,
  LoginRequest,
  Me,
  MeResponse,
  NonceResponse,
  Platform,
  PlayerResponse,
  SocialAuthResponse,
  SocialProvider,
  StartRunRequest,
  StartRunResponse,
  StatsResponse,
  UpdateSettingsRequest,
  UsernameAvailability,
  UserSearchResponse,
  UserSettings,
} from '@quezby/types';
import { createRequest } from './http';

export { ApiError, type RequestOptions } from './http';

export type ApiClientOptions = {
  /** The API's origin, e.g. `https://api.quezby.com` — no `/api` suffix. */
  baseUrl: string;
  getToken?: () => string | null;
  /** Called on any 401 from an authenticated request. */
  onUnauthorized?: () => void;
  /** Hard deadline per request. A dead network must not hang a screen. */
  timeoutMs?: number;
  /** Sent as `X-App-Version` so the API can tell builds apart. */
  appVersion?: string;
};

/**
 * The player API, `/api/v1`. The admin panel's client is a separate entry,
 * `@quezby/sdk/admin`, so none of it ships in the app.
 */
export function createApiClient(options: ApiClientOptions) {
  const request = createRequest({ ...options, prefix: '/api/v1' });

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
      linkCredentials: (input: LinkCredentialsRequest) =>
        request<{ user: Me }>('/me/credentials', {
          method: 'POST',
          body: input,
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
      following: (cursor?: string) =>
        request<FollowListResponse>('/me/following', { query: { cursor } }),
      followers: (cursor?: string) =>
        request<FollowListResponse>('/me/followers', { query: { cursor } }),
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
    leagues: {
      current: () => request<LeagueResponse>('/leagues/current'),
    },
    users: {
      search: (query: string) =>
        request<UserSearchResponse>('/users', { query: { search: query } }),
      get: (username: string) => request<PlayerResponse>(`/users/${encodeURIComponent(username)}`),
      follow: (username: string) =>
        request<void>(`/users/${encodeURIComponent(username)}/follow`, { method: 'PUT' }),
      unfollow: (username: string) =>
        request<void>(`/users/${encodeURIComponent(username)}/follow`, { method: 'DELETE' }),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
