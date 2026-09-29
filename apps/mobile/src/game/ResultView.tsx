import type { ReelKind, RunSummary } from '@quezby/engine';
import type {
  DailyResult,
  DuelSide,
  DuelView,
  FinishRunResponse,
  LeaderboardPeriod,
  LeagueUnlock,
  PassedPlayer,
  RankChange,
  RunMode,
  RunRating,
  RunResult,
} from '@quezby/types';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
  type WithTimingConfig,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { track } from '@/analytics/track';
import { useSession } from '@/auth/session';
import { PushNudge } from '@/components/PushNudge';
import { APP_PLATFORM } from '@/config/env';
import { BONUS_ORDER, deviceFailed, reelGuide } from '@/game/howTo';
import type { Outcome } from '@/game/useGame';
import { handle, ltr, useT, type Messages } from '@/i18n';
import { IS_RTL, SHRINK_TO_FIT } from '@/i18n/native';
import { tierMove } from '@/lib/tiers';
import { Icon, type IconName } from '@/ui/icons';
import {
  Avatar,
  BonusChip,
  BrandBand,
  Button,
  Callout,
  Confetti,
  CountdownChip,
  CountUp,
  Eyebrow,
  FaceOff,
  IconChip,
  LitEdge,
  Meter,
  Panel,
  Ribbon,
  Screen,
  ShareGrid,
  Stamp,
  StatGrid,
  Tag,
  TierBadge,
  Txt,
  Shine,
  gemColors,
  useShake,
  type ButtonTone,
  type StatItem,
} from '@/ui/kit';
import { SPRING_POP } from '@/ui/motion';
import {
  DEPTH,
  FONT,
  RADIUS,
  SPACE,
  TYPE,
  embossed,
  lh,
  tracking,
  useTheme,
  withAlpha,
} from '@/ui/theme';

const PERIODS: readonly LeaderboardPeriod[] = ['weekly', 'monthly', 'all'];

/**
 * The result's sequence, in ms from the moment it opens: the score slams in
 * and climbs, a record lands as the count does, each tile follows the one
 * above it, and the buttons come last.
 */
const BEAT = {
  score: 120,
  /** `CountUp`'s own climb. */
  count: 900,
  /** After the count: the record banner, or the season best. */
  crown: 80,
  /** After the crown: the banner has hit, the confetti goes. */
  burst: 150,
  /** A record's moment before the tiles. */
  pause: 260,
  tile: 100,
  /** Between the stamps or rows inside one tile. */
  inner: 90,
  /** A climbed rank hops once its tile has landed. */
  hop: 300,
  dock: 60,
  /** The dock's slide — then the sequence is over. */
  settle: 420,
} as const;

/** The kit's burst lasts two seconds; then it is taken down. */
const CONFETTI_MS = 2100;

const RISE: WithTimingConfig = {
  duration: 320,
  easing: Easing.out(Easing.cubic),
};
const CLIMB: WithTimingConfig = {
  duration: 380,
  easing: Easing.out(Easing.back(1.5)),
};
const SLIDE: WithTimingConfig = {
  duration: 360,
  easing: Easing.out(Easing.cubic),
};

type Section =
  | 'status'
  | 'vs'
  | 'daily'
  | 'rating'
  | 'breakdown'
  | 'stats'
  | 'unseen'
  | 'ranks'
  | 'passed'
  | 'league';

type Plan = {
  crown: number;
  burst: number | null;
  at: Record<Section, number>;
  dock: number;
  end: number;
};

/**
 * When each part of this result arrives. Only what is shown takes a beat.
 * The burst goes off for a record as it lands, or — without one — as the
 * tile of a party lands: a new league, or Dereceli opening.
 */
function choreograph(
  shown: readonly Section[],
  counting: boolean,
  record: boolean,
  party: 'rating' | 'league' | null = null,
): Plan {
  const crown = BEAT.score + (counting ? BEAT.count : 0) + BEAT.crown;
  const at: Record<Section, number> = {
    status: 0,
    vs: 0,
    daily: 0,
    rating: 0,
    breakdown: 0,
    stats: 0,
    unseen: 0,
    ranks: 0,
    passed: 0,
    league: 0,
  };
  let clock = crown + (record ? BEAT.pause : BEAT.tile);
  for (const section of shown) {
    at[section] = clock;
    clock += BEAT.tile;
  }
  const dock = clock + BEAT.dock;
  return {
    crown,
    burst: record ? crown + BEAT.burst : party ? at[party] + BEAT.hop : null,
    at,
    dock,
    end: dock + BEAT.settle,
  };
}

type Note = { tone: 'info' | 'warn' | 'bad'; title: string; body: string };

/** What a result that is not a plain ranked run has to say about itself. */
function noteFor(outcome: Outcome, t: Messages): Note | null {
  const notes = t.result.notes;
  if (outcome.mode === 'unsent') {
    return {
      tone: 'bad',
      title: notes.unsent.title,
      body: outcome.canRetry ? notes.unsent.retry(outcome.message) : outcome.message,
    };
  }
  if (outcome.mode === 'practice') {
    if (outcome.reason === 'tutorial') {
      return { tone: 'info', title: notes.tutorial.title, body: notes.tutorial.body };
    }
    return {
      tone: 'info',
      title: notes.practice.title,
      body: outcome.reason === 'outdated' ? notes.practice.outdated : notes.practice.offline,
    };
  }
  if (outcome.response.run.flagReason === 'device') {
    const failed = deviceFailed(t);
    return { tone: 'warn', title: failed.title, body: notes.device(failed.why[APP_PLATFORM]) };
  }
  switch (outcome.response.run.status) {
    case 'review':
      return { tone: 'info', title: t.daily.attempt.review.title, body: notes.review };
    case 'flagged':
      return { tone: 'warn', title: notes.flagged.title, body: notes.flagged.body };
    default:
      return null;
  }
}

