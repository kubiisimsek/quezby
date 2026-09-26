import { api } from '@/api/client';
import { installId, useSession } from '@/auth/session';

describe('api', () => {
  const fetchMock = jest.fn(async () => new Response(JSON.stringify({ user: {}, ranks: {} }), { status: 200 }));

  beforeEach(() => {
    fetchMock.mockClear();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    useSession.setState({ token: 'token-1', hydrated: true });
  });

  it('names the phone to the API on every call — install, system, model and build — once the install id is read', async () => {
    const install = await installId();

    await api.me.get();

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).toMatchObject({
      'X-App-Version': '1.0.0',
      'X-Device': `install=${install}; platform=ios; os=18.0; model=iPhone%2015; build=1`,
    });
  });
});
