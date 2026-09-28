import { StyleSheet, Text, View } from 'react-native';

import type { Media } from '@/game/dress';
import { FONT, SPACE, TYPE, lh, withAlpha } from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

type TierMedia = Extract<Media, { format: 'tier' }>;

/** The rows' letters, best first; each a little dimmer than the one above. */
const TIERS = [
  { letter: 'S', light: 0.95 },
  { letter: 'A', light: 0.78 },
  { letter: 'B', light: 0.6 },
  { letter: 'C', light: 0.42 },
];

/** A tier list: its title and four rows, S to C, of emoji. */
export function Tier({ media }: { media: TierMedia }) {
  return (
    <View testID="format-tier" style={styles.list}>
      <Text style={styles.title} numberOfLines={1}>
        {media.title}
      </Text>
      {TIERS.map((tier, i) => (
        <View key={tier.letter} style={styles.row}>
          <View style={[styles.letterCell, { backgroundColor: withAlpha(REEL.ink, tier.light) }]}>
            <Text style={styles.letter}>{tier.letter}</Text>
          </View>
          <View style={styles.items}>
            {(media.rows[i] ?? []).map((item, k) => (
              <Text key={k} style={styles.item}>
                {item}
              </Text>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { alignSelf: 'stretch', gap: SPACE.xs },
  title: { ...TYPE.label, color: REEL.inkSoft, marginBottom: SPACE.xs, textAlign: 'center' },
  row: { backgroundColor: REEL.shade, borderRadius: 12, flexDirection: 'row', height: 48, overflow: 'hidden' },
  letterCell: { alignItems: 'center', justifyContent: 'center', width: 44 },
  letter: { color: REEL.outline, fontFamily: FONT.display, fontSize: 20, lineHeight: lh(24) },
  items: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: SPACE.sm, paddingHorizontal: SPACE.md },
  item: { fontSize: 26, lineHeight: 32 },
});
