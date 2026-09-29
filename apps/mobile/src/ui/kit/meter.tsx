import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { type TagTone } from '@/ui/kit/tones';
import { stagger } from '@/ui/motion';
import { RADIUS, useTheme, withAlpha } from '@/ui/theme';

/**
 * How far along something is, as a game's bar — a dark groove in the
 * outline, a bright fill with a shine along its top — that fills in on
 * arrival.
 *
 * A date alone says when; the bar says how close — a column of papers reads at
 * a glance as mostly full and one nearly empty. The fill is a status colour
 * and never the only signal: whatever sits beside it says the same in words.
 * `notches` cuts the groove into even steps — a league's quarters — so a
 * climb shows milestones on the way.
 */
export function Meter({
  value,
  tone = 'primary',
  index = 0,
  notches = 0,
}: {
  /** 0 to 1. */
  value: number;
  tone?: TagTone;
  /** Position in a list — meters fill one after another. */
  index?: number;
  /** Even steps cut across the bar: 4 draws three notches. */
  notches?: number;
}) {
  const theme = useTheme();
  const fill = useSharedValue(0);
  const color = {
    neutral: theme.inkFaint,
    primary: theme.primary,
    secondary: theme.secondaryHi,
    ok: theme.ok,
    warn: theme.gold,
    bad: theme.bad,
  }[tone];

  useEffect(() => {
    const target = Math.min(1, Math.max(0, value));
    fill.value = withDelay(
      stagger(index) + 120,
      withTiming(target, { duration: 620 }),
    );
  }, [fill, index, value]);

  const style = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View
      style={[
        meter.track,
        { backgroundColor: theme.well, borderColor: theme.outline },
      ]}
    >
      <Animated.View style={[meter.fill, { backgroundColor: color }, style]}>
        <View
          pointerEvents="none"
          style={[meter.shine, { backgroundColor: withAlpha(theme.onBrand, 0.45) }]}
        />
      </Animated.View>
      {Array.from({ length: Math.max(0, notches - 1) }, (_, step) => (
        <View
          key={step}
          testID="meter-notch"
          pointerEvents="none"
          style={[
            meter.notch,
            { backgroundColor: withAlpha(theme.outline, 0.7), left: `${((step + 1) * 100) / notches}%` },
          ]}
        />
      ))}
    </View>
  );
}

const meter = StyleSheet.create({
  track: {
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    height: 14,
    overflow: 'hidden',
  },
  fill: { borderRadius: RADIUS.pill, height: '100%', minWidth: 8, overflow: 'hidden' },
  shine: { borderRadius: RADIUS.pill, height: 3, left: 4, position: 'absolute', right: 4, top: 2 },
  notch: { bottom: 0, marginLeft: -1, position: 'absolute', top: 0, width: 2 },
});