/**
 * The end of a run. A ranked run shows only what the API answered — the
 * score its replay found, the ranks, the league, the daily card; the phone's
 * own count never reaches this screen. Practice runs, which the API never
 * sees, show the engine's summary under a "practice" label. A new player's
 * practice run ("DENEME TURU") also shows the kinds it ended before, and
 * leads on (`onContinue`) instead of home. A VS run leads with its VS — sent
 * with the score kept from the friend, or won, lost, drawn — and its way on
 * is the rematch, or back to the conversation; it has no ranks to show and
 * nothing to share.
 *
 * It arrives as a sequence: the score slams in and counts up, a new record
 * lands in gold with confetti, the tiles follow and the buttons come last. A
 * touch anywhere while it plays jumps everything to its end; a phone set to
 * reduce motion gets the end straight away.
 */
export function ResultView({
  outcome,
  mode,
  onReplay,
  onPlayFree,
  onRematch,
  onThread,
  onClose,
  onRetrySubmit,
  onOpenDaily,
  onContinue,
}: {
  outcome: Outcome;
  mode: RunMode;
  onReplay: () => void;
  onPlayFree: () => void;
  /** After a VS: another one with the same friend. */
  onRematch?: () => void;
  /** After a VS: the conversation with the friend. */
  onThread?: () => void;
  onClose: () => void;
  onRetrySubmit: () => void;
  onOpenDaily: () => void;
  /** After a new player's practice run: on to the ways in. */
  onContinue?: () => void;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const verified = outcome.mode === 'verified' ? outcome.response : null;
  const run = verified?.run ?? null;
  const practice = outcome.mode === 'practice' ? outcome.summary : null;
  const tutorial = outcome.mode === 'practice' && outcome.reason === 'tutorial';
  const unseen = outcome.mode === 'practice' ? (outcome.unseen ?? []) : [];
  const score = run?.score ?? practice?.score ?? null;
  const endedBy = run?.endedBy ?? practice?.endedBy ?? null;
  const ranked = run?.status === 'ranked';
  const record = Boolean(verified?.isNewBest) && ranked;
  const note = noteFor(outcome, t);

  const duel = verified?.duel ?? null;
  const shown: Section[] = [];
  if (note) shown.push('status');
  if (duel) shown.push('vs');
  if (verified?.daily) shown.push('daily');
  if (verified?.rating) shown.push('rating');
  if (verified) shown.push('breakdown');
  if (verified || practice) shown.push('stats');
  if (unseen.length > 0) shown.push('unseen');
  if (verified && ranked) shown.push('ranks');
  if (verified && verified.passed.length > 0) shown.push('passed');
  if (verified?.leagueUnlock) shown.push('league');
  const rating = verified?.rating ?? null;
  const promotion =
    rating !== null &&
    rating.after !== null &&
    (rating.kind === 'placement' || tierMove(rating.tierBefore, rating.tier) === 'up');
  const opened = verified?.leagueUnlock?.remaining === 0;
  const plan = choreograph(
    shown,
    score !== null,
    record,
    promotion ? 'rating' : opened ? 'league' : null,
  );

  const [skipped, setSkipped] = useState(reduced);
  const [playing, setPlaying] = useState(!reduced);
  const [burst, setBurst] = useState(false);
  const [dockHeight, setDockHeight] = useState(0);

  useEffect(() => {
    if (skipped) return;
    const timers = [setTimeout(() => setPlaying(false), plan.end)];
    if (plan.burst !== null) {
      timers.push(setTimeout(() => setBurst(true), plan.burst));
      timers.push(setTimeout(() => setBurst(false), plan.burst + CONFETTI_MS));
    }
    return () => timers.forEach(clearTimeout);
  }, [plan.burst, plan.end, skipped]);

  /** Sees every touch first and lets it through — the tap still scrolls or presses. */
  const skipOnTouch = playing
    ? () => {
        setSkipped(true);
        setPlaying(false);
        return false;
      }
    : undefined;

  const dock = t.result.dock;
  const main: DockAction & { icon: IconName } =
    tutorial && onContinue
      ? { label: dock.continue, icon: 'check', tone: 'primary', onPress: onContinue }
      : outcome.mode === 'unsent' && outcome.canRetry
        ? { label: dock.resend, icon: 'refresh', tone: 'play', onPress: onRetrySubmit }
        : mode === 'vs' && duel?.status === 'waiting' && onThread
          ? { label: t.vs.result.toThread, icon: 'message', tone: 'primary', onPress: onThread }
          : mode === 'vs' && onRematch
            ? { label: t.vs.result.rematch, icon: 'swords', tone: 'play', onPress: onRematch }
            : mode === 'daily'
              ? { label: t.home.today.free, icon: 'play', tone: 'play', onPress: onPlayFree }
              : { label: dock.replay, icon: 'play', tone: 'play', onPress: onReplay };
  const leave: DockAction =
    tutorial && onContinue
      ? { label: dock.practiceAgain, tone: 'secondary', onPress: onReplay }
      : mode === 'vs' && duel?.status !== 'waiting' && onThread
        ? { label: t.vs.result.toThread, tone: 'secondary', onPress: onThread }
        : { label: dock.home, tone: 'ghost', onPress: onClose };
  const shareText = verified?.shareText ?? null;

  return (
    <Screen>
      <View
        testID="result"
        style={styles.fill}
        onStartShouldSetResponderCapture={skipOnTouch}
      >
        <ScrollView
          style={styles.fill}
          contentContainerStyle={{ paddingBottom: dockHeight + SPACE.xl }}
          showsVerticalScrollIndicator={false}
        >
          <Stage
            top={insets.top}
            endedBy={endedBy}
            score={score}
            practice={practice === null ? null : tutorial ? 'tutorial' : 'practice'}
            record={record}
            best={verified?.best?.score ?? null}
            crownAt={plan.crown}
            skipped={skipped}
          />

          <View style={styles.body}>
            {note ? (
              <Rise at={plan.at.status} skipped={skipped}>
                <Callout tone={note.tone} title={note.title}>
                  {note.body}
                </Callout>
              </Rise>
            ) : null}

            {verified ? (
              <Verified
                response={verified}
                plan={plan}
                skipped={skipped}
                onOpenDaily={onOpenDaily}
              />
            ) : null}

            {practice ? (
              <Rise at={plan.at.stats} skipped={skipped}>
                <StatGrid
                  columns={3}
                  items={[
                    {
                      label: t.result.stats.posts,
                      value: t.fmt.score(practice.reels),
                      icon: 'arrowUp',
                    },
                    {
                      label: t.result.stats.accuracy,
                      value: t.fmt.perMille(practice.accuracy),
                      icon: 'check',
                    },
                    {
                      label: t.result.stats.maxCombo,
                      value: t.fmt.combo(practice.maxCombo),
                      icon: 'flame',
                      tone: 'warn',
                    },
                  ]}
                />
              </Rise>
            ) : null}

            {unseen.length > 0 ? (
              <Rise at={plan.at.unseen} skipped={skipped}>
                <Unseen kinds={unseen} />
              </Rise>
            ) : null}
          </View>
        </ScrollView>

        <Dock
          at={plan.dock}
          skipped={skipped}
          bottom={insets.bottom}
          main={main}
          onShare={
            verified && shareText
              ? () => {
                  track(verified.run.mode === 'daily' ? 'share_daily' : 'share_result');
                  void Share.share({ message: shareText });
                }
              : undefined
          }
          leave={leave}
          onHeight={setDockHeight}
        />
      </View>

      {burst && !skipped ? (
        <View
          testID="confetti"
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        >
          <Confetti fire />
        </View>
      ) : null}
    </Screen>
  );
}

/**
 * 0 until `at`, then 1 along `curve` — or 1 at once, cutting any move short,
 * when the player skipped or the phone reduces motion.
 */
function useBeat(
  at: number,
  skipped: boolean,
  curve: WithTimingConfig = RISE,
): SharedValue<number> {
  const progress = useSharedValue(skipped ? 1 : 0);

  useEffect(() => {
    if (skipped) {
      cancelAnimation(progress);
      progress.value = 1;
      return;
    }
    progress.value = withDelay(at, withTiming(1, curve));
  }, [at, curve, progress, skipped]);

  return progress;
}

/** A block rising into place on the result's clock. */
function Rise({
  at,
  skipped,
  style,
  children,
}: {
  at: number;
  skipped: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const progress = useBeat(at, skipped);
  const motion = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 18 }],
  }));
  return <Animated.View style={[style, motion]}>{children}</Animated.View>;
}

