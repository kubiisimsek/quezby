import type {
  ApiErrorBody,
  ApiErrorCode,
  AppConfigResponse,
  AppleLinkRequest,
  AppleSignInRequest,
  AuthResponse,
  DailyResponse,
  FinishRunRequest,
  FinishRunResponse,
  FollowListResponse,
  GoogleLinkRequest,
  GoogleSignInRequest,
  GuestSignUpRequest,
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
  UserSearchResponse,
  UserSettings,
  UsernameAvailability,
} from '@quezby/types';

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

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode | 'network' | 'timeout',
    message: string,
    readonly fields: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | number | undefined>;
};

const DEFAULT_TIMEOUT_MS = 15_000;

function isErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as ApiErrorBody).error?.code === 'string'
  );
}

export function createApiClient(options: ApiClientOptions) {
  const base = `${options.baseUrl.replace(/\/$/, '')}/api/v1`;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, auth = true, query } = init;
    const search = query
      ? Object.entries(query)
          .filter(([, value]) => value !== undefined)
          .map(
            ([key, value]) =>
              `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
          )
          .join('&')
      : '';
    const url = `${base}${path}${search ? `?${search}` : ''}`;

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.appVersion) headers['X-App-Version'] = options.appVersion;
    const token = auth ? options.getToken?.() : null;
    if (token) headers.Authorization = `Bearer ${token}`;

    // `AbortSignal.timeout` is not in React Native's runtime.
    const controller = new AbortController();
    let expired = false;
    const timer = setTimeout(() => {
      expired = true;
      controller.abort();
    }, timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      throw expired
        ? new ApiError(0, 'timeout', 'The request timed out.')
        : new ApiError(0, 'network', 'The API could not be reached.');
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 204) return undefined as T;

    const text = await response.text();
    let payload: unknown = null;
    if (text.length > 0) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      if (response.status === 401 && token) options.onUnauthorized?.();
      if (isErrorBody(payload)) {
        throw new ApiError(
          response.status,
          payload.error.code,
          payload.error.message,
          payload.error.fields ?? {},
        );
      }
      throw new ApiError(
        response.status,
        response.status === 429 ? 'too_many_requests' : 'server_error',
        `The API answered ${response.status}.`,
      );
    }

    return payload as T;
  }

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
    runs: {
      start: (input: StartRunRequest) =>
        request<StartRunResponse>('/runs', { method: 'POST', body: input }),
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
