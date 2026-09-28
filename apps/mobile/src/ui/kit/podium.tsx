import { useEffect, useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import { handle, useT } from '@/i18n';
import { Icon } from '@/ui/icons';
import { MedalBadge, medalColors, type MedalRank } from '@/ui/kit/badges';
import { Avatar } from '@/ui/kit/identity';
import { AnimatedPressable } from '@/ui/kit/shared';
import { SPRING, SPRING_POP, usePressScale } from '@/ui/motion';
import { DEPTH, FONT, RADIUS, SPACE, embossed, lh, useTheme, withAlpha } from '@/ui/theme';

export type PodiumEntry = {
  rank: number;
  username: string;
  /** Their photo; null or left out draws their initials. */
  avatarUrl?: string | null;
  score: number;
  isMe: boolean;
};

/** Second, first, third — the winner in the middle, on the tallest block. */
const ORDER: MedalRank[] = [2, 1, 3];

/** How tall each block stands over the floor. */
const PEDESTAL = { 1: 76, 2: 58, 3: 46 } as const;

/** The avatar on each block — the kit's `lg` for the winner, `md` beside. */
const AVATAR = { 1: 54, 2: 40, 3: 40 } as const;
/** The band of metal between the outline and the portrait. */
const RING = 3;
/** The whole frame: the avatar, the metal band and the outline round it. */
const FRAME = {
  1: AVATAR[1] + 2 * (RING + DEPTH.outline),
  2: AVATAR[2] + 2 * (RING + DEPTH.outline),
  3: AVATAR[3] + 2 * (RING + DEPTH.outline),
} as const;

/** The winner's crown, and how far it sits down over the frame. */
const CROWN = 30;
const CROWN_SEAT = 10;

/** Room over the winner, so the light behind them is not cut off. */
const HEADROOM = SPACE.xs;
/** The light behind the winner, centred on their portrait. */
const GLOW = 132;
const GLOW_TOP = HEADROOM + CROWN - CROWN_SEAT + FRAME[1] / 2 - GLOW / 2;

/**
 * When each part arrives, in ms: the blocks rise together, then the players
 * pop on — third, second, then the winner — and last the crown drops onto
 * the winner's head.
 */
const RISE_AT = { 1: 0, 2: 70, 3: 140 } as const;
const POP_AT = { 1: 520, 2: 390, 3: 260 } as const;
const CROWN_AT = 720;

/**
 * The top three of a board, standing on a stage: one podium in three steps,
 * each block faced in its metal — a lit top, a shaded side, its place cut
 * big into the front — and the player on top in a metal frame with their
 * medal. The winner wears a crown and stands in a light.
 *
 * It arrives once: the blocks rise, the players pop on, the crown drops. A
 * phone that asks for less motion gets it all in place at once. A place
 * nobody holds yet stands empty, with "—". Text is set for a brand stage or
 * the arena, both dark enough under it.
 */
export function Podium<T extends PodiumEntry>({
  entries,
  onPressEntry,
}: {
  entries: T[];
  onPressEntry?: (entry: T) => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const places = new Map<number, T>();
  for (const entry of entries) {
    if (entry.rank >= 1 && entry.rank <= 3 && !places.has(entry.rank)) {
      places.set(entry.rank, entry);
    }
  }
  const crowned = places.has(1);
  const light = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (!crowned) return;
    if (reduced) {
      light.value = 1;
      return;
    }
    light.value = withDelay(POP_AT[1], withTiming(1, { duration: 520 }));
  }, [crowned, light, reduced]);

  const lightStyle = useAnimatedStyle(() => ({ opacity: light.value }));

  return (
    <View style={styles.podium}>
      {crowned ? (
        <Animated.View pointerEvents="none" style={[styles.glow, lightStyle]}>
          <Spotlight size={GLOW} color={theme.goldHi} />
        </Animated.View>
      ) : null}
      <View style={styles.steps}>
        {ORDER.map((place, index) => (
          <Place
            key={place}
            place={place}
            joined={index > 0}
            entry={places.get(place) ?? null}
            onPress={onPressEntry}
          />
        ))}
      </View>
    </View>
  );
}

