import type { Reel } from '@quezby/engine';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { lookOf } from '@/game/content';
import { reelGuide } from '@/game/howTo';
import { useT } from '@/i18n';
import { Icon, type IconName } from '@/ui/icons';
import { FONT, RADIUS, SPACE, TYPE, lh } from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

export type ReelValues = {
  dragY: SharedValue<number>;
  enter: SharedValue<number>;
  timer: SharedValue<number>;
  holdFill: SharedValue<number>;
  holding: SharedValue<number>;
};

const BADGE_ICON: Record<'like' | 'hold' | 'freeze', IconName> = {
  like: 'heart',
  hold: 'sparkle',
  freeze: 'handStop',
};

/**
 * One reel, full screen. A reel is content, not chrome: it wears the feed's
 * fixed colours (`reel` in the tokens) in both themes, and its kind reads
 * from the colour and the badge before a word of it is read.
 */
export function ReelCard({
  reel,
  seed,
  values,
  hint,
  paused = false,
}: {
  reel: Reel;
  seed: number;
  values: ReelValues;
  /** The intro teaches each kind once, in words. */
  hint: boolean;
  /** Waiting under a coach card: not live yet, so it holds still. */
  paused?: boolean;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const look = useMemo(() => lookOf(seed, reel, t.locale), [seed, reel, t.locale]);
  const copy = reelGuide(t)[reel.kind];
  const pulse = useSharedValue(0);

  // The reel is "playing": the one loop that means live.
  useEffect(() => {
    pulse.value = 0;
    if (paused) return undefined;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: reel.kind === 'freeze' ? 380 : 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: reel.kind === 'freeze' ? 380 : 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, [paused, pulse, reel.index, reel.kind]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: values.enter.value,
    transform: [{ translateY: values.dragY.value + (1 - values.enter.value) * 90 }],
  }));

  const discStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + pulse.value * 0.05 },
      { translateY: -pulse.value * 6 },
    ],
  }));

  const alarmStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.65,
  }));

  const timerStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, values.timer.value)) * 100}%`,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.card, { backgroundColor: look.background }, cardStyle]}
    >
      <View style={[styles.glow, styles.glowTop]} />
      <View style={[styles.glow, styles.glowBottom]} />

      {reel.kind === 'freeze' ? (
        <Animated.View style={[styles.alarm, alarmStyle]} />
      ) : null}

      <View style={[styles.center, { paddingTop: insets.top + 64 }]}>
        {copy.badge && reel.kind !== 'skip' ? (
          <View style={[styles.badge, reel.kind === 'freeze' ? styles.badgeAlarm : null]}>
            <Icon name={BADGE_ICON[reel.kind]} size={14} color={REEL.ink} strokeWidth={2.2} />
            <Text style={styles.badgeText}>{copy.badge}</Text>
          </View>
        ) : null}

        <Animated.View
          style={[
            styles.disc,
            reel.kind === 'like' ? styles.discLike : null,
            reel.kind === 'hold' ? styles.discHold : null,
            reel.kind === 'freeze' ? styles.discFreeze : null,
            discStyle,
          ]}
        >
          <Text style={styles.emoji}>{look.emoji}</Text>
        </Animated.View>

        {look.headline ? (
          <View style={styles.headlineBlock}>
            <Text style={styles.headline}>{look.headline}</Text>
            <Text style={styles.subline}>{look.caption}</Text>
          </View>
        ) : null}

        {reel.kind === 'hold' ? <HoldMeter reel={reel} values={values} /> : null}

        {hint && reel.kind !== 'hold' ? (
          <View style={styles.hint}>
            <Text style={styles.hintText}>{copy.hint}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.side, { bottom: insets.bottom + 110 }]}>
        <SideAction icon="heart" label={look.likes} />
        <SideAction icon="edit" label={look.comments} />
        <SideAction icon="share" label={t.game.post.share} />
      </View>

      {reel.kind !== 'freeze' ? (
        <View style={[styles.caption, { bottom: insets.bottom + 28 }]}>
          <Text style={styles.user}>{look.user}</Text>
          <Text style={styles.captionText} numberOfLines={2}>
            {look.caption}
          </Text>
        </View>
      ) : null}

      <View style={[styles.timerTrack, { bottom: insets.bottom + 10 }]}>
        <Animated.View
          style={[
            styles.timerFill,
            reel.kind === 'freeze' ? styles.timerAlarm : null,
            timerStyle,
          ]}
        />
      </View>
    </Animated.View>
  );
}

function SideAction({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.sideAction}>
      <Icon name={icon} size={30} color={REEL.ink} strokeWidth={2} />
      <Text style={styles.sideLabel}>{label}</Text>
    </View>
  );
}

/** The gold reel's bar: it fills while pressed; let go inside the green. */
function HoldMeter({ reel, values }: { reel: Reel; values: ReelValues }) {
  const t = useT();
  const zoneLeft = (reel.zoneCenter - reel.zoneHalf) / 10;
  const zoneWidth = (reel.zoneHalf * 2) / 10;

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.min(1, values.holdFill.value) * 100}%`,
  }));
  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 + values.holding.value * 0.35 }],
  }));

  return (
    <View style={styles.holdBlock}>
      <Animated.View style={[styles.holdTrack, trackStyle]}>
        <View style={[styles.holdZone, { left: `${zoneLeft}%`, width: `${zoneWidth}%` }]} />
        <Animated.View style={[styles.holdFill, fillStyle]} />
      </Animated.View>
      <Text style={styles.holdLabel}>{t.game.post.holdMeter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  glow: {
    borderRadius: RADIUS.pill,
    height: 420,
    position: 'absolute',
    width: 420,
  },
  glowTop: { backgroundColor: REEL.skipDisc, left: -160, top: -140 },
  glowBottom: { backgroundColor: REEL.shade, bottom: -180, right: -140 },
  alarm: {
    ...StyleSheet.absoluteFill,
    borderColor: REEL.freezeAlarm,
    borderWidth: 10,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: SPACE.xl,
    justifyContent: 'center',
    paddingBottom: 150,
    paddingHorizontal: SPACE.xxl,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: REEL.shade,
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
  },
  badgeAlarm: { backgroundColor: REEL.freezeAlarm },
  badgeText: { ...TYPE.heading, color: REEL.ink },
  disc: {
    alignItems: 'center',
    backgroundColor: REEL.skipDisc,
    borderRadius: RADIUS.pill,
    height: 190,
    justifyContent: 'center',
    width: 190,
  },
  discLike: { borderColor: REEL.likeGlow, borderWidth: 4 },
  discHold: { backgroundColor: REEL.holdDeep, borderColor: REEL.holdBar, borderWidth: 4 },
  discFreeze: { backgroundColor: REEL.shade, borderColor: REEL.freezeAlarm, borderWidth: 4 },
  emoji: { fontSize: 104, lineHeight: 124 },
  headlineBlock: { alignItems: 'center', gap: SPACE.xs },
  headline: { ...TYPE.display, color: REEL.ink, fontSize: 30, lineHeight: lh(36), textAlign: 'center' },
  subline: { ...TYPE.heading, color: REEL.inkSoft },
  hint: {
    backgroundColor: REEL.shade,
    borderRadius: RADIUS.control,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.ms,
  },
  hintText: { ...TYPE.heading, color: REEL.ink, textAlign: 'center' },
  side: {
    alignItems: 'center',
    gap: SPACE.xl,
    position: 'absolute',
    right: SPACE.lg,
  },
  sideAction: { alignItems: 'center', gap: 2 },
  sideLabel: { ...TYPE.micro, color: REEL.ink },
  caption: {
    gap: SPACE.xxs,
    left: SPACE.xl,
    position: 'absolute',
    right: 90,
  },
  user: { ...TYPE.heading, color: REEL.ink },
  captionText: { ...TYPE.body, color: REEL.inkSoft },
  timerTrack: {
    backgroundColor: REEL.track,
    borderRadius: RADIUS.pill,
    height: 4,
    left: SPACE.xl,
    overflow: 'hidden',
    position: 'absolute',
    right: SPACE.xl,
  },
  timerFill: { backgroundColor: REEL.ink, borderRadius: RADIUS.pill, height: '100%' },
  timerAlarm: { backgroundColor: REEL.freezeAlarm },
  holdBlock: { alignItems: 'center', alignSelf: 'stretch', gap: SPACE.ms },
  holdTrack: {
    alignSelf: 'stretch',
    backgroundColor: REEL.shade,
    borderColor: REEL.holdBar,
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    height: 26,
    overflow: 'hidden',
  },
  holdZone: {
    backgroundColor: REEL.holdZone,
    bottom: 0,
    position: 'absolute',
    top: 0,
  },
  holdFill: {
    backgroundColor: REEL.holdBar,
    borderRadius: RADIUS.pill,
    height: '100%',
    opacity: 0.85,
  },
  holdLabel: { ...TYPE.heading, color: REEL.ink, fontFamily: FONT.bold },
});
