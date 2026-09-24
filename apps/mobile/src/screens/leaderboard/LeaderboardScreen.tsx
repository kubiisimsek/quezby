import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type {
  LeaderboardEntry,
  LeaderboardPeriod,
  LeaderboardScope,
} from '@quezby/types';
import { useCallback, useState, type ReactNode } from 'react';
import {
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { BoardStage, useArrival } from '@/components/BoardStage';
import { FloorDock } from '@/components/FloorDock';
import { FriendsEmpty } from '@/components/FriendsEmpty';
import { PlayerSheet } from '@/components/PlayerSheet';
import { ScopeSwitch } from '@/components/ScopeSwitch';
import {
  ClimbItemView,
  SummitPodium,
  climbKey,
  layoutBoard,
} from '@/components/SummitBoard';
import { useLeaderboard } from '@/hooks/useBoards';
import { messageFor } from '@/lib/errors';
import { formatScore } from '@/lib/format';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import {
  Button,
  Callout,
  CountdownChip,
  EmptyState,
  FloorCard,
  IconButton,
  Screen,
  Segmented,
  SkeletonList,
  TopBar,
} from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Leaderboard'>,
  NativeStackScreenProps<RootStackParamList>
>;

const PERIODS: Array<{ value: LeaderboardPeriod; label: string }> = [
  { value: 'daily', label: 'Bugün' },
  { value: 'weekly', label: 'Hafta' },
  { value: 'monthly', label: 'Ay' },
  { value: 'all', label: 'Tüm zamanlar' },
];

/** What sits under the period switch. */
type Body = 'loading' | 'error' | 'alone' | 'empty' | 'board';

/**
 * "Zirve" — the summit. The stage across the top holds the board's name, its
 * clock and its crowd, the everyone/friends switch, and the top three on
 * their podium; everyone else climbs under it as tiles, each with the points
 * it takes to pass the one above, and your own floor stays pinned over the
 * dock with the one player to pass next and the gold button that goes and
 * does it. When you are further down than the list reaches, the rows around
 * you follow a break, so you always see who you are racing.
 *
 * The list is see-through: the arena runs behind it. Every number comes from
 * the API's answer; the phone only draws it.
 */
export function LeaderboardScreen({ navigation }: Props) {
  const theme = useTheme();
  const [period, setPeriod] = useState<LeaderboardPeriod>('daily');
  const [scope, setScope] = useState<LeaderboardScope>('everyone');
  const [selected, setSelected] = useState<string | null>(null);
  const [floorHeight, setFloorHeight] = useState(0);
  const [pulling, setPulling] = useState(false);
  const intro = useArrival(0, 10);

  const board = useLeaderboard(period, scope);
  const { refetch } = board;
  const data = board.data;
  const layout = data ? layoutBoard(data) : null;

  let body: Body = 'board';
  if (!data || !layout) body = board.isError ? 'error' : 'loading';
  else if (data.scope === 'friends' && layout.alone) body = 'alone';
  else if (data.entries.length === 0) body = 'empty';

  const play = useCallback(
    () => navigation.navigate('Game', { mode: 'free' }),
    [navigation],
  );
  const search = useCallback(() => navigation.navigate('Search'), [navigation]);
  const open = useCallback(
    (entry: LeaderboardEntry) => setSelected(entry.username),
    [],
  );
  const refresh = useCallback(async () => {
    setPulling(true);
    try {
      await refetch();
    } finally {
      setPulling(false);
    }
  }, [refetch]);

  const podiumShown =
    body === 'loading' || body === 'empty' || body === 'board';
  const stale = board.isPlaceholderData;

  const header = (
    <View>
      <BoardStage
        floor={podiumShown}
        style={podiumShown ? null : styles.stageClosed}
      >
        <TopBar
          title="Zirve"
          subtitle={data ? `${formatScore(data.players)} oyuncu` : undefined}
          right={
            <View style={styles.headRight}>
              {data?.endsAt ? (
                <CountdownChip
                  endsAt={data.endsAt}
                  serverTime={data.serverTime}
                  prefix="Bitmesine"
                  tone="onBrand"
                  onElapsed={() => void refetch()}
                />
              ) : null}
              <IconButton
                icon="search"
                label="Oyuncu ara"
                tone="onBrand"
                onPress={search}
              />
            </View>
          }
        />
        <Animated.View style={[styles.stageBody, intro]}>
          <ScopeSwitch value={scope} onChange={setScope} />
        </Animated.View>

        {podiumShown ? (
          <View style={styles.podium}>
            <SummitPodium
              board={data}
              podium={layout?.podium ?? []}
              onPressEntry={open}
            />
          </View>
        ) : null}
      </BoardStage>

      <View style={styles.periods}>
        <Segmented value={period} onChange={setPeriod} options={PERIODS} />
      </View>
    </View>
  );

  let empty: ReactNode = null;
  switch (body) {
    case 'loading':
      empty = (
        <View style={styles.pad}>
          <SkeletonList rows={4} />
        </View>
      );
      break;
    case 'error':
      empty = (
        <View style={styles.pad}>
          <Callout tone="bad" title="Sıralama yüklenemedi">
            {messageFor(board.error)}
          </Callout>
          <Button
            label="Tekrar dene"
            tone="neutral"
            icon="refresh"
            onPress={() => void refetch()}
          />
        </View>
      );
      break;
    case 'alone':
      empty = <FriendsEmpty onSearch={search} onPlay={play} />;
      break;
    case 'empty':
      empty = (
        <EmptyState
          icon="mountain"
          title="Zirve boş"
          hint="Bu dönemde henüz kimse oynamadı. İlk sen ol, adın en üstte dursun."
          action={
            <Button label="Oyna" icon="play" tone="play" onPress={play} />
          }
        />
      );
      break;
    default:
      break;
  }

  return (
    <Screen>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={body === 'board' && layout ? layout.climb : []}
        keyExtractor={climbKey}
        renderItem={({ item, index }) => (
          <View style={[styles.item, stale ? styles.stale : null]}>
            <ClimbItemView item={item} index={index} onPressEntry={open} />
          </View>
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              body === 'board' ? floorHeight + SPACE.lg : SPACE.xxl,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={() => void refresh()}
            tintColor={theme.onBrand}
            colors={[theme.primary]}
            progressBackgroundColor={theme.surface}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {body === 'board' && data ? (
        <FloorDock onHeight={setFloorHeight}>
          <FloorCard
            rank={data.me?.rank ?? null}
            score={data.me?.score ?? null}
            targetUsername={data.rival?.entry.username ?? null}
            gapToNext={data.rival?.gap ?? null}
            progress={data.nextRankProgress}
            onPlay={play}
          />
        </FloorDock>
      ) : null}

      <PlayerSheet username={selected} onClose={() => setSelected(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  stageClosed: { paddingBottom: SPACE.xl },
  headRight: { alignItems: 'center', flexDirection: 'row', gap: SPACE.sm },
  stageBody: { paddingHorizontal: SPACE.xl },
  podium: { marginTop: SPACE.sm, paddingHorizontal: SPACE.xl },
  periods: {
    paddingBottom: SPACE.md,
    paddingHorizontal: SPACE.xl,
    paddingTop: SPACE.lg,
  },
  item: { paddingBottom: SPACE.sm, paddingHorizontal: SPACE.xl },
  stale: { opacity: 0.5 },
  pad: { gap: SPACE.md, padding: SPACE.xl },
});
