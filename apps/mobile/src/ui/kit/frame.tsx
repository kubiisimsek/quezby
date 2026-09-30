import type { LeagueTier } from '@quezby/types';
import { useEffect, useId, type ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { initialsOf } from '@/lib/format';
import {
  BEZEL,
  BEZEL_GLOSS,
  CANVAS,
  FRAMES,
  HOLE,
  PLATE,
  PLATE_GLOSS,
  PLATE_MARK,
  WINDOW,
  sparkle,
  type Paint,
  type Shape,
} from '@/ui/kit/emblemArt';
import { gemColors } from '@/ui/kit/identity';
import { type TagTone } from '@/ui/kit/tones';
import { DEPTH, FONT, embossed, useTheme, withAlpha } from '@/ui/theme';
import { emblem } from '@/ui/tokens';

/**
 * A league as a frame round a player's portrait — the way a game dresses a
 * picture for its rank: a bezel in the league's metal, a plate under it with
 * the league's mark, and the ornaments that grow every league (wings that
 * spread wider, a spike, a tiara, a crown with a halo). The shapes are `emblemArt`'s; the
 * metals are `emblem` in the palette.
 *
 * `animated` sets it alive — a band of light sweeping the bezel, sparkles
 * twinkling, the glow breathing and MasterClass's rays turning — where a
 * league is the point of the screen: the league screen, a rated result, the
 * mode sheet. It stands still under reduced motion.
 */

type Metal = {
  hi: string;
  rim: string;
  face: string;
  shade: string;
  deep: string;
  accent: string;
  gem: string;
  gemHi: string;
  glow: string;
};

/** A league's metal: its highlight, rim, face, shades, the mark's accent, a gem and its glow. */
export function metalOf(tier: LeagueTier): Metal {
  return {
    hi: emblem[`${tier}Hi`],
    rim: emblem[`${tier}Rim`],
    face: emblem[`${tier}Face`],
    shade: emblem[`${tier}Shade`],
    deep: emblem[`${tier}Deep`],
    accent: emblem[`${tier}Accent`],
    gem: emblem[`${tier}Gem`],
    gemHi: emblem[`${tier}GemHi`],
    glow: emblem[`${tier}Glow`],
  };
}

const AnimatedRect = Animated.createAnimatedComponent(Rect);

/** How long the shine takes to cross, and how long the bezel rests between two. */
const SHINE_MS = 950;
const SHINE_REST_MS = 2600;
const TWINKLE_MS = 900;
const BREATH_MS = 1800;
const SPIN_MS = 26000;

export function LeagueFrame({
  tier,
  size,
  children,
  animated = false,
  label,
}: {
  tier: LeagueTier;
  /** The frame's box, points: the portrait's window is a little under half of it. */
  size: number;
  /** What looks out of the window — a portrait. Without it, the league's mark. */
  children?: ReactNode;
  animated?: boolean;
  /** Read aloud as a picture of the league; without it the frame is decoration. */
  label?: string;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const moving = animated && !reduced;
  const frame = FRAMES[tier];
  const metal = metalOf(tier);
  const id = useId().replace(/:/g, '');
  const unit = size / CANVAS;

  const shineX = useSharedValue(-40);
  const twinkle = useSharedValue(0);
  const breath = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    if (!moving) {
      shineX.value = -40;
      twinkle.value = 0;
      breath.value = 0;
      spin.value = 0;
      return;
    }
    const ease = Easing.inOut(Easing.quad);
    shineX.value = withRepeat(
      withSequence(
        withTiming(170, { duration: SHINE_MS, easing: ease }),
        withDelay(SHINE_REST_MS, withTiming(-40, { duration: 0 })),
      ),
      -1,
    );
    twinkle.value = withRepeat(withTiming(1, { duration: TWINKLE_MS, easing: ease }), -1, true);
    breath.value = withRepeat(withTiming(1, { duration: BREATH_MS, easing: ease }), -1, true);
    spin.value = withRepeat(withTiming(1, { duration: SPIN_MS, easing: Easing.linear }), -1);
    return () => {
      cancelAnimation(shineX);
      cancelAnimation(twinkle);
      cancelAnimation(breath);
      cancelAnimation(spin);
    };
  }, [breath, moving, shineX, spin, twinkle]);

  const shineProps = useAnimatedProps(() => ({ x: shineX.value }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.65 + breath.value * 0.35,
    transform: [{ scale: 0.96 + breath.value * 0.08 }],
  }));
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));
  const twinkleA = useAnimatedStyle(() => ({ opacity: moving ? 0.25 + twinkle.value * 0.75 : 1 }));
  const twinkleB = useAnimatedStyle(() => ({ opacity: moving ? 1 - twinkle.value * 0.75 : 1 }));

  const fill = (paint: Paint | 'none'): string => {
    switch (paint) {
      case 'none':
        return 'none';
      case 'rim':
        return `url(#rim${id})`;
      case 'face':
        return `url(#face${id})`;
      case 'accent':
        return `url(#accent${id})`;
      case 'gem':
        return `url(#gem${id})`;
      case 'halo':
        return metal.glow;
      default:
        return metal[paint];
    }
  };
  const draw = (shapes: Shape[], key: string) =>
    shapes.map((shape, i) => (
      <G key={`${key}${i}`} opacity={shape.opacity ?? 1}>
        {shape.outline ? (
          <Path
            d={shape.d}
            fill="none"
            stroke={theme.outline}
            strokeWidth={shape.outline * 2}
            strokeLinejoin="round"
          />
        ) : null}
        <Path
          d={shape.d}
          fill={fill(shape.fill)}
          stroke={shape.stroke ? fill(shape.stroke) : undefined}
          strokeWidth={shape.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    ));
  const mark = (x: number, y: number, scale: number) => (
    <G transform={`translate(${x} ${y}) scale(${scale}) translate(-60 -60)`}>
      {draw(frame.mark, 'mark')}
    </G>
  );
  const gradients = (
    <Defs>
      <LinearGradient id={`rim${id}`} x1="0" y1="0" x2="0.3" y2="1">
        <Stop offset="0" stopColor={metal.hi} />
        <Stop offset="0.45" stopColor={metal.rim} />
        <Stop offset="1" stopColor={metal.shade} />
      </LinearGradient>
      <LinearGradient id={`face${id}`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={metal.deep} />
        <Stop offset="1" stopColor={theme.nightDeep} />
      </LinearGradient>
      <LinearGradient id={`accent${id}`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={metal.accent} />
        <Stop offset="1" stopColor={metal.hi} />
      </LinearGradient>
      <LinearGradient id={`gem${id}`} x1="0" y1="0" x2="0.4" y2="1">
        <Stop offset="0" stopColor={metal.gemHi} />
        <Stop offset="1" stopColor={metal.gem} />
      </LinearGradient>
      <RadialGradient id={`glow${id}`} cx="0.5" cy="0.5" r="0.5">
        <Stop offset="0" stopColor={metal.glow} stopOpacity={0.6} />
        <Stop offset="1" stopColor={metal.glow} stopOpacity={0} />
      </RadialGradient>
      <ClipPath id={`clip${id}`}>
        <Path d={BEZEL} clipRule="evenodd" />
        <Path d={PLATE} />
      </ClipPath>
    </Defs>
  );
  const box = { height: size, width: size };
  const spun = frame.back.filter((shape) => shape.spin);
  const still = frame.back.filter((shape) => !shape.spin);
  const odd = frame.sparkles.filter((_, i) => i % 2 === 1);
  const even = frame.sparkles.filter((_, i) => i % 2 === 0);
  const hole = {
    borderRadius: (HOLE.radius + 1) * unit,
    height: (HOLE.size + 2) * unit,
    left: (HOLE.x - 1) * unit,
    top: (HOLE.y - 1) * unit,
    width: (HOLE.size + 2) * unit,
  };

  return (
    <View
      accessible={label !== undefined}
      accessibilityRole={label !== undefined ? 'image' : undefined}
      accessibilityLabel={label}
      accessibilityElementsHidden={label === undefined}
      importantForAccessibility={label === undefined ? 'no-hide-descendants' : 'auto'}
      style={box}
      testID={`league-frame-${tier}`}
    >
      {frame.glow ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, glowStyle]}>
          <Svg width={size} height={size} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
            {gradients}
            <Circle cx={60} cy={60} r={64} fill={`url(#glow${id})`} />
          </Svg>
        </Animated.View>
      ) : null}
      {spun.length > 0 ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, spinStyle]}>
          <Svg width={size} height={size} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
            {draw(spun, 'spin')}
          </Svg>
        </Animated.View>
      ) : null}
      <Svg
        pointerEvents="none"
        width={size}
        height={size}
        viewBox={`0 0 ${CANVAS} ${CANVAS}`}
        style={StyleSheet.absoluteFill}
      >
        {gradients}
        {draw(still, 'back')}
        {children ? null : (
          <>
            <Path d={WINDOW} fill={`url(#face${id})`} />
            {mark(60, 58, 0.7)}
          </>
        )}
      </Svg>
      {children ? (
        <View pointerEvents="none" style={[styles.window, hole]}>
          {children}
        </View>
      ) : null}
      <Svg
        pointerEvents="none"
        width={size}
        height={size}
        viewBox={`0 0 ${CANVAS} ${CANVAS}`}
        style={StyleSheet.absoluteFill}
      >
        {gradients}
        <Path d={BEZEL} fill="none" stroke={theme.outline} strokeWidth={7} strokeLinejoin="round" />
        <Path d={BEZEL} fill={`url(#rim${id})`} fillRule="evenodd" />
        <Path d={BEZEL_GLOSS} fill={withAlpha(theme.onBrand, 0.35)} />
        <Path d={WINDOW} fill="none" stroke={metal.deep} strokeWidth={2.4} />
        {draw(frame.front, 'front')}
        <Path d={PLATE} fill="none" stroke={theme.outline} strokeWidth={7} strokeLinejoin="round" />
        <Path d={PLATE} fill={`url(#rim${id})`} />
        <Path d={PLATE_GLOSS} fill={withAlpha(theme.onBrand, 0.3)} />
        {mark(PLATE_MARK.x, PLATE_MARK.y, PLATE_MARK.scale)}
        {moving ? (
          <G clipPath={`url(#clip${id})`}>
            <G transform="rotate(22 60 60)">
              <AnimatedRect
                animatedProps={shineProps}
                y={-30}
                width={16}
                height={180}
                fill={withAlpha(theme.onBrand, 0.55)}
              />
            </G>
          </G>
        ) : null}
      </Svg>
      {even.length > 0 ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, twinkleA]}>
          <Svg width={size} height={size} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
            {even.map(([x, y, s]) => (
              <Path key={`${x}${y}`} d={sparkle(x, y, s)} fill={theme.onBrand} />
            ))}
          </Svg>
        </Animated.View>
      ) : null}
      {odd.length > 0 ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, twinkleB]}>
          <Svg width={size} height={size} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
            {odd.map(([x, y, s]) => (
              <Path key={`${x}${y}`} d={sparkle(x, y, s)} fill={theme.onBrand} />
            ))}
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

