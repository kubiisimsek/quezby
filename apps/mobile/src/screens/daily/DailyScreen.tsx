import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type {
  DailyAttempt,
  DailyResponse,
  LeaderboardEntry,
  LeaderboardScope,
} from '@quezby/types';
import { useCallback, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BoardStage, PlayersPill, useArrival } from '@/components/BoardStage';
import { FriendsEmpty } from '@/components/FriendsEmpty';
import { PlayerSheet } from '@/components/PlayerSheet';
import { ScopeSwitch } from '@/components/ScopeSwitch';
import {
  ClimbItemView,
  SummitPodium,
  climbKey,
  layoutBoard,
} from '@/components/SummitBoard';
import { useDaily, useLeaderboard } from '@/hooks/useBoards';
import { messageFor } from '@/lib/errors';
import { formatRank, formatScore } from '@/lib/format';
import type { RootStackParamList } from '@/navigation/types';
import {
  Button,
  Callout,
  CountdownChip,
  EmptyState,
  Ribbon,
  Screen,
  ShareGrid,
  SkeletonList,
  Stamp,
  TopBar,
  Txt,
} from '@/ui/kit';
import {
  FONT,
  RADIUS,
  SPACE,
  TYPE,
  embossed,
  useTheme,
  withAlpha,
} from '@/ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Daily'>;

/** What sits under today's podium. */
type Body = 'loading' | 'error' | 'alone' | 'empty' | 'board';

/**
 * "Günün akışı #N" — one feed for everyone today, one attempt each. The
 * stage says which one it is, when the next one comes, and where your
 * attempt stands: not played yet (the one gold button), cut short, ranked
 * with its share grid, or held off the board. Today's summit stands on a
 * stage of its own under it, among everyone or your friends, and the rest
 * climb under that.
 *
 * The share text is the server's; the phone only hands it to the share sheet.
 */
export function DailyScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState<LeaderboardScope>('everyone');
  const [selected, setSelected] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);

  const daily = useDaily();
  const board = useLeaderboard('challenge', scope);
  const refetchDaily = daily.refetch;
  const refetchBoard = board.refetch;
  const today = daily.data;
  const data = board.data;
  const layout = data ? layoutBoard(data) : null;

  let body: Body = 'board';
  if (!data || !layout) body = board.isError ? 'error' : 'loading';
  else if (data.scope === 'friends' && layout.alone) body = 'alone';
  else if (data.entries.length === 0) body = 'empty';

  const back = useCallback(() => navigation.goBack(), [navigation]);
  const play = useCallback(
    () => navigation.navigate('Game', { mode: 'daily' }),
    [navigation],
  );
  const search = useCallback(
    () => navigation.navigate('Tabs', { screen: 'Search' }),
    [navigation],
  );
  const open = useCallback(
    (entry: LeaderboardEntry) => setSelected(entry.username),
    [],
  );
  const share = useCallback((message: string) => {
    Share.share({ message }).catch(() => undefined);
  }, []);
  const newDay = useCallback(() => {
    void refetchDaily();
    void refetchBoard();
  }, [refetchBoard, refetchDaily]);
  const refresh = useCallback(async () => {
    setPulling(true);
    try {
      await Promise.all([refetchDaily(), refetchBoard()]);
    } finally {
      setPulling(false);
    }
  }, [refetchBoard, refetchDaily]);

  let top: ReactNode;
  if (today) {
    top = (
      <DayStage
        today={today}
        onPlay={play}
        onShare={share}
        onElapsed={newDay}
      />
    );
  } else if (daily.isError) {
    top = (
      <View style={styles.stageBlock}>
        <Callout tone="bad" title="Günün akışı yüklenemedi">
          {messageFor(daily.error)}
        </Callout>
        <Button
          label="Tekrar dene"
          tone="onBrandSoft"
          icon="refresh"
          onPress={() => void refetchDaily()}
        />
      </View>
    );
  } else {
    top = (
      <View style={styles.waiting}>
        <ActivityIndicator color={theme.onBrand} size="large" />
      </View>
    );
  }

  const podiumShown =
    body === 'loading' || body === 'empty' || body === 'board';
  const stale = board.isPlaceholderData;

  const header = (
    <View>
      <BoardStage>
        <TopBar title="Günün akışı" onBack={back} />
        {top}
      </BoardStage>
      <View style={styles.section}>
        <BoardStage
          inset
          floor={podiumShown}
          style={podiumShown ? null : styles.summitClosed}
        >
          <View style={styles.summit}>
            <View style={styles.summitHead}>
              <Ribbon label="GÜNÜN ZİRVESİ" />
              {data ? <PlayersPill count={data.players} /> : null}
            </View>
            <ScopeSwitch value={scope} onChange={setScope} />
          </View>
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
      </View>
    </View>
  );

  let empty: ReactNode = null;
  switch (body) {
    case 'loading':
      empty = (
        <View style={styles.pad}>
          <SkeletonList rows={3} />
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
            onPress={() => void refetchBoard()}
          />
        </View>
      );
      break;
    case 'alone':
      empty = (
        <FriendsEmpty
          onSearch={search}
          onPlay={today && !today.attempt ? play : undefined}
        />
      );
      break;
    case 'empty':
      empty = (
        <EmptyState
          icon="mountain"
          title="Günün zirvesi boş"
          hint="İlk skorlar geldikçe zirve burada şekillenir."
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
          { paddingBottom: insets.bottom + SPACE.xl },
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

      <PlayerSheet username={selected} onClose={() => setSelected(null)} />
    </Screen>
  );
}

