import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError as AdminApiError, createAdminClient, type AdminClient } from '../admin';
import { ApiError } from '../index';

type Call = {
  name: string;
  call: (api: AdminClient) => Promise<unknown>;
  method: string;
  url: string;
  body?: unknown;
  auth: boolean;
};

const PLAYER = '01jplayer0000000000000000a';
const RUN = '01jrun000000000000000000ab';
const ADMIN = '01jadmin00000000000000000c';

/** Every endpoint of the admin contract: where it goes, how, with what, and whether it sends the token. */
const CALLS: Call[] = [
  {
    name: 'auth.login',
    call: (api) => api.auth.login({ email: 'a@quezby.com', password: 'secret' }),
    method: 'POST',
    url: '/auth/login',
    body: { email: 'a@quezby.com', password: 'secret' },
    auth: false,
  },
  { name: 'auth.logout', call: (api) => api.auth.logout(), method: 'POST', url: '/auth/logout', auth: true },
  { name: 'me.get', call: (api) => api.me.get(), method: 'GET', url: '/me', auth: true },
  {
    name: 'me.changePassword',
    call: (api) =>
      api.me.changePassword({ currentPassword: 'old', password: 'new-password-12', passwordConfirmation: 'new-password-12' }),
    method: 'PUT',
    url: '/me/password',
    body: { currentPassword: 'old', password: 'new-password-12', passwordConfirmation: 'new-password-12' },
    auth: true,
  },
  { name: 'overview.get', call: (api) => api.overview.get(), method: 'GET', url: '/overview', auth: true },
  { name: 'overview.counts', call: (api) => api.overview.counts(), method: 'GET', url: '/counts', auth: true },
  { name: 'players.list with defaults', call: (api) => api.players.list(), method: 'GET', url: '/players', auth: true },
  {
    name: 'players.list with filters',
    call: (api) => api.players.list({ search: 'ku', status: 'banned', platform: 'ios', sort: 'best', page: 2, perPage: 50 }),
    method: 'GET',
    url: '/players?search=ku&status=banned&platform=ios&sort=best&page=2&perPage=50',
    auth: true,
  },
  { name: 'players.get', call: (api) => api.players.get(PLAYER), method: 'GET', url: `/players/${PLAYER}`, auth: true },
  {
    name: 'players.ban',
    call: (api) => api.players.ban(PLAYER, { reason: 'Bot' }),
    method: 'POST',
    url: `/players/${PLAYER}/ban`,
    body: { reason: 'Bot' },
    auth: true,
  },
  { name: 'players.unban', call: (api) => api.players.unban(PLAYER), method: 'POST', url: `/players/${PLAYER}/unban`, auth: true },
  {
    name: 'players.rename',
    call: (api) => api.players.rename(PLAYER, { reason: 'Küfürlü ad' }),
    method: 'POST',
    url: `/players/${PLAYER}/rename`,
    body: { reason: 'Küfürlü ad' },
    auth: true,
  },
  { name: 'players.activity', call: (api) => api.players.activity(PLAYER), method: 'GET', url: `/players/${PLAYER}/activity`, auth: true },
  { name: 'players.signOut', call: (api) => api.players.signOut(PLAYER), method: 'POST', url: `/players/${PLAYER}/sign-out`, auth: true },
  {
    name: 'players.removeAvatar',
    call: (api) => api.players.removeAvatar(PLAYER, { reason: 'Uygunsuz fotoğraf' }),
    method: 'POST',
    url: `/players/${PLAYER}/avatar/remove`,
    body: { reason: 'Uygunsuz fotoğraf' },
    auth: true,
  },
  {
    name: 'players.dismissReports',
    call: (api) => api.players.dismissReports(PLAYER, { reason: 'Sorun yok' }),
    method: 'POST',
    url: `/players/${PLAYER}/reports/dismiss`,
    body: { reason: 'Sorun yok' },
    auth: true,
  },
  { name: 'reports.list', call: (api) => api.reports.list({ status: 'open', page: 2 }), method: 'GET', url: '/reports?status=open&page=2', auth: true },
  {
    name: 'players.remove',
    call: (api) => api.players.remove(PLAYER, { reason: 'İstek', confirm: 'kerem.35' }),
    method: 'POST',
    url: `/players/${PLAYER}/delete`,
    body: { reason: 'İstek', confirm: 'kerem.35' },
    auth: true,
  },
  {
    name: 'runs.list with filters',
    call: (api) =>
      api.runs.list({ status: 'flagged', mode: 'daily', flag: 'wall_clock', player: PLAYER, from: '2026-09-01', to: '2026-09-25', sort: 'score' }),
    method: 'GET',
    url: `/runs?status=flagged&mode=daily&flag=wall_clock&player=${PLAYER}&from=2026-09-01&to=2026-09-25&sort=score`,
    auth: true,
  },
  { name: 'runs.get', call: (api) => api.runs.get(RUN), method: 'GET', url: `/runs/${RUN}`, auth: true },
  { name: 'runs.approve', call: (api) => api.runs.approve(RUN), method: 'POST', url: `/runs/${RUN}/approve`, auth: true },
  {
    name: 'runs.reject',
    call: (api) => api.runs.reject(RUN, { reason: 'Bot gibi' }),
    method: 'POST',
    url: `/runs/${RUN}/reject`,
    body: { reason: 'Bot gibi' },
    auth: true,
  },
  {
    name: 'suspects.list sends booleans as 1 and 0',
    call: (api) => api.suspects.list({ days: 7, includeBanned: true }),
    method: 'GET',
    url: '/suspects?days=7&includeBanned=1',
    auth: true,
  },
  {
    name: 'boards.get',
    call: (api) => api.boards.get({ board: 'weekly', key: '2026-W39', season: 2, page: 3 }),
    method: 'GET',
    url: '/boards?board=weekly&key=2026-W39&season=2&page=3',
    auth: true,
  },
  {
    name: 'boards.keys',
    call: (api) => api.boards.keys({ board: 'challenge', limit: 30 }),
    method: 'GET',
    url: '/boards/keys?board=challenge&limit=30',
    auth: true,
  },
  { name: 'ratings.get', call: (api) => api.ratings.get(), method: 'GET', url: '/ratings', auth: true },
  {
    name: 'ratings.calibration',
    call: (api) => api.ratings.calibration({ days: 14 }),
    method: 'GET',
    url: '/ratings/calibration?days=14',
    auth: true,
  },
  { name: 'ratings.calibration with defaults', call: (api) => api.ratings.calibration(), method: 'GET', url: '/ratings/calibration', auth: true },
  { name: 'analytics.get with defaults', call: (api) => api.analytics.get(), method: 'GET', url: '/analytics', auth: true },
  { name: 'analytics.get for 90 days', call: (api) => api.analytics.get({ days: 90 }), method: 'GET', url: '/analytics?days=90', auth: true },
  {
    name: 'content.list',
    call: (api) => api.content.list({ kind: 'like', sort: 'missRate' }),
    method: 'GET',
    url: '/content?kind=like&sort=missRate',
    auth: true,
  },
  {
    name: 'content.list, a page of it',
    call: (api) => api.content.list({ sort: 'shows', page: 3, perPage: 50 }),
    method: 'GET',
    url: '/content?sort=shows&page=3&perPage=50',
    auth: true,
  },
  {
    name: 'audit.list',
    call: (api) => api.audit.list({ action: 'player.ban', via: 'cli', subjectType: 'player', subjectId: PLAYER }),
    method: 'GET',
    url: `/audit?action=player.ban&via=cli&subjectType=player&subjectId=${PLAYER}`,
    auth: true,
  },
  { name: 'admins.list', call: (api) => api.admins.list(), method: 'GET', url: '/admins', auth: true },
  {
    name: 'admins.create',
    call: (api) => api.admins.create({ name: 'Ekin', email: 'ekin@quezby.com', role: 'moderator' }),
    method: 'POST',
    url: '/admins',
    body: { name: 'Ekin', email: 'ekin@quezby.com', role: 'moderator' },
    auth: true,
  },
  {
    name: 'admins.update',
    call: (api) => api.admins.update(ADMIN, { role: 'viewer', disabled: true }),
    method: 'PUT',
    url: `/admins/${ADMIN}`,
    body: { role: 'viewer', disabled: true },
    auth: true,
  },
  {
    name: 'admins.resetPassword',
    call: (api) => api.admins.resetPassword(ADMIN),
    method: 'POST',
    url: `/admins/${ADMIN}/reset-password`,
    auth: true,
  },
  { name: 'system.get', call: (api) => api.system.get(), method: 'GET', url: '/system', auth: true },
  { name: 'system.run', call: (api) => api.system.run('expire-runs'), method: 'POST', url: '/system/expire-runs', auth: true },
  {
    name: 'system.run prunes analytics',
    call: (api) => api.system.run('analytics-prune'),
    method: 'POST',
    url: '/system/analytics-prune',
    auth: true,
  },
];

