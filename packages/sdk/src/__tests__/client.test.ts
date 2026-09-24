import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, createApiClient } from '../index';

function respond(status: number, body?: unknown) {
  return vi.fn(async () =>
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createApiClient', () => {
  it('prefixes /api/v1, sends the token and the app version', async () => {
    const fetchMock = respond(200, { user: { id: '1' }, ranks: {} });
    vi.stubGlobal('fetch', fetchMock);
    const api = createApiClient({
      baseUrl: 'https://api.example.com/',
      getToken: () => 'tok',
      appVersion: '1.0.0',
    });

    await api.me.get();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.example.com/api/v1/me');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer tok',
      'X-App-Version': '1.0.0',
    });
  });

  it('never sends the token to a public route', async () => {
    const fetchMock = respond(200, { token: 't', user: {} });
    vi.stubGlobal('fetch', fetchMock);
    const api = createApiClient({ baseUrl: 'http://x', getToken: () => 'tok' });

    await api.auth.guest({ platform: 'ios', installId: 'abc' });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).not.toHaveProperty('Authorization');
  });

  it('encodes query strings', async () => {
    const fetchMock = respond(200, { username: 'a*b', available: true, reason: null });
    vi.stubGlobal('fetch', fetchMock);
    const api = createApiClient({ baseUrl: 'http://x' });

    await api.usernames.check('a*b.c');

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe('http://x/api/v1/usernames/check?username=a*b.c');
  });

  it('turns an error body into an ApiError with its code and fields', async () => {
    vi.stubGlobal(
      'fetch',
      respond(422, {
        error: {
          code: 'username_taken',
          message: 'Taken',
          fields: { username: ['taken'] },
        },
      }),
    );
    const api = createApiClient({ baseUrl: 'http://x', getToken: () => 't' });

    const error = await api.me.updateUsername('kubi').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: 'username_taken',
      fields: { username: ['taken'] },
    });
  });

  it('reports a 401 on an authenticated call', async () => {
    vi.stubGlobal('fetch', respond(401, { error: { code: 'unauthenticated', message: 'x' } }));
    const onUnauthorized = vi.fn();
    const api = createApiClient({
      baseUrl: 'http://x',
      getToken: () => 't',
      onUnauthorized,
    });

    await expect(api.me.get()).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('calls an unreachable API a network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Network request failed');
      }),
    );
    const api = createApiClient({ baseUrl: 'http://x' });

    await expect(api.app.config('ios', '1.0.0')).rejects.toMatchObject({
      code: 'network',
    });
  });

  it('returns nothing for a 204', async () => {
    vi.stubGlobal('fetch', respond(204));
    const api = createApiClient({ baseUrl: 'http://x', getToken: () => 't' });
    await expect(api.me.delete()).resolves.toBeUndefined();
  });
});
