import type { LeagueTier } from '@quezby/types';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useT } from '@/i18n';
import { tierColors } from '@/ui/kit/badges';
import { LeagueFrame } from '@/ui/kit/frame';
import { IconChip } from '@/ui/kit/identity';
import { QbCoin } from '@/ui/kit/qb';
import { DEPTH, FONT, RADIUS, SPACE, embossed, lh, useTheme, withAlpha } from '@/ui/theme';

/** The pill's height; what leads it is taller and stands over its start. */
const PILL = 30;

/**
 * A badge the way a game shows a rank: an outlined pill with its lip, and a
 * picture a size up standing over its start — a league's frame, the qb
 * coin, a gem. The profile and a player's card wear them in one row, all the
 * same height. What a screen reader hears is `said`.
 */
export function Chip({
  lead,
  leadSize,
  label,
  color,
  fill,
  said,
  testID,
}: {
  lead: ReactNode;
  /** The picture's box; it overhangs the pill's start by half of it. */
  leadSize: number;
  label: string;
  /** The words' colour, and the pill's edge. */
  color: string;
  fill: string;
  said: string;
  testID?: string;
}) {
  const theme = useTheme();
  const half = leadSize / 2;

  return (
    <View
      accessible
      accessibilityLabel={said}
      style={[styles.chip, { height: Math.max(PILL, leadSize) }]}
      testID={testID}
    >
      <View
        style={[
          styles.pill,
          {
            backgroundColor: fill,
            borderColor: theme.outline,
            marginStart: half,
            paddingStart: half + SPACE.sm,
          },
        ]}
      >
        <View pointerEvents="none" style={[styles.edge, { borderColor: withAlpha(color, 0.45) }]} />
        <Text numberOfLines={1} style={[styles.label, { color }, embossed(1.5)]}>
          {label}
        </Text>
      </View>
      <View style={[styles.lead, { height: leadSize, width: leadSize }]}>{lead}</View>
    </View>
  );
}

/** A player's league: its frame with the mark in the window, and its name in its metal. */
export function LeagueChip({ tier, animated = false }: { tier: LeagueTier; animated?: boolean }) {
  const t = useT();
  const theme = useTheme();
  const colors = tierColors(theme, tier);
  const name = t.tiers.league(tier);

  return (
    <Chip
      lead={<LeagueFrame tier={tier} size={40} animated={animated} />}
      leadSize={40}
      label={name}
      color={colors.solid}
      fill={colors.soft}
      said={name}
      testID={`league-chip-${tier}`}
    />
  );
}

/** A qb amount: the coin, and the number in gold — the coin says what it counts. */
export function QbChip({ value }: { value: number }) {
  const t = useT();
  const theme = useTheme();
  const amount = t.fmt.score(value);

  return (
    <Chip
      lead={<QbCoin size={34} />}
      leadSize={34}
      label={amount}
      color={theme.gold}
      fill={theme.goldInk}
      said={t.rating.elo(amount)}
      testID="qb-chip"
    />
  );
}

/** A warning worn as a badge — a guest account: its gem, and its words. */
export function WarnChip({ label }: { label: string }) {
  const theme = useTheme();

  return (
    <Chip
      lead={<IconChip icon="alert" tone="warn" size="sm" />}
      leadSize={30}
      label={label}
      color={theme.warnText}
      fill={theme.warnSoft}
      said={label}
    />
  );
}

const styles = StyleSheet.create({
  chip: { alignItems: 'center', flexDirection: 'row' },
  pill: {
    alignItems: 'center',
    borderBottomWidth: DEPTH.outline + 2,
    borderRadius: RADIUS.pill,
    borderWidth: DEPTH.outline,
    flexDirection: 'row',
    height: PILL + 2,
    paddingEnd: SPACE.md,
  },
  /** A thin line of the chip's colour inside the dark outline. */
  edge: {
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    bottom: 0,
    end: 0,
    position: 'absolute',
    start: 0,
    top: 0,
  },
  label: { fontFamily: FONT.display, fontSize: 14, lineHeight: lh(18) },
  lead: { alignItems: 'center', justifyContent: 'center', position: 'absolute', start: 0 },
});
