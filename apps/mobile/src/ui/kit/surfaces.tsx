import { useEffect, useId, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type DimensionValue,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  LinearGradient,
  Pattern,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { common } from '@/ui/kit/shared';
import { FADE, SPRING_PRESS, stagger } from '@/ui/motion';
import { DEPTH, RADIUS, useTheme, withAlpha } from '@/ui/theme';

type Size = { width: number; height: number };

/**
 * A box's measured size, for an SVG that must cover it exactly. Sized from
 * layout rather than `100%`: a box whose content grows after it mounts keeps
 * the viewport it rasterised at first, and the rest is left bare.
 */
function useMeasured(): [Size, (event: LayoutChangeEvent) => void] {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) =>
      Math.round(current.width) === Math.round(width) &&
      Math.round(current.height) === Math.round(height)
        ? current
        : { width, height },
    );
  };
  return [size, onLayout];
}

type Corners = Required<
  Pick<
    ViewStyle,
    | 'borderTopLeftRadius'
    | 'borderTopRightRadius'
    | 'borderBottomLeftRadius'
    | 'borderBottomRightRadius'
  >
>;

/**
 * Where a wash may paint inside a bordered box, read from the box's style:
 * each corner's radius less the thinner of the two borders that meet there —
 * by the outer curve alone it would paint over the outline, which a box with
 * a lip draws beneath what it holds. `outline` is the border's colour, or
 * null for a box without one.
 */
function washFrame(style: StyleProp<ViewStyle>): {
  corners: Corners;
  outline: ViewStyle['borderColor'] | null;
} {
  const flat = StyleSheet.flatten(style) ?? {};
  const size = (value: unknown, fallback: number) =>
    typeof value === 'number' ? value : fallback;
  const all = size(flat.borderRadius, 0);
  const width = size(flat.borderWidth, 0);
  const top = size(flat.borderTopWidth, width);
  const bottom = size(flat.borderBottomWidth, width);
  const left = size(flat.borderLeftWidth, width);
  const right = size(flat.borderRightWidth, width);
  const corner = (radius: unknown, a: number, b: number) =>
    Math.max(0, size(radius, all) - Math.min(a, b));
  const bordered = Math.max(top, bottom, left, right) > 0;
  return {
    corners: {
      borderTopLeftRadius: corner(flat.borderTopLeftRadius, top, left),
      borderTopRightRadius: corner(flat.borderTopRightRadius, top, right),
      borderBottomLeftRadius: corner(flat.borderBottomLeftRadius, bottom, left),
      borderBottomRightRadius: corner(flat.borderBottomRightRadius, bottom, right),
    },
    outline: bordered ? (flat.borderBottomColor ?? flat.borderColor ?? null) : null,
  };
}

/**
 * The arena — what every screen stands on: a violet night, deeper at the
 * bottom, lit magenta from above with a violet bloom in the far corner, and
 * faint diagonal lanes across it so the dark reads as a place rather than a
 * blank. Drawn once per screen, behind everything.
 */
export function Arena({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const id = `arena-${useId().replace(/:/g, '')}`;
  const [size, onLayout] = useMeasured();
  const { width, height } = size;

  return (
    <View
      pointerEvents="none"
      onLayout={onLayout}
      style={[StyleSheet.absoluteFill, { backgroundColor: theme.canvas }, style]}
    >
      {width > 0 && height > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={`${id}-night`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.night} />
              <Stop offset="1" stopColor={theme.nightDeep} />
            </LinearGradient>
            <RadialGradient
              id={`${id}-glow`}
              cx={width / 2}
              cy={-height * 0.06}
              rx={width * 1.05}
              ry={height * 0.42}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={theme.glow} stopOpacity={0.55} />
              <Stop offset="1" stopColor={theme.glow} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient
              id={`${id}-bloom`}
              cx={width * 1.02}
              cy={height * 0.98}
              rx={width * 0.95}
              ry={height * 0.5}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={theme.glowAlt} stopOpacity={0.38} />
              <Stop offset="1" stopColor={theme.glowAlt} stopOpacity={0} />
            </RadialGradient>
            <Pattern
              id={`${id}-lanes`}
              patternUnits="userSpaceOnUse"
              width={26}
              height={26}
              patternTransform="rotate(40)"
            >
              <Rect width={3} height={26} fill={theme.onBrand} />
            </Pattern>
          </Defs>
          <Rect width={width} height={height} fill={`url(#${id}-night)`} />
          <Rect width={width} height={height} fill={`url(#${id}-glow)`} />
          <Rect width={width} height={height} fill={`url(#${id}-bloom)`} />
          <Rect
            width={width}
            height={height}
            fill={`url(#${id}-lanes)`}
            opacity={0.035}
          />
        </Svg>
      ) : null}
    </View>
  );
}

