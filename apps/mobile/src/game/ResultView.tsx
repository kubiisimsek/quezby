import type { ReelKind, RunSummary } from '@quezby/engine';
import type {
  DailyResult,
  FinishRunResponse,
  LeaderboardPeriod,
  LeagueStanding,
  LeagueUnlock,
  LeagueZone,
  PassedPlayer,
  RankChange,
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

import { APP_PLATFORM } from '@/config/env';
import { BONUS_ORDER, DEVICE_FAILED, REEL_GUIDE } from '@/game/howTo';
import type { Outcome } from '@/game/useGame';
import {
  formatCombo,
  formatPerMille,
  formatRank,
  formatRankChange,
  formatScore,
} from '@/lib/format';
import { Icon, type IconName } from '@/ui/icons';
import {
  Avatar,
  BonusChip,
  BrandBand,
  Button,
  Callout,
  Confetti,
  CountUp,
  Eyebrow,
  IconChip,
  Meter,
  Panel,
  Ribbon,
  Screen,
  ShareGrid,
  Stamp,
  StatGrid,
  TIER_LABELS,
  Tag,
  TierBadge,
  Txt,
  gemColors,
  type ButtonTone,
  type StatItem,
  type TagTone,
} from '@/ui/kit';
import { SPRING_POP } from '@/ui/motion';
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

const ENDING: Record<RunSummary['endedBy'], string> = {
  drained: 'Dopamin bitti. Sıkıldın, uygulamayı kapattın.',
  penalty: 'Çok hata yaptın, akış seni bıraktı.',
  quit: 'Oyundan çıktın.',
};

const PERIODS: Array<{ period: LeaderboardPeriod; label: string }> = [
  { period: 'daily', label: 'Bugün' },
  { period: 'weekly', label: 'Hafta' },
  { period: 'monthly', label: 'Ay' },
  { period: 'all', label: 'Tümü' },
];

const ZONE: Record<
  LeagueZone,
  { line: string; tone: TagTone; icon: IconName }
> = {
  promote: { line: 'Terfi bölgesindesin', tone: 'ok', icon: 'trendUp' },
  stay: { line: 'Güvendesin', tone: 'secondary', icon: 'shield' },
  demote: { line: 'Düşme bölgesindesin', tone: 'bad', icon: 'trendDown' },
};

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
  'status' | 'daily' | 'breakdown' | 'stats' | 'unseen' | 'ranks' | 'passed' | 'league';

type Plan = {
  crown: number;
  burst: number | null;
  at: Record<Section, number>;
  dock: number;
  end: number;
};

/** When each part of this result arrives. Only what is shown takes a beat. */
function choreograph(
  shown: readonly Section[],
  counting: boolean,
  record: boolean,
): Plan {
  const crown = BEAT.score + (counting ? BEAT.count : 0) + BEAT.crown;
  const at: Record<Section, number> = {
    status: 0,
    daily: 0,
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
    burst: record ? crown + BEAT.burst : null,
    at,
    dock,
    end: dock + BEAT.settle,
  };
}

type Note = { tone: 'info' | 'warn' | 'bad'; title: string; body: string };

/** What a result that is not a plain ranked run has to say about itself. */
function noteFor(outcome: Outcome): Note | null {
  if (outcome.mode === 'unsent') {
    return {
      tone: 'bad',
      title: 'Skorun doğrulanamadı',
      body: outcome.canRetry
        ? `${outcome.message} Hamlelerin telefonda saklı; bağlantı gelince tekrar gönderebilirsin.`
        : outcome.message,
    };
  }
  if (outcome.mode === 'practice') {
    if (outcome.reason === 'tutorial') {
      return {
        tone: 'info',
        title: 'Deneme turu',
        body: 'Bu tur hiçbir yere sayılmadı. Hareketleri gördün; sıra gerçek oyunda.',
      };
    }
    return {
      tone: 'info',
      title: 'Antrenman turu',
      body:
        outcome.reason === 'outdated'
          ? 'Uygulamanın yeni sürümü var; güncelleyene kadar skorların sıralamaya girmez.'
          : 'Çevrimdışı oynadın; bu skor sıralamaya gönderilmedi.',
    };
  }
  if (outcome.response.run.flagReason === 'device') {
    return {
      tone: 'warn',
      title: DEVICE_FAILED.title,
      body: `${DEVICE_FAILED.why[APP_PLATFORM]} Oynamaya devam edebilirsin.`,
    };
  }
  switch (outcome.response.run.status) {
    case 'review':
      return {
        tone: 'info',
        title: 'Skorun inceleniyor',
        body: 'Zirveye yakın skorlara bir göz atıyoruz. Onaylanınca sıralamada yerini alır.',
      };
    case 'flagged':
      return {
        tone: 'warn',
        title: 'Sıralamaya girmedi',
        body: 'Bu tur doğrulanamadı. Skorun kaydedildi ama sıralamada görünmeyecek.',
      };
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
 * leads on (`onContinue`) instead of home.
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
  onClose,
  onRetrySubmit,
  onOpenDaily,
  onContinue,
}: {
  outcome: Outcome;
  mode: 'free' | 'daily';
  onReplay: () => void;
  onPlayFree: () => void;
  onClose: () => void;
  onRetrySubmit: () => void;
  onOpenDaily: () => void;
  /** After a new player's practice run: on to their name. */
  onContinue?: () => void;
}) {
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
  const note = noteFor(outcome);

  const shown: Section[] = [];
  if (note) shown.push('status');
  if (verified?.daily) shown.push('daily');
  if (verified) shown.push('breakdown');
  if (verified || practice) shown.push('stats');
  if (unseen.length > 0) shown.push('unseen');
  if (verified && ranked) shown.push('ranks');
  if (verified && verified.passed.length > 0) shown.push('passed');
  if (verified?.league || verified?.leagueUnlock) shown.push('league');
  const plan = choreograph(shown, score !== null, record);

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

  const main: DockAction & { icon: IconName } =
    tutorial && onContinue
      ? { label: 'Devam et', icon: 'check', tone: 'primary', onPress: onContinue }
      : outcome.mode === 'unsent' && outcome.canRetry
        ? { label: 'Tekrar gönder', icon: 'refresh', tone: 'play', onPress: onRetrySubmit }
        : mode === 'daily'
          ? { label: 'Serbest oyna', icon: 'play', tone: 'play', onPress: onPlayFree }
          : { label: 'Tekrar oyna', icon: 'play', tone: 'play', onPress: onReplay };
  const leave: DockAction =
    tutorial && onContinue
      ? { label: 'Bir daha dene', tone: 'secondary', onPress: onReplay }
      : { label: 'Ana sayfaya dön', tone: 'ghost', onPress: onClose };

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
                      label: 'Post',
                      value: formatScore(practice.reels),
                      icon: 'arrowUp',
                    },
                    {
                      label: 'İsabet',
                      value: formatPerMille(practice.accuracy),
                      icon: 'check',
                    },
                    {
                      label: 'En yüksek kombo',
                      value: formatCombo(practice.maxCombo),
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
            verified
              ? () => void Share.share({ message: verified.shareText })
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
  const long = score !== null && formatScore(score).length > 7;

  return (
    <BrandBand
      style={[
        styles.stage,
        { borderColor: theme.outline, paddingTop: top + SPACE.xl },
      ]}
    >
      {practice ? (
        <Rise at={0} skipped={skipped}>
          <Ribbon label={practice === 'tutorial' ? 'DENEME TURU' : 'ANTRENMAN'} tone="ink" />
        </Rise>
      ) : null}

      {endedBy ? (
        <Rise at={0} skipped={skipped}>
          <Txt variant="heading" tone="onSolid" align="center">
            {ENDING[endedBy]}
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
            Skor gönderilemedi
          </Txt>
        </Slam>
      ) : (
        <View style={styles.scoreBlock}>
          <Slam at={BEAT.score} skipped={skipped} from={1.9}>
            <Animated.View style={punchStyle}>
              <CountUp
                value={score}
                format={formatScore}
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
              {practice === 'tutorial' ? 'deneme puanı' : practice ? 'antrenman puanı' : 'puan'}
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

/** "YENİ REKOR!" on a gold banner with folded tails. */
function RecordBanner() {
  const theme = useTheme();
  return (
    <View accessible accessibilityLabel="Yeni rekor" style={styles.banner}>
      <Svg
        width={32}
        height={36}
        viewBox="0 0 32 36"
        style={[styles.tail, styles.tailLeft]}
      >
        <Path
          d={TAIL_LEFT}
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
          d={TAIL_RIGHT}
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
        <View
          pointerEvents="none"
          style={[styles.bannerHi, { backgroundColor: theme.goldHi }]}
        />
        <Icon name="crown" size={22} color={theme.goldInk} strokeWidth={2.8} />
        <Text style={[styles.bannerText, { color: theme.goldInk }]}>
          YENİ REKOR!
        </Text>
      </View>
    </View>
  );
}

function BestLine({ score }: { score: number }) {
  const theme = useTheme();
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
        Sezon rekorun: {formatScore(score)}
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
  const { run } = response;

  return (
    <>
      {response.daily ? (
        <Rise at={plan.at.daily} skipped={skipped}>
          <DailyTile daily={response.daily} onOpenDaily={onOpenDaily} />
        </Rise>
      ) : null}

      <Rise at={plan.at.breakdown} skipped={skipped}>
        <Breakdown run={run} at={plan.at.breakdown} skipped={skipped} />
      </Rise>

      <Rise at={plan.at.stats} skipped={skipped}>
        <StatGrid columns={3} items={runStats(run)} />
      </Rise>

      {run.status === 'ranked' ? (
        <View style={styles.ranks}>
          {PERIODS.map(({ period, label }, index) => (
            <RankTile
              key={period}
              label={label}
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

      {response.league ? (
        <Rise at={plan.at.league} skipped={skipped}>
          <LeagueTile league={response.league} />
        </Rise>
      ) : response.leagueUnlock ? (
        <Rise at={plan.at.league} skipped={skipped}>
          <LeagueUnlockTile unlock={response.leagueUnlock} />
        </Rise>
      ) : null}
    </>
  );
}

/** The league before it opens: how many counted runs it still waits for. */
function LeagueUnlockTile({ unlock }: { unlock: LeagueUnlock }) {
  const played = unlock.required - unlock.remaining;
  return (
    <Panel style={styles.unlock}>
      <View style={styles.league}>
        <IconChip icon="lock" tone="secondary" size="lg" />
        <View style={styles.leagueText}>
          <Txt variant="title">{`Lige ${unlock.remaining} oyun kaldı`}</Txt>
          <Txt variant="meta" tone="muted">
            {`Lig, ilk ${unlock.required} oyunundan sonra açılır.`}
          </Txt>
        </View>
      </View>
      <Meter value={played / unlock.required} tone="secondary" />
    </Panel>
  );
}

/** A practice run that ended before some kinds came up: their rules, so nothing is left unknown. */
function Unseen({ kinds }: { kinds: readonly ReelKind[] }) {
  return (
    <Panel style={styles.unseen}>
      <Eyebrow icon="info">Henüz görmediklerin</Eyebrow>
      {kinds.map((kind) => {
        const guide = REEL_GUIDE[kind];
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
  return (
    <Panel style={styles.tile}>
      <Eyebrow icon="calendar">{`Günün akışı #${daily.number}`}</Eyebrow>
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
          Bugünün tablosuna girmedi
        </Txt>
      ) : (
        <Txt variant="title" align="center">
          <Text style={{ color: theme.gold }}>{formatRank(daily.rank)}</Text>
          {` / ${formatScore(daily.players)} oyuncu`}
        </Txt>
      )}
      <Button
        label="Günün tablosu"
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
  const bonuses = BONUS_ORDER.filter(
    (kind) => run.breakdown.bonuses[kind].count > 0,
  );

  return (
    <Panel style={styles.tile}>
      <Eyebrow icon="sparkle">Puanın nereden geldi</Eyebrow>
      <View style={styles.sources}>
        <Source
          label="Postlardan"
          value={formatScore(run.breakdown.reelPoints)}
        />
        <Source
          label="Kombolardan"
          value={`+${formatScore(run.breakdown.bonusPoints)}`}
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
        adjustsFontSizeToFit
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

function runStats(run: RunResult): StatItem[] {
  return [
    { label: 'Post', value: formatScore(run.reels), icon: 'arrowUp' },
    { label: 'İsabet', value: formatPerMille(run.accuracy), icon: 'check' },
    {
      label: 'En yüksek kombo',
      value: formatCombo(run.maxCombo),
      icon: 'flame',
      tone: 'warn',
    },
    {
      label: 'Beğeni',
      value: formatScore(run.stats.likes),
      icon: 'heart',
      tone: 'primary',
    },
    {
      label: 'Mükemmel',
      value: formatScore(run.stats.perfects),
      icon: 'star',
      tone: 'ok',
    },
    {
      label: 'Tepki',
      value: run.stats.avgReactionMs ? `${run.stats.avgReactionMs} ms` : '—',
      icon: 'clock',
    },
  ];
}

/** How a board's place moved, as it is read aloud. */
function spokenMove(change: RankChange): string | null {
  const { before, after } = change;
  if (after === null) return null;
  if (before === null) return 'yeni';
  if (after < before) return `${formatScore(before - after)} sıra yukarı`;
  if (after > before) return `${formatScore(after - before)} sıra aşağı`;
  return null;
}

/**
 * One board's place — gold, the way the game writes your rank — and how this
 * run moved it, on a green or red pill. A place that climbed hops once.
 */
function RankTile({
  label,
  rank,
  change,
  at,
  skipped,
}: {
  label: string;
  rank: number | null;
  change: RankChange;
  at: number;
  skipped: boolean;
}) {
  const theme = useTheme();
  const moved = formatRankChange(change.before, change.after);
  const climbed = moved.startsWith('▲');
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

  const spoken = spokenMove(change);
  const place = rank ? formatRank(rank) : 'sıralamada değilsin';

  return (
    <Animated.View
      accessible
      accessibilityLabel={
        spoken ? `${label}: ${place}, ${spoken}` : `${label}: ${place}`
      }
      style={[
        styles.rankTile,
        { backgroundColor: theme.tile, borderColor: theme.outline },
        motion,
      ]}
    >
      <View
        pointerEvents="none"
        style={[styles.edge, { backgroundColor: theme.tileHi }]}
      />
      <Text numberOfLines={1} style={[TYPE.micro, { color: theme.inkMuted }]}>
        {label}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.rankValue,
          { color: rank ? theme.gold : theme.inkFaint },
          embossed(2),
        ]}
      >
        {formatRank(rank)}
      </Text>
      {moved ? <MovePill moved={moved} /> : <View style={styles.moveSpace} />}
    </Animated.View>
  );
}

function MovePill({ moved }: { moved: string }) {
  const theme = useTheme();
  const gem = gemColors(theme, moved.startsWith('▼') ? 'bad' : 'ok');
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

/** The players this run overtook today, climbing in under you one by one. */
function Passed({
  players,
  at,
  skipped,
}: {
  players: PassedPlayer[];
  at: number;
  skipped: boolean;
}) {
  return (
    <Panel style={styles.tile}>
      <Eyebrow icon="trendUp">Bugün geçtiklerin</Eyebrow>
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
  const climb = useBeat(at, skipped, CLIMB);
  const motion = useAnimatedStyle(() => ({
    opacity: Math.min(1, climb.value),
    transform: [{ translateY: (1 - climb.value) * 22 }],
  }));

  return (
    <Animated.View
      accessible
      accessibilityLabel={`@${player.username}${player.isFollowing ? ', arkadaşın' : ''}, ${formatScore(player.score)} puan, geçtin`}
      style={[
        styles.passed,
        { backgroundColor: theme.well, borderColor: theme.wellLine },
        motion,
      ]}
    >
      <Avatar name={player.username} size="sm" />
      <Txt variant="heading" numberOfLines={1} style={styles.shrink}>
        @{player.username}
        {player.isFollowing ? ' · arkadaşın' : ''}
      </Txt>
      <Text style={[styles.passedScore, { color: theme.inkMuted }]}>
        {formatScore(player.score)}
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

function LeagueTile({ league }: { league: LeagueStanding }) {
  const zone = ZONE[league.zone];
  return (
    <Panel style={styles.league}>
      <TierBadge tier={league.tier} size="lg" />
      <View style={styles.leagueText}>
        <Txt variant="title" numberOfLines={1}>
          {`${TIER_LABELS[league.tier]} lig · ${formatRank(league.rank)}/${league.members}`}
        </Txt>
        <Tag label={zone.line} tone={zone.tone} icon={zone.icon} />
        <Txt variant="meta" tone="muted">
          {`Haftalık ${formatScore(league.points)} puan`}
        </Txt>
      </View>
    </Panel>
  );
}

type DockAction = { label: string; tone: ButtonTone; onPress: () => void };

/**
 * The way on, on a dark tray at the bottom: gold for the one that starts a
 * game, then sharing and the way home. It slides up last. After a new
 * player's practice run the way on is magenta — it leads to their name, not
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
            label="Paylaş"
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
    lineHeight: 80,
    textAlign: 'center',
  },
  scoreLong: { fontSize: 54, lineHeight: 64 },
  unit: {
    fontFamily: FONT.displayBold,
    fontSize: 18,
    letterSpacing: 0.5,
    lineHeight: 22,
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
  bannerHi: { height: '50%', left: 0, position: 'absolute', right: 0, top: 0 },
  bannerText: {
    fontFamily: FONT.display,
    fontSize: 23,
    letterSpacing: 1,
    lineHeight: 28,
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
  sourceValue: { fontFamily: FONT.display, fontSize: 22, lineHeight: 27 },
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
  edge: { height: 3, left: 0, position: 'absolute', right: 0, top: 0 },
  rankValue: { fontFamily: FONT.display, fontSize: 22, lineHeight: 27 },
  move: {
    alignItems: 'center',
    borderBottomWidth: 3.5,
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    minWidth: 36,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 1,
  },
  moveText: { fontFamily: FONT.display, fontSize: 12.5, lineHeight: 16 },
  moveSpace: { height: 21.5 },
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
  passedScore: { fontFamily: FONT.displayBold, fontSize: 15, lineHeight: 19 },
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
