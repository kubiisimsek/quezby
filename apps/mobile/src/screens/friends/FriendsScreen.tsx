import { ApiError } from '@quezby/sdk';
import type { FriendRequest } from '@quezby/types';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { PlayerSheet } from '@/components/PlayerSheet';
import { useFriendList, useFriendRequests, useFriendship } from '@/hooks/useSocial';
import { handle, useT } from '@/i18n';
import { messageFor } from '@/lib/errors';
import type { RootStackParamList } from '@/navigation/types';
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
  TopBar,
} from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Friends'>;

/**
 * A friend list as a screen of its own: a friend's — opened from the count on
 * their card — or the player's own, from their own card, with "Arkadaş bul"
 * in the corner. Anyone else's is locked, which the API decides. The
 * player's own list lives on the Mesajlar tab too, beside the search.
 */
export function FriendsScreen({ navigation, route }: Props) {
  const t = useT();
  const words = t.friends.list;
  const me = useSession((state) => state.user?.username) ?? '';
  const name = route.params?.username ?? me;
  const own = name === me;
  // The same query the list asks: its answer carries the count.
  const total = useFriendList(name).data?.pages[0]?.total;
  const find = () => navigation.navigate('FindFriends');

  return (
    <Screen>
      <TopBar
        title={own ? words.title : handle(name)}
        subtitle={total === undefined ? undefined : t.friends.sheet.friends(total)}
        onBack={() => navigation.goBack()}
        right={own ? <IconButton icon="userPlus" label={words.find} onPress={find} /> : undefined}
      />
      <FriendListView name={name} own={own} onFind={find} />
    </Screen>
  );
}

/**
 * A friend list's body, A to Z: for the player's own, the requests waiting
 * first with Kabul et and Reddet; a friend's, only who they are friends with;
 * anyone else's, locked. A row opens the player's card. The friend list
 * screen and the Mesajlar tab's Arkadaşlar side both draw it.
 */
export function FriendListView({
  name,
  own,
  onFind,
}: {
  name: string;
  own: boolean;
  /** "Arkadaş bul", from an empty list of your own. */
  onFind: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const words = t.friends.list;
  const me = useSession((state) => state.user?.username) ?? '';
  const list = useFriendList(name);
  const requests = useFriendRequests(own);
  const friendship = useFriendship();
  const [opened, setOpened] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);

  // Coming back asks again; the first visit has just asked.
  const seen = useRef(false);
  const { refetch: refetchList } = list;
  const { refetch: refetchRequests } = requests;
  useFocusEffect(
    useCallback(() => {
      if (!seen.current) {
        seen.current = true;
        return;
      }
      void refetchList();
      if (own) void refetchRequests();
    }, [own, refetchList, refetchRequests]),
  );

  const refresh = async () => {
    setPulling(true);
    try {
      await Promise.all([list.refetch(), own ? requests.refetch() : null]);
    } finally {
      setPulling(false);
    }
  };

  const friends = list.data?.pages.flatMap((page) => page.friends) ?? [];
  const incoming = own ? (requests.data?.incoming ?? []) : [];
  const locked = list.error instanceof ApiError && list.error.code === 'friends_hidden';

  return (
    <>
      <FlatList
        data={friends}
        keyExtractor={(player) => player.username}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={friends.length === 0 && incoming.length === 0 ? styles.emptyList : styles.list}
        ItemSeparatorComponent={Gap}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
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
          incoming.length > 0 || friendship.isError ? (
            <View style={styles.head}>
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
              {friends.length > 0 ? <Eyebrow icon="users">{words.friends}</Eyebrow> : null}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <PlayerRow
            username={item.username}
            src={item.avatarUrl}
            tier={item.league}
            best={item.best}
            isMe={item.username === me}
            onPress={() => setOpened(item.username)}
          />
        )}
        ListEmptyComponent={
          list.isLoading ? (
            <SkeletonList rows={4} />
          ) : locked ? (
            <EmptyState icon="lock" title={words.locked} hint={words.lockedHint(handle(name))} />
          ) : list.isError ? (
            <View style={styles.pad}>
              <Callout tone="bad" title={words.failed}>
                {messageFor(list.error, t)}
              </Callout>
              <Button label={words.retry} tone="neutral" icon="refresh" onPress={() => void list.refetch()} />
            </View>
          ) : !own ? (
            <EmptyState icon="users" title={words.othersEmpty} />
          ) : incoming.length === 0 ? (
            <EmptyState
              icon="users"
              title={words.emptyTitle}
              hint={words.emptyHint}
              action={<Button label={words.find} icon="search" tone="primary" onPress={onFind} />}
            />
          ) : null
        }
        ListFooterComponent={
          list.isFetchingNextPage ? (
            <View style={styles.more}>
              <SkeletonList rows={1} />
            </View>
          ) : null
        }
      />
      <PlayerSheet username={opened} onClose={() => setOpened(null)} />
    </>
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
