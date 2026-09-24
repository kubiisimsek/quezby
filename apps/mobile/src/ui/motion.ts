import { useCallback, useEffect } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';

/**
 * The app's motion language.
 *
 * Two rules, and every animation in the app follows them:
 *
 *   1. Anything a finger drives is a **spring** — it has to be able to catch
 *      the gesture mid-flight and inherit its velocity. A sheet, a press, a
 *      tab pill.
 *   2. Anything the app drives on its own is a **timing** curve — a scrim
 *      fading, a skeleton breathing. Springs there just read as wobble.
 *
 * The numbers are stiffness/damping pairs rather than durations because a
 * spring that is retargeted mid-flight has no duration to speak of.
 */

/** Sheets, pills, anything that lands under a thumb. Settles in ~280ms. */
export const SPRING: WithSpringConfig = {
  stiffness: 220,
  damping: 26,
  mass: 1,
  overshootClamping: false,
};

/** Press feedback. Stiffer and fully damped — a button must not wobble. */
export const SPRING_PRESS: WithSpringConfig = {
  stiffness: 420,
  damping: 34,
  mass: 0.7,
  overshootClamping: true,
};

/** The one place a little overshoot is welcome: a value appearing from nothing. */
export const SPRING_POP: WithSpringConfig = {
  stiffness: 260,
  damping: 18,
  mass: 0.9,
};

/** Scrims, cross-fades, skeletons. */
export const FADE: WithTimingConfig = {
  duration: 200,
  easing: Easing.out(Easing.quad),
};

export const FADE_OUT: WithTimingConfig = {
  duration: 160,
  easing: Easing.in(Easing.quad),
};

/** Entrance stagger. Row `i` waits `i * STAGGER_MS`, capped so long lists
 *  do not make the last row arrive a second late. */
export const STAGGER_MS = 45;
export const STAGGER_CAP = 6;

export function stagger(index: number): number {
  return Math.min(index, STAGGER_CAP) * STAGGER_MS;
}

/**
 * Press feedback for any custom-drawn control.
 *
 * Returns a style and the two handlers to spread onto a `Pressable`. Scale
 * rather than opacity: opacity on a card dims whatever sits behind it.
 */
export function usePressScale(to = 0.97) {
  const scale = useSharedValue(1);

  const onPressIn = useCallback(() => {
    scale.value = withSpring(to, SPRING_PRESS);
  }, [scale, to]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_PRESS);
  }, [scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { style, onPressIn, onPressOut };
}

/** Clamp a value into a range on the UI thread. */
export function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

/** A fade driven by a boolean, for scrims and overlays. */
export function useFade(visible: boolean) {
  const opacity = useSharedValue(visible ? 1 : 0);
  opacity.value = withTiming(visible ? 1 : 0, visible ? FADE : FADE_OUT);
  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

/**
 * A block arriving on a screen that just opened: it rises a little and fades
 * in, `index` steps after the first. The app drives it, so it is a timing
 * curve; pass `from` to rise from further for a hero. With reduced motion it
 * is simply there.
 */
export function useEntrance(index = 0, from = 14) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      stagger(index) * 2,
      withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }),
    );
  }, [index, progress, reduced]);

  return useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * from }],
  }));
}
