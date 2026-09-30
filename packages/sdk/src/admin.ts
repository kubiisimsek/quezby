import type {
  AdminAccountsResponse,
  AdminActionResponse,
  AdminAnalytics,
  AdminAnalyticsQuery,
  AdminAuditQuery,
  AdminAuditEntry,
  AdminBoardKeysQuery,
  AdminBoardKeysResponse,
  AdminBoardQuery,
  AdminBoardResponse,
  AdminCalibrationQuery,
  AdminCalibrationResponse,
  AdminContentQuery,
  AdminContentResponse,
  AdminCounts,
  AdminCreateRequest,
  AdminDeletePlayerRequest,
  AdminLoginRequest,
  AdminMeResponse,
  AdminOverview,
  AdminPage,
  AdminPasswordRequest,
  AdminPlayerActivity,
  AdminPlayerResponse,
  AdminPlayersQuery,
  AdminPlayersResponse,
  AdminRatingsResponse,
  AdminReasonRequest,
  AdminRenameResponse,
  AdminReportsQuery,
  AdminReportsResponse,
  AdminRunResponse,
  AdminRunsQuery,
  AdminRunsResponse,
  AdminSession,
  AdminSetRatingRequest,
  AdminSetRatingResponse,
  AdminSuspectsQuery,
  AdminSuspectsResponse,
  AdminSystem,
  AdminSystemAction,
  AdminSystemActionResponse,
  AdminTemporaryPassword,
  AdminUpdateRequest,
  AdminAccount,
} from '@quezby/types';
import { createRequest } from './http';

export { ApiError, type RequestOptions } from './http';

export type AdminClientOptions = {
  /** The API's origin, e.g. `https://api.quezby.com`; empty for the panel's dev proxy. */
  baseUrl: string;
  getToken?: () => string | null;
  /** Called on any 401 from an authenticated request: the session is over. */
  onUnauthorized?: () => void;
  timeoutMs?: number;
};

const id = (value: string | number) => encodeURIComponent(String(value));

/**
 * The admin panel's API, `/api/v1/admin` — `docs/backend/admin-api.md`. A 403
 * (`forbidden`) is a role that may not do something, not a lost session, so
 * only a 401 calls `onUnauthorized`.
 */
