import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Gradient } from '@/ui/kit';
import { SPACE, useTheme, withAlpha } from '@/ui/theme';

/** How far above the card the night starts to close over the list. */
const FADE = 40;
/** How dark the shelf under the card is. */
const SHELF = 0.88;

/**
 * Holds "Senin katın" at the bottom of a board, over the dock: the card
 * stands on a shelf of night that the list fades into as it slides under,
 * with room below it for the dock's play slab. It rises in once, when it
 * first has a board to stand on — or is simply there when the phone asks for
 * less motion — and reports its height so the list can leave that much room
 * under its last row.
 */
export function FloorDock({
  children,
  onHeight,
}: {
  children: ReactNode;
  onHeight: (height: number) => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const rise = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      rise.value = 1;
      return;
    }
    rise.value = withDelay(
      240,
      withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }),
    );
  }, [reduced, rise]);

  const style = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [{ translateY: (1 - rise.value) * 40 }],
  }));

  return (
    <Animated.View
      style={[styles.dock, style]}
      onLayout={(event) => onHeight(event.nativeEvent.layout.height)}
    >
      <View pointerEvents="none" style={styles.fade}>
        <Gradient
          from={theme.nightDeep}
          to={theme.nightDeep}
          fromOpacity={0}
          toOpacity={SHELF}
          vertical
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.shelf,
          { backgroundColor: withAlpha(theme.nightDeep, SHELF) },
        ]}
      />
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dock: {
    bottom: 0,
    left: 0,
    paddingBottom: SPACE.lg + SPACE.xxs,
    paddingHorizontal: SPACE.md,
    position: 'absolute',
    right: 0,
  },
  fade: { height: FADE, left: 0, position: 'absolute', right: 0, top: -FADE },
  shelf: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
});
