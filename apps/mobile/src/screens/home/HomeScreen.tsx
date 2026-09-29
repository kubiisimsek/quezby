import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import {
  useIsFocused,
  type CompositeScreenProps,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type {
  DailyAttempt,
  DailyResponse,
  InboxSummary,
  LeaderboardResponse,
  RatingResponse,
  WaitingDuel,
} from '@quezby/types';
import type { UseQueryResult } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
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
import { useSession } from '@/auth/session';
import { CredentialsSheet } from '@/components/CredentialsSheet';
import { ModeSheet } from '@/components/ModeSheet';
import { SignInWaysSheet } from '@/components/SignInWaysSheet';
import { APP_PLATFORM } from '@/config/env';
import { deviceFailed as deviceFailedWords } from '@/game/howTo';
import { useDaily, useLeaderboard, useRating } from '@/hooks/useBoards';
import { useMe } from '@/hooks/useMe';
import { useDeclineDuel, useInboxSummary } from '@/hooks/useSocial';
import { handle, useT } from '@/i18n';
import type { PlayMode } from '@/i18n/messages/modes';
import { messageFor } from '@/lib/errors';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import { deviceFailed, useDeviceVerdict } from '@/stores/deviceVerdict';
import { useOnboarding } from '@/stores/onboarding';
import { useSettings } from '@/stores/settings';
import { type IconName } from '@/ui/icons';
import {
  Arena,
  Avatar,
  Button,
  ConsentCard,
  CountdownChip,
  IconButton,
  Meter,
  NoticeCard,
  RankChips,
  Skeleton,
  SwipePlay,
  Tag,
  TierBadge,
  Txt,
  type TagTone,
} from '@/ui/kit';
import { useEntrance } from '@/ui/motion';
import { FONT, SPACE, TYPE, embossed, lh, useTheme } from '@/ui/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

type Navigation = Props['navigation'];

/** How far the dock's gold orb rises into the screen: the play slab stands clear of it. */
const ORB_RISE = 34;

/**
 * The game lobby, drawn as the phone's lock screen — Quezby is the phone
 * habit turned into a game. Up top, you, the bell (Bildirimler, with what
 * you have not seen yet) and Yardım. Where a lock screen keeps the time, the
 * lobby keeps your season best, with your places under it. What waits for you
 * comes in as notifications, all the same size: a friend's VS (with ✓ and ✗),
 * today's feed, the league, the player to pass. At the bottom, where the
 * phone says "swipe up", the one gold slab: tap it, or swipe it up, to play.
 * Every number is the API's.
 */
export function HomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const user = useSession((state) => state.user);
  const ranks = useSession((state) => state.ranks);
  const userId = user?.id ?? null;
  const unranked = useDeviceVerdict((state) => deviceFailed(state, userId));
  const me = useMe();
  const daily = useDaily();
  const rating = useRating();
  const weekly = useLeaderboard('weekly', 'everyone', 3);
  const inbox = useInboxSummary();
  const remindersRead = useOnboarding((state) => state.hydrated);
  const remindedFor = useOnboarding((state) => state.remindedFor);
  const [keep, setKeep] = useState<'ways' | 'email' | null>(null);
  const settingsRead = useSettings((state) => state.hydrated);
  // A phone that never saw the question — installed before it existed — is asked once, here.
  const asking = useSettings((state) => state.hydrated && state.consent === 'unasked');
  /** The email form waits for the ways sheet to leave the screen. */
  const toEmail = useRef(false);
  const placed = rating.data?.placed === true;

  // A guest who has just been placed in a league has something to lose: ask
  // once to keep the account. Never over the game's result — only here.
  // After the usage question, never on top of it.
  useEffect(() => {
    if (!focused || !remindersRead || !settingsRead || asking || !placed || !user?.isGuest) return;
    if (remindedFor === user.id) return;
    useOnboarding.getState().markReminded(user.id);
    track('protect_reminder');
    setKeep('ways');
  }, [asking, focused, placed, remindedFor, remindersRead, settingsRead, user?.id, user?.isGuest]);

  const strip = useEntrance(0, 10);
  const clock = useEntrance(1, 16);
  const vsIn = useEntrance(2);
  const dailyIn = useEntrance(3);
  const leagueIn = useEntrance(4);
  const rivalIn = useEntrance(5);

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
        rating.refetch(),
        weekly.refetch(),
        inbox.refetch(),
      ]);
    } finally {
      setPulling(false);
    }
  };

  const tier = rating.data?.tier ?? null;
  const best = user?.best ?? null;
  const playFree = () => navigation.navigate('Game', { mode: 'free' });

  // The gold slab opens the modes; a used daily opens the day's board instead.
  const [choosing, setChoosing] = useState(false);
  const dailyPlayed = Boolean(daily.data?.attempt);
  const playMode = (mode: PlayMode) => {
    if (mode === 'daily' && dailyPlayed) navigation.navigate('Daily');
    else navigation.navigate('Game', { mode });
  };

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
            <Avatar name={user?.username ?? '?'} src={user?.avatarUrl} tone="primary" size="lg" />
            {tier ? (
              <View style={styles.tierPin}>
                <TierBadge tier={tier} size="sm" />
              </View>
            ) : null}
          </View>
          <View style={styles.playerText}>
            <Txt variant="title" numberOfLines={1}>
              {user?.username ? handle(user.username) : null}
            </Txt>
            {tier ? (
              <Txt variant="micro" tone="muted">
                {t.tiers.league(tier)}
              </Txt>
            ) : null}
          </View>
          <IconButton
            icon="bell"
            label={t.alerts.title}
            badge={inbox.data?.notifications ?? 0}
            onPress={() => navigation.navigate('Alerts')}
          />
          <IconButton
            icon="help"
            label={t.home.help}
            onPress={() => navigation.navigate('Help')}
          />
        </Animated.View>

        <Animated.View style={[styles.clock, clock]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              best ? t.friends.best.said(t.fmt.score(best.score)) : t.home.records.title
            }
            onPress={() => navigation.navigate('Leaderboard')}
            style={styles.clockFace}
          >
            <Text style={[TYPE.label, { color: theme.inkMuted }]}>{t.home.clock.label}</Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.record, { color: best ? theme.gold : theme.inkFaint }, embossed(3)]}
            >
              {best ? t.fmt.score(best.score) : '—'}
            </Text>
          </Pressable>
          <RankChips
            items={[
              { label: t.home.records.boards.weekly, rank: ranks?.weekly },
              { label: t.home.records.boards.monthly, rank: ranks?.monthly },
              { label: t.home.records.boards.all, rank: ranks?.all },
            ]}
          />
        </Animated.View>

        {asking ? (
          <Animated.View style={clock}>
            <ConsentCard onAnswer={(yes) => useSettings.getState().answer(yes)} />
          </Animated.View>
        ) : null}

        {unranked ? (
          <Animated.View style={clock}>
            <DeviceNotice />
          </Animated.View>
        ) : null}

        {inbox.data && inbox.data.waiting.length > 0 ? (
          <Animated.View style={[styles.stack, vsIn]}>
            <VsNotices inbox={inbox} navigation={navigation} />
          </Animated.View>
        ) : null}

        <Animated.View style={dailyIn}>
          <DailyNotice daily={daily} navigation={navigation} />
        </Animated.View>

        <Animated.View style={leagueIn}>
          <LeagueNotice rating={rating} onPress={() => navigation.navigate('League')} />
        </Animated.View>

        <Animated.View style={rivalIn}>
          <RivalNotice
            rival={weekly.data?.rival ?? null}
            onPlay={() => {
              track('rival');
              playFree();
            }}
          />
        </Animated.View>
      </ScrollView>

      <View style={styles.unlock}>
        <SwipePlay
          label={t.nav.tabs.play}
          hint={t.home.swipe}
          breathing={focused && !choosing}
          onPlay={() => setChoosing(true)}
        />
      </View>

      <ModeSheet
        open={choosing}
        onClose={() => setChoosing(false)}
        rating={rating.data}
        dailyPlayed={dailyPlayed}
        onPick={playMode}
      />

      <SignInWaysSheet
        open={keep === 'ways'}
        description={t.home.protect}
        onClose={() => setKeep(null)}
        onEmail={() => {
          toEmail.current = true;
          setKeep(null);
        }}
        onClosed={() => {
          if (!toEmail.current) return;
          toEmail.current = false;
          setKeep('email');
        }}
      />
      <CredentialsSheet open={keep === 'email'} guest onClose={() => setKeep(null)} />
    </View>
  );
}

