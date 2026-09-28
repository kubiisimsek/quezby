import type {
  BlocksResponse,
  FriendRequestsResponse,
  FriendsResponse,
  InboxSummary,
  Phrase,
  ReportReason,
  ThreadResponse,
} from '@quezby/types';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';

import { api } from '@/api/client';

/**
 * Server state for friends: what the badges count, the inbox, requests, a
 * conversation, blocks and VS. What two players are to each other is always
 * the API's answer; a change refreshes every list that shows it. None of it
 * polls on its own: the pulse (`usePulse`) says when the inbox moved, and a
 * notification says so at once.
 */

export const threadKey = (username: string) => ['thread', username] as const;

/** The screen on show, as the pulse sees it (`stores/route`). */
type OnScreen = { name: string | null; username: string | null };

/**
 * What a moved pulse asks again: the badges and the lobby's VS card always;
 * the inbox list, the requests, a search or a conversation only while on
 * screen. The rest is marked old and asked again when it next shows.
 */
export function refreshInbox(client: QueryClient, on: OnScreen): void {
  void client.invalidateQueries({ queryKey: ['inbox'] });
  const shown: Record<string, boolean> = {
    friends: on.name === 'Friends',
    'friend-requests': on.name === 'Friends' || on.name === 'FindFriends',
    search: on.name === 'FindFriends',
    thread: false,
    player: false,
  };
  for (const [key, active] of Object.entries(shown)) {
    void client.invalidateQueries({ queryKey: [key], refetchType: active ? 'active' : 'none' });
  }
  if (on.name === 'Thread' && on.username) {
    void client.refetchQueries({ queryKey: threadKey(on.username), type: 'active' });
  }
}

/**
 * Everything that shows what two players are to each other, asked again —
 * the inbox and its badges, requests, blocks, search results, player cards
 * and the friends boards.
 */
export function refreshSocial(client: QueryClient, username?: string): void {
  for (const key of ['inbox', 'friends', 'friend-requests', 'blocks', 'search', 'leaderboard', 'league']) {
    void client.invalidateQueries({ queryKey: [key] });
  }
  if (username) {
    void client.invalidateQueries({ queryKey: ['player', username] });
    void client.invalidateQueries({ queryKey: threadKey(username) });
  }
}

/** What the badges count: requests waiting, and friends whose conversation wants a look. */
export function useInboxSummary() {
  return useQuery<InboxSummary>({
    queryKey: ['inbox'],
    queryFn: () => api.me.inbox(),
  });
}

/** The badge on the Arkadaşlar slot and the lobby's mailbox. */
export function inboxCount(summary: InboxSummary | undefined): number {
  return summary ? summary.requests + summary.threads : 0;
}

/** The inbox: a conversation per friend, the one last heard from first, a page at a time. */
export function useFriendThreads() {
  return useInfiniteQuery<FriendsResponse, Error, InfiniteData<FriendsResponse>, readonly string[], string | undefined>({
    queryKey: ['friends'],
    queryFn: ({ pageParam }) => api.me.friends(pageParam),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useFriendRequests() {
  return useQuery<FriendRequestsResponse>({
    queryKey: ['friend-requests'],
    queryFn: () => api.me.friendRequests(),
  });
}

export function useBlocks(enabled = true) {
  return useQuery<BlocksResponse>({
    queryKey: ['blocks'],
    queryFn: () => api.me.blocks(),
    enabled,
  });
}

/**
 * Send, accept, take back, turn down or end: `add` sends a request — or
 * accepts theirs — and anything else takes the tie away, whatever it was.
 */
export function useFriendship() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ username, add }: { username: string; add: boolean }) =>
      add ? api.users.addFriend(username) : api.users.removeFriend(username),
    onSettled: (_answer, _error, { username }) => refreshSocial(client, username),
  });
}

/** Block or unblock: a block ends the friendship, the requests and an open VS between the two. */
export function useBlock() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ username, block }: { username: string; block: boolean }) =>
      block ? api.users.block(username) : api.users.unblock(username),
    onSettled: (_answer, _error, { username }) => refreshSocial(client, username),
  });
}

/** A player's photo or name, sent to the moderators. */
export function useReport() {
  return useMutation({
    mutationFn: ({ username, reason }: { username: string; reason: ReportReason }) =>
      api.users.report(username, reason),
  });
}

/**
 * A conversation, newest page first. Older lines come a page at a time
 * (`fetchNextPage`); new ones come when the pulse moves while it is open.
 */
export function useThread(username: string) {
  return useInfiniteQuery<ThreadResponse, Error, InfiniteData<ThreadResponse>, readonly string[], number | undefined>({
    queryKey: threadKey(username),
    queryFn: ({ pageParam }) => api.me.thread(username, pageParam),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextBefore ?? undefined,
  });
}

/** The conversation read up to its newest line; the badges drop what it counted. */
export function useReadThread() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (username: string) => api.me.readThread(username),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['inbox'] });
      void client.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}

/** A phrase to a friend: it lands at the end of the conversation as soon as the API has it. */
export function useSendPhrase(username: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (phrase: Phrase) => api.me.sendPhrase(username, phrase),
    onSuccess: ({ message }) => {
      client.setQueryData<InfiniteData<ThreadResponse>>(threadKey(username), (data) => {
        const [newest, ...older] = data?.pages ?? [];
        if (!data || !newest || newest.messages.some((line) => line.id === message.id)) return data;
        return { ...data, pages: [{ ...newest, messages: [...newest.messages, message] }, ...older] };
      });
      void client.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}

/** Turns down a friend's VS: it counts for nobody. */
export function useDeclineDuel(username: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (duelId: string) => api.duels.decline(duelId),
    onSettled: () => refreshSocial(client, username),
  });
}