/** Today's number, the time to the next one, and your attempt. */
function DayStage({
  today,
  onPlay,
  onShare,
  onElapsed,
}: {
  today: DailyResponse;
  onPlay: () => void;
  onShare: (message: string) => void;
  onElapsed: () => void;
}) {
  const theme = useTheme();
  const intro = useArrival(0, 12);

  return (
    <Animated.View style={[styles.stageBlock, intro]}>
      <View style={styles.dayHead}>
        <View>
          <Text style={[TYPE.label, { color: withAlpha(theme.onBrand, 0.8) }]}>AKIŞ</Text>
          <Txt variant="display">{`#${formatScore(today.number)}`}</Txt>
        </View>
        <View>
          <CountdownChip
            endsAt={today.endsAt}
            serverTime={today.serverTime}
            prefix="Yeni akışa"
            tone="onBrand"
            onElapsed={onElapsed}
          />
        </View>
      </View>
      <Attempt
        attempt={today.attempt}
        players={today.players}
        onPlay={onPlay}
        onShare={onShare}
      />
    </Animated.View>
  );
}

function Attempt({
  attempt,
  players,
  onPlay,
  onShare,
}: {
  attempt: DailyAttempt | null;
  players: number;
  onPlay: () => void;
  onShare: (message: string) => void;
}) {
  if (!attempt) {
    return (
      <View style={styles.attempt}>
        <Txt variant="title">Bugünün akışı seni bekliyor</Txt>
        <Txt variant="body" tone="onSolid">
          Herkes aynı akışı oynar · tek hak
        </Txt>
        <Button
          label="Oyna"
          icon="play"
          tone="onBrand"
          size="xl"
          onPress={onPlay}
          style={styles.action}
        />
      </View>
    );
  }

  switch (attempt.status) {
    case 'ranked':
      return (
        <Ranked
          score={attempt.score}
          rank={attempt.rank}
          players={players}
          grid={attempt.grid}
          shareText={attempt.shareText}
          onShare={onShare}
        />
      );
    case 'unfinished':
      return (
        <View style={styles.attempt}>
          <Txt variant="title">Turun yarıda kaldı</Txt>
          <Txt variant="body" tone="onSolid">
            Bugünkü hakkını başlattın ama tur bitmedi. Sonuç sunucuya ulaşırsa
            burada görünür.
          </Txt>
        </View>
      );
    case 'review':
      return (
        <Callout tone="info" title="Skorun inceleniyor">
          Bu skor sıralamaya girmeden önce bir göz atıyoruz. Onaylanınca burada
          görünür.
        </Callout>
      );
    case 'flagged':
      return (
        <Callout tone="warn" title="Skorun sıralamaya girmedi">
          Tur doğrulanamadı, bu yüzden bugünün sıralamasına yazılmadı. Yarın
          yeni akış seni bekliyor.
        </Callout>
      );
    default:
      return (
        <Callout tone="warn" title="Tur sayılmadı">
          Tur yarıda kaldı ya da süresi doldu, bu yüzden sıralamaya girmedi.
          Yarın yeni akış seni bekliyor.
        </Callout>
      );
  }
}