/**
 * The API's check came back against this phone — rooted, an emulator, a
 * changed app. It plays on, but its runs never rank; the lobby says so
 * before a game starts, as the result of every run does.
 */
function DeviceNotice() {
  const t = useT();
  return (
    <NoticeCard
      eyebrow={t.home.device.eyebrow}
      title={t.home.device.title}
      icon="alert"
      tone="warn"
      meta={
        <Txt variant="meta" tone="muted">
          {t.home.device.body(deviceFailedWords(t).why[APP_PLATFORM])}
        </Txt>
      }
    />
  );
}

/**
 * The VS waiting for you, the one running out first on top: ✓ plays it —
 * playing it is the answer — and ✗ turns it down. The friend opens the
 * conversation. Past three, a line counts the rest and opens the inbox.
 */
function VsNotices({
  inbox,
  navigation,
}: {
  inbox: UseQueryResult<InboxSummary>;
  navigation: Navigation;
}) {
  const t = useT();
  const data = inbox.data;
  if (!data) return null;
  const more = data.yourTurn - data.waiting.length;
  return (
    <>
      {data.waiting.map((duel) => (
        <VsNotice
          key={duel.id}
          duel={duel}
          serverTime={data.serverTime}
          onElapsed={() => void inbox.refetch()}
          navigation={navigation}
        />
      ))}
      {more > 0 ? (
        <Button
          label={t.vs.notice.more(more, t.fmt.score(more))}
          tone="ghost"
          size="sm"
          icon="message"
          onPress={() => navigation.navigate('Inbox')}
        />
      ) : null}
    </>
  );
}

