import { StyleSheet, Text, View } from 'react-native';

import type { Dress, Media } from '@/game/dress';
import { sticker, useMediaWidth } from '@/game/formats/shared';
import { useT } from '@/i18n';
import { RADIUS, SPACE, TYPE } from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

type CctvMedia = Extract<Media, { format: 'cctv' }>;

/**
 * A security camera's frame: its corners, the red REC, the camera and the
 * room, the running clock, and who walked in — alone, or over a row of the
 * other cameras' dark screens.
 */
export function Cctv({ media, emoji, dress }: { media: CctvMedia; emoji: string; dress: Dress }) {
  const t = useT();
  const width = useMediaWidth();
  const wall = dress.layout === 1;
  return (
    <View testID="format-cctv" style={[styles.block, { width }]}>
      <View style={[styles.frame, { height: width * (wall ? 0.62 : 0.78) }]}>
        <View style={[styles.corner, styles.topStart]} />
        <View style={[styles.corner, styles.topEnd]} />
        <View style={[styles.corner, styles.bottomStart]} />
        <View style={[styles.corner, styles.bottomEnd]} />
        <View style={[styles.row, styles.top]}>
          <View style={styles.rec}>
            <View style={styles.recDot} />
            <Text style={styles.label}>{t.game.post.rec}</Text>
          </View>
          <Text style={styles.label}>{t.game.post.camera(media.camera)}</Text>
        </View>
        <Text style={sticker(wall ? 72 : 96)}>{emoji}</Text>
        <View style={[styles.row, styles.bottom]}>
          <Text style={styles.label} numberOfLines={1}>
            {media.place}
          </Text>
          <Text style={[styles.label, styles.time]}>{media.time}</Text>
        </View>
      </View>
      {wall ? (
        <View style={styles.wall}>
          {[1, 2, 3].map((n) => (
            <View key={n} style={styles.screen}>
              <Text style={styles.small}>{t.game.post.camera(((media.camera + n - 1) % 8) + 1)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const CORNER = 22;

const styles = StyleSheet.create({
  block: { gap: SPACE.sm },
  frame: {
    alignItems: 'center',
    backgroundColor: REEL.shade,
    borderRadius: 18,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  corner: { borderColor: REEL.inkSoft, height: CORNER, position: 'absolute', width: CORNER },
  topStart: { borderStartWidth: 3, borderTopWidth: 3, start: SPACE.md, top: SPACE.md },
  topEnd: { borderEndWidth: 3, borderTopWidth: 3, end: SPACE.md, top: SPACE.md },
  bottomStart: { borderBottomWidth: 3, borderStartWidth: 3, bottom: SPACE.md, start: SPACE.md },
  bottomEnd: { borderBottomWidth: 3, borderEndWidth: 3, bottom: SPACE.md, end: SPACE.md },
  row: {
    alignItems: 'center',
    end: SPACE.xl + SPACE.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'absolute',
    start: SPACE.xl + SPACE.sm,
  },
  top: { top: SPACE.xl },
  bottom: { bottom: SPACE.xl, gap: SPACE.sm },
  rec: { alignItems: 'center', flexDirection: 'row', gap: SPACE.xs },
  recDot: { backgroundColor: REEL.freezeAlarm, borderRadius: RADIUS.pill, height: 10, width: 10 },
  label: { ...TYPE.label, color: REEL.ink },
  time: { fontVariant: ['tabular-nums'] },
  wall: { flexDirection: 'row', gap: SPACE.sm },
  screen: {
    alignItems: 'flex-start',
    backgroundColor: REEL.shade,
    borderRadius: 10,
    flex: 1,
    height: 58,
    padding: SPACE.sm,
  },
  small: { ...TYPE.micro, color: REEL.inkFaint },
});
