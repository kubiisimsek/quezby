import type { NotificationItem } from '@quezby/types';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { PlayerSheet } from '@/components/PlayerSheet';
import {
  useDeclineDuel,
  useFriendship,
  useNotifications,
  useSeeNotifications,
} from '@/hooks/useSocial';
import { handle, useT, type Messages } from '@/i18n';
import { messageFor } from '@/lib/errors';
import type { RootStackParamList } from '@/navigation/types';
import {
  Avatar,
  Button,
  Callout,
  EmptyState,
  IconButton,
  NoticeCard,
  Screen,
  SkeletonList,
  TopBar,
} from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Alerts'>;

type Navigation = Props['navigation'];

type Friendship = ReturnType<typeof useFriendship>;

/**
 * Bildirimler, behind the bell on the lobby: what happened among friends,
 * newest first, as the lobby's notices — a request (answered here with ✓
 * and ✗), a friend who accepted yours, a VS sent to you (played with ✓,
 * turned down with ✗) and what became of the ones you sent. What was new
 * since the last look stays lit while the list is open; opening it takes
 * the bell's badge back to zero. Phrases are not here: they are Mesajlar's.
 */
export function AlertsScreen({ navigation }: Props) {
  const theme = useTheme();
  const t = useT();
  const words = t.alerts;
  const list = useNotifications();
  const see = useSeeNotifications();
  const friendship = useFriendship();
  const [opened, setOpened] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);

  // Seen once it is on screen: the badge goes to zero, the lit notices stay lit.
  const unseen = list.data?.unseen ?? 0;
  const { mutate: markSeen } = see;
  useEffect(() => {
    if (unseen > 0) markSeen();
  }, [unseen, markSeen]);

  // Coming back asks again; the first visit has just asked.
  const seen = useRef(false);
  const { refetch } = list;
  useFocusEffect(
    useCallback(() => {
      if (!seen.current) {
        seen.current = true;
        return;
      }
      void refetch();
    }, [refetch]),
  );

  const refresh = async () => {
    setPulling(true);
    try {
      await list.refetch();
    } finally {
      setPulling(false);
    }
  };

  const items = list.data?.notifications ?? [];

  return (
    <Screen>
      <TopBar title={words.title} subtitle={words.tagline} onBack={() => navigation.goBack()} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
        ItemSeparatorComponent={Gap}
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={() => void refresh()}
            tintColor={theme.gold}
            colors={[theme.gold]}
          />
        }
        ListHeaderComponent={
          friendship.isError ? (
            <View style={styles.head}>
              <Callout tone="bad">{messageFor(friendship.error, t)}</Callout>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Alert
            item={item}
            friendship={friendship}
            navigation={navigation}
            onOpenPlayer={() => setOpened(item.player.username)}
          />
        )}
        ListEmptyComponent={
          list.isLoading ? (
            <SkeletonList rows={4} />
          ) : list.isError ? (
            <View style={styles.pad}>
              <Callout tone="bad" title={words.failed}>
                {messageFor(list.error, t)}
              </Callout>
              <Button label={words.retry} tone="neutral" icon="refresh" onPress={() => void list.refetch()} />
            </View>
          ) : (
            <EmptyState icon="bell" title={words.empty} hint={words.emptyHint} />
          )
        }
      />
      <PlayerSheet username={opened} onClose={() => setOpened(null)} />
    </Screen>
  );
}

/** What a notification says, in the player's language. */
export function alertLine(item: NotificationItem, t: Messages): string {
  const lines = t.alerts.lines;
  const name = handle(item.player.username);
  switch (item.kind) {
    case 'friend_request':
      return lines.friendRequest(name);
    case 'friends':
      return lines.friends(name);
    case 'vs_invite':
      return lines.vsInvite(name);
    case 'vs_declined':
      return lines.declined(name);
    case 'vs_expired':
      return lines.expired(name);
    case 'vs_result': {
      const outcome = item.duel?.outcome;
      if (outcome === 'won') return lines.won(name);
      if (outcome === 'lost') return lines.lost(name);
      if (outcome === 'draw') return lines.draw(name);
      return lines.finished(name);
    }
    default:
      return lines.finished(name);
  }
}

/**
 * One notification. A request waiting for you answers here, and so does a VS
 * still waiting for you to play; everything else opens that friend's
 * conversation — a request, the player's card.
 */
function Alert({
  item,
  friendship,
  navigation,
  onOpenPlayer,
}: {
  item: NotificationItem;
  friendship: Friendship;
  navigation: Navigation;
  onOpenPlayer: () => void;
}) {
  const t = useT();
  const words = t.alerts;
  const relation = t.friends.relation;
  const { player, duel } = item;
  const decline = useDeclineDuel(player.username);
  const line = alertLine(item, t);
  const when = t.fmt.ago(item.createdAt);

  const request = item.kind === 'friend_request';
  const busy = friendship.isPending && friendship.variables?.username === player.username;
  const answerRequest = request && player.relation === 'incoming';
  const answerVs = item.kind === 'vs_invite' && duel?.status === 'waiting' && duel.turn === 'you';

  const right = answerRequest ? (
    <>
      <IconButton
        icon="check"
        tone="ok"
        size="sm"
        label={relation.accept}
        loading={busy && friendship.variables?.add === true}
        disabled={busy}
        onPress={() => friendship.mutate({ username: player.username, add: true })}
      />
      <IconButton
        icon="close"
        tone="danger"
        size="sm"
        label={relation.decline}
        loading={busy && friendship.variables?.add === false}
        disabled={busy}
        onPress={() => friendship.mutate({ username: player.username, add: false })}
      />
    </>
  ) : answerVs && duel ? (
    <>
      <IconButton
        icon="check"
        tone="ok"
        size="sm"
        label={relation.accept}
        disabled={decline.isPending}
        onPress={() =>
          navigation.navigate('Game', { mode: 'vs', opponent: player.username, duelId: duel.id })
        }
      />
      <IconButton
        icon="close"
        tone="danger"
        size="sm"
        label={relation.decline}
        loading={decline.isPending}
        onPress={() => decline.mutate(duel.id)}
      />
    </>
  ) : undefined;

  return (
    <NoticeCard
      eyebrow={words.kinds[item.kind]}
      title={line}
      meta={decline.isError ? messageFor(decline.error, t) : when}
      lead={<Avatar name={player.username} src={player.avatarUrl} size="md" />}
      fresh={item.unseen}
      accessibilityLabel={[item.unseen ? words.fresh : null, line, when].filter(Boolean).join(', ')}
      onPress={
        request ? onOpenPlayer : () => navigation.navigate('Thread', { username: player.username })
      }
      right={right}
    />
  );
}

function Gap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  head: { paddingBottom: SPACE.md },
  list: { paddingBottom: SPACE.xxl, paddingHorizontal: SPACE.xl },
  emptyList: { flexGrow: 1, paddingHorizontal: SPACE.xl },
  pad: { gap: SPACE.md },
  gap: { height: SPACE.ms },
});
