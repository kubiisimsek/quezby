import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type {
  LeagueMember,
  LeagueResponse,
  LeagueTier,
  LeagueZone,
} from '@quezby/types';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
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

import { track } from '@/analytics/track';
import { BoardStage, useArrival } from '@/components/BoardStage';
import { FloorDock } from '@/components/FloorDock';
import { PlayerSheet } from '@/components/PlayerSheet';
import { useLeague } from '@/hooks/useBoards';
import { useT } from '@/i18n';
import { messageFor } from '@/lib/errors';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import { Icon } from '@/ui/icons';
import {
  Button,
  Callout,
  ClimbRow,
  Confetti,
  CountdownChip,
  EmptyState,
  FloorCard,
  IconButton,
  Panel,
  Ribbon,
  Screen,
  SkeletonList,
  Spotlight,
  Stamp,
  TierBadge,
  Txt,
} from '@/ui/kit';
import {
  DEPTH,
  RADIUS,
  SPACE,
  TYPE,
  useTheme,
  withAlpha,
  type Theme,
} from '@/ui/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'League'>,
  NativeStackScreenProps<RootStackParamList>
>;

/** The week whose result card was last put away. */
const SEEN_KEY = 'quezby.league.seen.v1';

/** The tiers, bottom to top. */
const TIERS: LeagueTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

/**
 * The week's league. On the stage: your tier's emblem glowing between the
 * tiers under and over it, its name, the time left and how points are
 * counted. Under it, the group you were seated in, best first — the
 * promotion places under a green "TERFİ BÖLGESİ" banner at the top and the
 * demotion places under a red "DÜŞME BÖLGESİ" at the foot, so where you
 * stand needs no counting — and your floor pinned over the dock. Last week's
 * outcome greets you once, until you put it away; a promotion gets confetti.
 */
export function LeagueScreen({ navigation }: Props) {
  const league = useLeague();
  const theme = useTheme();
  const t = useT();
  const { refetch } = league;
  const data = league.data;
  const [selected, setSelected] = useState<string | null>(null);
  const [floorHeight, setFloorHeight] = useState(0);
  const [pulling, setPulling] = useState(false);
  const { seen, dismiss } = useSeenWeek();

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
  const open = useCallback(
    (member: LeagueMember) => setSelected(member.username),
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

  const me = data?.joined ? data.me : null;
  const lastWeek = data?.lastWeek ?? null;
  const greet =
    lastWeek !== null && seen !== undefined && seen !== lastWeek.weekKey;

  let body: ReactNode;
  if (!data) {
    body = league.isError ? (
      <View style={styles.stack}>
        <Callout tone="bad" title={t.league.failed}>
          {messageFor(league.error, t)}
        </Callout>
        <Button
          label={t.league.retry}
          tone="neutral"
          icon="refresh"
          onPress={() => void refetch()}
        />
      </View>
    ) : (
      <SkeletonList rows={4} />
    );
  } else {
    body = (
      <View style={styles.stack}>
        {greet && lastWeek ? (
          <LastWeekCard
            lastWeek={lastWeek}
            onDismiss={() => dismiss(lastWeek.weekKey)}
          />
        ) : null}
        {data.joined ? (
          <Group members={data.members} onPress={open} />
        ) : data.unlock ? (
          <EmptyState
            icon="lock"
            title={t.league.locked.title(data.unlock.remaining)}
            hint={t.league.locked.hint(data.unlock.required)}
            action={
              <Button
                label={t.league.play}
                icon="play"
                tone="play"
                onPress={play}
              />
            }
          />
        ) : (
          <EmptyState
            icon="shield"
            title={t.league.join.title}
            hint={t.league.join.hint}
            action={
              <Button
                label={t.league.join.action}
                icon="play"
                tone="play"
                onPress={play}
              />
            }
          />
        )}
      </View>
    );
  }

  const above = me
    ? (data?.members[data.members.findIndex((m) => m.isMe) - 1] ?? null)
    : null;

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
        <LeagueStage
          league={data}
          failed={league.isError}
          onElapsed={() => void refetch()}
        />
        <View style={styles.body}>{body}</View>
      </ScrollView>

      {me ? (
        <FloorDock onHeight={setFloorHeight}>
          <FloorCard
            rank={me.rank}
            score={me.points}
            targetUsername={above?.username ?? null}
            gapToNext={me.gap}
            progress={data?.nextRankProgress ?? null}
            onPlay={chase}
          />
        </FloorDock>
      ) : null}

      <Confetti
        fire={
          greet && lastWeek?.outcome === 'promoted' ? lastWeek.weekKey : null
        }
      />
      <PlayerSheet username={selected} onClose={() => setSelected(null)} />
    </Screen>
  );
}