function Place<T extends PodiumEntry>({
  place,
  joined,
  entry,
  onPress,
}: {
  place: MedalRank;
  /** Shares its left outline with the block before it. */
  joined: boolean;
  entry: T | null;
  onPress?: (entry: T) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const reduced = useReducedMotion();
  const metal = medalColors(theme, place);
  const press = usePressScale(0.96);
  const height = PEDESTAL[place];
  const frame = FRAME[place];
  const frameRadius = Math.round(AVATAR[place] * 0.32) + RING + DEPTH.outline;
  const winner = place === 1;
  const rise = useSharedValue(reduced ? 1 : 0);
  const pop = useSharedValue(reduced ? 1 : 0);
  const crown = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      rise.value = 1;
      pop.value = 1;
      crown.value = 1;
      return;
    }
    rise.value = withDelay(RISE_AT[place], withSpring(1, SPRING));
    pop.value = withDelay(POP_AT[place], withSpring(1, SPRING_POP));
    crown.value = withDelay(CROWN_AT, withSpring(1, SPRING_POP));
  }, [crown, place, pop, reduced, rise]);

  const pedestalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - rise.value) * height }],
  }));
  const personStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value),
    transform: [{ scale: 0.4 + pop.value * 0.6 }],
  }));
  const crownStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, crown.value),
    transform: [
      { translateY: (1 - crown.value) * -22 },
      { rotate: `${-12 - (1 - crown.value) * 24}deg` },
    ],
  }));

  const label = entry
    ? t.board.row({
        rank: place,
        name: entry.username,
        isMe: entry.isMe,
        score: entry.score,
      })
    : t.board.vacant(place);

  const column = (
    <>
      <Animated.View style={[styles.person, personStyle]}>
        {/* The winner's place keeps the crown's room even while empty, so nothing shifts when one lands. */}
        {winner ? (
          <Animated.View style={[styles.crown, crownStyle]}>
            {entry ? (
              <Icon
                name="crown"
                size={CROWN}
                color={theme.outline}
                fill={theme.gold}
                strokeWidth={2.2}
              />
            ) : null}
          </Animated.View>
        ) : null}
        {entry ? (
          <View
            style={[
              styles.frame,
              {
                backgroundColor: metal.solid,
                borderColor: theme.outline,
                borderRadius: frameRadius,
              },
            ]}
          >
            <View
              pointerEvents="none"
              style={[
                styles.frameShine,
                { backgroundColor: withAlpha(theme.onBrand, 0.4) },
              ]}
            />
            <Avatar
              name={entry.username}
              src={entry.avatarUrl}
              tone={entry.isMe ? 'primary' : 'neutral'}
              size={winner ? 'lg' : 'md'}
            />
          </View>
        ) : (
          <View
            style={[
              styles.vacantFrame,
              {
                backgroundColor: withAlpha(theme.outline, 0.28),
                borderColor: withAlpha(theme.onBrand, 0.35),
                borderRadius: frameRadius,
                height: frame,
                width: frame,
              },
            ]}
          >
            <Icon
              name="account"
              size={Math.round(frame * 0.42)}
              color={withAlpha(theme.onBrand, 0.4)}
              strokeWidth={2.2}
            />
          </View>
        )}
        {entry ? (
          <View style={styles.medal}>
            <MedalBadge rank={place} size="sm" />
          </View>
        ) : null}
      </Animated.View>

      <View style={styles.name}>
        <Text
          numberOfLines={1}
          style={[
            styles.nameText,
            styles.shrink,
            { color: theme.onBrand },
            embossed(1.5),
          ]}
        >
          {entry ? handle(entry.username) : '—'}
        </Text>
        {entry?.isMe ? (
          <Text
            style={[styles.nameText, { color: theme.onBrand }, embossed(1.5)]}
          >
            {` · ${t.board.you}`}
          </Text>
        ) : null}
      </View>
      {/* An empty place keeps the score's room, so a board landing never shifts the blocks. */}
      <View
        style={[
          styles.score,
          entry ? { backgroundColor: withAlpha(theme.outline, 0.45) } : null,
        ]}
      >
        {entry ? (
          <Text
            style={[
              styles.scoreText,
              { color: winner ? theme.gold : theme.onBrand },
              embossed(1.5),
            ]}
          >
            {t.fmt.score(entry.score)}
          </Text>
        ) : null}
      </View>

      <View style={[styles.stage, { height }]}>
        <Animated.View
          style={[
            styles.pedestal,
            {
              backgroundColor: metal.solid,
              borderColor: theme.outline,
              height,
            },
            entry ? null : styles.vacant,
            pedestalStyle,
          ]}
        >
          <View
            style={[
              styles.top,
              { backgroundColor: withAlpha(theme.onBrand, 0.42) },
            ]}
          />
          <View
            style={[
              styles.seam,
              { backgroundColor: withAlpha(theme.outline, 0.45) },
            ]}
          />
          <View style={styles.front}>
            <View
              pointerEvents="none"
              style={[
                styles.side,
                { backgroundColor: withAlpha(metal.lip, 0.55) },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.sheen,
                { backgroundColor: withAlpha(theme.onBrand, 0.2) },
              ]}
            />
            <Text
              style={[
                styles.digit,
                DIGIT[place],
                { color: metal.ink, textShadowColor: metal.lip },
              ]}
            >
              {place}
            </Text>
          </View>
        </Animated.View>
      </View>
    </>
  );

  const box = [
    styles.place,
    winner ? styles.winner : null,
    joined ? styles.joined : null,
  ];

  if (entry && onPress) {
    return (
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => onPress(entry)}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={[...box, press.style]}
      >
        {column}
      </AnimatedPressable>
    );
  }

  return (
    <View accessible accessibilityLabel={label} style={box}>
      {column}
    </View>
  );
}