export function createAdminClient(options: AdminClientOptions) {
  const request = createRequest({ ...options, prefix: '/api/v1/admin' });

  return {
    request,
    auth: {
      login: (input: AdminLoginRequest) =>
        request<AdminSession>('/auth/login', { method: 'POST', body: input, auth: false }),
      logout: () => request<void>('/auth/logout', { method: 'POST' }),
    },
    me: {
      get: () => request<AdminMeResponse>('/me'),
      changePassword: (input: AdminPasswordRequest) =>
        request<void>('/me/password', { method: 'PUT', body: input }),
    },
    overview: {
      get: () => request<AdminOverview>('/overview'),
      /** What the sidebar badges count. */
      counts: () => request<AdminCounts>('/counts'),
    },
    players: {
      list: (query: AdminPlayersQuery = {}) =>
        request<AdminPlayersResponse>('/players', { query }),
      get: (playerId: string) => request<AdminPlayerResponse>(`/players/${id(playerId)}`),
      /** Visits, days and firsts — only for a player who said yes to usage analytics. */
      activity: (playerId: string) =>
        request<AdminPlayerActivity>(`/players/${id(playerId)}/activity`),
      ban: (playerId: string, input: AdminReasonRequest) =>
        request<AdminActionResponse>(`/players/${id(playerId)}/ban`, { method: 'POST', body: input }),
      unban: (playerId: string) =>
        request<AdminActionResponse>(`/players/${id(playerId)}/unban`, { method: 'POST' }),
      /** Gives the player a fresh automatic name, `guest` and eight digits. */
      rename: (playerId: string, input: AdminReasonRequest) =>
        request<AdminRenameResponse>(`/players/${id(playerId)}/rename`, { method: 'POST', body: input }),
      /** Ends every session the player has. Refused for guests: their token is their only key. */
      signOut: (playerId: string) =>
        request<AdminActionResponse>(`/players/${id(playerId)}/sign-out`, { method: 'POST' }),
      /** Takes the player's photo down; the reports about it close. */
      removeAvatar: (playerId: string, input: AdminReasonRequest) =>
        request<AdminActionResponse>(`/players/${id(playerId)}/avatar/remove`, { method: 'POST', body: input }),
      /** Lets the player's open reports go. */
      dismissReports: (playerId: string, input: AdminReasonRequest) =>
        request<AdminActionResponse>(`/players/${id(playerId)}/reports/dismiss`, { method: 'POST', body: input }),
      /** Sets the player's rating (qb) by hand, placing them if they are not yet. Owner only. */
      setRating: (playerId: string, input: AdminSetRatingRequest) =>
        request<AdminSetRatingResponse>(`/players/${id(playerId)}/rating`, { method: 'POST', body: input }),
      /** Owner only. */
      remove: (playerId: string, input: AdminDeletePlayerRequest) =>
        request<void>(`/players/${id(playerId)}/delete`, { method: 'POST', body: input }),
    },
    runs: {
      list: (query: AdminRunsQuery = {}) => request<AdminRunsResponse>('/runs', { query }),
      get: (runId: string) => request<AdminRunResponse>(`/runs/${id(runId)}`),
      approve: (runId: string) =>
        request<AdminActionResponse>(`/runs/${id(runId)}/approve`, { method: 'POST' }),
      reject: (runId: string, input: AdminReasonRequest) =>
        request<AdminActionResponse>(`/runs/${id(runId)}/reject`, { method: 'POST', body: input }),
    },
    /** What players reported about each other's photos and names, a row per reported player. */
    reports: {
      list: (query: AdminReportsQuery = {}) => request<AdminReportsResponse>('/reports', { query }),
    },
    suspects: {
      list: (query: AdminSuspectsQuery = {}) =>
        request<AdminSuspectsResponse>('/suspects', { query }),
    },
    boards: {
      get: (query: AdminBoardQuery) => request<AdminBoardResponse>('/boards', { query }),
      keys: (query: AdminBoardKeysQuery) =>
        request<AdminBoardKeysResponse>('/boards/keys', { query }),
    },
    ratings: {
      get: () => request<AdminRatingsResponse>('/ratings'),
      calibration: (query: AdminCalibrationQuery = {}) =>
        request<AdminCalibrationResponse>('/ratings/calibration', { query }),
    },
    analytics: {
      get: (query: AdminAnalyticsQuery = {}) => request<AdminAnalytics>('/analytics', { query }),
    },
    content: {
      list: (query: AdminContentQuery = {}) => request<AdminContentResponse>('/content', { query }),
    },
    audit: {
      list: (query: AdminAuditQuery = {}) =>
        request<AdminPage<AdminAuditEntry>>('/audit', { query }),
    },
    admins: {
      list: () => request<AdminAccountsResponse>('/admins'),
      create: (input: AdminCreateRequest) =>
        request<AdminTemporaryPassword>('/admins', { method: 'POST', body: input }),
      update: (adminId: string, input: AdminUpdateRequest) =>
        request<{ admin: AdminAccount }>(`/admins/${id(adminId)}`, { method: 'PUT', body: input }),
      resetPassword: (adminId: string) =>
        request<AdminTemporaryPassword>(`/admins/${id(adminId)}/reset-password`, { method: 'POST' }),
    },
    system: {
      get: () => request<AdminSystem>('/system'),
      run: (action: AdminSystemAction) =>
        request<AdminSystemActionResponse>(`/system/${action}`, { method: 'POST' }),
    },
  };
}

export type AdminClient = ReturnType<typeof createAdminClient>;