function respond(status: number, body?: unknown) {
  return vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createAdminClient', () => {
  it.each(CALLS)('$name', async ({ call, method, url, body, auth }) => {
    const fetchMock = respond(200, {});
    vi.stubGlobal('fetch', fetchMock);
    const api = createAdminClient({ baseUrl: 'https://api.example.com/', getToken: () => 'tok' });

    await call(api);

    const [calledUrl, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(calledUrl).toBe(`https://api.example.com/api/v1/admin${url}`);
    expect(init.method).toBe(method);
    expect(init.body === undefined ? undefined : JSON.parse(init.body as string)).toEqual(body);
    if (auth) expect(init.headers).toMatchObject({ Authorization: 'Bearer tok' });
    else expect(init.headers).not.toHaveProperty('Authorization');
    expect(init.headers).not.toHaveProperty('X-App-Version');
    expect(init.headers).not.toHaveProperty('X-Device');
  });

  it('calls the dev proxy on the same origin when the base URL is empty', async () => {
    const fetchMock = respond(200, { admin: {} });
    vi.stubGlobal('fetch', fetchMock);

    await createAdminClient({ baseUrl: '', getToken: () => 'tok' }).me.get();

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe('/api/v1/admin/me');
  });

  it('ends the session on a 401', async () => {
    vi.stubGlobal('fetch', respond(401, { error: { code: 'unauthenticated', message: 'Oturum yok.' } }));
    const onUnauthorized = vi.fn();
    const api = createAdminClient({ baseUrl: 'http://x', getToken: () => 'tok', onUnauthorized });

    await expect(api.overview.get()).rejects.toMatchObject({ status: 401, code: 'unauthenticated' });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('keeps the session on a 403: the role may not, the admin is still signed in', async () => {
    vi.stubGlobal('fetch', respond(403, { error: { code: 'forbidden', message: 'Bu işlem için yetkin yok.' } }));
    const onUnauthorized = vi.fn();
    const api = createAdminClient({ baseUrl: 'http://x', getToken: () => 'tok', onUnauthorized });

    const error = await api.players.remove(PLAYER, { reason: 'x', confirm: 'y' }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 403, code: 'forbidden', message: 'Bu işlem için yetkin yok.' });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('answers undefined for a 204', async () => {
    vi.stubGlobal('fetch', respond(204));
    const api = createAdminClient({ baseUrl: 'http://x', getToken: () => 'tok' });

    await expect(api.auth.logout()).resolves.toBeUndefined();
  });

  it('shares one ApiError class with the player client', () => {
    expect(AdminApiError).toBe(ApiError);
  });
});