function VsNotice({
  duel,
  serverTime,
  onElapsed,
  navigation,
}: {
  duel: WaitingDuel;
  serverTime: string;
  onElapsed: () => void;
  navigation: Navigation;
}) {
  const t = useT();
  const { opponent } = duel;
  const decline = useDeclineDuel(opponent.username);
  const name = handle(opponent.username);
  return (
    <NoticeCard
      eyebrow={t.vs.notice.eyebrow}
      title={t.vs.notice.title(name)}
      lead={<Avatar name={opponent.username} src={opponent.avatarUrl} size="md" />}
      accessibilityLabel={t.vs.notice.label(name)}
      meta={
        decline.isError ? (
          messageFor(decline.error, t)
        ) : (
          <CountdownChip
            endsAt={duel.expiresAt}
            serverTime={serverTime}
            prefix={t.home.countdown.endsIn}
            onElapsed={onElapsed}
          />
        )
      }
      onPress={() => navigation.navigate('Thread', { username: opponent.username })}
      right={
        <>
          <IconButton
            icon="check"
            tone="ok"
            size="sm"
            label={t.friends.relation.accept}
            disabled={decline.isPending}
            onPress={() =>
              navigation.navigate('Game', { mode: 'vs', opponent: opponent.username, duelId: duel.id })
            }
          />
          <IconButton
            icon="close"
            tone="danger"
            size="sm"
            label={t.friends.relation.decline}
            loading={decline.isPending}
            onPress={() => decline.mutate(duel.id)}
          />
        </>
      }
    />
  );
}

/**
 * What today's attempt came to when it has no place to show: held for a
 * look, failed a check, still on its way, abandoned — or ranked without a
 * point, which places nobody. Its words are `t.home.today.tags`.
 */
type AttemptTag = Exclude<DailyAttempt['status'], 'ranked'> | 'unplaced';

const ATTEMPT_TAG: Record<AttemptTag, { tone: TagTone; icon: IconName }> = {
  review: { tone: 'secondary', icon: 'eye' },
  flagged: { tone: 'warn', icon: 'alert' },
  unfinished: { tone: 'neutral', icon: 'hourglass' },
  void: { tone: 'neutral', icon: 'close' },
  unplaced: { tone: 'neutral', icon: 'info' },
};

function tagOf(attempt: DailyAttempt): AttemptTag | null {
  if (attempt.status !== 'ranked') return attempt.status;
  return attempt.rank === null ? 'unplaced' : null;
}

/**
 * "Günün akışı": everyone's same feed, one attempt — one notice among the
 * others. Open, it counts down to the end of the day with a small Oyna;
 * played, it is your place and score, and counts down to the next feed. The
 * whole day — its board, sharing — is behind it on the Daily screen.
 */
function DailyNotice({
  daily,
  navigation,
}: {
  daily: UseQueryResult<DailyResponse>;
  navigation: Navigation;
}) {
  const theme = useTheme();
  const t = useT();
  const data = daily.data;
  const openDaily = () => navigation.navigate('Daily');

  if (!data) {
    return (
      <NoticeCard
        eyebrow={t.daily.ribbon}
        title={daily.isError ? messageFor(daily.error, t) : t.daily.rule}
        icon="calendar"
        meta={daily.isError ? undefined : <Skeleton height={14} width={120} />}
        right={
          daily.isError ? (
            <IconButton icon="refresh" label={t.nav.retry} size="sm" onPress={() => void daily.refetch()} />
          ) : undefined
        }
      />
    );
  }

  const attempt = data.attempt;
  const countdown = (
    <CountdownChip
      endsAt={data.endsAt}
      serverTime={data.serverTime}
      prefix={attempt ? t.daily.nextIn : t.home.countdown.endsIn}
      onElapsed={() => void daily.refetch()}
    />
  );
  const eyebrow = t.home.notice.daily(t.fmt.score(data.number));

  if (!attempt) {
    return (
      <NoticeCard
        eyebrow={eyebrow}
        title={t.daily.rule}
        icon="calendar"
        meta={countdown}
        onPress={openDaily}
        right={
          <Button
            label={t.home.notice.play}
            accessibilityLabel={t.home.notice.playLabel}
            tone="primary"
            size="sm"
            onPress={() => navigation.navigate('Game', { mode: 'daily' })}
          />
        }
      />
    );
  }

  const tag = tagOf(attempt);
  return (
    <NoticeCard
      eyebrow={eyebrow}
      title={
        tag
          ? t.home.today.tags[tag]
          : t.home.today.placed(t.fmt.rank(attempt.rank), data.players, t.fmt.score(data.players))
      }
      icon={tag ? ATTEMPT_TAG[tag].icon : 'calendar'}
      tone={tag ? ATTEMPT_TAG[tag].tone : 'primary'}
      meta={countdown}
      onPress={openDaily}
      right={
        attempt.score === null ? undefined : (
          <Text style={[styles.score, { color: theme.gold }, embossed(2)]}>
            {t.fmt.score(attempt.score)}
          </Text>
        )
      }
    />
  );
}

