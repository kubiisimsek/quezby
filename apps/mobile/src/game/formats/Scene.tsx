import type { ContentKind } from '@quezby/config';
import { StyleSheet, Text, View } from 'react-native';

import { shout, sticker, tilt, useMediaWidth } from '@/game/formats/shared';
import type { Dress } from '@/game/dress';
import { RADIUS, SPACE } from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

/** How many emojis a wallpaper tiles: five across, eight down. */
const WALLPAPER = Array.from({ length: 40 }, (_, i) => i);

/**
 * The emoji as the post's photo, framed five ways: the disc the feed always
 * had, cropped huge under the caption's first words, in a white photo frame,
 * as a sticker on a wallpaper of itself, and under a spotlight.
 */
export function Scene({
  emoji,
  caption,
  kind,
  dress,
}: {
  emoji: string;
  caption: string;
  kind: ContentKind;
  dress: Dress;
}) {
  const width = useMediaWidth();
  const friend = kind === 'like';

  switch (dress.layout) {
    case 1:
      return (
        <View testID="scene-crop" style={[styles.photo, { width, height: width * 0.95 }]}>
          <Text style={[styles.crop, tilt(dress.tilt * 3)]}>{emoji}</Text>
          <Text style={[shout(28), styles.overlay]} numberOfLines={3}>
            {caption}
          </Text>
        </View>
      );
    case 2:
      return (
        <View testID="scene-frame" style={[styles.frame, { width: width * 0.72 }, tilt(dress.tilt)]}>
          <View style={styles.tape} />
          <View style={[styles.frameShot, friend ? styles.frameShotFriend : null]}>
            <Text style={sticker(96)}>{emoji}</Text>
          </View>
        </View>
      );
    case 3:
      return (
        <View testID="scene-wallpaper" style={[styles.photo, { width, height: width * 0.85 }]}>
          <View style={styles.wallpaper}>
            {WALLPAPER.map((i) => (
              <Text key={i} style={styles.wallpaperTile}>
                {emoji}
              </Text>
            ))}
          </View>
          <View style={[styles.badge, friend ? styles.badgeFriend : null, tilt(dress.tilt * 2)]}>
            <Text style={sticker(78)}>{emoji}</Text>
          </View>
        </View>
      );
    case 4:
      return (
        <View testID="scene-spotlight" style={[styles.spot, { width, height: width * 0.9 }]}>
          <View style={[styles.beam, { borderLeftWidth: width * 0.24, borderRightWidth: width * 0.24 }]} />
          <View style={styles.floor} />
          <Text style={[sticker(112), styles.onFloor]}>{emoji}</Text>
          <Text style={[sticker(30), styles.spark, tilt(dress.tilt * 3)]}>{dress.sticker}</Text>
        </View>
      );
    default:
      return (
        <View testID="scene-disc" style={[styles.disc, friend ? styles.discFriend : null]}>
          <Text style={styles.discEmoji}>{emoji}</Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  disc: {
    alignItems: 'center',
    backgroundColor: REEL.skipDisc,
    borderRadius: RADIUS.pill,
    height: 190,
    justifyContent: 'center',
    width: 190,
  },
  discFriend: { borderColor: REEL.likeGlow, borderWidth: 4 },
  discEmoji: { fontSize: 104, lineHeight: 124 },
  photo: {
    backgroundColor: REEL.glass,
    borderRadius: 24,
    overflow: 'hidden',
  },
  crop: {
    bottom: -60,
    fontSize: 250,
    left: -50,
    lineHeight: 290,
    position: 'absolute',
  },
  overlay: { padding: SPACE.xl, paddingEnd: SPACE.xxl },
  frame: {
    backgroundColor: REEL.photo,
    borderRadius: 6,
    padding: SPACE.ms,
    paddingBottom: SPACE.xxl + SPACE.md,
    shadowColor: REEL.outline,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
  },
  frameShot: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: REEL.shade,
    borderRadius: 2,
    justifyContent: 'center',
  },
  frameShotFriend: { backgroundColor: REEL.likeDeep },
  tape: {
    alignSelf: 'center',
    backgroundColor: REEL.tape,
    height: 18,
    position: 'absolute',
    top: -9,
    transform: [{ rotate: '4deg' }],
    width: 64,
    zIndex: 1,
  },
  wallpaper: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    flexWrap: 'wrap',
    opacity: 0.22,
    transform: [{ rotate: '-12deg' }, { scale: 1.3 }],
  },
  wallpaperTile: { fontSize: 24, lineHeight: 42, textAlign: 'center', width: '20%' },
  badge: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: REEL.photo,
    borderColor: REEL.outline,
    borderRadius: RADIUS.pill,
    borderWidth: 4,
    height: 136,
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
    width: 136,
  },
  badgeFriend: { borderColor: REEL.likeDeep },
  spot: { alignItems: 'center', justifyContent: 'flex-end' },
  beam: {
    borderBottomColor: REEL.glass,
    borderBottomWidth: 300,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    height: 0,
    position: 'absolute',
    top: 0,
    width: 40,
  },
  floor: {
    backgroundColor: REEL.shade,
    borderRadius: RADIUS.pill,
    bottom: SPACE.xl,
    height: 34,
    position: 'absolute',
    width: '62%',
  },
  onFloor: { marginBottom: SPACE.xl + 8 },
  spark: { position: 'absolute', right: '18%', top: '30%' },
});
