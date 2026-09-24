import { Children, useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { IconChip } from '@/ui/kit/identity';
import { common } from '@/ui/kit/shared';
import { tagPalette, toneColor, type TagTone, type Tone } from '@/ui/kit/tones';
import { Icon, type IconName } from '@/ui/icons';
import { DEPTH, FONT, RADIUS, SPACE, TYPE, embossed, useTheme } from '@/ui/theme';

/**
 * A status on a pill: a glyph (or a dot) and a few words, in the tone's colour
 * on its dark wash. Never colour alone.
 */
export function Tag({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: TagTone;
  icon?: IconName;
}) {
  const theme = useTheme();
  const colors = tagPalette(theme)[tone];

  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: colors.bg, borderColor: colors.border },
      ]}
    >
      {icon ? (
        <Icon name={icon} size={12} color={colors.fg} strokeWidth={2.8} />
      ) : (
        <View style={[styles.tagDot, { backgroundColor: colors.fg }]} />
      )}
      <Text style={[styles.tagText, { color: colors.fg }]}>{label}</Text>
    </View>
  );
}

export function Callout({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warn' | 'bad';
  title?: string;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const palette = {
    info: {
      bg: theme.secondarySoft,
      fg: theme.secondaryText,
      border: theme.secondaryLine,
      icon: 'info' as IconName,
    },
    warn: {
      bg: theme.warnSoft,
      fg: theme.warnText,
      border: theme.warnLine,
      icon: 'alert' as IconName,
    },
    bad: {
      bg: theme.badSoft,
      fg: theme.badText,
      border: theme.badLine,
      icon: 'alert' as IconName,
    },
  }[tone];

  return (
    <View
      style={[
        styles.callout,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}
    >
      <IconChip
        icon={palette.icon}
        tone={tone === 'info' ? 'secondary' : tone === 'warn' ? 'warn' : 'bad'}
        size="sm"
      />
      <View style={[common.flex, styles.calloutText]}>
        {title ? (
          <Text style={[TYPE.heading, { color: theme.ink }]}>{title}</Text>
        ) : null}
        {isText(children) ? (
          <Text style={[TYPE.meta, { color: palette.fg }]}>{children}</Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

/**
 * Copy alone — `"Bağlandı"`, or `Artık {name} ile girersin.`, which JSX hands
 * over as several strings — goes in the callout's own text; anything else is
 * laid out by whoever passed it.
 */
function isText(children: ReactNode): boolean {
  const parts = Children.toArray(children);
  return parts.length > 0 && parts.every((part) => typeof part === 'string' || typeof part === 'number');
}

/**
 * One number and what it counts, on a small tile: the gem says what, the
 * number under it says how much, in Rubik on its shadow, and its name sits
 * last on one line, shrinking rather than breaking a word. The app's only
 * metric surface.
 */
export function Stat({
  label,
  value,
  tone = 'ink',
  icon,
}: {
  label: string;
  value: string | number;
  tone?: Tone;
  icon?: IconName;
}) {
  const theme = useTheme();
  const pop = useSharedValue(0);

  useEffect(() => {
    pop.value = withTiming(1, { duration: 300 });
  }, [pop, value]);

  const style = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{ scale: 0.9 + pop.value * 0.1 }],
  }));

  return (
    <View
      style={[
        styles.stat,
        { backgroundColor: theme.tile, borderColor: theme.outline },
      ]}
    >
      <View pointerEvents="none" style={[styles.statEdge, { backgroundColor: theme.tileHi }]} />
      {icon ? <IconChip icon={icon} tone={STAT_GEM[tone]} size="sm" /> : null}
      <Animated.Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.statValue, { color: toneColor(theme, tone) }, embossed(2), style]}
      >
        {value}
      </Animated.Text>
      <Text
        style={[TYPE.micro, styles.statLabel, { color: theme.inkMuted }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {label}
      </Text>
    </View>
  );
}

/** A stat's gem follows its tone; an ordinary number gets violet. */
const STAT_GEM: Record<Tone, TagTone> = {
  ink: 'secondary',
  muted: 'neutral',
  faint: 'neutral',
  primary: 'primary',
  secondary: 'secondary',
  ok: 'ok',
  warn: 'warn',
  bad: 'bad',
  onSolid: 'secondary',
};

export function StatRow({ children }: { children: ReactNode }) {
  return <View style={styles.statRow}>{children}</View>;
}

export type StatItem = {
  label: string;
  value: string | number;
  icon?: IconName;
  tone?: Tone;
};

/**
 * Many `Stat`s in even columns — a run's or a player's numbers. A short last
 * row keeps its tiles the width of the rest.
 */
export function StatGrid({
  items,
  columns = 2,
}: {
  items: StatItem[];
  columns?: 2 | 3;
}) {
  if (items.length === 0) return null;

  const rows: StatItem[][] = [];
  for (let start = 0; start < items.length; start += columns) {
    rows.push(items.slice(start, start + columns));
  }

  return (
    <View style={styles.statGrid}>
      {rows.map((row, r) => (
        <View key={r} style={styles.statRow}>
          {row.map((item, c) => (
            <Stat
              key={`${r}-${c}`}
              label={item.label}
              value={item.value}
              icon={item.icon}
              tone={item.tone}
            />
          ))}
          {Array.from({ length: columns - row.length }, (_, c) => (
            <View key={`gap-${c}`} style={common.flex} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  tagDot: { borderRadius: RADIUS.pill, height: 6, width: 6 },
  tagText: { fontFamily: FONT.bold, fontSize: 12, lineHeight: 15 },
  callout: {
    alignItems: 'flex-start',
    borderRadius: RADIUS.control,
    borderWidth: 2,
    flexDirection: 'row',
    gap: SPACE.md,
    padding: SPACE.md,
  },
  calloutText: { gap: 2, paddingTop: 1 },
  stat: {
    alignItems: 'center',
    borderBottomWidth: DEPTH.outline + DEPTH.lipSm,
    borderRadius: RADIUS.control,
    borderWidth: DEPTH.outline,
    flex: 1,
    gap: SPACE.xs,
    overflow: 'hidden',
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.ms,
  },
  statEdge: { height: 3, left: 0, position: 'absolute', right: 0, top: 0 },
  statLabel: { alignSelf: 'stretch', textAlign: 'center' },
  statValue: { fontFamily: FONT.display, fontSize: 21, lineHeight: 26 },
  statRow: { flexDirection: 'row', gap: SPACE.ms },
  statGrid: { gap: SPACE.ms },
});
