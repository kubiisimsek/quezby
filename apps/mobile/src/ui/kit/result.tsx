import type { BonusKind } from '@quezby/types';
import { StyleSheet, Text, View } from 'react-native';

import { ltr, useT } from '@/i18n';
import { type IconName } from '@/ui/icons';
import { IconChip, gemColors } from '@/ui/kit/identity';
import { Txt } from '@/ui/kit/text';
import { type TagTone } from '@/ui/kit/tones';
import { DEPTH, FONT, RADIUS, SPACE, embossed, lh, useTheme, withAlpha } from '@/ui/theme';


const BONUS_LOOK: Record<BonusKind, { icon: IconName; tone: TagTone }> = {
  flawless: { icon: 'star', tone: 'primary' },
  lightning: { icon: 'bolt', tone: 'warn' },
  coolHead: { icon: 'handStop', tone: 'secondary' },
  comeback: { icon: 'trendUp', tone: 'ok' },
};

/**
 * A named combo a run earned: what it is, how often, and what it paid. A
 * lifetime tally has no points to show and a guide no count; each is left
 * out when it is not given.
 */
export function BonusChip({
  kind,
  count,
  points,
}: {
  kind: BonusKind;
  count?: number;
  points?: number;
}) {
  const theme = useTheme();
  const t = useT();
  const look = BONUS_LOOK[kind];
  const gem = gemColors(theme, look.tone);
  const name = t.bonus[kind].name;
  const label = t.result.bonusChip({
    name,
    count,
    points: points === undefined ? undefined : { value: points, shown: t.fmt.score(points) },
  });

  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[
        styles.chip,
        {
          backgroundColor: withAlpha(gem.solid, 0.18),
          borderColor: theme.outline,
        },
      ]}
    >
      <IconChip icon={look.icon} tone={look.tone} size="sm" />
      <Text style={[styles.name, { color: theme.ink }]}>{name}</Text>
      {count !== undefined && count > 1 ? (
        <Text style={[styles.count, { color: gem.solid }]}>{ltr(`×${count}`)}</Text>
      ) : null}
      {points === undefined ? null : (
        <Text style={[styles.points, { color: gem.solid }, embossed(1.5)]}>
          {ltr(`+${t.fmt.score(points)}`)}
        </Text>
      )}
    </View>
  );
}

const JOINERS = new Set([0x200d, 0xfe0e, 0xfe0f, 0x20e3]);

/** A line split into what a reader sees as characters, so ⬛️ stays one square. */
function symbols(line: string): string[] {
  const out: string[] = [];
  for (const char of Array.from(line)) {
    const code = char.codePointAt(0) ?? 0;
    const previous = out[out.length - 1];
    const joins =
      JOINERS.has(code) ||
      (code >= 0x1f3fb && code <= 0x1f3ff) ||
      previous?.endsWith('‍');
    if (joins && previous !== undefined) {
      out[out.length - 1] = previous + char;
    } else if (char.trim() !== '') {
      out.push(char);
    }
  }
  return out;
}

/**
 * The share grid the server built for a run — one square per level —
 * set large, one square to a cell so every row lines up.
 */
export function ShareGrid({ grid }: { grid: string }) {
  const t = useT();
  const lines = grid
    .split('\n')
    .map(symbols)
    .filter((line) => line.length > 0);

  if (lines.length === 0) return null;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={t.result.shareGrid(grid)}
      style={styles.grid}
    >
      {lines.map((cells, row) => (
        <View key={row} style={styles.line}>
          {cells.map((cell, column) => (
            <View key={column} style={styles.cell}>
              <Txt style={styles.square}>{cell}</Txt>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderBottomWidth: DEPTH.outline + 2,
    borderRadius: RADIUS.pill,
    borderWidth: DEPTH.outline - 0.5,
    flexDirection: 'row',
    gap: SPACE.sm,
    paddingLeft: 4,
    paddingRight: SPACE.md,
    paddingVertical: 4,
  },
  name: { fontFamily: FONT.semibold, fontSize: 15, lineHeight: lh(19) },
  count: { fontFamily: FONT.display, fontSize: 13, lineHeight: lh(17) },
  points: { fontFamily: FONT.display, fontSize: 16, lineHeight: lh(20), marginLeft: SPACE.xxs },
  grid: { alignItems: 'center', gap: SPACE.xs },
  line: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.xs,
    justifyContent: 'center',
  },
  cell: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  square: { fontSize: 28, lineHeight: 34 },
});
