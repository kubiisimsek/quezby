import type { ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type AccessibilityRole,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { AnimatedPressable } from '@/ui/kit/shared';
import { SPRING_PRESS } from '@/ui/motion';
import { DEPTH, useTheme, withAlpha } from '@/ui/theme';

export type SlabColors = {
  /** The top of the face, where the light falls. */
  hi: string;
  /** The face. */
  face: string;
  /** The side under it — what the face sinks into when pressed. */
  lip: string;
};

/**
 * The game's button, as a slab: a face with a lit top on a darker lip, both
 * inside the arena's outline. Pressing sinks the face into its lip — the
 * whole thing moves, the way a real key does — and letting go springs it
 * back. Everything that can be pressed and is not a row or a tile is built
 * on this.
 */
export function Slab({
  colors,
  radius,
  lip = DEPTH.lip,
  onPress,
  disabled,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityState,
  hitSlop,
  style,
  faceStyle,
  gloss = true,
  testID,
  children,
}: {
  colors: SlabColors;
  radius: number;
  lip?: number;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  hitSlop?: number;
  /** The slab's box — width, margins, flex. */
  style?: StyleProp<ViewStyle>;
  /** The face's box — its height, padding and what is laid out on it. */
  faceStyle?: StyleProp<ViewStyle>;
  /** The candy highlight on the upper half. Off for a slab that sits flat. */
  gloss?: boolean;
  testID?: string;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const down = useSharedValue(0);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: down.value * lip }],
  }));

  const outline = {
    borderColor: theme.outline,
    borderRadius: radius,
    borderWidth: DEPTH.outline,
  };

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled), ...accessibilityState }}
      onPress={onPress}
      onPressIn={() => {
        down.value = withTiming(1, { duration: 60 });
      }}
      onPressOut={() => {
        down.value = withSpring(0, SPRING_PRESS);
      }}
      disabled={disabled || !onPress}
      hitSlop={hitSlop}
      style={[{ paddingBottom: lip }, style]}
    >
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          outline,
          { backgroundColor: colors.lip, top: lip },
        ]}
      />
      <Animated.View
        testID="slab-face"
        style={[
          outline,
          styles.face,
          { backgroundColor: colors.face },
          faceStyle,
          pressStyle,
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.hi,
            {
              backgroundColor: colors.hi,
              borderTopLeftRadius: radius,
              borderTopRightRadius: radius,
            },
          ]}
        />
        {gloss ? (
          <View
            pointerEvents="none"
            style={[
              styles.gloss,
              {
                backgroundColor: withAlpha(theme.onBrand, 0.22),
                borderRadius: Math.max(4, radius - 5),
              },
            ]}
          />
        ) : null}
        {children}
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  face: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  /** The face's lit half: the top shade of a two-tone slab. */
  hi: { height: '50%', left: 0, position: 'absolute', right: 0, top: 0 },
  gloss: {
    height: '36%',
    left: 7,
    position: 'absolute',
    right: 7,
    top: 4,
  },
});
