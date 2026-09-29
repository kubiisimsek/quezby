import { ApiError } from '@quezby/sdk';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { api } from '@/api/client';
import {
  friendListKey,
  refreshSocial,
  useDeclineDuel,
  useFriendList,
  useFriendRequests,
  useInboxSummary,
  useNotifications,
  useSeeNotifications,
} from '@/hooks/useSocial';
import { buildDuel, buildInbox, buildNotification, buildSummary, buildWaiting } from '@/test/factories';
import { createTestQueryClient } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: {
    me: { inbox: jest.fn(), friendRequests: jest.fn(), notifications: jest.fn(), seeNotifications: jest.fn() },
    users: { friends: jest.fn() },
    duels: { decline: jest.fn() },
  },
}));

const mocked = api as unknown as {
  me: { inbox: jest.Mock; friendRequests: jest.Mock; notifications: jest.Mock; seeNotifications: jest.Mock };
  users: { friends: jest.Mock };
  duels: { decline: jest.Mock };
};

function wrapperFor(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useInboxSummary', () => {
  it('reads the badges, the friend count and the VS waiting from /me/inbox', async () => {
    const summary = buildInbox({ requests: 2, friends: 12, yourTurn: 1, waiting: [buildWaiting()] });
    mocked.me.inbox.mockResolvedValue(summary);
    const hook = await renderHook(() => useInboxSummary(), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(hook.result.current.data).toEqual(summary));
  });
});

describe('useNotifications', () => {
  it('reads the bell\'s list', async () => {
    const answer = { notifications: [buildNotification()], unseen: 1 };
    mocked.me.notifications.mockResolvedValue(answer);
    const hook = await renderHook(() => useNotifications(), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(hook.result.current.data).toEqual(answer));
  });
});

describe('useSeeNotifications', () => {
  it('tells the API the list was seen, and takes the badge to zero at once', async () => {
    mocked.me.seeNotifications.mockResolvedValue(undefined);
    const client = createTestQueryClient();
    client.setQueryData(['inbox'], buildInbox({ notifications: 3, threads: 1 }));
    const hook = await renderHook(() => useSeeNotifications(), { wrapper: wrapperFor(client) });

    await act(async () => {
      await hook.result.current.mutateAsync();
    });

    expect(mocked.me.seeNotifications).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(['inbox'])).toEqual(buildInbox({ notifications: 0, threads: 1 }));
  });
});

describe('useFriendList', () => {
  it('asks for a player’s friends a page at a time', async () => {
    mocked.users.friends
      .mockResolvedValueOnce({ friends: [buildSummary({ username: 'mert' })], total: 2, nextCursor: 'bWVydA' })
      .mockResolvedValueOnce({ friends: [buildSummary({ username: 'oya' })], total: 2, nextCursor: null });
    const hook = await renderHook(() => useFriendList('deniz'), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(hook.result.current.data?.pages).toHaveLength(1));
    expect(mocked.users.friends).toHaveBeenCalledWith('deniz', undefined);
    expect(hook.result.current.hasNextPage).toBe(true);

    await act(async () => {
      await hook.result.current.fetchNextPage();
    });

    expect(mocked.users.friends).toHaveBeenLastCalledWith('deniz', 'bWVydA');
    await waitFor(() =>
      expect(hook.result.current.data?.pages.flatMap((page) => page.friends.map((f) => f.username))).toEqual([
        'mert',
        'oya',
      ]),
    );
    expect(hook.result.current.hasNextPage).toBe(false);
  });

  it('takes a locked list as the answer, without asking again', async () => {
    mocked.users.friends.mockRejectedValue(new ApiError(403, 'friends_hidden', 'x'));
    const hook = await renderHook(() => useFriendList('deniz'), { wrapper: wrapperFor(createTestQueryClient()) });

    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(mocked.users.friends).toHaveBeenCalledTimes(1);
  });
});

describe('useFriendRequests', () => {
  it('asks only when it is on', async () => {
    mocked.me.friendRequests.mockResolvedValue({ incoming: [], outgoing: [] });
    const client = createTestQueryClient();
    await renderHook(() => useFriendRequests(false), { wrapper: wrapperFor(client) });
    expect(mocked.me.friendRequests).not.toHaveBeenCalled();

    const hook = await renderHook(() => useFriendRequests(), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(mocked.me.friendRequests).toHaveBeenCalledTimes(1);
  });
});

describe('useDeclineDuel', () => {
  it('turns a VS down and asks again for everything that shows it', async () => {
    mocked.duels.decline.mockResolvedValue({ duel: buildDuel({ status: 'declined' }) });
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const hook = await renderHook(() => useDeclineDuel('deniz'), { wrapper: wrapperFor(client) });

    await act(async () => {
      await hook.result.current.mutateAsync('01jduel0000000000000000001');
    });

    expect(mocked.duels.decline).toHaveBeenCalledWith('01jduel0000000000000000001');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['inbox'] });
  });
});

describe('refreshSocial', () => {
  it('marks every friend list old with the rest', () => {
    const client = createTestQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries').mockResolvedValue();

    refreshSocial(client, 'deniz');

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['friend-list'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['notifications'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['friends'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['player', 'deniz'] });
    expect(friendListKey('deniz')).toEqual(['friend-list', 'deniz']);
  });
});
