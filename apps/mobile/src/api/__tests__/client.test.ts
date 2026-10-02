import { api } from '@/api/client';
import { installId, useSession } from '@/auth/session';
import { useLanguage } from '@/i18n/language';
import { pendingAppLogs, resetAppLogs } from '@/lib/appLog';

describe('api', () => {
  const fetchMock = jest.fn(async () => new Response(JSON.stringify({ user: {}, ranks: {} }), { status: 200 }));

  beforeEach(() => {
    fetchMock.mockClear();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    useSession.setState({ token: 'token-1', hydrated: true });
  });

  it('names the phone to the API on every call — install, system, maker, model and build — once the install id is read', async () => {
    const install = await installId();

    await api.me.get();

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).toMatchObject({
      'X-App-Version': '1.0.0',
      'X-Device': `install=${install}; platform=ios; os=18.0; brand=Apple; model=iPhone%2015; build=1`,
    });
  });

  it('asks the API to answer in the language the game speaks, as it is at each call', async () => {
    await api.me.get();
    useLanguage.setState({ locale: 'ar' });
    await api.me.get();

    const headers = fetchMock.mock.calls.map((call) => (call as unknown as [string, RequestInit])[1].headers);
    expect(headers[0]).toMatchObject({ 'Accept-Language': 'tr' });
    expect(headers[1]).toMatchObject({ 'Accept-Language': 'ar' });
  });

  it('keeps a request that never reached the API for the Loglar page — but not the logs’ own', async () => {
    resetAppLogs();
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;

    await expect(api.me.inbox()).rejects.toMatchObject({ code: 'network' });
    await expect(api.me.sendLogs({ entries: [{ level: 'info', event: 'a', message: 'b' }] })).rejects.toMatchObject({
      code: 'network',
    });

    expect(pendingAppLogs()).toEqual([
      expect.objectContaining({ level: 'warning', event: 'api.unreachable', message: 'GET /me/inbox' }),
    ]);
  });
});
