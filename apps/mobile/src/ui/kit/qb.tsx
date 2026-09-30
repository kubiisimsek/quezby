import { useId } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { useTheme, withAlpha } from '@/ui/theme';
import { emblem } from '@/ui/tokens';

/** The coin's drawing board. */
const CANVAS = 100;

/** The face's centre: the monogram turns about it. */
const CX = 50;
const CY = 48;

/**
 * The monogram: q's bowl and its stem going down, b's stem going up and its
 * bowl — the same stroke turned half round about the face's centre, so the
 * mark reads the same either way up.
 */
export const QB_MONOGRAM =
  'M45.5 50.5a9 9 0 1 1-18 0a9 9 0 1 1 18 0M45.5 41V68' +
  'M54.5 45.5a9 9 0 1 0 18 0a9 9 0 1 0-18 0M54.5 28V55';

/** The beads round the rim, one every 30°. */
const BEADS = Array.from({ length: 12 }, (_, index) => {
  const angle = (index * Math.PI) / 6;
  return [CX + 39 * Math.cos(angle), CY + 39 * Math.sin(angle)] as const;
});

/**
 * qb — the players' name for their rating — as a coin: a gold rim standing
 * on its lip, the brand's magenta-to-violet face, and the qb monogram raised
 * on it in gold. Drawn wherever a qb amount is the point: the league's hero,
 * the result, the qb history. Under 28 pt the rim loses its beads. A picture
 * only: the amount beside it is what a screen reader says.
 */
export function QbCoin({ size = 24, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const id = useId().replace(/:/g, '');
  const rim = `qb-rim-${id}`;
  const face = `qb-face-${id}`;
  const mark = `qb-mark-${id}`;
  const detailed = size >= 28;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[{ height: size, width: size }, style]}
      testID="qb-coin"
    >
      <Svg width={size} height={size} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
        <Defs>
          <LinearGradient id={rim} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={emblem.goldHi} />
            <Stop offset="0.45" stopColor={emblem.goldRim} />
            <Stop offset="1" stopColor={emblem.goldShade} />
          </LinearGradient>
          <LinearGradient id={face} x1="0.2" y1="0" x2="0.8" y2="1">
            <Stop offset="0" stopColor={theme.brandFrom} />
            <Stop offset="1" stopColor={theme.brandTo} />
          </LinearGradient>
          <LinearGradient id={mark} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={emblem.goldAccent} />
            <Stop offset="0.55" stopColor={emblem.goldRim} />
            <Stop offset="1" stopColor={emblem.goldFace} />
          </LinearGradient>
        </Defs>

        {/* The lip the coin stands on, then the rim. */}
        <Circle cx={CX} cy={CY + 4} r={45} fill={emblem.goldDeep} stroke={theme.outline} strokeWidth={4} />
        <Circle cx={CX} cy={CY} r={45} fill={`url(#${rim})`} stroke={theme.outline} strokeWidth={4} />
        {detailed
          ? BEADS.map(([x, y]) => <Circle key={`${x}${y}`} cx={x} cy={y} r={2.2} fill={emblem.goldShade} />)
          : null}

        {/* The face, sunk into the rim. */}
        <Circle cx={CX} cy={CY} r={33} fill={`url(#${face})`} stroke={emblem.goldDeep} strokeWidth={3.5} />
        <Path
          d="M24 40a27 27 0 0 1 52 0a44 44 0 0 0-52 0Z"
          fill={withAlpha(theme.onBrand, 0.16)}
        />

        {/* The monogram, raised: its dark edge, then the gold. */}
        <Path
          d={QB_MONOGRAM}
          fill="none"
          stroke={theme.outline}
          strokeWidth={detailed ? 13 : 15}
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(0 1.5)"
        />
        <Path
          d={QB_MONOGRAM}
          fill="none"
          stroke={`url(#${mark})`}
          strokeWidth={detailed ? 7.5 : 9}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* The rim's shine, top left. */}
        <Path
          d="M13 36a39 39 0 0 1 22-24"
          fill="none"
          stroke={withAlpha(theme.onBrand, 0.55)}
          strokeWidth={4.5}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
