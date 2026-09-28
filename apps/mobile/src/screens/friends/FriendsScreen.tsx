import type { FriendRequest, FriendThread, InboxMessage } from '@quezby/types';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect, type CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { PlayerSheet } from '@/components/PlayerSheet';
import { PushNudge } from '@/components/PushNudge';
import { useFriendRequests, useFriendship, useFriendThreads } from '@/hooks/useSocial';
import { handle, useT, type Messages } from '@/i18n';
import { messageFor } from '@/lib/errors';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import {
  Button,
  Callout,
  EmptyState,
  Eyebrow,
  IconButton,
  Panel,
  PlayerRow,
  Screen,
  SkeletonList,
  ThreadRow,
  TopBar,
  type TagTone,
} from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Friends'>,
  NativeStackScreenProps<RootStackParamList>
>;

/**
 * Arkadaşlar, the dock's friends tab — the inbox. With notifications off, a
 * card to turn them on leads; then requests waiting for you, each with Kabul
 * et and Reddet; then one conversation per friend, the one last heard from
 * first, with its newest line, what is unread and a VS waiting on either of
 * you. Finding new players is the glyph in the corner.
 */
export function FriendsScreen({ navigation }: Props) {
  const theme = useTheme();
  const t = useT();
  const words = t.friends.tab;
  const threads = useFriendThreads();
  const requests = useFriendRequests();
  const friendship = useFriendship();
  const [opened, setOpened] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);

  // Coming back to the tab asks again; the first visit has just asked.
  const seen = useRef(false);
  const { refetch: refetchThreads } = threads;
  const { refetch: refetchRequests } = requests;
  useFocusEffect(
    useCallback(() => {
      if (!seen.current) {
        seen.current = true;
        return;
      }
      void refetchThreads();
      void refetchRequests();
    }, [refetchRequests, refetchThreads]),
  );

  const refresh = async () => {
    setPulling(true);
    try {
      await Promise.all([threads.refetch(), requests.refetch()]);
    } finally {
      setPulling(false);
    }
  };

  const friends = threads.data?.pages.flatMap((page) => page.friends) ?? [];
  const incoming = requests.data?.incoming ?? [];
  const find = () => navigation.navigate('FindFriends');
  const chat = (username: string) => navigation.navigate('Thread', { username });

  return (
    <Screen>
      <TopBar
        title={words.title}
        subtitle={words.tagline}
        right={<IconButton icon="userPlus" label={words.find} onPress={find} />}
      />
      <FlatList
        data={friends}
        keyExtractor={(thread) => thread.player.username}
        contentContainerStyle={friends.length === 0 && incoming.length === 0 ? styles.emptyList : styles.list}
        ItemSeparatorComponent={Gap}
        onEndReached={() => {
          if (threads.hasNextPage && !threads.isFetchingNextPage) void threads.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={() => void refresh()}
            tintColor={theme.gold}
            colors={[theme.gold]}
          />
        }
        ListHeaderComponent={
          <View style={styles.head}>
            <PushNudge hideable />
            {incoming.length > 0 ? (
              <>
                <Eyebrow icon="userPlus">{words.requests}</Eyebrow>
                {incoming.map((request) => (
                  <Request
                    key={request.player.username}
                    request={request}
                    friendship={friendship}
                    onOpen={() => setOpened(request.player.username)}
                  />
                ))}
              </>
            ) : null}
            {friendship.isError ? <Callout tone="bad">{messageFor(friendship.error, t)}</Callout> : null}
            {friends.length > 0 ? <Eyebrow icon="inbox">{words.inbox}</Eyebrow> : null}
          </View>
        }
        renderItem={({ item }) => (
          <Thread thread={item} onPress={() => chat(item.player.username)} />
        )}
        ListEmptyComponent={
          threads.isLoading ? (
            <SkeletonList rows={4} />
          ) : threads.isError ? (
            <View style={styles.pad}>
              <Callout tone="bad" title={words.failed}>
                {messageFor(threads.error, t)}
              </Callout>
              <Button label={words.retry} tone="neutral" icon="refresh" onPress={() => void threads.refetch()} />
            </View>
          ) : incoming.length === 0 ? (
            <EmptyState
              icon="users"
              title={words.emptyTitle}
              hint={words.emptyHint}
              action={<Button label={words.find} icon="search" tone="primary" onPress={find} />}
            />
          ) : null
        }
        ListFooterComponent={
          threads.isFetchingNextPage ? (
            <View style={styles.more}>
              <SkeletonList rows={1} />
            </View>
          ) : null
        }
      />
      <PlayerSheet username={opened} onClose={() => setOpened(null)} />
    </Screen>
  );
}