/**
 * A player's portrait in their league's frame: their photo, or their initials
 * in Rubik on a card of their tone (magenta for you, violet for everyone
 * else), looking out of the frame's window. A player with no league yet has
 * the plain card, a little smaller, in a bezel of their tone.
 */
export function FramedAvatar({
  tier,
  name,
  src,
  size,
  tone = 'secondary',
  animated = false,
}: {
  tier: LeagueTier | null;
  name: string;
  src?: string | null;
  size: number;
  tone?: TagTone;
  animated?: boolean;
}) {
  const theme = useTheme();
  const colors = gemColors(theme, tone === 'neutral' ? 'secondary' : tone);
  const face = (box: number) => (
    <View style={[styles.face, { backgroundColor: colors.deep }]}>
      <View
        pointerEvents="none"
        style={[styles.faceShine, { backgroundColor: withAlpha(theme.onBrand, 0.12) }]}
      />
      <Text
        style={[
          styles.initials,
          { color: theme.onBrand, fontSize: Math.round(box * 0.36) },
          embossed(box > 60 ? 3 : box > 36 ? 2 : 1.5),
        ]}
      >
        {initialsOf(name)}
      </Text>
      {src ? <Image source={{ uri: src }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
    </View>
  );

  if (tier === null) {
    const box = Math.round(size * 0.62);
    const frame = Math.max(2, Math.round(box * 0.07));
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.bare, { height: size, width: size }]}
      >
        <View
          style={[
            styles.bareFrame,
            {
              backgroundColor: colors.solid,
              borderColor: theme.outline,
              borderRadius: Math.round(box * 0.32),
              height: box,
              padding: frame,
              width: box,
            },
          ]}
        >
          <View style={[styles.bareCard, { borderRadius: Math.round(box * 0.32) - frame }]}>
            {face(box)}
          </View>
        </View>
      </View>
    );
  }

  return (
    <LeagueFrame tier={tier} size={size} animated={animated}>
      {face((HOLE.size * size) / CANVAS)}
    </LeagueFrame>
  );
}

const styles = StyleSheet.create({
  window: { overflow: 'hidden', position: 'absolute' },
  face: { alignItems: 'center', flex: 1, justifyContent: 'center', overflow: 'hidden' },
  faceShine: { height: '45%', left: 0, position: 'absolute', right: 0, top: 0 },
  initials: { fontFamily: FONT.display, includeFontPadding: false },
  bare: { alignItems: 'center', justifyContent: 'center' },
  bareFrame: { borderWidth: DEPTH.outline },
  bareCard: { flex: 1, overflow: 'hidden' },
});
