import type { RunSummary } from '@quezby/engine';
import type { LeagueTier, RunRating } from '@quezby/types';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useSession } from '@/auth/session';
import { useT } from '@/i18n';
import { feel } from '@/lib/haptics';
import { TIERS, tierMove } from '@/lib/tiers';
import { Icon } from '@/ui/icons';
import {
  BrandBand,
  CountUp,
  FramedAvatar,
  Meter,
  Ribbon,
  Spotlight,
  Stamp,
  Tag,
  Txt,
  gemColors,
  metalOf,
  useShake,
} from '@/ui/kit';
import { StageBanner } from '@/ui/kit/result';
import { DEPTH, FONT, RADIUS, SPACE, embossed, lh, useTheme, withAlpha } from '@/ui/theme';

/**
 * The top of a rated result — Dereceli's own ceremony, in place of the score:
 * the player's portrait in their league's frame, the Elo counting from where
 * it stood to where it lands with the move slammed in big (green up, red
 * down), the league's bar running with it, and the score against the target.
 *
 * A new league is its own moment: the bar fills, the old frame flashes and
 * shrinks away, the new one slams in over turning rays, "YÜKSELDİN!" lands
 * in gold with the burst and the phone buzzes. A fall drains the bar, shakes,
 * and drops the lower frame in under a red "DÜŞTÜN". The run that places a
 * player reveals their first frame the same way. A tap skips to the end; a
 * phone set to reduce motion starts there.
 */

/** The ceremony's clock, ms from the moment the result opens. */
const T = {
  frame: 150,
  count: 520,
  countMs: 1000,
  /** A promotion's or a fall's bar runs to the edge of the league… */
  fillMs: 900,
  /** …the old frame flashes and goes, and the new one slams in. */
  swap: 1560,
  banner: 1780,
  refillMs: 700,
  delta: 1150,
  deltaAfterSwap: 1980,
  lines: 1350,
  linesAfterSwap: 2200,
  end: 1600,
  endAfterSwap: 2600,
  /** A placement reveals the first frame. */
  reveal: 1000,
  revealBanner: 1180,
  endReveal: 2000,
} as const;

type Story = 'placing' | 'reveal' | 'up' | 'down' | 'stay';

function storyOf(rating: RunRating): Story {
  if (rating.after === null || rating.tier === null) return 'placing';
  if (rating.kind === 'placement') return 'reveal';
  const move = tierMove(rating.tierBefore, rating.tier);
  return move ?? 'stay';
}

/**
 * When the ceremony is over — the tiles under it follow — and when its burst
 * goes off: a new league or the first one, never a fall.
 */
export function rankedTimeline(rating: RunRating): { end: number; burst: number | null } {
  switch (storyOf(rating)) {
    case 'placing':
      return { end: T.lines, burst: null };
    case 'reveal':
      return { end: T.endReveal, burst: T.revealBanner };
    case 'up':
      return { end: T.endAfterSwap, burst: T.banner };
    case 'down':
      return { end: T.endAfterSwap, burst: null };
    default:
      return { end: T.end, burst: null };
  }
}

/** How far into its league a rating is, 0 to 1; MasterClass, with no top, is always full. */
function progressIn(tier: LeagueTier, rating: number): number {
  if (tier === 'master') return 1;
  const floor = TIERS.indexOf(tier) * 1000;
  return Math.min(1, Math.max(0, (rating - floor) / 1000));
}

const FRAME = 164;
const RAYS = 300;