/**
 * Your league: its emblem, your Elo and the score your next run has to beat
 * — or, while the first rated runs place you, how many are played; or, while
 * Dereceli is shut, how many Normal and Günlük games still open it.
 */
function LeagueNotice({
  rating,
  onPress,
}: {
  rating: UseQueryResult<RatingResponse>;
  onPress: () => void;
}) {
  const t = useT();
  const data = rating.data;
  const eyebrow = t.home.notice.league;

  if (!data) {
    return (
      <NoticeCard
        eyebrow={eyebrow}
        title={rating.isError ? messageFor(rating.error, t) : t.home.league.title}
        icon="shield"
        tone="secondary"
        meta={rating.isError ? undefined : <Skeleton height={14} width={120} />}
        onPress={onPress}
      />
    );
  }

  if (data.unlock) {
    const { required, remaining } = data.unlock;
    return (
      <NoticeCard
        eyebrow={t.modes.ribbon}
        title={t.modes.lockedTitle(remaining)}
        icon="lock"
        tone="secondary"
        meta={
          <View style={styles.meter}>
            <Meter value={(required - remaining) / required} tone="secondary" />
          </View>
        }
        onPress={onPress}
      />
    );
  }

  if (!data.placed || data.rating === null || data.tier === null) {
    const placement = data.placement ?? { played: 0, required: 1 };
    return (
      <NoticeCard
        eyebrow={t.rating.placement.ribbon}
        title={t.rating.placement.title(placement.played, placement.required)}
        icon="flag"
        tone="secondary"
        meta={
          <View style={styles.meter}>
            <Meter value={placement.played / placement.required} tone="secondary" notches={placement.required} />
          </View>
        }
        onPress={onPress}
      />
    );
  }

  return (
    <NoticeCard
      eyebrow={eyebrow}
      title={t.home.league.rated(t.tiers.league(data.tier), t.rating.elo(t.fmt.score(data.rating)))}
      icon="shield"
      tone="secondary"
      meta={
        data.target === null ? undefined : (
          <Tag label={t.rating.target(t.fmt.score(data.target))} tone="secondary" icon="target" />
        )
      }
      right={<TierBadge tier={data.tier} size="md" />}
      onPress={onPress}
    />
  );
}

/**
 * The player right above you on this week's board and the points it takes
 * to pass them — the API's `gap`, where a tie goes to whoever got there
 * first — with the one action on a rival: Geç onu.
 */
function RivalNotice({
  rival,
  onPlay,
}: {
  rival: LeaderboardResponse['rival'];
  onPlay: () => void;
}) {
  const t = useT();
  if (!rival) return null;
  const { entry } = rival;
  return (
    <NoticeCard
      eyebrow={t.home.notice.rival}
      title={t.home.rival.gap(entry.username, rival.gap, t.fmt.gap(rival.gap))}
      lead={<Avatar name={entry.username} src={entry.avatarUrl} size="md" />}
      meta={t.home.rival.ahead(entry.username)}
      right={<Button label={t.home.rival.pass} tone="primary" size="sm" onPress={onPlay} />}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { gap: SPACE.md, paddingBottom: SPACE.xl, paddingHorizontal: SPACE.lg },
  player: { alignItems: 'center', flexDirection: 'row', gap: SPACE.md },
  playerText: { flex: 1, gap: 1 },
  tierPin: { bottom: -8, position: 'absolute', right: -8 },
  clock: { gap: SPACE.md, paddingBottom: SPACE.sm, paddingTop: SPACE.lg },
  clockFace: { alignItems: 'center', gap: SPACE.xxs },
  record: { fontFamily: FONT.display, fontSize: 64, lineHeight: lh(72) },
  stack: { gap: SPACE.sm },
  score: { fontFamily: FONT.display, fontSize: 22, lineHeight: lh(26) },
  meter: { alignSelf: 'stretch', paddingTop: SPACE.xs },
  unlock: {
    gap: SPACE.sm,
    paddingBottom: ORB_RISE + SPACE.xs,
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.sm,
  },
});