/**
 * A ranked attempt, in a well on the stage: the score slams in, your place
 * stands beside it in gold, and the server's grid sits under them.
 */
function Ranked({
  score,
  rank,
  players,
  grid,
  shareText,
  onShare,
}: {
  score: number | null;
  rank: number | null;
  players: number;
  grid: string | null;
  shareText: string | null;
  onShare: (message: string) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.attempt}>
      <View
        style={[
          styles.result,
          {
            backgroundColor: withAlpha(theme.outline, 0.42),
            borderColor: withAlpha(theme.onBrand, 0.16),
          },
        ]}
      >
        <View style={styles.resultRow}>
          <View style={styles.resultScore}>
            <Text
              accessibilityLabel="Skorun"
              style={[TYPE.label, { color: theme.inkMuted }]}
            >
              SKORUN
            </Text>
            <Stamp from={1.7} delay={180} style={styles.stamp}>
              <Txt variant="score">
                {score === null ? '—' : formatScore(score)}
              </Txt>
            </Stamp>
          </View>
          <View style={styles.resultRank}>
            <Text
              accessibilityLabel="Sıran"
              style={[TYPE.label, { color: theme.inkMuted }]}
            >
              SIRAN
            </Text>
            <Text style={[styles.rank, { color: theme.gold }, embossed(2)]}>
              {formatRank(rank)}
              <Text style={{ color: theme.inkMuted }}>
                {` / ${formatScore(players)}`}
              </Text>
            </Text>
          </View>
        </View>
        {grid ? (
          <View
            style={[
              styles.grid,
              { borderTopColor: withAlpha(theme.onBrand, 0.12) },
            ]}
          >
            <ShareGrid grid={grid} />
          </View>
        ) : null}
      </View>
      {shareText ? (
        <Button
          label="Paylaş"
          icon="share"
          tone="onBrandSoft"
          size="lg"
          onPress={() => onShare(shareText)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  waiting: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    paddingBottom: SPACE.xl,
  },
  stageBlock: {
    gap: SPACE.lg,
    paddingBottom: SPACE.xl,
    paddingHorizontal: SPACE.xl,
  },
  dayHead: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.md,
    justifyContent: 'space-between',
  },
  attempt: { gap: SPACE.sm },
  action: { marginTop: SPACE.sm },
  result: {
    borderRadius: RADIUS.panel,
    borderWidth: 1.5,
    gap: SPACE.md,
    padding: SPACE.lg,
  },
  resultRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: SPACE.lg,
    justifyContent: 'space-between',
  },
  resultScore: { gap: SPACE.xxs },
  stamp: { alignSelf: 'flex-start' },
  resultRank: { alignItems: 'flex-end', gap: SPACE.xxs },
  rank: { fontFamily: FONT.display, fontSize: 22, lineHeight: 28 },
  grid: {
    alignItems: 'center',
    borderTopWidth: 2,
    paddingTop: SPACE.md,
  },
  section: {
    paddingBottom: SPACE.md,
    paddingHorizontal: SPACE.xl,
    paddingTop: SPACE.xl,
  },
  summit: {
    gap: SPACE.md,
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.lg,
  },
  summitClosed: { paddingBottom: SPACE.lg },
  summitHead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACE.sm,
    justifyContent: 'space-between',
  },
  podium: { paddingHorizontal: SPACE.lg },
  item: { paddingBottom: SPACE.sm, paddingHorizontal: SPACE.xl },
  stale: { opacity: 0.5 },
  pad: { gap: SPACE.md, padding: SPACE.xl },
});
