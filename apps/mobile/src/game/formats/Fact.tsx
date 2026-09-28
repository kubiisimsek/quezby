import { StyleSheet, Text, View } from 'react-native';

import type { Dress, Media } from '@/game/dress';
import { shout, sticker } from '@/game/formats/shared';
import { useT } from '@/i18n';
import { SHRINK_TO_FIT } from '@/i18n/native';
import { RADIUS, SPACE, TYPE } from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

type FactMedia = Extract<Media, { format: 'fact' }>;

/**
 * One big number and what it counts, under a ribbon — standing on the reel,
 * or on a card with the post's emoji pinned to it.
 */
export function Fact({ media, emoji, dress }: { media: FactMedia; emoji: string; dress: Dress }) {
  const t = useT();
  const carded = dress.layout === 1;
  return (
    <View testID="format-fact" style={[styles.block, carded ? styles.card : null]}>
      <Text style={styles.ribbon}>{media.eyebrow ?? t.game.post.didYouKnow}</Text>
      <Text style={shout(64)} numberOfLines={1} adjustsFontSizeToFit={SHRINK_TO_FIT}>
        {media.big}
      </Text>
      <View style={styles.rule} />
      <Text style={styles.text}>{media.text}</Text>
      <Text style={[sticker(38), styles.sticker, { transform: [{ rotate: `${dress.tilt * 3}deg` }] }]}>
        {carded ? emoji : dress.sticker}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { alignItems: 'center', alignSelf: 'stretch', gap: SPACE.sm, paddingHorizontal: SPACE.md },
  card: {
    backgroundColor: REEL.glass,
    borderColor: REEL.glassStrong,
    borderRadius: 24,
    borderWidth: 1.5,
    paddingVertical: SPACE.xl,
  },
  ribbon: { ...TYPE.label, color: REEL.inkSoft, textAlign: 'center' },
  rule: { backgroundColor: REEL.glassStrong, borderRadius: RADIUS.pill, height: 5, width: 44 },
  text: { ...TYPE.heading, color: REEL.inkSoft, maxWidth: 270, textAlign: 'center' },
  sticker: { end: -4, position: 'absolute', top: -26 },
});