/**
 * The kit's stamp on the result's clock. Once the player skips, it lands
 * where it is: no wait, no slam.
 */
function Slam({
  at,
  skipped,
  from = 1.8,
  style,
  children,
}: {
  at: number;
  skipped: boolean;
  from?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <Stamp delay={skipped ? 0 : at} from={skipped ? 1 : from} style={style}>
      {children}
    </Stamp>
  );
}

/** The top of the result: how the run ended, the score, and the record. */
function Stage({
  top,
  endedBy,
  score,
  practice,
  record,
  best,
  crownAt,
  skipped,
}: {
  top: number;
  endedBy: RunSummary['endedBy'] | null;
  score: number | null;
  /** A run the API never saw: offline or outdated practice, or a new player's practice run. */
  practice: 'practice' | 'tutorial' | null;
  record: boolean;
  best: number | null;
  crownAt: number;
  skipped: boolean;
}) {
  const theme = useTheme();
  const t = useT();
  const punch = useSharedValue(1);
  const punchStyle = useAnimatedStyle(() => ({
    transform: [{ scale: punch.value }],
  }));
  const land = () => {
    punch.value = withSequence(
      withTiming(1.1, { duration: 80 }),
      withSpring(1, SPRING_POP),
    );
  };
  const long = score !== null && t.fmt.score(score).length > 7;

  return (
    <BrandBand
      style={[
        styles.stage,
        { borderColor: theme.outline, paddingTop: top + SPACE.xl },
      ]}
    >
      {practice ? (
        <Rise at={0} skipped={skipped}>
          <Ribbon
            label={practice === 'tutorial' ? t.result.stage.tutorial : t.result.stage.practice}
            tone="ink"
          />
        </Rise>
      ) : null}

      {endedBy ? (
        <Rise at={0} skipped={skipped}>
          <Txt variant="heading" tone="onSolid" align="center">
            {t.result.ending[endedBy]}
          </Txt>
        </Rise>
      ) : null}

      {score === null ? (
        <Slam
          at={BEAT.score}
          skipped={skipped}
          from={1.5}
          style={styles.unsent}
        >
          <IconChip icon="alert" tone="bad" size="lg" />
          <Txt variant="display" tone="onSolid" align="center">
            {t.result.stage.unsent}
          </Txt>
        </Slam>
      ) : (
        <View style={styles.scoreBlock}>
          <Slam at={BEAT.score} skipped={skipped} from={1.9}>
            <Animated.View style={punchStyle}>
              <CountUp
                value={score}
                format={t.fmt.score}
                delay={BEAT.score}
                duration={skipped ? 0 : BEAT.count}
                onDone={skipped ? undefined : land}
                style={[
                  styles.score,
                  long ? styles.scoreLong : null,
                  { color: record ? theme.gold : theme.onBrand },
                  embossed(5),
                ]}
              />
            </Animated.View>
          </Slam>
          <Rise at={BEAT.score + 160} skipped={skipped}>
            <Text style={[styles.unit, { color: theme.onBrand }, embossed(2)]}>
              {t.result.stage.unit[practice ?? 'ranked'](score)}
            </Text>
          </Rise>
        </View>
      )}

      {record ? (
        <Slam at={crownAt} skipped={skipped} from={2.2} style={styles.crown}>
          <RecordBanner />
        </Slam>
      ) : best !== null ? (
        <Rise at={crownAt} skipped={skipped} style={styles.crown}>
          <BestLine score={best} />
        </Rise>
      ) : null}
    </BrandBand>
  );
}

const TAIL_LEFT = 'M30 2H2l10 16L2 34h28z';
const TAIL_RIGHT = 'M2 2h28L20 18l10 16H2z';

/**
 * "YENİ REKOR!" on a gold banner with folded tails. A tail's fold points
 * outwards, so in Arabic, where the tails swap sides, each draws the other's.
 */