/** A screen: the arena, and whatever stands on it. */
export function Screen({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View style={[common.flex, { backgroundColor: theme.canvas }, style]}>
      <Arena />
      {children}
    </View>
  );
}

/**
 * A two-colour wash. Drawn with SVG rather than a gradient library — one wash
 * is not worth a native module. `from` under it covers the frame between
 * layout and paint, so it is never bare even for one frame.
 */
export function Gradient({
  from,
  to,
  style,
  children,
  radius = 0,
  vertical = false,
  fromOpacity = 1,
  toOpacity = 1,
}: {
  from: string;
  to: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  radius?: number;
  /** Top to bottom instead of corner to corner. */
  vertical?: boolean;
  /** A scrim over a photo fades in from nothing; the brand wash never does. */
  fromOpacity?: number;
  toOpacity?: number;
}) {
  const id = `grad-${useId().replace(/:/g, '')}`;
  const [size, onLayout] = useMeasured();
  const box: StyleProp<ViewStyle> = [
    {
      borderRadius: radius,
      overflow: 'hidden',
      backgroundColor:
        fromOpacity === 1 && toOpacity === 1 ? from : 'transparent',
    },
    style,
  ];

  return (
    <View style={box}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.clip, washFrame(box).corners]}
        onLayout={onLayout}
      >
        {size.width > 0 && size.height > 0 ? (
          <Svg width={size.width} height={size.height}>
            <Defs>
              <LinearGradient
                id={id}
                x1="0"
                y1="0"
                x2={vertical ? '0' : '1'}
                y2="1"
              >
                <Stop offset="0" stopColor={from} stopOpacity={fromOpacity} />
                <Stop offset="1" stopColor={to} stopOpacity={toOpacity} />
              </LinearGradient>
            </Defs>
            <Rect
              width={size.width}
              height={size.height}
              fill={`url(#${id})`}
            />
          </Svg>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/**
 * The stage — the brand's slab of magenta running into violet, with lanes
 * across it: where a screen's hero stands (the welcome, the podium, a
 * result). The bloom is anchored to a corner rather than stretched, so the
 * same two colours read the same on a tall stage and a short one.
 */
export function BrandBand({
  children,
  style,
  radius = 0,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
}) {
  const theme = useTheme();
  const id = `band-${useId().replace(/:/g, '')}`;
  const [size, onLayout] = useMeasured();
  const { width, height } = size;
  const box: StyleProp<ViewStyle> = [
    {
      backgroundColor: theme.brandFrom,
      borderRadius: radius,
      overflow: 'hidden',
    },
    style,
  ];
  const frame = washFrame(box);

  // Between the wash's curve and a lip's thicker edge a sliver of the box
  // shows: in the outline's colour, it reads as the outline.
  return (
    <View style={[box, frame.outline ? { backgroundColor: frame.outline } : null]}>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.clip,
          frame.corners,
          { backgroundColor: theme.brandFrom },
        ]}
        onLayout={onLayout}
      >
        {width > 0 && height > 0 ? (
          <Svg width={width} height={height}>
            <Defs>
              <RadialGradient
                id={`${id}-violet`}
                cx={width * 1.08}
                cy={height * 1.12}
                rx={width * 1.05}
                ry={height * 1.8}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0" stopColor={theme.brandTo} stopOpacity={1} />
                <Stop offset="0.75" stopColor={theme.brandTo} stopOpacity={0} />
              </RadialGradient>
              <RadialGradient
                id={`${id}-light`}
                cx={width * 0.2}
                cy={0}
                rx={width * 0.7}
                ry={height * 1.1}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0" stopColor={theme.onBrand} stopOpacity={0.16} />
                <Stop offset="0.7" stopColor={theme.onBrand} stopOpacity={0} />
              </RadialGradient>
              <Pattern
                id={`${id}-lanes`}
                patternUnits="userSpaceOnUse"
                width={24}
                height={24}
                patternTransform="rotate(40)"
              >
                <Rect width={4} height={24} fill={theme.onBrand} />
              </Pattern>
            </Defs>
            <Rect width={width} height={height} fill={`url(#${id}-violet)`} />
            <Rect width={width} height={height} fill={`url(#${id}-light)`} />
            <Rect
              width={width}
              height={height}
              fill={`url(#${id}-lanes)`}
              opacity={0.07}
            />
          </Svg>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/**
 * The inside of a tile's corner: its radius less its outline. Whatever lies
 * flush against the inside of a tile's top — its lit edge, a shine, a banner
 * — rounds by this, or it crosses the outline's curve: a tile with a lip has
 * its outline drawn under what it holds, and clipped only by the outer curve.
 */
export function innerRadius(
  radius: number,
  outline: number = DEPTH.outline,
): number {
  return Math.max(0, radius - outline);
}

/** How thick a tile's lit edge is at its middle. */
const EDGE_WIDTH = 3;

/**
 * A tile's lit top edge: a band of light along the inside of the outline that
 * follows the corners and thins out down their curve — never a straight bar
 * cut across them. `radius` and `outline` are the tile's own.
 */
export function LitEdge({
  color,
  radius = RADIUS.panel,
  outline = DEPTH.outline,
}: {
  color: string;
  radius?: number;
  outline?: number;
}) {
  const inner = innerRadius(radius, outline);
  return (
    <View
      pointerEvents="none"
      style={[
        styles.edge,
        {
          borderTopColor: color,
          borderTopLeftRadius: inner,
          borderTopRightRadius: inner,
          height: Math.max(inner, EDGE_WIDTH * 2),
        },
      ]}
    />
  );
}

/**
 * The lit upper part of a small slab with a lip — a chat bubble, a ribbon, a
 * tab's tile: a lighter band across its top. The band is cut out of a box as
 * tall as the slab, rounded like its inside corners: a band rounded on its
 * own gets its corners flattened to its height, and they poke over the
 * outline. `radius` and `outline` are the slab's own.
 */
export function Shine({
  color,
  radius,
  outline = DEPTH.outline,
  height,
}: {
  color: string;
  radius: number;
  outline?: number;
  height: DimensionValue;
}) {
  const inner = innerRadius(radius, outline);
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.clip,
        { borderTopLeftRadius: inner, borderTopRightRadius: inner },
      ]}
    >
      <View style={{ backgroundColor: color, height }} />
    </View>
  );
}

export type PanelTone = 'surface' | 'primary' | 'sunken';

/** Face, lit edge and outline of a tile tone. */
function tileColors(theme: ReturnType<typeof useTheme>, tone: PanelTone) {
  switch (tone) {
    case 'primary':
      return { face: theme.primarySoft, hi: theme.primaryLine, border: theme.outline };
    case 'sunken':
      return { face: theme.well, hi: 'transparent', border: theme.wellLine };
    default:
      return { face: theme.tile, hi: theme.tileHi, border: theme.outline };
  }
}

/**
 * A tile — the arena's panel: a violet slab in the outline, standing on its
 * lip, its top edge catching the light. `primary` is your own tile in a list
 * of others; `sunken` is a well cut into a tile, flat and see-through.
 */
export function Panel({
  children,
  style,
  tone = 'surface',
  elevation,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: PanelTone;
  /** Kept for callers; a tile's depth is its lip. `flat` drops the lip. */
  elevation?: 'flat' | 'card' | 'raised' | 'overlay';
}) {
  const theme = useTheme();
  const colors = tileColors(theme, tone);
  const flat = tone === 'sunken' || elevation === 'flat';
  return (
    <View
      style={[
        common.panel,
        {
          backgroundColor: colors.face,
          borderColor: colors.border,
        },
        flat ? styles.flat : null,
        style,
      ]}
    >
      {flat ? null : <LitEdge color={colors.hi} />}
      {children}
    </View>
  );
}

/**
 * A tile you can press. It sinks a little into its lip under the thumb, and
 * arrives with the others in a list, one after another.
 */
export function Card({
  children,
  onPress,
  style,
  index = 0,
  tone = 'surface',
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Position in a list — drives the entrance stagger. */
  index?: number;
  tone?: 'surface' | 'primary';
}) {
  const theme = useTheme();
  const colors = tileColors(theme, tone);
  const enter = useSharedValue(0);
  const down = useSharedValue(0);

  useEffect(() => {
    enter.value = withDelay(
      stagger(index),
      withTiming(1, { ...FADE, duration: 320 }),
    );
  }, [enter, index]);

  const motion = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 14 + down.value * 3 }],
  }));

  const body = (
    <Animated.View
      style={[
        common.panel,
        { backgroundColor: colors.face, borderColor: colors.border },
        motion,
        style,
      ]}
    >
      <LitEdge color={colors.hi} />
      {children}
    </Animated.View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => {
        down.value = withTiming(1, { duration: 60 });
      }}
      onPressOut={() => {
        down.value = withSpring(0, SPRING_PRESS);
      }}
    >
      {body}
    </Pressable>
  );
}

/** A groove cut across a tile. */
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: withAlpha(theme.outline, 0.55) },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  /** A wash's frame: the inside of its box, so it never paints over the outline. */
  clip: { overflow: 'hidden' },
  divider: { borderRadius: RADIUS.pill, height: 2, width: '100%' },
  /** The lit top edge of a tile (`LitEdge`): the top border of a box rounded like the tile's inside. */
  edge: {
    borderTopWidth: EDGE_WIDTH,
    left: 0,
    opacity: 0.9,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  flat: { borderBottomWidth: DEPTH.outline, borderWidth: DEPTH.outline },
});
