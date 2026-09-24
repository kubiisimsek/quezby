import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import {
  useIsFocused,
  type CompositeScreenProps,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type {
  DailyAttempt,
  DailyResponse,
  LeaderboardResponse,
  LeagueMember,
  LeagueResponse,
} from '@quezby/types';
import type { UseQueryResult } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/auth/session';
import { APP_PLATFORM } from '@/config/env';
import { DEVICE_FAILED, REEL_GUIDE, REEL_ORDER } from '@/game/howTo';
import { useDaily, useLeaderboard, useLeague } from '@/hooks/useBoards';
import { useMe } from '@/hooks/useMe';
import { messageFor } from '@/lib/errors';
import { dativeOf, formatGap, formatRank, formatScore } from '@/lib/format';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import { deviceFailed, useDeviceVerdict } from '@/stores/deviceVerdict';
import { Icon, type IconName } from '@/ui/icons';
import {
  Arena,
  Avatar,
  BrandBand,
  Button,
  CountdownChip,
  IconButton,
  LobbyCard,
  Meter,
  PlayButton,
  RankChips,
  Ribbon,
  Skeleton,
  Stamp,
  Tag,
  TIER_LABELS,
  TierBadge,
  Txt,
  type TagTone,
} from '@/ui/kit';
import { useEntrance } from '@/ui/motion';
import {
  DEPTH,
  FONT,
  RADIUS,
  SPACE,
  TYPE,
  embossed,
  useTheme,
  withAlpha,
} from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

type Navigation = Props['navigation'];

/**
 * The game lobby. Everything on it points at today's one game: you and your
 * league in the status strip, "Günün akışı" as the event on the stage with
 * its countdown, the big gold play slab in the thumb's reach, then the doors
 * that bring you back tomorrow — the league, the player to pass this week,
 * your records. Every number is the API's.
 */
export function HomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const user = useSession((state) => state.user);
  const ranks = useSession((state) => state.ranks);
  const userId = user?.id ?? null;
  const unranked = useDeviceVerdict((state) => deviceFailed(state, userId));
  const me = useMe();
  const daily = useDaily();
  const league = useLeague();
  const weekly = useLeaderboard('weekly', 'everyone', 3);

  const strip = useEntrance(0, 10);
  const warning = useEntrance(0, 10);
  const hero = useEntrance(1, 22);
  const leagueIn = useEntrance(2);
  const rivalIn = useEntrance(3);
  const recordsIn = useEntrance(4);

  /**
   * Only a pull shows the spinner. The lobby refetches on its own when it
   * comes back into view, and a spinner for that would push the whole lobby
   * down under the player's thumb.
   */
  const [pulling, setPulling] = useState(false);

  const refresh = async () => {
    setPulling(true);
    try {
      await Promise.all([
        me.refetch(),
        daily.refetch(),
        league.refetch(),
        weekly.refetch(),
      ]);
    } finally {
      setPulling(false);
    }
  };

  const tier = league.data?.tier ?? null;
  const best = user?.best ?? null;

  return (
    <View style={[styles.fill, { backgroundColor: theme.canvas }]}>
      <StatusBar barStyle="light-content" />
      <Arena />
      <ScrollView
        testID="lobby"
        style={styles.fill}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + SPACE.sm }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={() => void refresh()}
            tintColor={theme.gold}
            colors={[theme.gold]}
          />
        }
      >
        <Animated.View style={[styles.player, strip]}>
          <View>
            <Avatar name={user?.username ?? '?'} tone="primary" size="lg" />
            {tier ? (
              <View style={styles.tierPin}>
                <TierBadge tier={tier} size="sm" />
              </View>
            ) : null}
          </View>
          <View style={styles.playerText}>
            <Txt variant="title" numberOfLines={1}>
              @{user?.username}
            </Txt>
            {tier ? (
              <Txt variant="micro" tone="muted">
                {`${TIER_LABELS[tier]} lig`}
              </Txt>
            ) : null}
          </View>
          <IconButton
            icon="help"
            label="Yardım"
            onPress={() => navigation.navigate('Help')}
          />
        </Animated.View>

        {unranked ? (
          <Animated.View style={warning}>
            <DeviceWarning />
          </Animated.View>
        ) : null}

        <Animated.View style={hero}>
          <DailyHero
            daily={daily}
            breathing={focused}
            navigation={navigation}
          />
        </Animated.View>

        <Animated.View style={leagueIn}>
          <LeagueDoor
            league={league}
            onPress={() => navigation.navigate('League')}
          />
        </Animated.View>

        <Animated.View style={rivalIn}>
          <RivalDoor
            name={user?.username ?? '?'}
            rival={weekly.data?.rival ?? null}
            onPlay={() => navigation.navigate('Game', { mode: 'free' })}
          />
        </Animated.View>

        <Animated.View style={recordsIn}>
          <LobbyCard
            title={best ? formatScore(best.score) : '—'}
            eyebrow="Sezon rekoru"
            icon="trophy"
            tone="warn"
            onPress={() => navigation.navigate('Leaderboard')}
          >
            <RankChips
              items={[
                { label: 'Bugün', rank: ranks?.daily },
                { label: 'Hafta', rank: ranks?.weekly },
                { label: 'Ay', rank: ranks?.monthly },
                { label: 'Tüm zamanlar', rank: ranks?.all },
              ]}
            />
          </LobbyCard>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/**
 * The API's check came back against this phone — rooted, an emulator, a
 * changed app. It plays on, but its runs never rank; the lobby says so up
 * top, before a game starts, as the result of every run does.
 */
