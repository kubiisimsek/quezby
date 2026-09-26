import type { LeagueTier } from '@quezby/types';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useT } from '@/i18n';
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


function tierColors(
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
    default:
      return { solid: theme.tierDiamond, soft: theme.tierDiamondSoft };
  }
}

const EMBLEM = 'M12 2.4 20.3 7.2v9.6L12 21.6l-8.3-4.8V7.2L12 2.4Z';
/** The lit upper face of the emblem. */
const EMBLEM_INNER = 'M12 3.9 19 7.9v3.6H5V7.9L12 3.9Z';

/**
 * What sits inside each emblem. Colour is never the only signal: the climb
 * reads in the shape too — one chevron, two, a star, a spark, a gem.
 */
function TierMark({ tier, color }: { tier: LeagueTier; color: string }) {
  const stroke = {
    stroke: color,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  switch (tier) {
    case 'bronze':
      return <Path d="M8.4 13.8 12 10.2l3.6 3.6" strokeWidth={2.6} {...stroke} />;
    case 'silver':
      return (
        <Path
          d="M8.4 11.6 12 8l3.6 3.6M8.4 15.6 12 12l3.6 3.6"
          strokeWidth={2.4}
          {...stroke}
        />
      );
    case 'gold':
      return (
        <Path
          d="m12 7.4 1.35 2.75 3.05.45-2.2 2.15.52 3.03L12 14.35l-2.72 1.43.52-3.03-2.2-2.15 3.05-.45L12 7.4Z"
          fill={color}
          stroke={color}
          strokeWidth={1}
          strokeLinejoin="round"
        />
      );
    case 'platinum':
      return (
        <Path
          d="M12 6.9c.5 2.7 2.4 4.6 5.1 5.1-2.7.5-4.6 2.4-5.1 5.1-.5-2.7-2.4-4.6-5.1-5.1 2.7-.5 4.6-2.4 5.1-5.1Z"
          fill={color}
        />
      );
    default:
      return (
        <Path
          d="M8.3 10.6 10.1 8h3.8l1.8 2.6L12 16.4l-3.7-5.8ZM8.3 10.6h7.4M10.9 10.6 12 16.4l1.1-5.8"
          strokeWidth={1.8}
          {...stroke}
        />
      );
  }
}

const TIER_SIZE = { sm: 22, md: 30, lg: 44, xl: 76 } as const;

/**
 * A league tier as an emblem: a shield in the tier's metal with the outline
 * round it and its mark cut into it — and its name beside it when there is
 * room.
 */
export function TierBadge({
  tier,
  size = 'md',
  showLabel = false,
}: {
  tier: LeagueTier;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
}) {
  const theme = useTheme();
  const t = useT();
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
      <Svg width={box} height={box} viewBox="0 0 24 24">
        <Path
          d={EMBLEM}
          fill={colors.solid}
          stroke={theme.outline}
          strokeWidth={2.2}
          strokeLinejoin="round"
        />
        <Path
          d={EMBLEM_INNER}
          fill={withAlpha(theme.onBrand, 0.28)}
        />
        <TierMark tier={tier} color={theme.outline} />
      </Svg>
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