function RecordBanner() {
  const theme = useTheme();
  const t = useT();
  return (
    <View accessible accessibilityLabel={t.result.stage.recordLabel} style={styles.banner}>
      <Svg
        width={32}
        height={36}
        viewBox="0 0 32 36"
        style={[styles.tail, styles.tailLeft]}
      >
        <Path
          d={IS_RTL ? TAIL_RIGHT : TAIL_LEFT}
          fill={theme.goldLip}
          stroke={theme.outline}
          strokeWidth={DEPTH.outline}
          strokeLinejoin="round"
        />
      </Svg>
      <Svg
        width={32}
        height={36}
        viewBox="0 0 32 36"
        style={[styles.tail, styles.tailRight]}
      >
        <Path
          d={IS_RTL ? TAIL_LEFT : TAIL_RIGHT}
          fill={theme.goldLip}
          stroke={theme.outline}
          strokeWidth={DEPTH.outline}
          strokeLinejoin="round"
        />
      </Svg>
      <View
        style={[
          styles.bannerFace,
          { backgroundColor: theme.gold, borderColor: theme.outline },
        ]}
      >
        <Shine color={theme.goldHi} radius={12} height="50%" />
        <Icon name="crown" size={22} color={theme.goldInk} strokeWidth={2.8} />
        <Text style={[styles.bannerText, { color: theme.goldInk }]}>
          {t.result.stage.record}
        </Text>
      </View>
    </View>
  );
}

function BestLine({ score }: { score: number }) {
  const theme = useTheme();
  const t = useT();
  return (
    <View
      style={[
        styles.best,
        {
          backgroundColor: withAlpha(theme.outline, 0.4),
          borderColor: withAlpha(theme.onBrand, 0.16),
        },
      ]}
    >
      <Icon name="crown" size={15} color={theme.gold} strokeWidth={2.6} />
      <Txt variant="meta" tone="onSolid">
        {t.result.stage.seasonBest(t.fmt.score(score))}
      </Txt>
    </View>
  );
}

function Verified({
  response,
  plan,
  skipped,
  onOpenDaily,
}: {
  response: FinishRunResponse;
  plan: Plan;
  skipped: boolean;
  onOpenDaily: () => void;
}) {
  const t = useT();
  const { run } = response;

  return (
    <>
      {response.duel ? (
        <Rise at={plan.at.vs} skipped={skipped}>
          <VsTile duel={response.duel} />
        </Rise>
      ) : null}

      {response.daily ? (
        <Rise at={plan.at.daily} skipped={skipped}>
          <DailyTile daily={response.daily} onOpenDaily={onOpenDaily} />
        </Rise>
      ) : null}

      {response.rating ? (
        <Rise at={plan.at.rating} skipped={skipped}>
          <RatingTile rating={response.rating} score={run.score} at={plan.at.rating} skipped={skipped} />
        </Rise>
      ) : null}

      <Rise at={plan.at.breakdown} skipped={skipped}>
        <Breakdown run={run} at={plan.at.breakdown} skipped={skipped} />
      </Rise>

      <Rise at={plan.at.stats} skipped={skipped}>
        <StatGrid columns={3} items={runStats(run, t)} />
      </Rise>

      {run.status === 'ranked' ? (
        <View style={styles.ranks}>
          {PERIODS.map((period, index) => (
            <RankTile
              key={period}
              period={period}
              rank={response.ranks[period]}
              change={response.rankChanges[period]}
              at={plan.at.ranks + index * BEAT.inner}
              skipped={skipped}
            />
          ))}
        </View>
      ) : null}

      {response.passed.length > 0 ? (
        <Rise at={plan.at.passed} skipped={skipped}>
          <Passed
            players={response.passed}
            at={plan.at.passed}
            skipped={skipped}
          />
        </Rise>
      ) : null}

      {response.leagueUnlock ? (
        <Rise at={plan.at.league} skipped={skipped}>
          <LeagueUnlockTile unlock={response.leagueUnlock} />
        </Rise>
      ) : null}
    </>
  );
}

/**
 * A VS run's VS: sent — the friend is told, your score is kept from them
 * until they play, and the time they have runs down; over — the word in
 * Rubik in the colour of how it went, both scores and how the two of you
 * stand; never sent — a run that was not clean sends nothing.
 */
function VsTile({ duel }: { duel: DuelView }) {
  const theme = useTheme();
  const t = useT();
  const words = t.vs.result;
  const user = useSession((state) => state.user);
  const name = handle(duel.opponent.username);

  if (duel.status === 'void') {
    return (
      <Callout tone="warn" title={words.voidTitle}>
        {words.voidBody}
      </Callout>
    );
  }

  if (duel.status === 'waiting' && duel.sent) {
    return (
      <Panel tone="primary" style={styles.vs}>
        <Eyebrow icon="swords">{words.sent}</Eyebrow>
        <FaceOff
          left={{ name: user?.username ?? '?', src: user?.avatarUrl, caption: words.you }}
          right={{ name: duel.opponent.username, src: duel.opponent.avatarUrl, caption: name }}
        />
        <Txt variant="meta" align="center">
          {words.sentBody(name)}
        </Txt>
        {duel.expiresAt ? (
          <View style={styles.vsClock}>
            <CountdownChip endsAt={duel.expiresAt} serverTime={duel.serverTime} prefix={t.inbox.thread.left} />
          </View>
        ) : null}
        <View style={styles.vsNudge}>
          <PushNudge line={t.push.nudge.vs(name)} />
        </View>
      </Panel>
    );
  }

  if (duel.status === 'finished' && duel.outcome) {
    const color = duel.outcome === 'won' ? theme.ok : duel.outcome === 'lost' ? theme.bad : theme.gold;
    return (
      <Panel style={styles.vs}>
        <Stamp from={1.6}>
          <Text style={[styles.vsWord, { color }, embossed(3)]}>{words[duel.outcome]}</Text>
        </Stamp>
        <View style={styles.vsSides}>
          <VsSide label={words.you} side={duel.you} />
          <VsSide label={name} side={duel.them} />
        </View>
        <Txt variant="meta" tone="muted" align="center">
          {words.h2h(duel.h2h.wins, duel.h2h.losses)}
        </Txt>
      </Panel>
    );
  }

  return <Callout tone="info">{words.closed}</Callout>;
}

