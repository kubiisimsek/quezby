import { USERNAME_MAX_LENGTH } from '@quezby/config';
import type { FriendThread, InboxMessage } from '@quezby/types';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect, type CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Keyboard, RefreshControl, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { PlayerSheet } from '@/components/PlayerSheet';
import { PushNudge } from '@/components/PushNudge';
import { useUserSearch } from '@/hooks/useBoards';
import { useFriendship, useFriendThreads, useInboxSummary } from '@/hooks/useSocial';
import { handle, useT, type Messages } from '@/i18n';
import { messageFor } from '@/lib/errors';
import type { InboxSegment, RootStackParamList, TabParamList } from '@/navigation/types';
import { Results, SEARCH_MIN_LENGTH, nameProblem } from '@/screens/friends/FindFriendsScreen';
import { FriendListView } from '@/screens/friends/FriendsScreen';
import {
  Button,
  Callout,
  EmptyState,
  Field,
  IconButton,
  Screen,
  Segmented,
  SkeletonList,
  ThreadRow,
  TopBar,
  type TagTone,
} from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Inbox'>,
  NativeStackScreenProps<RootStackParamList>
>;

type Navigation = Props['navigation'];

/**
 * Mesajlar, the dock's social tab, in two sides under one switch. Mesajlar:
 * one conversation per friend, the one last heard from first, with its
 * newest line, what is unread and a VS waiting on either of you. Arkadaşlar:
 * a search by the start of a name, then the requests waiting and your friends
 * A to Z. Each side counts what waits on it; the slab beside the title adds
 * a new friend (Arkadaş bul). With notifications off, a card to turn them on
 * leads the conversations.
 */
export function InboxScreen({ navigation, route }: Props) {
  const t = useT();
  const words = t.friends.inbox;
  const summary = useInboxSummary().data;
  const [segment, setSegment] = useState<InboxSegment>(route.params?.segment ?? 'messages');

  // Opened on a side from elsewhere — the profile's friend counter.
  const asked = route.params?.segment;
  useEffect(() => {
    if (!asked) return;
    setSegment(asked);
    navigation.setParams({ segment: undefined });
  }, [asked, navigation]);

  const threads = summary?.threads ?? 0;
  const requests = summary?.requests ?? 0;

  return (
    <Screen>
      <TopBar
        title={words.title}
        right={
          <IconButton
            icon="userPlus"
            label={t.friends.relation.addLong}
            onPress={() => navigation.navigate('FindFriends')}
          />
        }
      />
      <View style={styles.switch}>
        <Segmented
          value={segment}
          onChange={setSegment}
          options={[
            {
              value: 'messages',
              label: words.segments.messages,
              icon: 'message',
              count: threads > 0 ? threads : undefined,
            },
            {
              value: 'friends',
              label: words.segments.friends,
              icon: 'users',
              count: requests > 0 ? requests : undefined,
            },
          ]}
        />
      </View>
      {segment === 'messages' ? (
        <Conversations navigation={navigation} onFind={() => setSegment('friends')} />
      ) : (
        <Friends navigation={navigation} />
      )}
    </Screen>
  );
}

/** The conversations, a page at a time; with none, the way to the friends' side. */
function Conversations({ navigation, onFind }: { navigation: Navigation; onFind: () => void }) {
  const theme = useTheme();
  const t = useT();
  const words = t.friends.inbox;
  const threads = useFriendThreads();
  const [pulling, setPulling] = useState(false);

  // Coming back to the tab asks again; the first visit has just asked.
  const seen = useRef(false);
  const { refetch: refetchThreads } = threads;
  useFocusEffect(
    useCallback(() => {
      if (!seen.current) {
        seen.current = true;
        return;
      }
      void refetchThreads();
    }, [refetchThreads]),
  );

  const refresh = async () => {
    setPulling(true);
    try {
      await threads.refetch();
    } finally {
      setPulling(false);
    }
  };

  const friends = threads.data?.pages.flatMap((page) => page.friends) ?? [];
  const chat = (username: string) => navigation.navigate('Thread', { username });

  return (
    <FlatList
      data={friends}
      keyExtractor={(thread) => thread.player.username}
      contentContainerStyle={friends.length === 0 ? styles.emptyList : styles.list}
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
        ) : (
          <EmptyState
            icon="message"
            title={words.emptyTitle}
            hint={words.emptyHint}
            action={<Button label={words.find} icon="search" tone="primary" onPress={onFind} />}
          />
        )
      }
      ListFooterComponent={
        threads.isFetchingNextPage ? (
          <View style={styles.more}>
            <SkeletonList rows={1} />
          </View>
        ) : null
      }
    />
  );
}

/**
 * The Arkadaşlar side: a search by the start of a name — its answers, with
 * what the two of you can do from each row — and, with nothing typed, your
 * requests and friends.
 */
function Friends({ navigation }: { navigation: Navigation }) {
  const t = useT();
  const words = t.friends.search;
  const me = useSession((state) => state.user?.username) ?? '';
  const [query, setQuery] = useState('');
  const [opened, setOpened] = useState<string | null>(null);
  const friendship = useFriendship();
  const search = useUserSearch(query);

  const term = query.trim();
  const problem = nameProblem(term, t);
  const searching = !problem && term.length >= SEARCH_MIN_LENGTH;
  const open = (username: string) => {
    Keyboard.dismiss();
    setOpened(username);
  };

  return (
    <View style={styles.fill}>
      <View style={styles.search}>
        <Field
          label={words.title}
          icon="search"
          value={query}
          onChangeText={(text) => setQuery(text.toLowerCase())}
          placeholder={words.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          returnKeyType="search"
          maxLength={USERNAME_MAX_LENGTH}
          error={problem ?? undefined}
          hint={term !== '' && term.length < SEARCH_MIN_LENGTH ? words.tooShort(SEARCH_MIN_LENGTH) : undefined}
        />
        {friendship.isError ? <Callout tone="bad">{messageFor(friendship.error, t)}</Callout> : null}
      </View>
      {searching ? (
        <Results
          term={term}
          search={search}
          friendship={friendship}
          onOpen={open}
          onChat={(username) => navigation.navigate('Thread', { username })}
        />
      ) : (
        <FriendListView name={me} own onFind={() => navigation.navigate('FindFriends')} />
      )}
      <PlayerSheet username={opened} onClose={() => setOpened(null)} />
    </View>
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
  fill: { flex: 1 },
  switch: { paddingBottom: SPACE.sm, paddingHorizontal: SPACE.xl },
  search: { gap: SPACE.sm, paddingBottom: SPACE.sm, paddingHorizontal: SPACE.xl },
  head: { gap: SPACE.md, paddingBottom: SPACE.md },
  list: { paddingBottom: SPACE.xxl, paddingHorizontal: SPACE.xl },
  emptyList: { flexGrow: 1, paddingHorizontal: SPACE.xl },
  pad: { gap: SPACE.md },
  gap: { height: SPACE.ms },
  more: { paddingTop: SPACE.md },
});
