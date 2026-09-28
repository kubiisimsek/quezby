import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import type { Media } from '@/game/dress';
import { tilt, useMediaWidth } from '@/game/formats/shared';
import { useT } from '@/i18n';
import { FONT, SPACE, lh, tracking } from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

type ReceiptMedia = Extract<Media, { format: 'receipt' }>;

/** A barcode's bars and gaps in turn, in units. */
const BARS = [2, 1, 1, 2, 3, 1, 1, 1, 2, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 1, 2, 1, 3, 2, 1, 1, 2, 1, 1];

/**
 * A till receipt on its paper: the shop, its number and the time, the post's
 * own items first and the basket's filler after, the total and a barcode;
 * the paper's end torn in teeth. Prices in the language's own marks.
 */
export function Receipt({ media, angle }: { media: ReceiptMedia; angle: number }) {
  const t = useT();
  const width = useMediaWidth() * 0.8;
  const teeth = Math.floor(width / 12);
  // Bars and gaps take turns: even places are ink, odd ones paper.
  let x = 0;
  const bars: { x: number; width: number; key: number }[] = [];
  BARS.forEach((units, i) => {
    if (i % 2 === 0) bars.push({ x, width: units * 2, key: i });
    x += units * 2;
  });

  return (
    <View testID="format-receipt" style={[{ width }, tilt(angle)]}>
      <View style={styles.paper}>
        <Text style={styles.store} numberOfLines={1}>
          {media.store}
        </Text>
        <Text style={styles.meta}>
          {t.game.post.receipt(media.number)} · {media.time}
        </Text>
        <View style={styles.rule} />
        {media.lines.map((line, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.item} numberOfLines={1}>
              {line.qty > 1 ? `${line.text} ×${line.qty}` : line.text}
            </Text>
            <Text style={styles.price}>{t.fmt.price(line.qty * line.cents)}</Text>
          </View>
        ))}
        <View style={styles.rule} />
        <View style={styles.row}>
          <Text style={styles.total}>{t.game.post.total}</Text>
          <Text style={styles.total}>{t.fmt.price(media.total)}</Text>
        </View>
        <Svg width={x} height={26} style={styles.barcode}>
          {bars.map((bar) => (
            <Rect key={bar.key} x={bar.x} y={0} width={bar.width} height={26} fill={REEL.paperInk} />
          ))}
        </Svg>
      </View>
      <Svg width={width} height={9}>
        <Path
          d={`M0 0${Array.from({ length: teeth }, (_, i) => `L${i * 12 + 6} 9L${(i + 1) * 12} 0`).join('')}L${width} 0Z`}
          fill={REEL.paper}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    backgroundColor: REEL.paper,
    gap: SPACE.xs,
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.lg,
    paddingBottom: SPACE.sm,
  },
  store: {
    color: REEL.paperInk,
    fontFamily: FONT.display,
    fontSize: 18,
    letterSpacing: tracking(2),
    lineHeight: lh(22),
    textAlign: 'center',
  },
  meta: { color: REEL.paperFaint, fontFamily: FONT.medium, fontSize: 11, lineHeight: lh(14), textAlign: 'center' },
  rule: { borderColor: REEL.paperFaint, borderStyle: 'dashed', borderTopWidth: 1, marginVertical: SPACE.xs },
  row: { flexDirection: 'row', gap: SPACE.sm, justifyContent: 'space-between' },
  item: { color: REEL.paperInk, flex: 1, fontFamily: FONT.semibold, fontSize: 13, lineHeight: lh(18) },
  price: {
    color: REEL.paperInk,
    fontFamily: FONT.semibold,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    lineHeight: lh(18),
  },
  total: { color: REEL.paperInk, fontFamily: FONT.display, fontSize: 15, lineHeight: lh(20) },
  barcode: { alignSelf: 'center', marginTop: SPACE.sm },
});
