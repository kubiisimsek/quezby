import type { ContentKind, PostFormat } from '@quezby/config';
import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, Path, Pattern, Rect } from 'react-native-svg';

import type { Pattern as PatternName } from '@/game/dress';
import { RADIUS } from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

/**
 * What lies on a reel's colour behind its post. An ordinary or a friend's
 * post wears a faint pattern the dress picks — or, plain, the two soft glows
 * the feed always had; a gold post turns in a burst of light; a red one is
 * taped off or watched through a camera. All of it is white or black at a
 * low opacity, so the kind's colour is what the eye reads first.
 */
export function Backdrop({
  kind,
  format,
  pattern,
  paused,
}: {
  kind: ContentKind;
  format: PostFormat;
  pattern: PatternName;
  /** Waiting under a coach card: the rays hold still with the rest of the reel. */
  paused: boolean;
}) {
  if (kind === 'hold') return <Rays paused={paused} />;
  if (kind === 'freeze') return format === 'sign' ? <Tape /> : <Scanlines />;
  if (pattern === 'plain') return <Glows />;
  return <Tiles pattern={pattern} />;
}

function Glows() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.glow, styles.glowTop]} />
      <View style={[styles.glow, styles.glowBottom]} />
    </View>
  );
}

/** One tile of each pattern, repeated over the whole reel. */
function Tiles({ pattern }: { pattern: Exclude<PatternName, 'plain'> }) {
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} testID={`backdrop-${pattern}`}>
      <Defs>
        {pattern === 'dots' ? (
          <Pattern id="dots" patternUnits="userSpaceOnUse" width={22} height={22}>
            <Circle cx={11} cy={11} r={2.4} fill={REEL.pattern} />
          </Pattern>
        ) : null}
        {pattern === 'stripes' ? (
          <Pattern id="stripes" patternUnits="userSpaceOnUse" width={28} height={28} patternTransform="rotate(-35)">
            <Rect x={0} y={0} width={14} height={28} fill={REEL.pattern} />
          </Pattern>
        ) : null}
        {pattern === 'grid' ? (
          <Pattern id="grid" patternUnits="userSpaceOnUse" width={32} height={32}>
            <Path d="M32 0H0V32" stroke={REEL.pattern} strokeWidth={2} fill="none" />
          </Pattern>
        ) : null}
        {pattern === 'waves' ? (
          <Pattern id="waves" patternUnits="userSpaceOnUse" width={40} height={24}>
            <Path d="M0 12 Q10 2 20 12 T40 12" stroke={REEL.pattern} strokeWidth={3} fill="none" />
          </Pattern>
        ) : null}
        {pattern === 'confetti' ? (
          <Pattern id="confetti" patternUnits="userSpaceOnUse" width={64} height={64}>
            <Rect x={8} y={10} width={10} height={4} rx={2} fill={REEL.pattern} transform="rotate(25 13 12)" />
            <Circle cx={44} cy={18} r={3} fill={REEL.pattern} />
            <Rect x={30} y={44} width={10} height={4} rx={2} fill={REEL.pattern} transform="rotate(-30 35 46)" />
            <Circle cx={12} cy={50} r={2.5} fill={REEL.pattern} />
            <Rect x={50} y={52} width={4} height={4} fill={REEL.pattern} transform="rotate(45 52 54)" />
          </Pattern>
        ) : null}
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${pattern})`} />
    </Svg>
  );
}

const RAYS = 18;

/** A gold post's burst of light, turning slowly while the post is live. */
function Rays({ paused }: { paused: boolean }) {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const turn = useSharedValue(0);
  const size = Math.hypot(width, height) * 1.1;

  useEffect(() => {
    if (paused || reduced) return undefined;
    turn.value = withRepeat(withTiming(360, { duration: 24_000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(turn);
  }, [paused, reduced, turn]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  const r = size / 2;
  const wedges = Array.from({ length: RAYS }, (_, i) => {
    const from = (i * 2 * Math.PI) / RAYS;
    const to = from + Math.PI / RAYS;
    return `M${r} ${r}L${r + r * Math.cos(from)} ${r + r * Math.sin(from)}L${r + r * Math.cos(to)} ${r + r * Math.sin(to)}Z`;
  }).join('');

  return (
    <Animated.View
      pointerEvents="none"
      testID="backdrop-rays"
      style={[
        styles.rays,
        { width: size, height: size, left: (width - size) / 2, top: height * 0.36 - r },
        style,
      ]}
    >
      <Svg width={size} height={size}>
        <Path d={wedges} fill={REEL.holdRay} />
      </Svg>
    </Animated.View>
  );
}

/** Two bands of hazard tape across a red post. */
function Tape() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="backdrop-tape">
      <View style={[styles.tape, styles.tapeTop]}>
        <Stripes />
      </View>
      <View style={[styles.tape, styles.tapeBottom]}>
        <Stripes />
      </View>
    </View>
  );
}

function Stripes() {
  return (
    <Svg style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="hazard" patternUnits="userSpaceOnUse" width={26} height={26} patternTransform="rotate(45)">
          <Rect x={0} y={0} width={13} height={26} fill={REEL.freezeAlarm} />
          <Rect x={13} y={0} width={13} height={26} fill={REEL.hazard} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill="url(#hazard)" />
    </Svg>
  );
}

/** A security camera's lines over a red post. */
function Scanlines() {
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} testID="backdrop-scan">
      <Defs>
        <Pattern id="scan" patternUnits="userSpaceOnUse" width={8} height={5}>
          <Line x1={0} y1={1} x2={8} y2={1} stroke={REEL.scan} strokeWidth={2} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill="url(#scan)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  glow: {
    borderRadius: RADIUS.pill,
    height: 420,
    position: 'absolute',
    width: 420,
  },
  glowTop: { backgroundColor: REEL.skipDisc, left: -160, top: -140 },
  glowBottom: { backgroundColor: REEL.shade, bottom: -180, right: -140 },
  rays: { position: 'absolute' },
  tape: {
    borderColor: REEL.hazard,
    borderBottomWidth: 3,
    borderTopWidth: 3,
    height: 30,
    left: '-25%',
    overflow: 'hidden',
    position: 'absolute',
    width: '150%',
  },
  tapeTop: { top: '17%', transform: [{ rotate: '-8deg' }] },
  tapeBottom: { bottom: '24%', transform: [{ rotate: '6deg' }] },
});
