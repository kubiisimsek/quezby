import type {
  BlocksResponse,
  FriendListResponse,
  FriendRequestsResponse,
  FriendsResponse,
  InboxSummary,
  NotificationsResponse,
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

import { ApiError } from '@quezby/sdk';

import { api } from '@/api/client';

/**
 * Server state for friends: what the badges count, the inbox, requests, a
 * conversation, blocks and VS. What two players are to each other is always
 * the API's answer; a change refreshes every list that shows it. None of it
 * polls on its own: the pulse (`usePulse`) says when the inbox moved, and a
 * notification says so at once.
 */

export const threadKey = (username: string) => ['thread', username] as const;

/** A player's friend list. `['friends']` is the inbox's conversations, not this. */
export const friendListKey = (username: string) => ['friend-list', username] as const;

/** The screen on show, as the pulse sees it (`stores/route`). */
type OnScreen = { name: string | null; username: string | null };

/**
 * What a moved pulse asks again: the badges and the lobby's VS notices
 * always; the inbox list, the requests, a friend list, a search or a
 * conversation only while on screen. The rest is marked old and asked again
 * when it next shows.
 */
export function refreshInbox(client: QueryClient, on: OnScreen): void {
  void client.invalidateQueries({ queryKey: ['inbox'] });
  const shown: Record<string, boolean> = {
    friends: on.name === 'Inbox',
    'friend-requests': on.name === 'Inbox' || on.name === 'Friends' || on.name === 'FindFriends',
    'friend-list': on.name === 'Inbox' || on.name === 'Friends',
    notifications: on.name === 'Alerts',
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
 * the inbox and its badges, requests, friend lists, blocks, search results,
 * player cards and the friends boards.
 */
export function refreshSocial(client: QueryClient, username?: string): void {
  for (const key of [
    'inbox',
    'friends',
    'friend-requests',
    'friend-list',
    'notifications',
    'blocks',
    'search',
    'leaderboard',
    'ratings',
  ]) {
    void client.invalidateQueries({ queryKey: [key] });
  }
  if (username) {
    void client.invalidateQueries({ queryKey: ['player', username] });
    void client.invalidateQueries({ queryKey: threadKey(username) });
  }
}

/**
 * What the badges count — requests waiting (the Profil slot), friends whose
 * conversation wants a look (the Mesajlar slot) — with the player's friend
 * count and the VS waiting for them on the lobby.
 */
export function useInboxSummary() {
  return useQuery<InboxSummary>({
    queryKey: ['inbox'],
    queryFn: () => api.me.inbox(),
  });
}

/** The bell's list: requests, VS and what became of them, newest first. */
export function useNotifications() {
  return useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn: () => api.me.notifications(),
  });
}

/**
 * The player has looked at the bell's list: its badge goes back to zero. The
 * list itself keeps what was new lit until the player leaves it.
 */
export function useSeeNotifications() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.me.seeNotifications(),
    onSuccess: () => {
      client.setQueryData<InboxSummary>(['inbox'], (summary) =>
        summary ? { ...summary, notifications: 0 } : summary,
      );
      void client.invalidateQueries({ queryKey: ['notifications'], refetchType: 'none' });
    },
  });
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

/**
 * A player's friends, A to Z, a page at a time: the player's own, or a
 * friend's. Anyone else's answers `friends_hidden` — a lock, not a hiccup,
 * so an answer the API gave is never asked again on its own.
 */
export function useFriendList(username: string) {
  return useInfiniteQuery<
    FriendListResponse,
    Error,
    InfiniteData<FriendListResponse>,
    readonly string[],
    string | undefined
  >({
    queryKey: friendListKey(username),
    queryFn: ({ pageParam }) => api.users.friends(username, pageParam),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    retry: (count, error) =>
      !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 1,
  });
}

export function useFriendRequests(enabled = true) {
  return useQuery<FriendRequestsResponse>({
    queryKey: ['friend-requests'],
    queryFn: () => api.me.friendRequests(),
    enabled,
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