/** One side of a finished VS: whose, the score, and whether it counted. */
function VsSide({ label, side }: { label: string; side: DuelSide | null }) {
  const theme = useTheme();
  const t = useT();
  const words = t.vs.result;
  const score = side?.score === null || side?.score === undefined ? '—' : t.fmt.score(side.score);
  const note = !side || side.score === null ? words.unfinished : side.valid ? null : words.invalid;
  return (
    <View style={[styles.vsSide, { backgroundColor: theme.well, borderColor: theme.wellLine }]}>
      <Txt variant="micro" tone="muted" numberOfLines={1}>
        {label}
      </Txt>
      <Text style={[styles.vsScore, { color: note ? theme.inkFaint : theme.ink }]}>{score}</Text>
      {note ? (
        <Txt variant="micro" tone="bad">
          {note}
        </Txt>
      ) : null}
    </View>
  );
}

/**
 * What the run did to the Elo, on the result's clock: the league's emblem,
 * the rating counting up to where it stands, the move slammed in — green up,
 * red down — and the score against the target. A new league is said in gold
 * (the burst goes off with it), a fall in red with a shake. Placement counts
 * its runs; a held run and one that did not count say so.
 */
function RatingTile({
  rating,
  score,
  at,
  skipped,
}: {
  rating: RunRating;
  score: number;
  at: number;
  skipped: boolean;
}) {
  const theme = useTheme();
  const t = useT();
  const words = t.rating.result;
  const move = tierMove(rating.tierBefore, rating.tier);
  const { style: shaken, shake } = useShake();

  useEffect(() => {
    if (move !== 'down') return;
    const timer = setTimeout(shake, skipped ? 0 : at + BEAT.hop);
    return () => clearTimeout(timer);
    // Not on `shake`: it is a fresh function each render, and a fall shakes once.
  }, [at, move, skipped]);

  if (rating.kind === 'pending' || rating.kind === 'void') {
    return (
      <Panel style={styles.league}>
        <IconChip icon={rating.kind === 'pending' ? 'hourglass' : 'info'} tone="secondary" />
        <Txt variant="meta" tone="muted" style={styles.leagueText}>
          {rating.kind === 'pending' ? words.pending : words.void}
        </Txt>
      </Panel>
    );
  }

  if (rating.after === null || rating.tier === null) {
    const placement = rating.placement ?? { played: 0, required: 1 };
    return (
      <Panel style={styles.unlock}>
        <View style={styles.league}>
          <IconChip icon="flag" tone="secondary" size="lg" />
          <View style={styles.leagueText}>
            <Txt variant="title">{t.rating.placement.title(placement.played, placement.required)}</Txt>
            <Txt variant="meta" tone="muted">
              {t.rating.placement.hint(placement.required)}
            </Txt>
          </View>
        </View>
        <Meter value={placement.played / placement.required} tone="secondary" notches={placement.required} />
      </Panel>
    );
  }

  const placed = rating.kind === 'placement';
  const headline = placed
    ? words.placed(rating.tier)
    : move === 'up'
      ? words.promoted(rating.tier)
      : move === 'down'
        ? words.demoted(rating.tier)
        : null;
  const deltaColor = rating.delta > 0 ? theme.ok : rating.delta < 0 ? theme.bad : theme.inkMuted;

  return (
    <Animated.View style={shaken}>
      <Panel style={styles.rating}>
        <View style={styles.league}>
          <Slam at={at + BEAT.inner} skipped={skipped} from={placed || move === 'up' ? 1.8 : 1.2}>
            <TierBadge tier={rating.tier} size="lg" />
          </Slam>
          <View style={styles.leagueText}>
            <Text style={[TYPE.label, { color: theme.inkMuted }]}>{words.ribbon}</Text>
            <View style={styles.ratingRow}>
              <CountUp
                value={rating.after}
                format={(value) => t.fmt.score(Math.round(value))}
                delay={skipped ? 0 : at}
                duration={skipped ? 0 : 700}
                style={[styles.ratingValue, { color: theme.ink }, embossed(2)]}
              />
              {placed ? null : (
                <Slam at={at + BEAT.inner * 3} skipped={skipped}>
                  <Text testID="rating-delta" style={[styles.ratingDelta, { color: deltaColor }, embossed(2)]}>
                    {t.rating.delta(rating.delta)}
                  </Text>
                </Slam>
              )}
            </View>
          </View>
        </View>
        {headline ? (
          <Txt variant="title" style={{ color: move === 'down' ? theme.badText : theme.gold }}>
            {headline}
          </Txt>
        ) : null}
        {rating.target !== null ? (
          <Txt variant="meta" tone="muted">
            {words.line(t.fmt.score(score), t.fmt.score(rating.target))}
          </Txt>
        ) : null}
        <View style={styles.ratingTags}>
          {rating.kind === 'forfeit' ? <Tag label={words.forfeit} tone="bad" icon="close" /> : null}
          {rating.shielded ? <Tag label={words.shielded} tone="secondary" icon="shield" /> : null}
          {rating.nextTarget !== null ? (
            <Tag label={words.next(t.fmt.score(rating.nextTarget))} tone="neutral" icon="target" />
          ) : null}
        </View>
      </Panel>
    </Animated.View>
  );
}

/**
 * Dereceli before it opens: how many Normal or Günlük games it still waits
 * for. The run that opens it says so, in gold, with the burst.
 */
