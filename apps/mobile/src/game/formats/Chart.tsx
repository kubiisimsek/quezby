import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import type { Media } from '@/game/dress';
import { CARD, shout, sticker, useMediaWidth } from '@/game/formats/shared';
import { useT } from '@/i18n';
import { IS_RTL } from '@/i18n/native';
import { SPACE, TYPE } from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

type ChartMedia = Extract<Media, { format: 'chart' }>;

const HEIGHT = 124;
const INSET = 10;

/** The hours a day's chart counts, from nine to midnight. */
const HOURS = ['09', '12', '15', '18', '21', '24'];

/**
 * A line chart of one's life: its title and big figure, the line over faint
 * rules, and the week, the day or the half year under it. Right to left, time
 * runs the other way — the line is mirrored with its labels.
 */
export function Chart({ media, emoji }: { media: ChartMedia; emoji: string }) {
  const t = useT();
  const inner = useMediaWidth() - SPACE.md * 2;
  const labels =
    media.axis === 'days' ? t.game.post.days : media.axis === 'months' ? t.game.post.months : HOURS;
  const step = (inner - INSET * 2) / Math.max(1, media.points.length - 1);
  const at = media.points.map((point, i) => ({
    x: INSET + i * step,
    y: INSET + ((100 - point) / 100) * (HEIGHT - INSET * 2),
  }));

  return (
    <View testID="format-chart" style={CARD}>
      <View style={styles.top}>
        <Text style={styles.title} numberOfLines={1}>
          {media.title}
        </Text>
        {media.value ? <Text style={shout(22)}>{media.value}</Text> : null}
      </View>
      <View style={IS_RTL ? styles.mirrored : null}>
        <Svg width={inner} height={HEIGHT}>
          {[0.2, 0.5, 0.8].map((line) => (
            <Line key={line} x1={0} x2={inner} y1={HEIGHT * line} y2={HEIGHT * line} stroke={REEL.glass} strokeWidth={1} />
          ))}
          <Polyline
            points={at.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={REEL.ink}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {at.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={4.5} fill={REEL.outline} stroke={REEL.ink} strokeWidth={3} />
          ))}
        </Svg>
      </View>
      <View style={styles.axis}>
        {labels.slice(0, media.points.length).map((label) => (
          <Text key={label} style={styles.label}>
            {label}
          </Text>
        ))}
      </View>
      <Text style={[sticker(34), styles.sticker]}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'center', flexDirection: 'row', gap: SPACE.sm, justifyContent: 'space-between' },
  title: { ...TYPE.label, color: REEL.inkSoft, flexShrink: 1 },
  mirrored: { transform: [{ scaleX: -1 }] },
  axis: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACE.xxs },
  label: { ...TYPE.micro, color: REEL.inkFaint },
  sticker: { bottom: -18, end: -12, position: 'absolute', transform: [{ rotate: '12deg' }] },
});