export function RankedStage({
  top,
  endedBy,
  score,
  rating,
  skipped,
}: {
  top: number;
  endedBy: RunSummary['endedBy'] | null;
  score: number;
  rating: RunRating;
  skipped: boolean;
}) {
  const theme = useTheme();
  const t = useT();
  const words = t.rating.result;
  const user = useSession((state) => state.user);
  const name = user?.username ?? '';
  const story = storyOf(rating);
  const moves = story === 'up' || story === 'down' || story === 'reveal';
  const swapAt = story === 'reveal' ? T.reveal : T.swap;
  const [swapped, setSwapped] = useState(skipped || !moves);
  const { style: shaken, shake } = useShake(9);

  useEffect(() => {
    if (!moves) return;
    const kind = story === 'down' ? 'rankDown' : 'rankUp';
    if (skipped) {
      setSwapped(true);
      return;
    }
    const timers = [
      setTimeout(() => {
        setSwapped(true);
        feel(kind);
        if (story === 'down') shake();
      }, swapAt),
    ];
    return () => timers.forEach(clearTimeout);
    // Not on `shake`: a fresh function each render, and a fall shakes once.
  }, [moves, skipped, story, swapAt]);

  if (story === 'placing') {
    const placement = rating.placement ?? { played: 0, required: 1 };
    return (
      <BrandBand style={[styles.stage, { borderColor: theme.outline, paddingTop: top + SPACE.xl }]}>
        <Ribbon label={t.rating.placement.ribbon} tone="ink" />
        <Stamp delay={skipped ? 0 : T.frame} from={skipped ? 1 : 1.6}>
          <FramedAvatar tier={null} name={name} src={user?.avatarUrl} size={FRAME} tone="primary" />
        </Stamp>
        <Txt variant="display" tone="onSolid" align="center">
          {t.rating.placement.title(placement.played, placement.required)}
        </Txt>
        <View style={styles.bar}>
          <Meter value={placement.played / placement.required} tone="warn" notches={placement.required} />
        </View>
        <Txt variant="meta" tone="onSolid" align="center">
          {t.rating.placement.hint(placement.required)}
        </Txt>
        <ScoreLine score={score} target={null} />
      </BrandBand>
    );
  }

  const after = rating.after ?? 0;
  const tier = rating.tier ?? 'bronze';
  const before = rating.before ?? after;
  const tierBefore = rating.tierBefore ?? tier;
  const shownTier = swapped ? tier : tierBefore;
  const metal = metalOf(shownTier);
  const deltaAt = moves ? T.deltaAfterSwap : T.delta;
  const linesAt = moves ? T.linesAfterSwap : T.lines;
  const ceil = tier === 'master' ? null : (TIERS.indexOf(tier) + 1) * 1000;
  const next = TIERS[TIERS.indexOf(tier) + 1] ?? null;
  const banner =
    story === 'up' ? words.banner.up : story === 'down' ? words.banner.down : story === 'reveal' ? words.banner.placed : null;
  const bannerAt = story === 'reveal' ? T.revealBanner : T.banner;

  return (
    <Animated.View style={shaken}>
      <BrandBand style={[styles.stage, { borderColor: theme.outline, paddingTop: top + SPACE.lg }]}>
        {endedBy ? (
          <Txt variant="meta" tone="onSolid" align="center">
            {t.result.ending[endedBy]}
          </Txt>
        ) : null}

        <View style={styles.frameBox}>
          <Rays color={metal.glow} on={swapped && (story === 'up' || story === 'reveal')} skipped={skipped} />
          {swapped ? (
            <Stamp
              key="after"
              delay={skipped || !moves ? (skipped ? 0 : T.frame) : 0}
              from={skipped ? 1 : moves ? (story === 'down' ? 1.3 : 2.2) : 1.6}
            >
              <FramedAvatar
                tier={story === 'reveal' ? tier : shownTier}
                name={name}
                src={user?.avatarUrl}
                size={FRAME}
                tone="primary"
                animated
              />
            </Stamp>
          ) : (
            <Leaving at={swapAt} story={story}>
              <FramedAvatar
                tier={story === 'reveal' ? null : tierBefore}
                name={name}
                src={user?.avatarUrl}
                size={FRAME}
                tone="primary"
              />
            </Leaving>
          )}
          <Flash at={swapAt} on={moves && !skipped} bad={story === 'down'} />
        </View>

        {story === 'reveal' && !swapped ? (
          <Text style={[styles.league, { color: theme.onBrand }, embossed(3)]}>{t.rating.placement.ribbon}</Text>
        ) : (
          <Stamp key={shownTier} delay={skipped ? 0 : swapped && moves ? 0 : T.frame} from={skipped ? 1 : 1.4}>
            <Text
              style={[styles.league, { color: metal.accent }, embossed(3)]}
              accessibilityLabel={t.tiers.league(shownTier)}
            >
              {t.tiers.league(shownTier)}
            </Text>
          </Stamp>
        )}

        {banner && swapped ? (
          <Stamp delay={skipped ? 0 : bannerAt - swapAt} from={skipped ? 1 : 2.2}>
            <StageBanner
              label={banner}
              accessibilityLabel={
                story === 'down' ? words.demoted(tier) : story === 'up' ? words.promoted(tier) : words.placed(tier)
              }
              tone={story === 'down' ? 'bad' : 'gold'}
              icon={story === 'down' ? 'trendDown' : 'crown'}
            />
          </Stamp>
        ) : null}

        <View style={styles.eloRow}>
          <CountUp
            value={after}
            from={story === 'reveal' ? 0 : before}
            format={(value) => t.rating.elo(t.fmt.score(Math.round(value)))}
            delay={skipped ? 0 : T.count}
            duration={skipped ? 0 : T.countMs}
            style={[styles.elo, { color: theme.gold }, embossed(4)]}
          />
          {story === 'reveal' ? null : (
            <Stamp delay={skipped ? 0 : deltaAt} from={skipped ? 1 : 2.4}>
              <Delta value={rating.delta} />
            </Stamp>
          )}
        </View>

        <LeagueBar
          story={story}
          from={progressIn(tierBefore, before)}
          to={progressIn(tier, after)}
          skipped={skipped}
        />
        <Txt variant="meta" tone="onSolid" align="center">
          {next !== null && ceil !== null ? t.rating.toNext(next, t.fmt.score(ceil - after)) : t.rating.noCeiling}
        </Txt>

        <Stamp delay={skipped ? 0 : linesAt} from={skipped ? 1 : 1.2}>
          <View style={styles.lines}>
            <ScoreLine score={score} target={rating.target} />
            <View style={styles.tags}>
              {rating.kind === 'forfeit' ? (
                <Tag label={words.forfeit} tone="bad" icon="close" />
              ) : rating.target !== null ? (
                <Verdict score={score} target={rating.target} />
              ) : null}
              {rating.shielded ? <Tag label={words.shielded} tone="secondary" icon="shield" /> : null}
              {rating.difficulty > 0 ? (
                <Tag label={t.rating.difficulty(t.fmt.score(rating.difficulty))} tone="secondary" icon="flame" />
              ) : null}
              {rating.nextDifficulty !== null && rating.nextDifficulty !== rating.difficulty ? (
                <Tag
                  label={words.nextDifficulty(t.fmt.score(rating.nextDifficulty))}
                  tone={rating.nextDifficulty > rating.difficulty ? 'warn' : 'neutral'}
                  icon={rating.nextDifficulty > rating.difficulty ? 'trendUp' : 'trendDown'}
                />
              ) : null}
              {rating.nextTarget !== null ? (
                <Tag label={words.next(t.fmt.score(rating.nextTarget))} tone="neutral" icon="target" />
              ) : null}
            </View>
          </View>
        </Stamp>
      </BrandBand>
    </Animated.View>
  );
}