function LeagueUnlockTile({ unlock }: { unlock: LeagueUnlock }) {
  const theme = useTheme();
  const t = useT();
  const played = unlock.required - unlock.remaining;

  if (unlock.remaining === 0) {
    return (
      <Panel style={styles.unlock}>
        <View style={styles.league}>
          <Stamp from={1.8} delay={120}>
            <IconChip icon="shield" tone="warn" size="lg" />
          </Stamp>
          <View style={styles.leagueText}>
            <Txt variant="title" style={{ color: theme.gold }}>
              {t.modes.opened.title}
            </Txt>
            <Txt variant="meta" tone="muted">
              {t.modes.opened.body(unlock.placement)}
            </Txt>
          </View>
        </View>
      </Panel>
    );
  }

  return (
    <Panel style={styles.unlock}>
      <View style={styles.league}>
        <IconChip icon="lock" tone="secondary" size="lg" />
        <View style={styles.leagueText}>
          <Txt variant="title">{t.modes.lockedTitle(unlock.remaining)}</Txt>
          <Txt variant="meta" tone="muted">
            {t.modes.lockedBody(unlock.required)}
          </Txt>
        </View>
      </View>
      <Meter value={played / unlock.required} tone="secondary" />
    </Panel>
  );
}

/** A practice run that ended before some kinds came up: their rules, so nothing is left unknown. */
function Unseen({ kinds }: { kinds: readonly ReelKind[] }) {
  const t = useT();
  const guides = reelGuide(t);
  return (
    <Panel style={styles.unseen}>
      <Eyebrow icon="info">{t.result.unseen}</Eyebrow>
      {kinds.map((kind) => {
        const guide = guides[kind];
        return (
          <View key={kind} style={styles.unseenRow}>
            <IconChip icon={guide.icon} tone={guide.tone === 'neutral' ? 'secondary' : guide.tone} />
            <View style={styles.leagueText}>
              <Txt variant="heading">{guide.title}</Txt>
              <Txt variant="meta" tone="muted">
                {guide.body}
              </Txt>
            </View>
          </View>
        );
      })}
    </Panel>
  );
}

