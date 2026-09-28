import { StyleSheet, Text, View } from 'react-native';

import type { Dress, Media } from '@/game/dress';
import { sticker, tilt } from '@/game/formats/shared';
import { FONT, RADIUS, SPACE, TYPE, lh } from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

type SignMedia = Extract<Media, { format: 'sign' }>;

/** A warning sign: a board on the tape, or a round red sign. */
export function Sign({ media, emoji, dress }: { media: SignMedia; emoji: string; dress: Dress }) {
  if (dress.layout === 1) {
    return (
      <View testID="format-sign" style={styles.round}>
        <Text style={sticker(34)}>{emoji}</Text>
        <Text style={[styles.big, styles.roundBig]} numberOfLines={2}>
          {media.sign}
        </Text>
        <Text style={[styles.small, styles.roundSmall]} numberOfLines={2}>
          {media.small}
        </Text>
      </View>
    );
  }
  return (
    <View testID="format-sign" style={[styles.board, tilt(dress.tilt / 2)]}>
      <Text style={sticker(34)}>{emoji}</Text>
      <Text style={styles.big} numberOfLines={2}>
        {media.sign}
      </Text>
      <Text style={styles.small} numberOfLines={2}>
        {media.small}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    alignItems: 'center',
    backgroundColor: REEL.sign,
    borderColor: REEL.freezeAlarm,
    borderRadius: 16,
    borderWidth: 5,
    gap: SPACE.xxs,
    maxWidth: 290,
    paddingHorizontal: SPACE.xl,
    paddingVertical: SPACE.md,
  },
  big: { color: REEL.signInk, fontFamily: FONT.display, fontSize: 28, lineHeight: lh(32), textAlign: 'center' },
  small: { ...TYPE.label, color: REEL.signInk, textAlign: 'center' },
  round: {
    alignItems: 'center',
    backgroundColor: REEL.freezeAlarm,
    borderColor: REEL.sign,
    borderRadius: RADIUS.pill,
    borderWidth: 7,
    gap: SPACE.xxs,
    height: 196,
    justifyContent: 'center',
    padding: SPACE.lg,
    width: 196,
  },
  roundBig: { color: REEL.ink, fontSize: 24, lineHeight: lh(28) },
  roundSmall: { color: REEL.ink },
});
