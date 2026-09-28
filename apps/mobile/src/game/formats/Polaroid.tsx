import { StyleSheet, Text, View } from 'react-native';

import type { Dress, Media } from '@/game/dress';
import { sticker, tilt, useMediaWidth } from '@/game/formats/shared';
import { FONT, SPACE, lh } from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

type PolaroidMedia = Extract<Media, { format: 'polaroid' }>;

/**
 * A friend's instant photo: the emoji in a white frame, a note written under
 * it, a strip of tape — alone, or on top of the one taken before it.
 */
export function Polaroid({ media, emoji, dress }: { media: PolaroidMedia; emoji: string; dress: Dress }) {
  const width = useMediaWidth() * 0.7;
  const stacked = dress.layout === 1;
  return (
    <View testID="format-polaroid" style={{ width }}>
      {stacked ? (
        <View style={[styles.frame, styles.under, tilt(8 - dress.tilt)]}>
          <View style={[styles.shot, { backgroundColor: REEL.likeTiles[0] }]} />
          <View style={styles.noteSpace} />
        </View>
      ) : null}
      <View style={[styles.frame, tilt(stacked ? -4 : dress.tilt)]}>
        <View style={styles.tape} />
        <View style={styles.shot}>
          <Text style={sticker(92)}>{emoji}</Text>
        </View>
        <Text style={styles.note} numberOfLines={1}>
          {media.note}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: REEL.photo,
    borderRadius: 5,
    padding: SPACE.ms,
    paddingBottom: 0,
    shadowColor: REEL.outline,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
  },
  under: { ...StyleSheet.absoluteFill, opacity: 0.9 },
  shot: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: REEL.likeDeep,
    borderRadius: 2,
    justifyContent: 'center',
  },
  note: {
    color: REEL.likeDeep,
    fontFamily: FONT.bold,
    fontSize: 16,
    lineHeight: lh(22),
    paddingBottom: SPACE.md,
    paddingTop: SPACE.sm,
    textAlign: 'center',
  },
  noteSpace: { height: 42 },
  tape: {
    alignSelf: 'center',
    backgroundColor: REEL.tape,
    height: 18,
    position: 'absolute',
    top: -9,
    transform: [{ rotate: '-3deg' }],
    width: 64,
    zIndex: 1,
  },
});