/** Today's challenge: its grid, where the run placed, and the way to its board. */
function DailyTile({
  daily,
  onOpenDaily,
}: {
  daily: DailyResult;
  onOpenDaily: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  return (
    <Panel style={styles.tile}>
      <Eyebrow icon="calendar">{t.daily.numbered(t.fmt.score(daily.number))}</Eyebrow>
      <View
        style={[
          styles.well,
          { backgroundColor: theme.well, borderColor: theme.wellLine },
        ]}
      >
        <ShareGrid grid={daily.grid} />
      </View>
      {daily.rank === null ? (
        <Txt variant="heading" tone="muted" align="center">
          {t.result.daily.unplaced}
        </Txt>
      ) : (
        <Txt variant="title" align="center">
          <Text style={{ color: theme.gold }}>{t.fmt.rank(daily.rank)}</Text>
          {t.result.daily.ofPlayers(daily.players)}
        </Txt>
      )}
      <Button
        label={t.game.actions.dailyBoard}
        icon="podium"
        tone="secondary"
        size="md"
        onPress={onOpenDaily}
      />
    </Panel>
  );
}

/** Where the score came from, and the named combos stamped in one by one. */
function Breakdown({
  run,
  at,
  skipped,
}: {
  run: RunResult;
  at: number;
  skipped: boolean;
}) {
  const t = useT();
  const bonuses = BONUS_ORDER.filter(
    (kind) => run.breakdown.bonuses[kind].count > 0,
  );

  return (
    <Panel style={styles.tile}>
      <Eyebrow icon="sparkle">{t.result.breakdown.title}</Eyebrow>
      <View style={styles.sources}>
        <Source
          label={t.result.breakdown.posts}
          value={t.fmt.score(run.breakdown.reelPoints)}
        />
        <Source
          label={t.result.breakdown.combos}
          value={ltr(`+${t.fmt.score(run.breakdown.bonusPoints)}`)}
          bright
        />
      </View>
      {bonuses.length > 0 ? (
        <View style={styles.chips}>
          {bonuses.map((kind, index) => (
            <Slam
              key={kind}
              at={at + BEAT.inner * (index + 1)}
              skipped={skipped}
              from={1.7}
            >
              <BonusChip
                kind={kind}
                count={run.breakdown.bonuses[kind].count}
                points={run.breakdown.bonuses[kind].points}
              />
            </Slam>
          ))}
        </View>
      ) : null}
    </Panel>
  );
}

function Source({
  label,
  value,
  bright = false,
}: {
  label: string;
  value: string;
  bright?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.source,
        { backgroundColor: theme.well, borderColor: theme.wellLine },
      ]}
    >
      <Text style={[TYPE.micro, { color: theme.inkMuted }]}>{label}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit={SHRINK_TO_FIT}
        style={[
          styles.sourceValue,
          { color: bright ? theme.primaryText : theme.ink },
          embossed(2),
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/** A verified run's numbers as stat tiles — here and on a past game's card. */
export function runStats(run: RunResult, t: Messages): StatItem[] {
  const stats = t.result.stats;
  return [
    { label: stats.posts, value: t.fmt.score(run.reels), icon: 'arrowUp' },
    { label: stats.accuracy, value: t.fmt.perMille(run.accuracy), icon: 'check' },
    {
      label: stats.maxCombo,
      value: t.fmt.combo(run.maxCombo),
      icon: 'flame',
      tone: 'warn',
    },
    {
      label: stats.likes,
      value: t.fmt.score(run.stats.likes),
      icon: 'heart',
      tone: 'primary',
    },
    {
      label: stats.perfects,
      value: t.fmt.score(run.stats.perfects),
      icon: 'star',
      tone: 'ok',
    },
    {
      label: stats.reaction,
      value: run.stats.avgReactionMs ? `${run.stats.avgReactionMs} ms` : '—',
      icon: 'clock',
    },
  ];
}

/** Which way a board's place moved; a new place or one that held moved neither way. */
function directionOf({ before, after }: RankChange): 'up' | 'down' | null {
  if (before === null || after === null || after === before) return null;
  return after < before ? 'up' : 'down';
}

/** How a board's place moved, as it is read aloud. */
function spokenMove(change: RankChange, t: Messages): string | null {
  const { before, after } = change;
  const moved = t.result.ranks.moved;
  if (after === null) return null;
  if (before === null) return moved.new;
  const places = Math.abs(after - before);
  switch (directionOf(change)) {
    case 'up':
      return moved.up(places, t.fmt.score(places));
    case 'down':
      return moved.down(places, t.fmt.score(places));
    default:
      return null;
  }
}

/**
 * One board's place — gold, the way the game writes your rank — and how this
 * run moved it, on a green or red pill. A place that climbed hops once.
 */
function RankTile({
  period,
  rank,
  change,
  at,
  skipped,
}: {
  period: LeaderboardPeriod;
  rank: number | null;
  change: RankChange;
  at: number;
  skipped: boolean;
}) {
  const theme = useTheme();
  const t = useT();
  const label = t.result.ranks.periods[period];
  const moved = t.fmt.rankChange(change.before, change.after);
  // From the numbers, not the arrow: in Arabic the arrow comes wrapped in an isolate.
  const direction = directionOf(change);
  const climbed = direction === 'up';
  const land = useBeat(at, skipped);
  const hop = useSharedValue(0);

  useEffect(() => {
    if (skipped || !climbed) {
      cancelAnimation(hop);
      hop.value = 0;
      return;
    }
    hop.value = withDelay(
      at + BEAT.hop,
      withSequence(
        withTiming(-9, { duration: 120, easing: Easing.out(Easing.quad) }),
        withSpring(0, SPRING_POP),
      ),
    );
  }, [at, climbed, hop, skipped]);

  const motion = useAnimatedStyle(() => ({
    opacity: land.value,
    transform: [{ translateY: (1 - land.value) * 18 + hop.value }],
  }));

  const spoken = spokenMove(change, t);
  const place = rank ? t.result.ranks.place(rank) : t.result.ranks.unranked;

  return (
    <Animated.View
      accessible
      accessibilityLabel={t.result.ranks.label(label, place, spoken)}
      style={[
        styles.rankTile,
        { backgroundColor: theme.tile, borderColor: theme.outline },
        motion,
      ]}
    >
      <LitEdge color={theme.tileHi} radius={RADIUS.control} />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit={SHRINK_TO_FIT}
        minimumFontScale={0.7}
        style={[TYPE.micro, { color: theme.inkMuted }]}
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit={SHRINK_TO_FIT}
        style={[
          styles.rankValue,
          { color: rank ? theme.gold : theme.inkFaint },
          embossed(2),
        ]}
      >
        {t.fmt.rank(rank)}
      </Text>
      {moved ? (
        <MovePill moved={moved} down={direction === 'down'} />
      ) : (
        <View style={styles.moveSpace} />
      )}
    </Animated.View>
  );
}

function MovePill({ moved, down }: { moved: string; down: boolean }) {
  const theme = useTheme();
  const gem = gemColors(theme, down ? 'bad' : 'ok');
  return (
    <View
      style={[
        styles.move,
        { backgroundColor: gem.solid, borderColor: theme.outline },
      ]}
    >
      <Text style={[styles.moveText, { color: gem.ink }]}>{moved}</Text>
    </View>
  );
}

/** The players this run overtook this week, climbing in under you one by one. */
function Passed({
  players,
  at,
  skipped,
}: {
  players: PassedPlayer[];
  at: number;
  skipped: boolean;
}) {
  const t = useT();
  return (
    <Panel style={styles.tile}>
      <Eyebrow icon="trendUp">{t.result.passed.title}</Eyebrow>
      {players.map((player, index) => (
        <PassedRow
          key={player.username}
          player={player}
          at={at + BEAT.inner * (index + 1)}
          skipped={skipped}
        />
      ))}
    </Panel>
  );
}

function PassedRow({
  player,
  at,
  skipped,
}: {
  player: PassedPlayer;
  at: number;
  skipped: boolean;
}) {
  const theme = useTheme();
  const t = useT();
  const name = handle(player.username);
  const climb = useBeat(at, skipped, CLIMB);
  const motion = useAnimatedStyle(() => ({
    opacity: Math.min(1, climb.value),
    transform: [{ translateY: (1 - climb.value) * 22 }],
  }));

  return (
    <Animated.View
      accessible
      accessibilityLabel={t.result.passed.label(
        name,
        player.isFriend,
        player.score,
        t.fmt.score(player.score),
      )}
      style={[
        styles.passed,
        { backgroundColor: theme.well, borderColor: theme.wellLine },
        motion,
      ]}
    >
      <Avatar name={player.username} src={player.avatarUrl} size="sm" />
      <Txt variant="heading" numberOfLines={1} style={styles.shrink}>
        {t.result.passed.name(name, player.isFriend)}
      </Txt>
      <Text style={[styles.passedScore, { color: theme.inkMuted }]}>
        {t.fmt.score(player.score)}
      </Text>
      <View
        style={[
          styles.passedMark,
          { backgroundColor: theme.ok, borderColor: theme.outline },
        ]}
      >
        <Icon
          name="arrowUp"
          size={12}
          color={theme.outline}
          strokeWidth={3.4}
        />
      </View>
    </Animated.View>
  );
}

type DockAction = { label: string; tone: ButtonTone; onPress: () => void };

/**
 * The way on, on a dark tray at the bottom: gold for the one that starts a
 * game, then sharing and the way home. It slides up last. After a new
 * player's practice run the way on is magenta — it leads to the ways in, not
 * a game — and the second slab plays the practice run again.
 */
function Dock({
  at,
  skipped,
  bottom,
  main,
  onShare,
  leave,
  onHeight,
}: {
  at: number;
  skipped: boolean;
  bottom: number;
  main: DockAction & { icon: IconName };
  onShare?: () => void;
  leave: DockAction;
  onHeight: (height: number) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const slide = useBeat(at, skipped, SLIDE);
  const motion = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - slide.value) * 320 }],
  }));

  return (
    <Animated.View
      onLayout={(event) => onHeight(event.nativeEvent.layout.height)}
      style={[
        styles.dock,
        {
          backgroundColor: theme.rail,
          borderColor: theme.outline,
          paddingBottom: bottom + SPACE.md,
        },
        motion,
      ]}
    >
      <View
        pointerEvents="none"
        style={[styles.rim, { backgroundColor: withAlpha(theme.onBrand, 0.1) }]}
      />
      <Button
        label={main.label}
        icon={main.icon}
        tone={main.tone}
        onPress={main.onPress}
      />
      <View style={styles.dockRow}>
        {onShare ? (
          <Button
            label={t.result.dock.share}
            icon="share"
            tone="primary"
            size="md"
            onPress={onShare}
            style={styles.grow}
          />
        ) : null}
        <Button
          label={leave.label}
          tone={leave.tone}
          size="md"
          onPress={leave.onPress}
          style={onShare || leave.tone !== 'ghost' ? styles.grow : null}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  vs: { alignItems: 'center', gap: SPACE.sm, paddingVertical: SPACE.lg },
  vsClock: { alignItems: 'center' },
  vsNudge: { alignSelf: 'stretch' },
  vsWord: { fontFamily: FONT.display, fontSize: 34, lineHeight: lh(40), textAlign: 'center' },
  vsSides: { alignSelf: 'stretch', flexDirection: 'row', gap: SPACE.sm },
  vsSide: {
    alignItems: 'center',
    borderRadius: RADIUS.control,
    borderWidth: 1.5,
    flex: 1,
    gap: 2,
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.ms,
  },
  vsScore: { fontFamily: FONT.display, fontSize: 24, lineHeight: lh(29) },
  stage: {
    alignItems: 'center',
    borderBottomLeftRadius: RADIUS.overlay,
    borderBottomRightRadius: RADIUS.overlay,
    borderBottomWidth: DEPTH.outline + 2,
    gap: SPACE.sm,
    paddingBottom: SPACE.xxl,
    paddingHorizontal: SPACE.xl,
  },
  scoreBlock: { alignItems: 'center', marginTop: SPACE.xs },
  score: {
    fontFamily: FONT.display,
    fontSize: 68,
    lineHeight: lh(80),
    textAlign: 'center',
  },
  scoreLong: { fontSize: 54, lineHeight: lh(64) },
  unit: {
    fontFamily: FONT.displayBold,
    fontSize: 18,
    letterSpacing: tracking(0.5),
    lineHeight: lh(22),
  },
  unsent: { alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.sm },
  crown: { marginTop: SPACE.sm },
  banner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  tail: { position: 'absolute', top: 12 },
  tailLeft: { left: 0 },
  tailRight: { right: 0 },
  bannerFace: {
    alignItems: 'center',
    borderBottomWidth: DEPTH.outline + 4,
    borderRadius: 12,
    borderWidth: DEPTH.outline,
    flexDirection: 'row',
    gap: SPACE.sm,
    overflow: 'hidden',
    paddingBottom: 6,
    paddingHorizontal: SPACE.xl,
    paddingTop: 7,
  },
  bannerText: {
    fontFamily: FONT.display,
    fontSize: 23,
    letterSpacing: tracking(1),
    lineHeight: lh(28),
  },
  best: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: SPACE.xs,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.xs,
  },
  body: { gap: SPACE.lg, paddingHorizontal: SPACE.xl, paddingTop: SPACE.xl },
  tile: { gap: SPACE.md },
  well: {
    alignItems: 'center',
    borderRadius: RADIUS.control,
    borderWidth: 1.5,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.md,
  },
  sources: { flexDirection: 'row', gap: SPACE.ms },
  source: {
    borderRadius: RADIUS.control,
    borderWidth: 1.5,
    flex: 1,
    gap: SPACE.xxs,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.ms,
  },
  sourceValue: { fontFamily: FONT.display, fontSize: 22, lineHeight: lh(27) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  ranks: { flexDirection: 'row', gap: SPACE.sm },
  rankTile: {
    alignItems: 'center',
    borderBottomWidth: DEPTH.outline + DEPTH.lipSm,
    borderRadius: RADIUS.control,
    borderWidth: DEPTH.outline,
    flex: 1,
    gap: SPACE.xs,
    overflow: 'hidden',
    paddingHorizontal: SPACE.xs,
    paddingVertical: SPACE.ms,
  },
  rankValue: { fontFamily: FONT.display, fontSize: 22, lineHeight: lh(27) },
  move: {
    alignItems: 'center',
    borderBottomWidth: 3.5,
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    minWidth: 36,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 1,
  },
  moveText: { fontFamily: FONT.display, fontSize: 12.5, lineHeight: lh(16) },
  /** A tile with no move keeps the pill's room, so the four tiles stay level. */
  moveSpace: { height: lh(16) + 5.5 },
  passed: {
    alignItems: 'center',
    borderRadius: RADIUS.control,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: SPACE.ms,
    paddingHorizontal: SPACE.ms,
    paddingVertical: SPACE.sm,
  },
  shrink: { flex: 1 },
  passedScore: { fontFamily: FONT.displayBold, fontSize: 15, lineHeight: lh(19) },
  passedMark: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  league: { alignItems: 'center', flexDirection: 'row', gap: SPACE.md },
  leagueText: { flex: 1, gap: SPACE.xs },
  unlock: { gap: SPACE.md },
  rating: { gap: SPACE.sm },
  ratingRow: { alignItems: 'baseline', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  ratingValue: { fontFamily: FONT.display, fontSize: 30, lineHeight: lh(36) },
  ratingDelta: { fontFamily: FONT.display, fontSize: 22, lineHeight: lh(27) },
  ratingTags: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs },
  unseen: { gap: SPACE.md },
  unseenRow: { alignItems: 'center', flexDirection: 'row', gap: SPACE.md },
  dock: {
    borderBottomWidth: 0,
    borderTopLeftRadius: RADIUS.overlay,
    borderTopRightRadius: RADIUS.overlay,
    borderWidth: DEPTH.outline + 0.5,
    bottom: 0,
    gap: SPACE.sm,
    left: 0,
    paddingHorizontal: SPACE.xl,
    paddingTop: SPACE.lg,
    position: 'absolute',
    right: 0,
  },
  rim: {
    borderRadius: RADIUS.pill,
    height: 2,
    left: RADIUS.overlay,
    position: 'absolute',
    right: RADIUS.overlay,
    top: 3,
  },
  dockRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACE.sm,
    justifyContent: 'center',
  },
  grow: { flex: 1 },
});
