import { useEffect, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { formatScore } from '@/lib/format';
import { Icon } from '@/ui/icons';
import { BrandBand } from '@/ui/kit';
import { stagger } from '@/ui/motion';
import { DEPTH, FONT, RADIUS, SPACE, useTheme, withAlpha } from '@/ui/theme';

/**
 * The stage a board stands on: the brand's magenta running into violet,
 * across the top of the screen and rounded at its foot — or, `inset`, a tile
 * of its own further down — in the arena's outline, standing on its lip.
 * With `floor`, a platform runs along its foot for the podium's blocks to
 * stand on. It has no padding of its own: what stands on it sets its own,
 * so the floor can run from edge to edge.
 */
export function BoardStage({
  children,
  floor = false,
  inset = false,
  style,
}: {
  children?: ReactNode;
  floor?: boolean;
  inset?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <BrandBand
      style={[
        inset ? styles.inset : styles.bleed,
        { borderColor: theme.outline },
        style,
      ]}
    >
      {children}
      {floor ? (
        <View
          testID="stage-floor"
          style={[
            styles.floor,
            {
              backgroundColor: withAlpha(theme.outline, 0.38),
              borderTopColor: withAlpha(theme.onBrand, 0.24),
            },
          ]}
        />
      ) : null}
    </BrandBand>
  );
}

/** "5.120 oyuncu" — how many are on a board, on a dark pill for a stage. */
export function PlayersPill({ count }: { count: number }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: withAlpha(theme.outline, 0.5),
          borderColor: withAlpha(theme.onBrand, 0.22),
        },
      ]}
    >
      <Icon name="users" size={14} color={theme.onBrand} strokeWidth={2.6} />
      <Text style={[styles.pillText, { color: theme.onBrand }]}>
        {`${formatScore(count)} oyuncu`}
      </Text>
    </View>
  );
}

/**
 * A block arriving on a board that just opened: it rises a little and fades
 * in, `index` steps after the first. A phone that asks for less motion gets
 * it in place at once.
 */
export function useArrival(index = 0, from = 12) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      stagger(index) * 2,
      withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }),
    );
  }, [index, progress, reduced]);

  return useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * from }],
  }));
}

const styles = StyleSheet.create({
  bleed: {
    borderBottomLeftRadius: RADIUS.overlay,
    borderBottomRightRadius: RADIUS.overlay,
    borderBottomWidth: DEPTH.outline + DEPTH.lip,
    borderTopWidth: 0,
    borderWidth: DEPTH.outline,
  },
  inset: {
    borderBottomWidth: DEPTH.outline + DEPTH.lip,
    borderRadius: RADIUS.overlay,
    borderWidth: DEPTH.outline,
  },
  floor: { borderTopWidth: 2, height: 14 },
  pill: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    flexDirection: 'row',
    gap: SPACE.xs,
    paddingHorizontal: SPACE.ms,
    paddingVertical: 5,
  },
  pillText: {
    fontFamily: FONT.displayBold,
    fontSize: 13.5,
    fontVariant: ['tabular-nums'],
    lineHeight: 17,
  },
});