/** Twelve rays fanning out of the centre of a 100 × 100 box, each half its slice. */
const RAYS = (() => {
  const count = 12;
  const half = Math.PI / count / 2;
  let path = '';
  for (let ray = 0; ray < count; ray += 1) {
    const mid = (ray / count) * Math.PI * 2 - Math.PI / 2;
    const [ax, ay] = [
      50 + 50 * Math.cos(mid - half),
      50 + 50 * Math.sin(mid - half),
    ];
    const [bx, by] = [
      50 + 50 * Math.cos(mid + half),
      50 + 50 * Math.sin(mid + half),
    ];
    path += `M50 50L${ax.toFixed(2)} ${ay.toFixed(2)}L${bx.toFixed(2)} ${by.toFixed(2)}Z`;
  }
  return path;
})();

/**
 * Light behind a winner or an emblem: a soft halo and rays fanning out,
 * both fading to nothing at the edge. Drawn once; it never turns.
 */
export function Spotlight({ size, color }: { size: number; color: string }) {
  const id = `spot-${useId().replace(/:/g, '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient
          id={`${id}-rays`}
          cx={50}
          cy={50}
          r={50}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset={0.12} stopColor={color} stopOpacity={0.5} />
          <Stop offset={1} stopColor={color} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient
          id={`${id}-halo`}
          cx={50}
          cy={50}
          r={50}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset={0} stopColor={color} stopOpacity={0.6} />
          <Stop offset={0.62} stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Path d={RAYS} fill={`url(#${id}-rays)`} />
      <Circle cx={50} cy={50} r={50} fill={`url(#${id}-halo)`} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  podium: { paddingTop: HEADROOM },
  glow: {
    height: GLOW,
    left: '50%',
    marginLeft: -GLOW / 2,
    position: 'absolute',
    top: GLOW_TOP,
    width: GLOW,
  },
  steps: { alignItems: 'flex-end', flexDirection: 'row' },
  place: { alignItems: 'center', flex: 1, gap: SPACE.xxs },
  winner: { flex: 1.18 },
  /** Neighbouring blocks share one outline, so the three read as one podium. */
  joined: { marginLeft: -DEPTH.outline },
  person: { alignItems: 'center', marginBottom: SPACE.md },
  crown: { height: CROWN, marginBottom: -CROWN_SEAT, width: CROWN, zIndex: 1 },
  frame: { borderWidth: DEPTH.outline, overflow: 'hidden', padding: RING },
  frameShine: {
    height: '50%',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  vacantFrame: {
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 2,
    justifyContent: 'center',
  },
  medal: {
    alignItems: 'center',
    bottom: -SPACE.md,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  name: {
    flexDirection: 'row',
    maxWidth: '100%',
    paddingHorizontal: SPACE.xs,
  },
  nameText: { fontFamily: FONT.displayBold, fontSize: 14, lineHeight: lh(18) },
  shrink: { flexShrink: 1 },
  score: {
    borderRadius: RADIUS.pill,
    minHeight: 21,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 1,
  },
  scoreText: {
    fontFamily: FONT.display,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    lineHeight: lh(19),
  },
  stage: { alignSelf: 'stretch', marginTop: SPACE.xs, overflow: 'hidden' },
  pedestal: {
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: DEPTH.outline,
    overflow: 'hidden',
  },
  vacant: { opacity: 0.55 },
  /** The block's top, seen from a little above: lighter than its face. */
  top: { height: 10 },
  seam: { height: 2 },
  front: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  /** The shaded right side that makes a flat face a block. */
  side: { bottom: 0, position: 'absolute', right: 0, top: 0, width: 9 },
  sheen: { bottom: 0, left: 0, position: 'absolute', top: 0, width: 5 },
  digit: {
    fontFamily: FONT.display,
    includeFontPadding: false,
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0.1,
  },
});

const DIGIT = StyleSheet.create({
  1: { fontSize: 44, lineHeight: lh(50) },
  2: { fontSize: 34, lineHeight: lh(40) },
  3: { fontSize: 28, lineHeight: lh(32) },
});