/** The last week put away, read once from the phone; undefined until read. */
function useSeenWeek() {
  const [seen, setSeen] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    const read = async () => {
      let value: string | null = null;
      try {
        value = await AsyncStorage.getItem(SEEN_KEY);
      } catch {
        value = null;
      }
      if (alive) setSeen(value);
    };
    void read();
    return () => {
      alive = false;
    };
  }, []);

  const dismiss = useCallback((weekKey: string) => {
    setSeen(weekKey);
    const write = async () => {
      try {
        await AsyncStorage.setItem(SEEN_KEY, weekKey);
      } catch {
        // Unsaved, the card only comes back once more.
      }
    };
    void write();
  }, []);

  return { seen, dismiss };
}

/** A tier's own colour — the emblem's metal, and the light behind it. */
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
    default:
      return theme.tierDiamond;
  }
}

/**
 * The stage: the league's name, and — once it is in — your tier on its
 * ladder. While it loads a spinner holds the room; when it could not be
 * loaded, an empty emblem does, and the error is said under the stage.
 */
function LeagueStage({
  league,
  failed,
  onElapsed,
}: {
  league: LeagueResponse | undefined;
  failed: boolean;
  onElapsed: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();

  let hero: ReactNode;
  if (league) hero = <TierHero league={league} onElapsed={onElapsed} />;
  else if (failed) {
    hero = (
      <View style={styles.waiting}>
        <Icon
          name="shield"
          size={64}
          color={withAlpha(theme.onBrand, 0.35)}
          strokeWidth={2}
        />
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
      <Ribbon label={t.league.ribbon} />
      {hero}
    </BoardStage>
  );
}

function TierHero({
  league,
  onElapsed,
}: {
  league: LeagueResponse;
  onElapsed: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const intro = useArrival(0, 12);

  return (
    <Animated.View style={[styles.hero, intro]}>
      <TierLadder tier={league.tier} />
      <Txt variant="hero" align="center">
        {t.tiers.league(league.tier)}
      </Txt>
      <View style={styles.centred}>
        <CountdownChip
          endsAt={league.endsAt}
          serverTime={league.serverTime}
          prefix={t.home.countdown.endsIn}
          tone="onBrand"
          onElapsed={onElapsed}
        />
      </View>
      <View style={styles.rule}>
        <Icon
          name="calendar"
          size={14}
          color={theme.onBrand}
          strokeWidth={2.4}
        />
        <Txt variant="meta" tone="onSolid">
          {t.league.rule}
        </Txt>
      </View>
    </Animated.View>
  );
}

/** The emblem's room on the ladder, and how big its light is. */
const EMBLEM = 92;
const EMBLEM_GLOW = 168;

/**
 * Your tier's emblem, big and lit, between the two tiers under it and the two
 * over it — the ones above dimmed until they are reached. Only your own
 * emblem is read aloud; the ladder is the title's picture.
 */
function TierLadder({ tier }: { tier: LeagueTier }) {
  const theme = useTheme();
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
          <TierBadge tier={tier} size="xl" />
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

/** One tier on the ladder, or the empty room past either end of it. */
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

function LastWeekCard({
  lastWeek,
  onDismiss,
}: {
  lastWeek: NonNullable<LeagueResponse['lastWeek']>;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const words = t.league.lastWeek;
  const intro = useArrival(1);
  const up = lastWeek.outcome === 'promoted';
  const down = lastWeek.outcome === 'demoted';
  const headline = up
    ? words.promoted(lastWeek.newTier)
    : down
      ? words.demoted(lastWeek.newTier)
      : words.stayed(lastWeek.newTier);
  const ring = up
    ? withAlpha(theme.gold, 0.8)
    : down
      ? withAlpha(theme.bad, 0.55)
      : null;

  return (
    <Animated.View style={intro}>
      <Panel style={styles.lastWeek}>
        {ring ? (
          <View
            pointerEvents="none"
            style={[styles.lastWeekRing, { borderColor: ring }]}
          />
        ) : null}
        <View style={styles.lastWeekEmblem}>
          {up ? (
            <View pointerEvents="none" style={styles.lastWeekGlow}>
              <Spotlight size={LAST_WEEK_GLOW} color={theme.gold} />
            </View>
          ) : null}
          <Stamp from={1.8} delay={220}>
            <TierBadge tier={lastWeek.newTier} size="lg" />
          </Stamp>
        </View>
        <View style={styles.lastWeekText}>
          <Txt
            variant="title"
            style={
              up
                ? { color: theme.gold }
                : down
                  ? { color: theme.badText }
                  : null
            }
          >
            {headline}
          </Txt>
          <Txt variant="meta" tone="muted">
            {words.finished(lastWeek.tier, lastWeek.rank)}
          </Txt>
        </View>
        <IconButton icon="close" label={words.close} onPress={onDismiss} />
      </Panel>
    </Animated.View>
  );
}

const LAST_WEEK_GLOW = 120;

type Run = { zone: LeagueZone; members: LeagueMember[] };

/** Members in order, cut wherever the zone changes. */
function runsOf(members: LeagueMember[]): Run[] {
  const runs: Run[] = [];
  for (const member of members) {
    const last = runs[runs.length - 1];
    if (last && last.zone === member.zone) last.members.push(member);
    else runs.push({ zone: member.zone, members: [member] });
  }
  return runs;
}

function Group({
  members,
  onPress,
}: {
  members: LeagueMember[];
  onPress: (member: LeagueMember) => void;
}) {
  const t = useT();
  return (
    <View style={styles.group}>
      {runsOf(members).map((run) => {
        const rows = run.members.map((member) => (
          <ClimbRow
            key={`${member.rank}-${member.username}`}
            rank={member.rank}
            username={member.username}
            score={member.points}
            detail={t.league.days(member.daysPlayed)}
            gap={member.gap}
            isMe={member.isMe}
            index={members.indexOf(member)}
            onPress={() => onPress(member)}
          />
        ));
        const key = `${run.zone}-${run.members[0]?.rank ?? 0}`;
        return run.zone === 'stay' ? (
          <View key={key} style={styles.rows}>
            {rows}
          </View>
        ) : (
          <ZoneBand key={key} zone={run.zone}>
            {rows}
          </ZoneBand>
        );
      })}
    </View>
  );
}

/** How tall a zone's banner is; it straddles the top edge of the zone's well. */
const BANNER = 30;

/**
 * The places that move you: a green well under a "TERFİ BÖLGESİ" banner at
 * the top of the group, a red one under "DÜŞME BÖLGESİ" at its foot, arrows
 * on the banner pointing the way the week will take them.
 */
function ZoneBand({
  zone,
  children,
}: {
  zone: Exclude<LeagueZone, 'stay'>;
  children: ReactNode;
}) {
  const theme = useTheme();
  const t = useT();
  const words = t.league.zones[zone];
  const up = zone === 'promote';
  const look = up
    ? {
        face: theme.ok,
        hi: theme.okHi,
        lip: theme.okLip,
        ink: theme.outline,
        tint: theme.ok,
      }
    : {
        face: theme.bad,
        hi: theme.badHi,
        lip: theme.badLip,
        ink: theme.onBrand,
        tint: theme.bad,
      };
  const arrow = (
    <View style={up ? null : styles.pointDown}>
      <Icon name="arrowUp" size={14} color={look.ink} strokeWidth={3.2} />
    </View>
  );

  return (
    <View style={styles.zone}>
      <View style={styles.bannerRow} pointerEvents="box-none">
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel={words.name}
          style={[
            styles.banner,
            {
              backgroundColor: look.face,
              borderBottomColor: look.lip,
              borderColor: theme.outline,
            },
          ]}
        >
          <View
            pointerEvents="none"
            style={[styles.bannerHi, { backgroundColor: look.hi }]}
          />
          {arrow}
          <Text style={[TYPE.label, { color: look.ink }]}>{words.ribbon}</Text>
          {arrow}
        </View>
      </View>
      <View
        style={[
          styles.zoneWell,
          {
            backgroundColor: withAlpha(look.tint, 0.1),
            borderColor: withAlpha(look.tint, 0.5),
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  stage: { gap: SPACE.md, paddingBottom: SPACE.xl },
  waiting: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  hero: { alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.xl },
  centred: { alignItems: 'center' },
  rule: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACE.sm,
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
  rungNear: { alignItems: 'center', justifyContent: 'center', width: 44 },
  rungFar: { alignItems: 'center', justifyContent: 'center', width: 30 },
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
  lastWeek: { alignItems: 'center', flexDirection: 'row', gap: SPACE.md },
  lastWeekRing: {
    borderRadius: RADIUS.panel - DEPTH.outline,
    borderWidth: 2,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  lastWeekEmblem: {
    alignItems: 'center',
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  lastWeekGlow: {
    height: LAST_WEEK_GLOW,
    left: (52 - LAST_WEEK_GLOW) / 2,
    position: 'absolute',
    top: (52 - LAST_WEEK_GLOW) / 2,
    width: LAST_WEEK_GLOW,
  },
  lastWeekText: { flex: 1, gap: SPACE.xxs },
  group: { gap: SPACE.md },
  rows: { gap: SPACE.sm },
  zone: { paddingTop: BANNER / 2 },
  bannerRow: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1,
  },
  banner: {
    alignItems: 'center',
    borderBottomWidth: DEPTH.outline + 2,
    borderRadius: 10,
    borderWidth: DEPTH.outline,
    flexDirection: 'row',
    gap: SPACE.sm,
    height: BANNER,
    overflow: 'hidden',
    paddingHorizontal: SPACE.md,
  },
  bannerHi: { height: '46%', left: 0, position: 'absolute', right: 0, top: 0 },
  pointDown: { transform: [{ rotate: '180deg' }] },
  zoneWell: {
    borderRadius: RADIUS.panel + SPACE.xs,
    borderWidth: 2,
    gap: SPACE.sm,
    padding: SPACE.sm,
    paddingTop: BANNER / 2 + SPACE.sm,
  },
});
