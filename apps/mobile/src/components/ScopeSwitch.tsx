import type { LeaderboardScope } from '@quezby/types';
import { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useT } from '@/i18n';
import { Icon, type IconName } from '@/ui/icons';
import { AnimatedPressable } from '@/ui/kit/shared';
import { SPRING, usePressScale } from '@/ui/motion';
import { DEPTH, FONT, RADIUS, SPACE, embossed, lh, useTheme, withAlpha } from '@/ui/theme';

/** The two sides, in order; their words are `t.board.scopes`. */
const OPTIONS: Array<{ value: LeaderboardScope; icon: IconName }> = [
  { value: 'everyone', icon: 'users' },
  { value: 'friends', icon: 'userCheck' },
];

/**
 * Who a board is among — everyone, or the players you follow — as a game's
 * two-way switch: a dark well cut into the stage, with the side that is on
 * raised out of it as a magenta slab. The slab springs across when the other
 * side is tapped, so the change reads as a move and not a blink; a phone
 * that asks for less motion sees it land at once.
 */
export function ScopeSwitch({
  value,
  onChange,
  style,
}: {
  value: LeaderboardScope;
  onChange: (value: LeaderboardScope) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const t = useT();
  const reduced = useReducedMotion();
  const index = Math.max(
    0,
    OPTIONS.findIndex((option) => option.value === value),
  );
  const side = useSharedValue(index);

  useEffect(() => {
    side.value = reduced ? index : withSpring(index, SPRING);
  }, [index, reduced, side]);

  const slab = useAnimatedStyle(() => ({
    left: `${side.value * 50}%` as const,
  }));

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.track,
        {
          backgroundColor: withAlpha(theme.outline, 0.5),
          borderColor: theme.outline,
        },
        style,
      ]}
    >
      <View pointerEvents="none" style={styles.rail}>
        <Animated.View
          style={[
            styles.slab,
            {
              backgroundColor: theme.primary,
              borderBottomColor: theme.primaryLip,
              borderColor: theme.outline,
            },
            slab,
          ]}
        >
          <View style={[styles.slabHi, { backgroundColor: theme.primaryHi }]} />
          <View
            style={[
              styles.slabGloss,
              { backgroundColor: withAlpha(theme.onBrand, 0.24) },
            ]}
          />
        </Animated.View>
      </View>
      {OPTIONS.map((option) => (
        <Option
          key={option.value}
          label={t.board.scopes[option.value]}
          icon={option.icon}
          on={option.value === value}
          onPress={() => {
            if (option.value !== value) onChange(option.value);
          }}
        />
      ))}
    </View>
  );
}

function Option({
  label,
  icon,
  on,
  onPress,
}: {
  label: string;
  icon: IconName;
  on: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const press = usePressScale(0.94);
  const color = on ? theme.onBrand : theme.inkMuted;

  return (
    <AnimatedPressable
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[styles.option, press.style]}
    >
      <Icon name={icon} size={16} color={color} strokeWidth={2.6} />
      <Text
        numberOfLines={1}
        style={[styles.label, { color }, on ? embossed(1.5) : null]}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const INSET = 3;
/** The raised slab's side: what the face stands on inside the well. */
const SLAB_LIP = 3;

const styles = StyleSheet.create({
  track: {
    borderRadius: RADIUS.control + 2,
    borderWidth: DEPTH.outline,
    flexDirection: 'row',
    padding: INSET,
  },
  rail: {
    bottom: INSET,
    left: INSET,
    position: 'absolute',
    right: INSET,
    top: INSET,
  },
  slab: {
    borderBottomWidth: DEPTH.outline + SLAB_LIP,
    borderRadius: RADIUS.control - INSET,
    borderWidth: DEPTH.outline,
    bottom: 0,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    width: '50%',
  },
  slabHi: { height: '48%', left: 0, position: 'absolute', right: 0, top: 0 },
  slabGloss: {
    borderRadius: RADIUS.pill,
    height: 4,
    left: SPACE.sm,
    position: 'absolute',
    right: SPACE.sm,
    top: 3,
  },
  option: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: SPACE.sm,
    justifyContent: 'center',
    minHeight: 44,
    paddingBottom: SLAB_LIP,
    paddingHorizontal: SPACE.md,
  },
  label: { fontFamily: FONT.display, fontSize: 15, lineHeight: lh(19) },
});