/** A request waiting for you: who sent it, and under them Kabul et and Reddet, side by side. */
function Request({
  request,
  friendship,
  onOpen,
}: {
  request: FriendRequest;
  friendship: ReturnType<typeof useFriendship>;
  onOpen: () => void;
}) {
  const t = useT();
  const words = t.friends.relation;
  const { player } = request;
  const busy = friendship.isPending && friendship.variables?.username === player.username;
  const answer = (add: boolean) => friendship.mutate({ username: player.username, add });
  return (
    <Panel style={styles.request}>
      <PlayerRow
        username={player.username}
        src={player.avatarUrl}
        tier={player.league}
        best={player.best}
        onPress={onOpen}
      />
      <View style={styles.answers}>
        <Button
          label={words.accept}
          icon="check"
          tone="primary"
          size="md"
          loading={busy && friendship.variables?.add === true}
          disabled={busy}
          onPress={() => answer(true)}
          style={styles.grow}
        />
        <Button
          label={words.decline}
          tone="neutral"
          size="md"
          loading={busy && friendship.variables?.add === false}
          disabled={busy}
          onPress={() => answer(false)}
          style={styles.grow}
        />
      </View>
    </Panel>
  );
}

function Thread({ thread, onPress }: { thread: FriendThread; onPress: () => void }) {
  const t = useT();
  const { player, duel } = thread;
  const name = handle(player.username);
  const line = previewOf(thread.last, t);
  const when = t.fmt.ago(thread.lastActivityAt);
  const tag: { label: string; tone: TagTone } | null =
    duel?.turn === 'you'
      ? { label: t.inbox.row.yourTurn, tone: 'warn' }
      : duel?.turn === 'them'
        ? { label: t.inbox.row.theirTurn, tone: 'secondary' }
        : null;

  return (
    <ThreadRow
      name={player.username}
      title={name}
      src={player.avatarUrl}
      line={line}
      when={when}
      unread={thread.unread}
      tag={tag}
      label={t.inbox.row.label(name, line, when, thread.unread)}
      onPress={onPress}
    />
  );
}

/** A conversation's newest line, as the list says it under the friend's name. */
export function previewOf(last: InboxMessage | null, t: Messages): string {
  const words = t.inbox.preview;
  if (!last) return words.none;
  switch (last.kind) {
    case 'friends':
      return words.friends;
    case 'phrase': {
      const text = last.phrase ? t.inbox.phrases[last.phrase] : '';
      return last.mine ? words.mine(text) : text;
    }
    case 'vs_invite':
      return last.mine ? words.inviteMine : words.inviteTheirs;
    case 'vs_declined':
      return last.mine ? words.declinedMine : words.declinedTheirs;
    case 'vs_expired':
      return words.expired;
    case 'vs_result': {
      const duel = last.duel;
      const you = scoreOf(duel?.you?.score, t);
      const them = scoreOf(duel?.them?.score, t);
      if (duel?.outcome === 'won') return words.won(you, them);
      if (duel?.outcome === 'lost') return words.lost(you, them);
      return words.draw(you, them);
    }
    default:
      return words.none;
  }
}

/** A VS score as a line shows it; a run left unfinished has none. */
export function scoreOf(score: number | null | undefined, t: Messages): string {
  return score === null || score === undefined ? '—' : t.fmt.score(score);
}

function Gap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  head: { gap: SPACE.md, paddingBottom: SPACE.md },
  list: { paddingBottom: SPACE.xxl, paddingHorizontal: SPACE.xl },
  emptyList: { flexGrow: 1, paddingHorizontal: SPACE.xl },
  pad: { gap: SPACE.md },
  request: { gap: SPACE.xs, paddingBottom: SPACE.md, paddingHorizontal: SPACE.md, paddingTop: SPACE.xxs },
  answers: { flexDirection: 'row', gap: SPACE.sm },
  grow: { flex: 1 },
  gap: { height: SPACE.ms },
  more: { paddingTop: SPACE.md },
});
