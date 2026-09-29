import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type {
  LeaderboardEntry,
  LeaderboardPeriod,
  LeaderboardResponse,
  LeaderboardScope,
  LeagueTier,
  RatingBoardResponse,
  RatingEntry,
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

import { track } from '@/analytics/track';
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
import { useLeaderboard, useRatingBoard } from '@/hooks/useBoards';
import { useT } from '@/i18n';
import { messageFor } from '@/lib/errors';
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

/** The periods, in the switch's order; their words are `t.board.summit.periods`. */
const PERIODS: LeaderboardPeriod[] = ['weekly', 'monthly', 'all'];

/** The switch: the three score boards, then the Elo board. */
type Tab = LeaderboardPeriod | 'elo';

/**
 * The Elo board drawn the way a score board is: the rating where the score
 * stands, the podium and the climb as they are. Every number is still the
 * API's.
 */
function asBoard(ratings: RatingBoardResponse): LeaderboardResponse {
  const entry = (row: RatingEntry): LeaderboardEntry => ({
    rank: row.rank,
    username: row.username,
    avatarUrl: row.avatarUrl,
    score: row.rating,
    reels: 0,
    isMe: row.isMe,
    isFriend: row.isFriend,
    gap: row.gap,
  });
  const me = ratings.me ? entry(ratings.me) : null;
  const listed = ratings.entries.some((row) => row.isMe);
  return {
    board: 'all',
    periodKey: 'elo',
    season: 0,
    scope: ratings.scope === 'friends' ? 'friends' : 'everyone',
    startsAt: null,
    endsAt: null,
    serverTime: '',
    entries: ratings.entries.map(entry),
    me,
    neighbors: me && !listed ? [me] : [],
    rival: null,
    nextRankProgress: null,
    players: ratings.players,
  };
}

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
  const t = useT();
  const [tab, setTab] = useState<Tab>('weekly');
  const [scope, setScope] = useState<LeaderboardScope>('everyone');
  const [selected, setSelected] = useState<string | null>(null);
  const [floorHeight, setFloorHeight] = useState(0);
  const [pulling, setPulling] = useState(false);
  const intro = useArrival(0, 10);

  const elo = tab === 'elo';
  const scores = useLeaderboard(elo ? 'weekly' : tab, scope);
  const ratings = useRatingBoard(scope, elo);
  const board = elo ? ratings : scores;
  const { refetch } = board;
  const data = elo ? (ratings.data ? asBoard(ratings.data) : undefined) : scores.data;
  const layout = data ? layoutBoard(data) : null;
  const tiers = new Map<string, LeagueTier>(
    [...(ratings.data?.entries ?? []), ...(ratings.data?.me ? [ratings.data.me] : [])].map(
      (row) => [row.username, row.tier],
    ),
  );
  const leagueOf = (entry: LeaderboardEntry) => {
    const tier = tiers.get(entry.username);
    return tier ? t.tiers.league(tier) : undefined;
  };

  let body: Body = 'board';
  if (!data || !layout) body = board.isError ? 'error' : 'loading';
  else if (data.scope === 'friends' && layout.alone) body = 'alone';
  else if (data.entries.length === 0) body = 'empty';

  const play = useCallback(
    () => navigation.navigate('Game', { mode: 'free' }),
    [navigation],
  );
  const chase = useCallback(
    (chasing: boolean) => {
      if (chasing) track('rival');
      play();
    },
    [play],
  );
  const search = useCallback(() => navigation.navigate('FindFriends'), [navigation]);
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
          title={t.board.summit.title}
          subtitle={elo ? t.rating.board.hint : data ? t.board.players(data.players) : undefined}
          right={
            <View style={styles.headRight}>
              {data?.endsAt ? (
                <CountdownChip
                  endsAt={data.endsAt}
                  serverTime={data.serverTime}
                  prefix={t.home.countdown.endsIn}
                  tone="onBrand"
                  onElapsed={() => void refetch()}
                />
              ) : null}
              <IconButton
                icon="search"
                label={t.friends.list.find}
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
              unit={elo ? 'elo' : 'points'}
            />
          </View>
        ) : null}
      </BoardStage>

      <View style={styles.periods}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            ...PERIODS.map((value) => ({
              value: value as Tab,
              label: t.board.summit.periods[value],
            })),
            { value: 'elo' as Tab, label: t.rating.board.tab },
          ]}
        />
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
          <Callout tone="bad" title={t.board.summit.failed}>
            {messageFor(board.error, t)}
          </Callout>
          <Button
            label={t.board.summit.retry}
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
          title={elo ? t.rating.board.empty : t.board.summit.emptyTitle}
          hint={elo ? t.rating.board.emptyHint : t.board.summit.emptyHint}
          action={
            <Button
              label={t.board.summit.play}
              icon="play"
              tone="play"
              onPress={play}
            />
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
            <ClimbItemView
              item={item}
              index={index}
              onPressEntry={open}
              detail={elo ? leagueOf : undefined}
              showReels={!elo}
            />
          </View>
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              body === 'board' && !elo ? floorHeight + SPACE.lg : SPACE.xxl,
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

      {body === 'board' && data && !elo ? (
        <FloorDock onHeight={setFloorHeight}>
          <FloorCard
            rank={data.me?.rank ?? null}
            score={data.me?.score ?? null}
            targetUsername={data.rival?.entry.username ?? null}
            gapToNext={data.rival?.gap ?? null}
            progress={data.nextRankProgress}
            onPlay={chase}
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
