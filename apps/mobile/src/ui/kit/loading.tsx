import { useEffect, type ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { IconChip } from '@/ui/kit/identity';
import { common } from '@/ui/kit/shared';
import { Txt } from '@/ui/kit/text';
import { type IconName } from '@/ui/icons';
import { RADIUS, SPACE, useTheme } from '@/ui/theme';

export function Loading() {
  const theme = useTheme();
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={theme.gold} size="large" />
    </View>
  );
}

/** A breathing placeholder. Beats a spinner for a list whose shape is known. */
export function Skeleton({
  height = 14,
  width = '100%',
  radius = RADIUS.control,
  style,
}: {
  height?: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const pulse = useSharedValue(0.5);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0.45, { duration: 700 }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        { backgroundColor: theme.fillActive, borderRadius: radius, height, width },
        animated,
        style,
      ]}
    />
  );
}

/** The shape of a list while it loads — three cards' worth of grey. */
export function SkeletonList({ rows = 3 }: { rows?: number }) {
  const theme = useTheme();
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: rows }).map((_, index) => (
        <View
          key={index}
          style={[
            common.panel,
            { backgroundColor: theme.tile, borderColor: theme.outline, gap: SPACE.ms },
          ]}
        >
          <Skeleton height={15} width="58%" />
          <Skeleton height={12} width="82%" />
          <Skeleton height={12} width="40%" />
        </View>
      ))}
    </View>
  );
}

export function EmptyState({
  title,
  hint,
  icon = 'sparkle',
  action,
}: {
  title: string;
  hint?: string;
  icon?: IconName;
  action?: ReactNode;
}) {
  const enter = useSharedValue(0);

  useEffect(() => {
    enter.value = withTiming(1, { duration: 420 });
  }, [enter]);

  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ scale: 0.92 + enter.value * 0.08 }],
  }));

  return (
    <View style={styles.centered}>
      <Animated.View style={[style, styles.emptyGem]}>
        <IconChip icon={icon} tone="primary" size="lg" />
      </Animated.View>
      <Txt variant="title" align="center">
        {title}
      </Txt>
      {hint ? (
        <Txt
          variant="meta"
          tone="muted"
          align="center"
          style={styles.emptyHint}
        >
          {hint}
        </Txt>
      ) : null}
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: SPACE.sm,
    justifyContent: 'center',
    padding: SPACE.xxl,
  },
  emptyGem: { marginBottom: SPACE.sm },
  emptyHint: { maxWidth: 260 },
  emptyAction: { marginTop: SPACE.md },
  skeletonList: { gap: SPACE.md },
});
