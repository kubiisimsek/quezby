import { StyleSheet, Text, View } from 'react-native';

import type { Dress, Media } from '@/game/dress';
import { sticker, useMediaWidth } from '@/game/formats/shared';
import { RADIUS, SPACE, TYPE } from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

type DumpMedia = Extract<Media, { format: 'dump' }>;

/**
 * A friend's photo dump: four photos in a grid of pinks — or the first one
 * big with the next peeking in, as a carousel shows it — and its page dots.
 */
export function Dump({ media, dress }: { media: DumpMedia; dress: Dress }) {
  const width = useMediaWidth() * 0.9;
  const carousel = dress.layout === 1;
  return (
    <View testID="format-dump" style={styles.block}>
      {carousel ? (
        <View style={[styles.carousel, { width, height: width * 0.9 }]}>
          <View style={[styles.tile, styles.big, { backgroundColor: REEL.likeTiles[1] }]}>
            <Text style={sticker(104)}>{media.photos[0]}</Text>
          </View>
          <View style={[styles.tile, styles.peek, { backgroundColor: REEL.likeTiles[0] }]}>
            <Text style={sticker(56)}>{media.photos[1]}</Text>
          </View>
          <View style={styles.count}>
            <Text style={styles.countText}>{`1/${media.photos.length}`}</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.grid, { width }]}>
          {media.photos.map((photo, i) => (
            <View key={i} style={[styles.cell, { backgroundColor: REEL.likeTiles[i % REEL.likeTiles.length] }]}>
              <Text style={sticker(46)}>{photo}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.dots}>
        {media.photos.map((_, i) => (
          <View key={i} style={[styles.dot, i === 0 ? styles.dotOn : null]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { alignItems: 'center', gap: SPACE.ms },
  grid: {
    borderColor: REEL.photo,
    borderRadius: 18,
    borderWidth: 3,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  cell: {
    alignItems: 'center',
    aspectRatio: 1,
    borderColor: REEL.photo,
    borderWidth: 1.5,
    justifyContent: 'center',
    width: '50%',
  },
  carousel: { flexDirection: 'row' },
  tile: { alignItems: 'center', borderColor: REEL.photo, borderRadius: 18, borderWidth: 3, justifyContent: 'center' },
  big: { flex: 1 },
  peek: { marginStart: SPACE.sm, width: '18%' },
  count: {
    backgroundColor: REEL.shade,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.xxs,
    position: 'absolute',
    end: '24%',
    top: SPACE.md,
  },
  countText: { ...TYPE.micro, color: REEL.ink },
  dots: { flexDirection: 'row', gap: SPACE.xs },
  dot: { backgroundColor: REEL.inkFaint, borderRadius: RADIUS.pill, height: 6, width: 6 },
  dotOn: { backgroundColor: REEL.ink, width: 16 },
});