function DeviceWarning() {
  return (
    <LobbyCard title="Bu cihazda kapalı" eyebrow="SIRALAMA" icon="alert" tone="warn">
      <Txt variant="meta" tone="muted">
        {`${DEVICE_FAILED.why[APP_PLATFORM]} Oynayabilirsin ama skorların sıralamaya girmez.`}
      </Txt>
    </LobbyCard>
  );
}

/**
 * The four reels of the game, fanned out like a hand of cards — what today's
 * feed is made of, in the feed's own colours. Pictures only: the rules live in
 * Yardım.
 */
function ReelFan() {
  const theme = useTheme();
  const tilt = [-11, -4, 4, 11];
  const drop = [10, 0, 0, 10];
  const faces: Record<string, { bg: string; ink: string }> = {
    skip: { bg: REEL.skip[0] ?? theme.tile, ink: REEL.ink },
    like: { bg: REEL.like, ink: REEL.ink },
    hold: { bg: REEL.hold, ink: REEL.goldInk },
    freeze: { bg: REEL.freeze, ink: REEL.ink },
  };
  return (
    <View style={styles.fan} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {REEL_ORDER.map((kind, index) => {
        const face = faces[kind] ?? { bg: theme.tile, ink: theme.ink };
        return (
          <Stamp key={kind} delay={180 + index * 90} from={0.3}>
            <View
              style={[
                styles.reel,
                {
                  backgroundColor: face.bg,
                  borderColor: theme.outline,
                  transform: [{ rotate: `${tilt[index] ?? 0}deg` }, { translateY: drop[index] ?? 0 }],
                },
              ]}
            >
              <View style={[styles.reelShine, { backgroundColor: withAlpha(theme.onBrand, 0.16) }]} />
              <Icon name={REEL_GUIDE[kind].icon} size={26} color={face.ink} strokeWidth={2.8} />
            </View>
          </Stamp>
        );
      })}
    </View>
  );
}

/**
 * "Günün akışı": everyone's same feed, one attempt — the lobby's event, on
 * its stage. Open, it is the breathing gold button under the stage; played,
 * it is your score and place with the way to show them off, and the button
 * turns to free play.
 */
function DailyHero({
  daily,
  breathing,
  navigation,
}: {
  daily: UseQueryResult<DailyResponse>;
  breathing: boolean;
  navigation: Navigation;
}) {
  const data = daily.data;
  const attempt = data?.attempt ?? null;
  const playFree = () => navigation.navigate('Game', { mode: 'free' });

  if (!data && daily.isError) {
    return (
      <View style={styles.heroBlock}>
        <Stage>
          <Ribbon label="GÜNÜN AKIŞI" />
          <Txt variant="display" align="center">
            Günün akışı
          </Txt>
          <Txt variant="meta" tone="onSolid" align="center">
            {messageFor(daily.error)}
          </Txt>
        </Stage>
        <PlayButton
          label="Oyna"
          icon="play"
          tone="play"
          breathing={breathing}
          onPress={playFree}
        />
        <Button
          label="Tekrar dene"
          icon="refresh"
          tone="secondary"
          size="md"
          onPress={() => void daily.refetch()}
        />
      </View>
    );
  }

  return (
    <View style={styles.heroBlock}>
      <Stage>
        <Ribbon label="GÜNÜN AKIŞI" />
        <Txt variant="display" align="center" style={styles.heroTitle}>
          {data ? `Günün akışı #${data.number}` : 'Günün akışı'}
        </Txt>
        <Txt variant="meta" tone="onSolid" align="center">
          Herkes aynı akışı oynar · tek hak
        </Txt>
        {attempt ? null : <ReelFan />}
        {data ? (
          <View style={styles.centred}>
            <CountdownChip
              endsAt={data.endsAt}
              serverTime={data.serverTime}
              prefix={attempt ? 'Yeni akışa' : 'Bitmesine'}
              tone="onBrand"
              onElapsed={() => void daily.refetch()}
            />
          </View>
        ) : null}

        {data && attempt ? (
          <Attempt
            attempt={attempt}
            players={data.players}
            onOpenDaily={() => navigation.navigate('Daily')}
          />
        ) : null}
      </Stage>

      <PlayButton
        label={attempt ? 'Oyna' : 'Günün akışını oyna'}
        icon="play"
        tone="play"
        loading={!data}
        breathing={breathing && Boolean(data)}
        onPress={
          attempt
            ? playFree
            : () => navigation.navigate('Game', { mode: 'daily' })
        }
      />
      {attempt ? null : (
        <Button
          label="Serbest oyna"
          tone="secondary"
          size="lg"
          onPress={playFree}
        />
      )}
    </View>
  );
}

