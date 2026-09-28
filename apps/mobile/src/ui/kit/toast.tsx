import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';
import { IconChip } from '@/ui/kit/identity';
import { AnimatedPressable, common } from '@/ui/kit/shared';
import { Txt } from '@/ui/kit/text';
import { SPRING } from '@/ui/motion';
import { SPACE, useTheme } from '@/ui/theme';

/** How far above the screen a toast waits. */
const HIDDEN = -180;

/**
 * News that arrives while the game is open — a friend's request, a VS, a
 * phrase: a tile that drops in from the top with a bell on it and its own
 * words, opens what it is about when tapped, and slides back up by itself.
 * It keeps its words while it leaves.
 */
export function Toast({
  notice,
  onPress,
}: {
  notice: { title: string; body: string } | null;
  onPress: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState(notice);
  const y = useSharedValue(HIDDEN);

  useEffect(() => {
    if (notice) {
      setShown(notice);
      y.value = withSpring(0, SPRING);
      return;
    }
    y.value = withTiming(HIDDEN, { duration: 220 }, (done) => {
      if (done) runOnJS(setShown)(null);
    });
  }, [notice, y]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  if (!shown) return null;

  return (
    <View pointerEvents="box-none" style={[styles.dock, { top: insets.top + SPACE.sm }]}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${shown.title}. ${shown.body}`}
        accessibilityHint={t.kit.toast.open}
        onPress={onPress}
        style={[
          common.panel,
          styles.tile,
          { backgroundColor: theme.raised, borderColor: theme.outline },
          style,
        ]}
      >
        <IconChip icon="bell" tone="primary" size="md" />
        <View style={styles.text}>
          <Txt variant="heading" numberOfLines={1}>
            {shown.title}
          </Txt>
          <Txt variant="meta" tone="muted" numberOfLines={2}>
            {shown.body}
          </Txt>
        </View>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { left: SPACE.lg, position: 'absolute', right: SPACE.lg },
  tile: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACE.md,
    paddingVertical: SPACE.md,
  },
  text: { flex: 1, gap: 1 },
});