/** The move, big: a green slab going up, a red one going down, grey for none. */
function Delta({ value }: { value: number }) {
  const theme = useTheme();
  const t = useT();
  const tone = value > 0 ? 'ok' : value < 0 ? 'bad' : 'neutral';
  const colors = gemColors(theme, tone);
  return (
    <View
      testID="rating-delta"
      accessible
      accessibilityLabel={t.rating.result.deltaLabel(t.rating.delta(value))}
      style={[styles.delta, { backgroundColor: colors.solid, borderColor: theme.outline }]}
    >
      <View pointerEvents="none" style={[styles.deltaShine, { backgroundColor: withAlpha(theme.onBrand, 0.3) }]} />
      {value !== 0 ? (
        <Icon name={value > 0 ? 'trendUp' : 'trendDown'} size={22} color={colors.ink} strokeWidth={3} />
      ) : null}
      <Text style={[styles.deltaText, { color: colors.ink }]}>{t.rating.delta(value)}</Text>
    </View>
  );
}

/** The league's bar: from where the rating stood to where it lands — over the edge and into the next league on a move. */
function LeagueBar({ story, from, to, skipped }: { story: Story; from: number; to: number; skipped: boolean }) {
  const theme = useTheme();
  const fill = useSharedValue(skipped ? to : story === 'reveal' ? 0 : from);

  useEffect(() => {
    cancelAnimation(fill);
    if (skipped) {
      fill.value = to;
      return;
    }
    const ease = Easing.out(Easing.cubic);
    if (story === 'up' || story === 'down') {
      const edge = story === 'up' ? 1 : 0;
      fill.value = withDelay(
        T.count,
        withSequence(
          withTiming(edge, { duration: T.fillMs, easing: Easing.in(Easing.quad) }),
          withDelay(T.banner - T.count - T.fillMs, withTiming(1 - edge, { duration: 0 })),
          withTiming(to, { duration: T.refillMs, easing: ease }),
        ),
      );
      return;
    }
    fill.value = withDelay(story === 'reveal' ? T.revealBanner : T.count, withTiming(to, { duration: T.countMs, easing: ease }));
  }, [fill, from, skipped, story, to]);

  const style = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  return (
    <View testID="league-bar" style={[styles.bar, styles.track, { backgroundColor: theme.well, borderColor: theme.outline }]}>
      <Animated.View style={[styles.fill, { backgroundColor: theme.gold }, style]}>
        <View pointerEvents="none" style={[styles.fillShine, { backgroundColor: withAlpha(theme.onBrand, 0.45) }]} />
      </Animated.View>
    </View>
  );
}