/**
 * The event's stage: the brand's magenta-to-violet slab in the outline,
 * standing on its lip like every tile, with light from the top and lanes
 * across it.
 */
function Stage({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.stageShell, { borderColor: theme.outline }]}>
      <BrandBand style={styles.stage}>{children}</BrandBand>
    </View>
  );
}

/**
 * What today's attempt came to when it has no place to show: held for a
 * look, failed a check, still on its way, abandoned — or ranked without a
 * point, which places nobody.
 */
const ATTEMPT_TAG: Record<
  Exclude<DailyAttempt['status'], 'ranked'> | 'unplaced',
  { label: string; tone: TagTone; icon: IconName }
> = {
  review: { label: 'Skorun inceleniyor', tone: 'secondary', icon: 'eye' },
  flagged: {
    label: 'Doğrulanamadı, tabloya girmedi',
    tone: 'warn',
    icon: 'alert',
  },
  unfinished: {
    label: 'Sonucun henüz gelmedi',
    tone: 'neutral',
    icon: 'hourglass',
  },
  void: { label: 'Bugünkü tur sayılmadı', tone: 'neutral', icon: 'close' },
  unplaced: { label: 'Tabloya girmedi', tone: 'neutral', icon: 'info' },
};

function Attempt({
  attempt,
  players,
  onOpenDaily,
}: {
  attempt: DailyAttempt;
  players: number;
  onOpenDaily: () => void;
}) {
  const theme = useTheme();
  const shareText = attempt.shareText;
  const placed = attempt.status === 'ranked' && attempt.rank !== null;
  const tag =
    attempt.status === 'ranked'
      ? placed
        ? null
        : ATTEMPT_TAG.unplaced
      : ATTEMPT_TAG[attempt.status];

  return (
    <View style={styles.attempt}>
      {attempt.score === null ? null : (
        <>
          <Text style={[TYPE.label, { color: withAlpha(theme.onBrand, 0.85) }]}>
            Bugünkü skorun
          </Text>
          <Stamp delay={120}>
            <Text style={[styles.attemptScore, { color: theme.gold }, embossed(3)]}>
              {formatScore(attempt.score)}
            </Text>
          </Stamp>
        </>
      )}
      {placed ? (
        <Txt variant="heading" tone="onSolid" align="center">
          {`${formatRank(attempt.rank)} / ${formatScore(players)} oyuncu`}
        </Txt>
      ) : null}
      {tag ? (
        <View style={styles.centred}>
          <Tag label={tag.label} tone={tag.tone} icon={tag.icon} />
        </View>
      ) : null}
      <View style={styles.actions}>
        {shareText ? (
          <Button
            label="Paylaş"
            icon="share"
            tone="primary"
            size="md"
            style={styles.flex}
            onPress={() => void Share.share({ message: shareText })}
          />
        ) : null}
        <Button
          label="Sıralamayı gör"
          icon="podium"
          tone="secondary"
          size="md"
          style={styles.flex}
          onPress={onOpenDaily}
        />
      </View>
    </View>
  );
}

/**
 * This week's league: your tier, place and zone, and how long the week has
 * left — or, before your first ranked run, the invitation to take a seat.
 */
