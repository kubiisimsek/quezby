import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { SPRING_POP } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

/**
 * Juice — what makes a moment land: a stamp, a number that climbs, a burst
 * of confetti, a shake. Each one plays once, when the game says so, never on
 * a loop; each stands down when the phone asks to reduce motion.
 */

/** A value slammed onto the screen: in big, then settling, after `delay` ms. */
export function Stamp({
  delay = 0,
  from = 1.8,
  style,
  children,
}: {
  delay?: number;
  /** How big it starts. */
  from?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const land = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      land.value = 1;
      return;
    }
    land.value = withDelay(delay, withSpring(1, SPRING_POP));
  }, [delay, land, reduced]);

  const stamp = useAnimatedStyle(() => ({
    opacity: Math.min(1, land.value * 1.6),
    transform: [{ scale: from - (from - 1) * land.value }],
  }));

  return <Animated.View style={[stamp, style]}>{children}</Animated.View>;
}

/**
 * A number that counts up to `value` — from `from`, 0 unless given, and down
 * when `from` is higher — fast at first, easing into the last digits, in
 * fixed-width figures so it does not wobble as it climbs. What a screen
 * reader hears is the final number, straight away — `said`'s words for it
 * when a picture beside it carries its unit.
 */
export function CountUp({
  value,
  from = 0,
  format,
  said,
  duration = 900,
  delay = 0,
  style,
  onDone,
}: {
  value: number;
  from?: number;
  format: (value: number) => string;
  said?: (value: number) => string;
  duration?: number;
  delay?: number;
  style?: StyleProp<TextStyle>;
  onDone?: () => void;
}) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : from);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (reduced || duration <= 0) {
      setShown(value);
      done.current?.();
      return;
    }
    let frame = 0;
    let start = 0;
    const wait = setTimeout(() => {
      const tick = (now: number) => {
        if (start === 0) start = now;
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - (1 - t) ** 3;
        setShown(Math.round(from + (value - from) * eased));
        if (t < 1) frame = requestAnimationFrame(tick);
        else done.current?.();
      };
      frame = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(wait);
      cancelAnimationFrame(frame);
    };
  }, [delay, duration, from, reduced, value]);

  return (
    <Text
      accessibilityLabel={(said ?? format)(value)}
      style={[styles.digits, style]}
    >
      {format(shown)}
    </Text>
  );
}

/**
 * A little shake — a miss, a wrong move — for whatever wears `style`. Call
 * `shake()` to play it once; it is 280 ms and a few points wide, a nudge
 * rather than an earthquake.
 */
export function useShake(distance = 7): {
  style: ReturnType<typeof useAnimatedStyle>;
  shake: () => void;
} {
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const shake = () => {
    if (reduced) return;
    const step = { duration: 40, easing: Easing.linear };
    x.value = withSequence(
      withTiming(-distance, step),
      withTiming(distance, step),
      withTiming(-distance * 0.6, step),
      withTiming(distance * 0.6, step),
      withTiming(-distance * 0.25, step),
      withTiming(0, step),
    );
  };
  return { style, shake };
}

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  size: number;
  color: string;
  delay: number;
  round: boolean;
};

const GRAVITY = 1500;
const LIFE_MS = 2000;

/**
 * A burst of confetti from the upper third of the screen, up and out and
 * raining down — a new record, a place climbed. `fire` starts it: pass a new
 * key (a count, a run id) to play it again. It draws nothing when the phone
 * asks to reduce motion, and never takes a touch.
 */
export function Confetti({
  fire,
  count = 56,
}: {
  /** Anything truthy plays the burst; a new value plays it again. */
  fire: number | string | boolean | null | undefined;
  count?: number;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);

  const pieces = useMemo<Piece[]>(() => {
    const colors = [theme.gold, theme.primary, theme.accent, theme.ok, theme.secondaryHi, theme.onBrand];
    return Array.from({ length: count }, (_, index) => ({
      x: width / 2 + (Math.random() - 0.5) * 80,
      y: height * 0.26,
      vx: (Math.random() - 0.5) * width * 1.6,
      vy: -(450 + Math.random() * 650),
      spin: (Math.random() - 0.5) * 1440,
      size: 7 + Math.random() * 7,
      color: colors[index % colors.length] ?? theme.gold,
      delay: Math.random() * 0.12,
      round: index % 4 === 0,
    }));
    // `fire` is here on purpose: a new burst gets new pieces.
  }, [count, width, height, fire, theme]);

  useEffect(() => {
    if (!fire || reduced) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration: LIFE_MS, easing: Easing.linear });
  }, [fire, progress, reduced]);

  if (!fire || reduced) return null;

  return (
    <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((piece, index) => (
        <ConfettiPiece key={index} piece={piece} progress={progress} />
      ))}
    </Animated.View>
  );
}

function ConfettiPiece({
  piece,
  progress,
}: {
  piece: Piece;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const t = Math.max(0, progress.value - piece.delay) * (LIFE_MS / 1000);
    const y = piece.y + piece.vy * t + (GRAVITY * t * t) / 2;
    const x = piece.x + piece.vx * t * 0.5;
    const fade = progress.value > 0.8 ? (1 - progress.value) / 0.2 : 1;
    return {
      opacity: progress.value <= 0 || progress.value >= 1 ? 0 : fade,
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${piece.spin * t}deg` },
        { rotateX: `${piece.spin * t * 0.7}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          backgroundColor: piece.color,
          borderRadius: piece.round ? piece.size : 2,
          height: piece.round ? piece.size : piece.size * 0.55,
          width: piece.size,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  digits: { fontVariant: ['tabular-nums'] },
  piece: { left: 0, position: 'absolute', top: 0 },
});