/** The frame that was: at the swap it flashes, grows a touch and fades away (or drops, on a fall). */
function Leaving({ at, story, children }: { at: number; story: Story; children: ReactNode }) {
  const out = useSharedValue(0);
  useEffect(() => {
    out.value = withDelay(at - 180, withTiming(1, { duration: 180, easing: Easing.in(Easing.quad) }));
  }, [at, out]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - out.value,
    transform:
      story === 'down'
        ? [{ translateY: out.value * 40 }, { scale: 1 - out.value * 0.2 }]
        : [{ scale: 1 + out.value * 0.15 }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** A burst of light over the frame as it changes — white going up, red coming down. */
function Flash({ at, on, bad }: { at: number; on: boolean; bad: boolean }) {
  const theme = useTheme();
  const glow = useSharedValue(0);
  useEffect(() => {
    if (!on) return;
    glow.value = withDelay(
      at - 120,
      withSequence(withTiming(1, { duration: 140 }), withTiming(0, { duration: 420, easing: Easing.out(Easing.quad) })),
    );
  }, [at, glow, on]);
  const style = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 0.6 + glow.value * 0.7 }],
  }));
  if (!on) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.flash, { backgroundColor: withAlpha(bad ? theme.bad : theme.onBrand, 0.85) }, style]}
    />
  );
}

/** Rays turning slowly behind a new frame. */
function Rays({ color, on, skipped }: { color: string; on: boolean; skipped: boolean }) {
  const reduced = useReducedMotion();
  const spin = useSharedValue(0);
  const shown = useSharedValue(skipped ? 1 : 0);
  useEffect(() => {
    if (!on) return;
    shown.value = skipped ? 1 : withTiming(1, { duration: 360 });
    if (reduced) return;
    spin.value = withRepeat(withTiming(1, { duration: 14000, easing: Easing.linear }), -1);
    return () => cancelAnimation(spin);
  }, [on, reduced, shown, skipped, spin]);
  const style = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ rotate: `${spin.value * 360}deg` }, { scale: 0.7 + shown.value * 0.3 }],
  }));
  if (!on) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.rays, style]}>
      <Spotlight size={RAYS} color={color} />
    </Animated.View>
  );
}

function ScoreLine({ score, target }: { score: number; target: number | null }) {
  const t = useT();
  const words = t.rating.result;
  return (
    <Txt variant="body" tone="onSolid" align="center">
      {target === null ? words.score(t.fmt.score(score)) : words.line(t.fmt.score(score), t.fmt.score(target))}
    </Txt>
  );
}

/** Whether the run beat its target: the one line that decides the move. */
function Verdict({ score, target }: { score: number; target: number }) {
  const t = useT();
  const words = t.rating.result.verdict;
  if (score > target) return <Tag label={words.beat} tone="ok" icon="check" />;
  if (score < target) return <Tag label={words.short} tone="bad" icon="close" />;
  return <Tag label={words.even} tone="neutral" icon="target" />;
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    borderBottomLeftRadius: RADIUS.overlay,
    borderBottomRightRadius: RADIUS.overlay,
    borderBottomWidth: DEPTH.outline + 2,
    gap: SPACE.sm,
    paddingBottom: SPACE.xl,
    paddingHorizontal: SPACE.xl,
  },
  frameBox: { alignItems: 'center', height: FRAME, justifyContent: 'center', width: FRAME },
  rays: { height: RAYS, left: (FRAME - RAYS) / 2, position: 'absolute', top: (FRAME - RAYS) / 2, width: RAYS },
  flash: { borderRadius: FRAME, height: FRAME, position: 'absolute', width: FRAME },
  league: { fontFamily: FONT.display, fontSize: 30, lineHeight: lh(36), textAlign: 'center' },
  eloRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, justifyContent: 'center' },
  elo: { fontFamily: FONT.display, fontSize: 46, lineHeight: lh(54) },
  delta: {
    alignItems: 'center',
    borderBottomWidth: DEPTH.outline + 3,
    borderRadius: RADIUS.pill,
    borderWidth: DEPTH.outline,
    flexDirection: 'row',
    gap: SPACE.xs,
    overflow: 'hidden',
    paddingHorizontal: SPACE.md,
    paddingVertical: 4,
  },
  deltaShine: { height: '45%', left: 6, position: 'absolute', right: 6, top: 2, borderRadius: RADIUS.pill },
  deltaText: { fontFamily: FONT.display, fontSize: 30, lineHeight: lh(36) },
  bar: { alignSelf: 'stretch' },
  track: { borderRadius: RADIUS.pill, borderWidth: 2, height: 18, overflow: 'hidden' },
  fill: { borderRadius: RADIUS.pill, height: '100%', minWidth: 10, overflow: 'hidden' },
  fillShine: { borderRadius: RADIUS.pill, height: 4, left: 5, position: 'absolute', right: 5, top: 2 },
  lines: { alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs, justifyContent: 'center' },
});