function LeagueDoor({
  league,
  onPress,
}: {
  league: UseQueryResult<LeagueResponse>;
  onPress: () => void;
}) {
  const data = league.data;

  if (!data) {
    return (
      <LobbyCard
        title="Lig"
        eyebrow="BU HAFTA"
        icon="shield"
        tone="secondary"
        onPress={onPress}
      >
        {league.isError ? (
          <Txt variant="meta" tone="muted">
            {messageFor(league.error)}
          </Txt>
        ) : (
          <Skeleton height={14} width="60%" />
        )}
      </LobbyCard>
    );
  }

  const me = data.joined ? data.me : null;
  const progress = data.nextRankProgress;

  return (
    <LobbyCard
      title="Lig"
      eyebrow="BU HAFTA"
      icon="shield"
      tone="secondary"
      right={<TierBadge tier={data.tier} size="lg" showLabel />}
      onPress={onPress}
    >
      {me ? (
        <>
          <Txt variant="title" style={styles.leagueLine}>
            {`${formatRank(me.rank)}/${formatScore(data.members.length)} · ${formatScore(me.points)} puan`}
          </Txt>
          {progress === null ? null : <Meter value={progress / 1000} tone="ok" />}
          <View style={styles.chips}>
            <ZoneTag league={data} me={me} />
            <CountdownChip
              endsAt={data.endsAt}
              serverTime={data.serverTime}
              prefix="Bitmesine"
              onElapsed={() => void league.refetch()}
            />
          </View>
        </>
      ) : (
        <>
          <Txt variant="body" tone="muted">
            Bu hafta ilk turunu oyna, ligine katıl.
          </Txt>
          <CountdownChip
            endsAt={data.endsAt}
            serverTime={data.serverTime}
            prefix="Bitmesine"
            onElapsed={() => void league.refetch()}
          />
        </>
      )}
    </LobbyCard>
  );
}

function ZoneTag({ league, me }: { league: LeagueResponse; me: LeagueMember }) {
  if (me.zone === 'promote') {
    return <Tag label="Terfi bölgesindesin" tone="ok" icon="trendUp" />;
  }
  if (me.zone === 'demote') {
    return <Tag label="Düşme bölgesindesin" tone="bad" icon="trendDown" />;
  }
  const gap = league.promotionGap;
  return gap === null ? (
    <Tag label="Güvendesin" tone="neutral" icon="check" />
  ) : (
    <Tag
      label={`Terfiye ${formatGap(gap)} puan`}
      tone="secondary"
      icon="arrowUp"
    />
  );
}

/**
 * The player right above you on this week's board and the points it takes
 * to pass them — the API's `gap`, where a tie goes to whoever got there
 * first — set as a face-off: you, VS, them.
 */
function RivalDoor({
  name,
  rival,
  onPlay,
}: {
  name: string;
  rival: LeaderboardResponse['rival'];
  onPlay: () => void;
}) {
  const theme = useTheme();
  if (!rival) return null;
  return (
    <LobbyCard title="Hedefin" eyebrow="BU HAFTA" icon="target" tone="warn">
      <View style={styles.versus}>
        <Avatar name={name} tone="primary" size="lg" />
        <Text style={[styles.vs, { color: theme.gold }, embossed(3)]}>VS</Text>
        <Avatar name={rival.entry.username} tone="secondary" size="lg" />
      </View>
      <Txt variant="title" align="center">
        {`@${dativeOf(rival.entry.username)} ${formatGap(rival.gap)} puan`}
      </Txt>
      <Txt variant="meta" tone="muted" align="center">
        {`@${rival.entry.username} haftalık sıralamada hemen önünde.`}
      </Txt>
      <Button
        label="Geç onu"
        icon="play"
        tone="primary"
        size="md"
        onPress={onPlay}
      />
    </LobbyCard>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  scroll: { gap: SPACE.lg, paddingBottom: SPACE.xxl, paddingHorizontal: SPACE.lg },
  player: { alignItems: 'center', flexDirection: 'row', gap: SPACE.md },
  playerText: { flex: 1, gap: 1 },
  tierPin: { bottom: -8, position: 'absolute', right: -8 },
  heroBlock: { gap: SPACE.md },
  stageShell: {
    borderBottomWidth: DEPTH.outline + DEPTH.lip,
    borderRadius: RADIUS.overlay,
    borderWidth: DEPTH.outline,
    overflow: 'hidden',
  },
  stage: {
    alignItems: 'center',
    gap: SPACE.xs,
    paddingBottom: SPACE.lg,
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.lg,
  },
  heroTitle: { marginTop: SPACE.xs },
  fan: {
    flexDirection: 'row',
    gap: SPACE.sm,
    justifyContent: 'center',
    marginBottom: SPACE.sm,
    marginTop: SPACE.md,
  },
  reel: {
    alignItems: 'center',
    borderBottomWidth: DEPTH.outline + 3,
    borderRadius: 14,
    borderWidth: DEPTH.outline,
    height: 76,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 54,
  },
  reelShine: { height: '40%', left: 0, position: 'absolute', right: 0, top: 0 },
  centred: { alignSelf: 'center', marginTop: SPACE.xs },
  attempt: {
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: SPACE.xs,
    marginTop: SPACE.md,
  },
  attemptScore: { fontFamily: FONT.display, fontSize: 46, lineHeight: 54 },
  actions: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: SPACE.sm,
    marginTop: SPACE.sm,
  },
  leagueLine: { fontSize: 19 },
  chips: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.sm,
  },
  versus: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACE.lg,
    justifyContent: 'center',
    marginVertical: SPACE.xs,
  },
  vs: { fontFamily: FONT.display, fontSize: 26, lineHeight: 30 },
});
