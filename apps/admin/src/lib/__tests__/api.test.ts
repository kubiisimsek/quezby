import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPanelClient } from '@/lib/api';
import { useSession } from '@/stores/session';
import { adminSession } from '@/test/factories';

/* The one test that goes through the real client: the token and the 401 wiring. */

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createPanelClient', () => {
  it('sends the session\'s token to the admin API', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ admin: {} }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    useSession.getState().signIn(adminSession(), false);

    await createPanelClient('https://api.quezby.com').me.get();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.quezby.com/api/v1/admin/me');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer test-token' });
  });

  it('ends the session when the API says it is over', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: { code: 'unauthenticated', message: 'Oturum yok.' } }), { status: 401 })),
    );
    useSession.getState().signIn(adminSession(), false);

    await expect(createPanelClient('').overview.get()).rejects.toMatchObject({ status: 401 });
    expect(useSession.getState().session).toBeNull();
    expect(useSession.getState().ended).toBe('expired');
  });
});
