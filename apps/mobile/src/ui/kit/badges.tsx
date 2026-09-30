import type { LeagueTier } from '@quezby/types';
import { StyleSheet, Text, View } from 'react-native';
import { useT } from '@/i18n';
import { LeagueFrame } from '@/ui/kit/frame';
import { Icon } from '@/ui/icons';
import { FONT, RADIUS, SPACE, embossed, useTheme, withAlpha, type Theme } from '@/ui/theme';

export type MedalRank = 1 | 2 | 3;

/** The metal of a podium place: the coin, its rim, its glyph, and a wash. */
export function medalColors(
  theme: Theme,
  rank: MedalRank,
): { solid: string; soft: string; ink: string; lip: string } {
  switch (rank) {
    case 1:
      return {
        solid: theme.medalGold,
        soft: theme.medalGoldSoft,
        ink: theme.medalGoldInk,
        lip: theme.medalGoldLip,
      };
    case 2:
      return {
        solid: theme.medalSilver,
        soft: theme.medalSilverSoft,
        ink: theme.medalSilverInk,
        lip: theme.medalSilverLip,
      };
    default:
      return {
        solid: theme.medalBronze,
        soft: theme.medalBronzeSoft,
        ink: theme.medalBronzeInk,
        lip: theme.medalBronzeLip,
      };
  }
}

const MEDAL_SIZE = {
  sm: { box: 24, glyph: 13 },
  md: { box: 30, glyph: 16 },
  lg: { box: 38, glyph: 21 },
} as const;

/**
 * First, second or third as a coin in its metal — a crown for the winner, a
 * medal for the others — with a rim and the outline, like a game's badge.
 */
export function MedalBadge({
  rank,
  size = 'md',
}: {
  rank: MedalRank;
  size?: 'sm' | 'md' | 'lg';
}) {
  const theme = useTheme();
  const t = useT();
  const colors = medalColors(theme, rank);
  const { box, glyph } = MEDAL_SIZE[size];

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={t.board.place(rank)}
      style={[
        styles.medal,
        {
          backgroundColor: colors.lip,
          borderColor: theme.outline,
          height: box,
          width: box,
        },
      ]}
    >
      <View
        testID="medal-coin"
        style={[
          styles.coin,
          { backgroundColor: colors.solid, borderRadius: box },
        ]}
      >
        <View
          pointerEvents="none"
          style={[styles.coinShine, { backgroundColor: withAlpha(theme.onBrand, 0.35) }]}
        />
        <Icon
          name={rank === 1 ? 'crown' : 'medal'}
          size={glyph}
          color={colors.ink}
          strokeWidth={2.6}
        />
      </View>
    </View>
  );
}


export function tierColors(
  theme: Theme,
  tier: LeagueTier,
): { solid: string; soft: string } {
  switch (tier) {
    case 'bronze':
      return { solid: theme.tierBronze, soft: theme.tierBronzeSoft };
    case 'silver':
      return { solid: theme.tierSilver, soft: theme.tierSilverSoft };
    case 'gold':
      return { solid: theme.tierGold, soft: theme.tierGoldSoft };
    case 'platinum':
      return { solid: theme.tierPlatinum, soft: theme.tierPlatinumSoft };
    case 'diamond':
      return { solid: theme.tierDiamond, soft: theme.tierDiamondSoft };
    default:
      return { solid: theme.tierMaster, soft: theme.tierMasterSoft };
  }
}

const TIER_SIZE = { sm: 26, md: 38, lg: 56, xl: 96 } as const;

/**
 * A league on its own: its frame (`LeagueFrame`) with the league's mark in
 * the window — and its name beside it when there is room. `animated` sets
 * the frame alive where the league is the point of the screen.
 */
export function TierBadge({
  tier,
  size = 'md',
  showLabel = false,
  animated = false,
}: {
  tier: LeagueTier;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  animated?: boolean;
}) {
  const t = useT();
  const theme = useTheme();
  const colors = tierColors(theme, tier);
  const box = TIER_SIZE[size];
  const label = t.tiers.names[tier];

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={t.tiers.league(tier)}
      style={styles.tier}
    >
      <LeagueFrame tier={tier} size={box} animated={animated} />
      {showLabel ? (
        <Text
          style={[
            styles.tierLabel,
            {
              color: colors.solid,
              fontSize: size === 'xl' ? 22 : size === 'lg' ? 17 : size === 'md' ? 14 : 12,
            },
            embossed(1.5),
          ]}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  medal: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    justifyContent: 'center',
    paddingBottom: 2,
  },
  coin: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coinShine: { height: '42%', left: 2, position: 'absolute', right: 2, top: 1, borderRadius: 99 },
  tier: { alignItems: 'center', flexDirection: 'row', gap: SPACE.xs },
  tierLabel: { fontFamily: FONT.display },
});
