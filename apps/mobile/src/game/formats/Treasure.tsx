import { StyleSheet, Text, View } from 'react-native';

import type { Dress } from '@/game/dress';
import { sticker } from '@/game/formats/shared';
import { RADIUS, SPACE } from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

/**
 * A gold post's prize: on a pedestal in the burst of light behind it, or set
 * in a medallion with sparks around. Small enough to leave the hold bar room.
 */
export function Treasure({ emoji, dress }: { emoji: string; dress: Dress }) {
  if (dress.layout === 1) {
    return (
      <View testID="format-treasure" style={styles.medallion}>
        <Text style={sticker(80)}>{emoji}</Text>
        <Text style={[sticker(24), styles.sparkA]}>✨</Text>
        <Text style={[sticker(18), styles.sparkB]}>✨</Text>
      </View>
    );
  }
  return (
    <View testID="format-treasure" style={styles.stand}>
      <Text style={[sticker(92), styles.prize]}>{emoji}</Text>
      <View style={styles.pedestal} />
    </View>
  );
}

const styles = StyleSheet.create({
  stand: { alignItems: 'center' },
  prize: { marginBottom: -SPACE.xl, zIndex: 1 },
  pedestal: {
    backgroundColor: REEL.holdDeep,
    borderRadius: RADIUS.pill,
    borderTopColor: REEL.holdBar,
    borderTopWidth: 4,
    height: 30,
    width: 132,
  },
  medallion: {
    alignItems: 'center',
    backgroundColor: REEL.holdDeep,
    borderColor: REEL.holdBar,
    borderRadius: RADIUS.pill,
    borderWidth: 6,
    height: 160,
    justifyContent: 'center',
    width: 160,
  },
  sparkA: { position: 'absolute', end: -10, top: 4 },
  sparkB: { bottom: 10, position: 'absolute', start: -8 },
});
