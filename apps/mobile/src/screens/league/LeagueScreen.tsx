import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { LeagueTier, LeagueUnlock, RatingEntry, RatingResponse } from '@quezby/types';
import type { UseQueryResult } from '@tanstack/react-query';
import { useCallback, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/auth/session';
import { track } from '@/analytics/track';
import { BoardStage, useArrival } from '@/components/BoardStage';
import { FloorDock } from '@/components/FloorDock';
import { PlayerSheet } from '@/components/PlayerSheet';
import { QbHistorySheet } from '@/components/QbHistorySheet';
import { useRating, useRatingBoard } from '@/hooks/useBoards';
import { useT } from '@/i18n';
import { messageFor } from '@/lib/errors';
import { TIERS } from '@/lib/tiers';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import { Icon } from '@/ui/icons';
import {
  Button,
  Callout,
  ClimbRow,
  EmptyState,
  Eyebrow,
  FloorCard,
  IconButton,
  IconChip,
  Meter,
  QbCoin,
  Ribbon,
  Screen,
  SkeletonList,
  Spotlight,
  Stamp,
  Tag,
  FramedAvatar,
  TierBadge,
  Txt,
} from '@/ui/kit';
import {
  FONT,
  SPACE,
  embossed,
  lh,
  useTheme,
  withAlpha,
  type Theme,
} from '@/ui/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'League'>,
  NativeStackScreenProps<RootStackParamList>
>;

/**
 * The league — the one your qb puts you in. On the stage: you in its frame
 * between the leagues under and over it, your qb in gold on its coin, how
 * far into the league you are, your best. The
 * coin in the stage's corner opens your qb moves. Before it: how far
 * Dereceli is, then the placement games. Under it, the league's players by
 * qb — a ranking that never resets — with your floor pinned over the dock:
 * the qb to pass the player right above you.
 */
export function LeagueScreen({ navigation }: Props) {
  const rating = useRating();
  const placed = rating.data?.placed === true;
  const board = useRatingBoard('league', placed);
  const theme = useTheme();
  const t = useT();
  const [selected, setSelected] = useState<string | null>(null);
  const [floorHeight, setFloorHeight] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [moves, setMoves] = useState(false);

  const play = useCallback(
    (mode: 'free' | 'rated' = 'rated') => navigation.navigate('Game', { mode }),
    [navigation],
  );
  const chase = useCallback(
    (chasing: boolean) => {
      if (chasing) track('rival');
      play();
    },
    [play],
  );
  const open = useCallback((entry: RatingEntry) => setSelected(entry.username), []);
  const refresh = useCallback(async () => {
    setPulling(true);
    try {
      await Promise.all([rating.refetch(), ...(placed ? [board.refetch()] : [])]);
    } finally {
      setPulling(false);
    }
  }, [board, placed, rating]);

  const data = placed ? board.data : undefined;
  const me = data?.me ?? null;
  const above = me ? (data?.entries.find((entry) => entry.rank === me.rank - 1) ?? null) : null;

  let ranking: ReactNode;
  if (!rating.data) {
    ranking = rating.isError ? null : <SkeletonList rows={4} />;
  } else if (!placed) {
    // The ranking is Dereceli's: the stage above holds the way there.
    ranking = <EmptyState icon="lock" title={t.league.closed.title} hint={t.league.closed.hint} />;
  } else if (!data) {
    ranking = board.isError ? (
      <View style={styles.stack}>
        <Callout tone="bad" title={t.league.failed}>
          {messageFor(board.error, t)}
        </Callout>
        <Button
          label={t.league.retry}
          tone="neutral"
          icon="refresh"
          onPress={() => void board.refetch()}
        />
      </View>
    ) : (
      <SkeletonList rows={4} />
    );
  } else {
    ranking = (
      <View style={styles.stack}>
        {me ? null : (
          <EmptyState
            icon="shield"
            title={t.league.idle.title}
            hint={t.league.idle.hint}
            action={
              <Button
                label={t.league.idle.action}
                icon="shield"
                tone="play"
                onPress={() => play('rated')}
              />
            }
          />
        )}
        {data.entries.length > 0 ? (
          <View style={styles.rows}>
            {data.entries.map((entry, index) => (
              <ClimbRow
                key={entry.username}
                rank={entry.rank}
                username={entry.username}
                avatarUrl={entry.avatarUrl}
                score={entry.rating}
                gap={entry.gap}
                isMe={entry.isMe}
                index={index}
                unit="elo"
                onPress={() => open(entry)}
              />
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <Screen>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: me ? floorHeight + SPACE.lg : SPACE.xxl },
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
      >
        <LeagueStage rating={rating} onPlay={play} onMoves={() => setMoves(true)} />
        <View style={[styles.body, styles.stack]}>
          <View style={styles.stack}>
            <Eyebrow icon="podium">{t.league.board}</Eyebrow>
            {ranking}
          </View>
        </View>
      </ScrollView>

      {me ? (
        <FloorDock onHeight={setFloorHeight}>
          <FloorCard
            rank={me.rank}
            score={me.rating}
            targetUsername={above?.username ?? null}
            gapToNext={me.gap}
            unit="elo"
            onPlay={chase}
          />
        </FloorDock>
      ) : null}

      <PlayerSheet username={selected} onClose={() => setSelected(null)} />
      <QbHistorySheet
        open={moves}
        onClose={() => setMoves(false)}
        changes={rating.data?.history ?? []}
        current={rating.data?.placed ? rating.data.rating : null}
      />
    </Screen>
  );
}

/** A league's own colour — the emblem's metal, and the light behind it. */
function tierColor(theme: Theme, tier: LeagueTier): string {
  switch (tier) {
    case 'bronze':
      return theme.tierBronze;
    case 'silver':
      return theme.tierSilver;
    case 'gold':
      return theme.tierGold;
    case 'platinum':
      return theme.tierPlatinum;
    case 'diamond':
      return theme.tierDiamond;
    default:
      return theme.tierMaster;
  }
}

/**
 * The stage: the league your qb puts you in, on its ladder. Before it, the
 * way there: while Dereceli is shut, how many Normal or Günlük games open it;
 * then the placement games that set the qb, each with its gold way in. A
 * spinner holds the room while it loads; an empty emblem when it could not
 * be loaded. Once Dereceli is open, the coin in the corner opens the qb moves.
 */
function LeagueStage({
  rating,
  onPlay,
  onMoves,
}: {
  rating: UseQueryResult<RatingResponse>;
  onPlay: (mode: 'free' | 'rated') => void;
  onMoves: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const data = rating.data;

  let hero: ReactNode;
  if (data?.placed && data.tier !== null && data.rating !== null) {
    hero = <TierHero rating={data} tier={data.tier} value={data.rating} />;
  } else if (data?.unlock) {
    hero = <LockedHero unlock={data.unlock} onPlay={() => onPlay('free')} />;
  } else if (data) {
    hero = <PlacementHero placement={data.placement} onPlay={() => onPlay('rated')} />;
  } else if (rating.isError) {
    hero = (
      <View style={styles.waiting}>
        <Icon
          name="shield"
          size={64}
          color={withAlpha(theme.onBrand, 0.35)}
          strokeWidth={2}
        />
        <Txt variant="meta" tone="onSolid" align="center">
          {messageFor(rating.error, t)}
        </Txt>
      </View>
    );
  } else {
    hero = (
      <View style={styles.waiting}>
        <ActivityIndicator color={theme.onBrand} size="large" />
      </View>
    );
  }

  return (
    <BoardStage style={[styles.stage, { paddingTop: insets.top + SPACE.md }]}>
      <View style={styles.top}>
        <Ribbon label={t.league.ribbon} />
        {data && !data.unlock ? (
          <IconButton
            icon="qb"
            label={t.rating.history.open}
            tone="onBrand"
            onPress={onMoves}
            style={styles.moves}
          />
        ) : null}
      </View>
      {hero}
    </BoardStage>
  );
}

function TierHero({
  rating,
  tier,
  value,
}: {
  rating: RatingResponse;
  tier: LeagueTier;
  value: number;
}) {
  const theme = useTheme();
  const t = useT();
  const intro = useArrival(0, 12);

  return (
    <Animated.View style={[styles.hero, intro]}>
      <TierLadder tier={tier} />
      <Txt variant="hero" align="center">
        {t.tiers.league(tier)}
      </Txt>
      <View style={styles.qb}>
        <QbCoin size={38} />
        <Text
          accessibilityLabel={t.rating.elo(t.fmt.score(value))}
          style={[styles.elo, { color: theme.gold }, embossed(3)]}
        >
          {t.fmt.score(value)}
        </Text>
      </View>
      {rating.progress !== null ? (
        <View style={styles.bar}>
          <Meter value={rating.progress / 1000} tone="warn" notches={4} />
        </View>
      ) : null}
      {rating.shield || rating.peak !== null ? (
        <View style={styles.tags}>
          {rating.shield ? (
            <Tag label={t.rating.shield(rating.shield.runs)} tone="secondary" icon="shield" />
          ) : null}
          {rating.peak !== null ? (
            <Tag
              label={t.rating.peak(t.fmt.score(rating.peak))}
              said={t.rating.peak(t.rating.elo(t.fmt.score(rating.peak)))}
              tone="neutral"
              icon="qb"
            />
          ) : null}
        </View>
      ) : null}
    </Animated.View>
  );
}

/** Dereceli still shut: the Normal and Günlük games that open it, counted. */
function LockedHero({
  unlock,
  onPlay,
}: {
  unlock: LeagueUnlock;
  onPlay: () => void;
}) {
  const t = useT();
  const intro = useArrival(0, 12);
  const { remaining, required } = unlock;

  return (
    <Animated.View style={[styles.hero, intro]}>
      <Stamp from={1.6} delay={160}>
        <IconChip icon="lock" tone="neutral" size="lg" />
      </Stamp>
      <Txt variant="hero" align="center">
        {t.modes.lockedTitle(remaining)}
      </Txt>
      <View style={styles.bar}>
        <Meter value={(required - remaining) / required} tone="warn" />
      </View>
      <Txt variant="meta" tone="onSolid" align="center">
        {t.modes.lockedBody(required)}
      </Txt>
      <View style={styles.heroPlay}>
        <Button label={t.modes.playNormal} icon="play" tone="play" onPress={onPlay} />
      </View>
    </Animated.View>
  );
}

/** Dereceli open, the Elo not set yet: the placement games, counted, and what they decide. */
function PlacementHero({
  placement,
  onPlay,
}: {
  placement: RatingResponse['placement'];
  onPlay: () => void;
}) {
  const t = useT();
  const intro = useArrival(0, 12);
  const { played, required } = placement ?? { played: 0, required: 1 };

  return (
    <Animated.View style={[styles.hero, intro]}>
      <Stamp from={1.6} delay={160}>
        <IconChip icon="flag" tone="secondary" size="lg" />
      </Stamp>
      <Txt variant="hero" align="center">
        {t.rating.placement.title(played, required)}
      </Txt>
      <View style={styles.bar}>
        <Meter value={played / required} tone="secondary" notches={required} />
      </View>
      <Txt variant="meta" tone="onSolid" align="center">
        {t.rating.placement.hint(required)}
      </Txt>
      <View style={styles.heroPlay}>
        <Button label={t.modes.play} icon="shield" tone="play" onPress={onPlay} />
      </View>
    </Animated.View>
  );
}

/** Your frame's room on the ladder, and how big its light is. */
const EMBLEM = 118;
const EMBLEM_GLOW = 210;

/**
 * You in your league's frame, big, lit and alive, between the two leagues
 * under it and the two over it — the ones above dimmed until they are
 * reached. Only your own league is read aloud; the ladder is the title's
 * picture.
 */
function TierLadder({ tier }: { tier: LeagueTier }) {
  const theme = useTheme();
  const t = useT();
  const user = useSession((state) => state.user);
  const at = TIERS.indexOf(tier);
  const step = (offset: number) => TIERS[at + offset] ?? null;

  return (
    <View style={styles.ladder}>
      <View pointerEvents="none" style={styles.ladderGlow}>
        <Spotlight size={EMBLEM_GLOW} color={tierColor(theme, tier)} />
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.rungs}
      >
        <Rung tier={step(-2)} far />
        <Rung tier={step(-1)} />
      </View>
      <View style={styles.emblem}>
        <Stamp from={1.7} delay={160}>
          <View accessible accessibilityRole="image" accessibilityLabel={t.tiers.league(tier)}>
            <FramedAvatar
              tier={tier}
              name={user?.username ?? ''}
              src={user?.avatarUrl}
              size={EMBLEM}
              tone="primary"
              animated
            />
          </View>
        </Stamp>
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.rungs}
      >
        <Rung tier={step(1)} locked />
        <Rung tier={step(2)} far locked />
      </View>
    </View>
  );
}

/** One league on the ladder, or the empty room past either end of it. */
function Rung({
  tier,
  far = false,
  locked = false,
}: {
  tier: LeagueTier | null;
  far?: boolean;
  locked?: boolean;
}) {
  const box = far ? styles.rungFar : styles.rungNear;
  if (!tier) return <View style={box} />;
  const opacity = locked ? (far ? 0.32 : 0.5) : far ? 0.7 : 0.9;
  return (
    <View style={[box, { opacity }]}>
      <TierBadge tier={tier} size={far ? 'md' : 'lg'} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  stage: { gap: SPACE.md, paddingBottom: SPACE.xl },
  top: { alignItems: 'center', alignSelf: 'stretch', justifyContent: 'center', minHeight: 42 },
  moves: { end: SPACE.lg, position: 'absolute' },
  waiting: {
    alignItems: 'center',
    gap: SPACE.md,
    justifyContent: 'center',
    minHeight: 200,
    paddingHorizontal: SPACE.xl,
  },
  hero: { alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.xl },
  heroPlay: { alignSelf: 'stretch', marginTop: SPACE.sm, paddingHorizontal: SPACE.xl },
  qb: { alignItems: 'center', flexDirection: 'row', gap: SPACE.sm },
  elo: { fontFamily: FONT.display, fontSize: 34, lineHeight: lh(40), textAlign: 'center' },
  bar: { alignSelf: 'stretch', gap: SPACE.xs, paddingHorizontal: SPACE.xl },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.xs,
    justifyContent: 'center',
    marginTop: SPACE.xxs,
  },
  ladder: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACE.ms,
    justifyContent: 'center',
    marginBottom: SPACE.xs,
    marginTop: SPACE.xs,
  },
  rungs: { alignItems: 'center', flexDirection: 'row', gap: SPACE.ms },
  rungNear: { alignItems: 'center', justifyContent: 'center', width: 56 },
  rungFar: { alignItems: 'center', justifyContent: 'center', width: 38 },
  emblem: {
    alignItems: 'center',
    height: EMBLEM,
    justifyContent: 'center',
    marginHorizontal: SPACE.xs,
    width: EMBLEM,
  },
  /** Behind the whole ladder, centred on the emblem — the rungs mirror each other. */
  ladderGlow: {
    height: EMBLEM_GLOW,
    left: '50%',
    marginLeft: -EMBLEM_GLOW / 2,
    position: 'absolute',
    top: (EMBLEM - EMBLEM_GLOW) / 2,
    width: EMBLEM_GLOW,
  },
  body: { padding: SPACE.xl },
  stack: { gap: SPACE.lg },
  rows: { gap: SPACE.sm },
});
