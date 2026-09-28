import { StyleSheet, Text, View } from 'react-native';

import type { Dress, Media } from '@/game/dress';
import { shout } from '@/game/formats/shared';
import { ltr } from '@/i18n/format';
import { IS_RTL } from '@/i18n/native';
import { FONT, SPACE, TYPE, lh } from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

type QuoteMedia = Extract<Media, { format: 'quote' }>;

/**
 * A quote card: the words big under an opening quotation mark and signed by
 * the account — or written on a note with a margin line.
 */
export function Quote({ media, user, dress }: { media: QuoteMedia; user: string; dress: Dress }) {
  const noted = dress.layout === 1;
  return (
    <View testID="format-quote" style={[styles.block, noted ? styles.note : null]}>
      <Text style={styles.mark}>{IS_RTL ? '”' : '“'}</Text>
      <Text style={[shout(media.text.length > 48 ? 22 : 26), styles.words]}>{media.text}</Text>
      <Text style={styles.sign}>{ltr(`— ${user}`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { alignSelf: 'stretch', gap: SPACE.sm, paddingHorizontal: SPACE.xs },
  note: {
    backgroundColor: REEL.shade,
    borderColor: REEL.glassStrong,
    borderRadius: 18,
    borderStartWidth: 6,
    padding: SPACE.xl,
  },
  mark: { color: REEL.glassStrong, fontFamily: FONT.display, fontSize: 84, height: 60, lineHeight: lh(96) },
  words: { textAlign: 'auto' },
  sign: { ...TYPE.heading, color: REEL.inkSoft },
});
