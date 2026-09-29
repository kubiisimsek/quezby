import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { PULSE_FAR_MS, PULSE_NEAR_MS, usePulse } from '@/hooks/usePulse';
import { refreshInbox, threadKey } from '@/hooks/useSocial';
import { threadFriend, useCurrentRoute } from '@/stores/route';
import { buildMe } from '@/test/factories';
import { createTestQueryClient } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({ api: { me: { pulse: jest.fn() } } }));

const mocked = api as unknown as { me: { pulse: jest.Mock } };

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/** Moves the clock, then lets the answers that came in land (React Query tells its observers on a zero timeout). */
async function wait(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(0);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  useSession.setState({ token: 'token', user: buildMe(), ranks: null, hydrated: true });
  useCurrentRoute.setState({ name: 'Home', username: null });
  mocked.me.pulse.mockResolvedValue({ stamp: 4 });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('usePulse', () => {
  it('asks every 10 s away from the friends, and every 3 s on their screens', async () => {
    const hook = await renderHook(() => usePulse(true), { wrapper: wrapperFor(createTestQueryClient()) });
    await wait(0);
    expect(mocked.me.pulse).toHaveBeenCalledTimes(1);

    await wait(PULSE_NEAR_MS);
    expect(mocked.me.pulse).toHaveBeenCalledTimes(1);
    await wait(PULSE_FAR_MS - PULSE_NEAR_MS);
    expect(mocked.me.pulse).toHaveBeenCalledTimes(2);

    await act(async () => useCurrentRoute.setState({ name: 'Thread', username: 'ekin' }));
    await wait(PULSE_NEAR_MS);
    expect(mocked.me.pulse).toHaveBeenCalledTimes(3);

    // The inbox tab and the friend list are the friends' screens too.
    await act(async () => useCurrentRoute.setState({ name: 'Inbox', username: null }));
    await wait(PULSE_NEAR_MS);
    expect(mocked.me.pulse).toHaveBeenCalledTimes(4);
    await act(async () => useCurrentRoute.setState({ name: 'Friends', username: null }));
    await wait(PULSE_NEAR_MS);
    expect(mocked.me.pulse).toHaveBeenCalledTimes(5);
    await hook.unmount();
  });

  it('rests during a run', async () => {
    useCurrentRoute.setState({ name: 'Game', username: null });
    const hook = await renderHook(() => usePulse(true), { wrapper: wrapperFor(createTestQueryClient()) });
    await wait(PULSE_FAR_MS * 2);
    expect(mocked.me.pulse).not.toHaveBeenCalled();

    await act(async () => useCurrentRoute.setState({ name: 'Home', username: null }));
    await wait(0);
    expect(mocked.me.pulse).toHaveBeenCalledTimes(1);
    await hook.unmount();
  });

  it('rests before the game is open', async () => {
    const hook = await renderHook(() => usePulse(false), { wrapper: wrapperFor(createTestQueryClient()) });
    await wait(PULSE_FAR_MS * 2);
    expect(mocked.me.pulse).not.toHaveBeenCalled();
    await hook.unmount();
  });

  it('asks the inbox again only when the number moved', async () => {
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    mocked.me.pulse.mockResolvedValueOnce({ stamp: 4 }).mockResolvedValueOnce({ stamp: 4 }).mockResolvedValue({ stamp: 5 });
    const hook = await renderHook(() => usePulse(true), { wrapper: wrapperFor(client) });

    await wait(0);
    await wait(PULSE_FAR_MS);
    expect(mocked.me.pulse).toHaveBeenCalledTimes(2);
    expect(invalidate).not.toHaveBeenCalled();

    await wait(PULSE_FAR_MS);
    expect(mocked.me.pulse).toHaveBeenCalledTimes(3);
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['inbox'] }));
    await hook.unmount();
  });
});

describe('refreshInbox', () => {
  it('asks again for the conversation on show, and only marks the other lists', () => {
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries').mockResolvedValue();
    const refetch = jest.spyOn(client, 'refetchQueries').mockResolvedValue();

    refreshInbox(client, { name: 'Thread', username: 'ekin' });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['inbox'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['friends'], refetchType: 'none' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['thread'], refetchType: 'none' });
    expect(refetch).toHaveBeenCalledWith({ queryKey: threadKey('ekin'), type: 'active' });
  });

  it('asks again for both sides of Mesajlar: the conversations, the requests and the friend list', () => {
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries').mockResolvedValue();
    const refetch = jest.spyOn(client, 'refetchQueries').mockResolvedValue();

    refreshInbox(client, { name: 'Inbox', username: null });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['friends'], refetchType: 'active' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['friend-requests'], refetchType: 'active' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['friend-list'], refetchType: 'active' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['notifications'], refetchType: 'none' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['search'], refetchType: 'none' });
    expect(refetch).not.toHaveBeenCalled();
  });

  it('asks again for the bell\'s list while it is on screen', () => {
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries').mockResolvedValue();

    refreshInbox(client, { name: 'Alerts', username: null });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['notifications'], refetchType: 'active' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['friends'], refetchType: 'none' });
  });

  it('asks again for the requests and the friend list on the friend list', () => {
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries').mockResolvedValue();

    refreshInbox(client, { name: 'Friends', username: null });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['friend-requests'], refetchType: 'active' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['friend-list'], refetchType: 'active' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['friends'], refetchType: 'none' });
  });
});

describe('threadFriend', () => {
  it('names the friend of a conversation, and nobody anywhere else', () => {
    expect(threadFriend({ name: 'Thread', params: { username: 'ekin' } })).toBe('ekin');
    expect(threadFriend({ name: 'Friends', params: { username: 'ekin' } })).toBeNull();
    expect(threadFriend({ name: 'Thread' })).toBeNull();
    expect(threadFriend(undefined)).toBeNull();
  });
});
