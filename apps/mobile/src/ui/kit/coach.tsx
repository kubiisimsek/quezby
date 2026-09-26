import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useT } from '@/i18n';
import { Icon, type IconName } from '@/ui/icons';
import { Button } from '@/ui/kit/buttons';
import { IconChip } from '@/ui/kit/identity';
import { Stamp } from '@/ui/kit/juice';
import { Panel } from '@/ui/kit/surfaces';
import { Ribbon, Txt } from '@/ui/kit/text';
import { type TagTone } from '@/ui/kit/tones';
import { DEPTH, RADIUS, SPACE, useTheme, withAlpha } from '@/ui/theme';

/** The move a coach card acts out: swipe up, double-tap, press and let go, or keep still. */
export type CoachGesture = 'swipe' | 'doubleTap' | 'hold' | 'still';

/** One play of the little demo; it plays twice, then rests on its last frame. */
const DEMO_MS = 1300;
const PLAYS = 2;

/**
 * A new kind of post, explained before it starts: a gem, a hand acting the
 * move out, the kind's name and one line, and the gold slab that starts the
 * post. The practice run shows one before the first post of each kind; the
 * post's clock only starts once it is put away.
 */
export function CoachCard({
  gesture,
  icon,
  tone,
  title,
  line,
  step,
  of,
  onDismiss,
}: {
  gesture: CoachGesture;
  icon: IconName;
  tone: TagTone;
  title: string;
  line: string;
  /** Which new kind this is, of how many: the ribbon's "2/4". */
  step: number;
  of: number;
  onDismiss: () => void;
}) {
  const t = useT();
  return (
    <Stamp from={1.12}>
      <Panel style={styles.card}>
        <Ribbon label={t.game.coach.ribbon(step, of)} />
        <View style={styles.stage}>
          <IconChip icon={icon} tone={tone} size="lg" />
          <Demo gesture={gesture} />
        </View>
        <View style={styles.words}>
          <Txt variant="display" align="center">
            {title}
          </Txt>
          <Txt variant="body" tone="muted" align="center">
            {line}
          </Txt>
        </View>
        <Button label={t.game.coach.start} icon="play" tone="play" onPress={onDismiss} />
      </Panel>
    </Stamp>
  );
}

/** The move, acted out by a hand — twice, then still; at once and still under reduced motion. */
function Demo({ gesture }: { gesture: CoachGesture }) {
  const reduced = useReducedMotion();
  const clock = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      clock.value = 1;
      return undefined;
    }
    clock.value = 0;
    clock.value = withRepeat(
      withTiming(1, { duration: DEMO_MS, easing: Easing.inOut(Easing.quad) }),
      PLAYS,
      false,
    );
    return () => cancelAnimation(clock);
  }, [clock, gesture, reduced]);

  return (
    <View
      testID={`coach-demo-${gesture}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.demo}
    >
      {gesture === 'swipe' ? <Swipe clock={clock} /> : null}
      {gesture === 'doubleTap' ? <DoubleTap clock={clock} /> : null}
      {gesture === 'hold' ? <Hold clock={clock} /> : null}
      {gesture === 'still' ? <Still clock={clock} /> : null}
    </View>
  );
}

function Swipe({ clock }: { clock: SharedValue<number> }) {
  const theme = useTheme();
  const hand = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(clock.value, [0, 0.2, 0.75, 1], [18, 18, -16, -16]) }],
  }));
  const trail = useAnimatedStyle(() => ({
    opacity: interpolate(clock.value, [0.2, 0.5, 1], [0, 1, 1]),
  }));
  return (
    <>
      <Animated.View style={[styles.trail, trail]}>
        <Icon name="arrowUp" size={22} color={theme.inkMuted} strokeWidth={2.5} />
      </Animated.View>
      <Animated.View style={hand}>
        <Icon name="hand" size={34} color={theme.ink} strokeWidth={2.2} />
      </Animated.View>
    </>
  );
}

function DoubleTap({ clock }: { clock: SharedValue<number> }) {
  const theme = useTheme();
  const hand = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(clock.value, [0, 0.15, 0.25, 0.35, 0.45, 1], [1, 0.8, 1, 0.8, 1, 1]) },
    ],
  }));
  const heart = useAnimatedStyle(() => ({
    opacity: interpolate(clock.value, [0.45, 0.55, 1], [0, 1, 1]),
    transform: [{ scale: interpolate(clock.value, [0.45, 0.6, 0.75, 1], [0.2, 1.25, 1, 1]) }],
  }));
  return (
    <>
      <Animated.View style={[styles.pop, heart]}>
        <Icon name="heart" size={24} color={theme.primary} fill={theme.primary} strokeWidth={2} />
      </Animated.View>
      <Animated.View style={hand}>
        <Icon name="hand" size={34} color={theme.ink} strokeWidth={2.2} />
      </Animated.View>
    </>
  );
}

/** The bar fills while the hand presses, and it lets go inside the green zone. */
function Hold({ clock }: { clock: SharedValue<number> }) {
  const theme = useTheme();
  const hand = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(clock.value, [0, 0.1, 0.8, 0.9, 1], [1, 0.84, 0.84, 1, 1]) }],
  }));
  const fill = useAnimatedStyle(() => ({
    width: `${interpolate(clock.value, [0.1, 0.8, 1], [0, 60, 60])}%`,
  }));
  return (
    <View style={styles.holdStage}>
      <Animated.View style={hand}>
        <Icon name="hand" size={30} color={theme.ink} strokeWidth={2.2} />
      </Animated.View>
      <View style={[styles.track, { backgroundColor: theme.well, borderColor: theme.outline }]}>
        <View style={[styles.zone, { backgroundColor: withAlpha(theme.ok, 0.55) }]} />
        <Animated.View style={[styles.fill, { backgroundColor: theme.gold }, fill]} />
      </View>
    </View>
  );
}

/** Hands off: the stop sign shakes its head, then holds still. */
function Still({ clock }: { clock: SharedValue<number> }) {
  const theme = useTheme();
  const hand = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(clock.value, [0, 0.1, 0.2, 0.3, 0.4, 0.5, 1], [0, -6, 6, -6, 6, 0, 0]) },
    ],
  }));
  return (
    <Animated.View style={hand}>
      <Icon name="handStop" size={34} color={theme.bad} strokeWidth={2.4} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'stretch', gap: SPACE.lg, padding: SPACE.xl },
  stage: { alignItems: 'center', flexDirection: 'row', gap: SPACE.xl, justifyContent: 'center' },
  words: { gap: SPACE.sm },
  demo: { alignItems: 'center', height: 72, justifyContent: 'center', width: 96 },
  trail: { position: 'absolute', top: 0 },
  pop: { position: 'absolute', right: 10, top: 4 },
  holdStage: { alignItems: 'center', gap: SPACE.sm },
  track: {
    borderRadius: RADIUS.pill,
    borderWidth: DEPTH.outline,
    height: 14,
    overflow: 'hidden',
    width: 88,
  },
  zone: { bottom: 0, left: '50%', position: 'absolute', top: 0, width: '20%' },
  fill: { bottom: 0, left: 0, opacity: 0.85, position: 'absolute', top: 0 },
});
