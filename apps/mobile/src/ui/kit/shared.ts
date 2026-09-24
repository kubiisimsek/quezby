import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { DEPTH, RADIUS, SPACE } from '@/ui/theme';

export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const common = StyleSheet.create({
  flex: { flex: 1 },
  /**
   * A tile: the arena's panel. The outline all round and a thicker bottom
   * edge — the slab's side — so it stands on the night instead of floating.
   */
  panel: {
    borderBottomWidth: DEPTH.outline + DEPTH.lip,
    borderRadius: RADIUS.panel,
    borderWidth: DEPTH.outline,
    gap: SPACE.xs,
    overflow: 'hidden',
    padding: SPACE.lg,
  },
  /** The lit top of a slab — a soft band across the upper third. */
  gloss: {
    left: SPACE.sm,
    position: 'absolute',
    right: SPACE.sm,
    top: 3,
  },
});
