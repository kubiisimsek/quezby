import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApiClient, type ApiClient } from '../index';

type Call = {
  name: string;
  call: (api: ApiClient) => Promise<unknown>;
  method: string;
  url: string;
  body?: unknown;
  auth: boolean;
};

/** Every endpoint of the v2 contract: where it goes, how, with what, and whether it sends the token. */
const CALLS: Call[] = [
  { name: 'auth.nonce', call: (api) => api.auth.nonce(), method: 'POST', url: '/auth/nonce', auth: false },
  {
    name: 'auth.apple',
    call: (api) =>
      api.auth.apple({ identityToken: 'jwt', nonce: 'n', authorizationCode: 'c', platform: 'ios', installId: 'i' }),
    method: 'POST',
    url: '/auth/apple',
    body: { identityToken: 'jwt', nonce: 'n', authorizationCode: 'c', platform: 'ios', installId: 'i' },
    auth: false,
  },
  {
    name: 'auth.google',
    call: (api) => api.auth.google({ idToken: 'jwt', platform: 'android', installId: 'i' }),
    method: 'POST',
    url: '/auth/google',
    body: { idToken: 'jwt', platform: 'android', installId: 'i' },
    auth: false,
  },
  {
    name: 'me.linkApple',
    call: (api) => api.me.linkApple({ identityToken: 'jwt', nonce: 'n' }),
    method: 'POST',
    url: '/me/identities/apple',
    body: { identityToken: 'jwt', nonce: 'n' },
    auth: true,
  },
  {
    name: 'me.linkGoogle',
    call: (api) => api.me.linkGoogle({ idToken: 'jwt' }),
    method: 'POST',
    url: '/me/identities/google',
    body: { idToken: 'jwt' },
    auth: true,
  },
  { name: 'me.unlink', call: (api) => api.me.unlink('google'), method: 'DELETE', url: '/me/identities/google', auth: true },
  { name: 'me.stats', call: (api) => api.me.stats(), method: 'GET', url: '/me/stats', auth: true },
  { name: 'me.following', call: (api) => api.me.following(), method: 'GET', url: '/me/following', auth: true },
  {
    name: 'me.followers with a cursor',
    call: (api) => api.me.followers('abc=='),
    method: 'GET',
    url: '/me/followers?cursor=abc%3D%3D',
    auth: true,
  },
  {
    name: 'runs.start',
    call: (api) => api.runs.start({ mode: 'daily', engineVersion: 2, contentVersion: 1 }),
    method: 'POST',
    url: '/runs',
    body: { mode: 'daily', engineVersion: 2, contentVersion: 1 },
    auth: true,
  },
  {
    name: 'leaderboards.get with defaults',
    call: (api) => api.leaderboards.get('monthly'),
    method: 'GET',
    url: '/leaderboards/monthly?scope=everyone&limit=50',
    auth: true,
  },
  {
    name: 'leaderboards.get for friends',
    call: (api) => api.leaderboards.get('challenge', { scope: 'friends', limit: 3 }),
    method: 'GET',
    url: '/leaderboards/challenge?scope=friends&limit=3',
    auth: true,
  },
  {
    name: 'runs.checkpoint',
    call: (api) => api.runs.checkpoint('01run', { reel: 42, prefixHash: 'ab'.repeat(32) }),
    method: 'POST',
    url: '/runs/01run/checkpoint',
    body: { reel: 42, prefixHash: 'ab'.repeat(32) },
    auth: true,
  },
  { name: 'device.challenge', call: (api) => api.device.challenge(), method: 'POST', url: '/device/challenge', auth: true },
  {
    name: 'device.android',
    call: (api) => api.device.android({ challenge: 'c1', token: 'play.token' }),
    method: 'POST',
    url: '/device/android',
    body: { challenge: 'c1', token: 'play.token' },
    auth: true,
  },
  {
    name: 'device.iosAttest',
    call: (api) => api.device.iosAttest({ challenge: 'c1', keyId: 'k1', attestation: 'o2Nm' }),
    method: 'POST',
    url: '/device/ios/attest',
    body: { challenge: 'c1', keyId: 'k1', attestation: 'o2Nm' },
    auth: true,
  },
  {
    name: 'device.iosAssert',
    call: (api) => api.device.iosAssert({ challenge: 'c1', keyId: 'k1', assertion: 'omlz' }),
    method: 'POST',
    url: '/device/ios/assert',
    body: { challenge: 'c1', keyId: 'k1', assertion: 'omlz' },
    auth: true,
  },
  { name: 'daily.get', call: (api) => api.daily.get(), method: 'GET', url: '/daily', auth: true },
  {
    name: 'analytics.send',
    call: (api) =>
      api.analytics.send({
        sentAt: '2026-09-26T10:00:00.000Z',
        platform: 'ios',
        visits: [
          {
            id: 'ab'.repeat(16),
            startedAt: '2026-09-26T09:55:00.000Z',
            seconds: 240,
            appVersion: '1.0.0',
            journey: [
              ['home', 0],
              ['game', 12],
              ['share_result', 230],
            ],
            counts: { home: 1, game: 1, share_result: 1 },
          },
        ],
      }),
    method: 'POST',
    url: '/analytics/visits',
    body: {
      sentAt: '2026-09-26T10:00:00.000Z',
      platform: 'ios',
      visits: [
        {
          id: 'ab'.repeat(16),
          startedAt: '2026-09-26T09:55:00.000Z',
          seconds: 240,
          appVersion: '1.0.0',
          journey: [
            ['home', 0],
            ['game', 12],
            ['share_result', 230],
          ],
          counts: { home: 1, game: 1, share_result: 1 },
        },
      ],
    },
    auth: true,
  },
  { name: 'leagues.current', call: (api) => api.leagues.current(), method: 'GET', url: '/leagues/current', auth: true },
  { name: 'users.search', call: (api) => api.users.search('ku.b'), method: 'GET', url: '/users?search=ku.b', auth: true },
  { name: 'users.get', call: (api) => api.users.get('mert*34'), method: 'GET', url: '/users/mert*34', auth: true },
  { name: 'users.follow', call: (api) => api.users.follow('kubi'), method: 'PUT', url: '/users/kubi/follow', auth: true },
  { name: 'users.unfollow', call: (api) => api.users.unfollow('kubi'), method: 'DELETE', url: '/users/kubi/follow', auth: true },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('endpoints', () => {
  it.each(CALLS)('$name', async ({ call, method, url, body, auth }) => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const api = createApiClient({ baseUrl: 'http://x', getToken: () => 'tok' });

    await call(api);

    const [calledUrl, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(calledUrl).toBe(`http://x/api/v1${url}`);
    expect(init.method).toBe(method);
    expect(init.body === undefined ? undefined : JSON.parse(init.body as string)).toEqual(body);
    if (auth) expect(init.headers).toMatchObject({ Authorization: 'Bearer tok' });
    else expect(init.headers).not.toHaveProperty('Authorization');
  });

  it('answers undefined for a 204, as follow and unfollow do', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));
    const api = createApiClient({ baseUrl: 'http://x', getToken: () => 'tok' });

    await expect(api.users.follow('kubi')).resolves.toBeUndefined();
  });
});
