import type { ApiErrorBody, ApiErrorCode } from '@quezby/types';

/**
 * The one way either client talks to the API: JSON in and out, a bearer token,
 * a hard deadline, and the contract's error shape turned into `ApiError`.
 */
export type HttpOptions = {
  /** The API's origin, e.g. `https://api.quezby.com` — no `/api` suffix. */
  baseUrl: string;
  /** Where the client's routes live under the origin, e.g. `/api/v1`. */
  prefix: string;
  getToken?: () => string | null;
  /** Called on any 401 from an authenticated request. */
  onUnauthorized?: () => void;
  /** Hard deadline per request. A dead network must not hang a screen. */
  timeoutMs?: number;
  /** Sent as `X-App-Version` so the API can tell builds apart. */
  appVersion?: string;
  /** Sent as `X-Device` when it answers — the phone the app runs on, for the API's device registry. */
  device?: () => string | null;
  /**
   * Sent as `Accept-Language` when it answers — the language the app speaks
   * right now, which the API answers its messages and share texts in.
   */
  locale?: () => string | null;
  /** Called when a request never got an answer — no network, or past the deadline. */
  onUnreached?: (failure: UnreachedRequest) => void;
};

/** A request that never reached the API, or got no answer in time. */
export type UnreachedRequest = { method: string; path: string; code: 'network' | 'timeout' };

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

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  /** `undefined` values are left out; booleans go as `1` / `0`, the way Laravel reads them. */
  query?: Record<string, string | number | boolean | undefined>;
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

function queryValue(value: string | number | boolean): string {
  if (typeof value === 'boolean') return value ? '1' : '0';
  return String(value);
}

export function createRequest(options: HttpOptions) {
  const base = `${options.baseUrl.replace(/\/$/, '')}${options.prefix}`;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return async function request<T>(path: string, init: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, auth = true, query } = init;
    const search = query
      ? Object.entries(query)
          .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(queryValue(value))}`)
          .join('&')
      : '';
    const url = `${base}${path}${search ? `?${search}` : ''}`;

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.appVersion) headers['X-App-Version'] = options.appVersion;
    const device = options.device?.();
    if (device) headers['X-Device'] = device;
    const locale = options.locale?.();
    if (locale) headers['Accept-Language'] = locale;
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
      const code = expired ? 'timeout' : 'network';
      options.onUnreached?.({ method, path, code });
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
  };
}

export type Request = ReturnType<typeof createRequest>;
