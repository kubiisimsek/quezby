import { useEffect, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { formatRank } from '@/lib/format';
import { Icon, type IconName } from '@/ui/icons';
import { buttonColors } from '@/ui/kit/buttons';
import { IconChip } from '@/ui/kit/identity';
import { AnimatedPressable, common } from '@/ui/kit/shared';
import { Slab } from '@/ui/kit/slab';
import { Txt } from '@/ui/kit/text';
import { type TagTone } from '@/ui/kit/tones';
import { SPRING_PRESS } from '@/ui/motion';
import {
  FONT,
  RADIUS,
  SPACE,
  TYPE,
  useTheme,
  withAlpha,
} from '@/ui/theme';

/**
 * A door in the game lobby — the league, the rival, the records: a tile with
 * a gem saying what kind of door it is, its name small over its title, its
 * live state on the right. A door that opens something sinks under the thumb
 * and carries a small arrow slab.
 */
export function LobbyCard({
  title,
  eyebrow,
  icon,
  tone = 'primary',
  right,
  onPress,
  children,
  style,
}: {
  title: string;
  eyebrow?: string;
  icon?: IconName;
  /** The gem's colour. */
  tone?: TagTone;
  right?: ReactNode;
  onPress?: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const down = useSharedValue(0);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: down.value * 3 }],
  }));

  const content = (
    <>
      <View pointerEvents="none" style={[styles.edge, { backgroundColor: theme.tileHi }]} />
      <View style={styles.head}>
        {icon ? <IconChip icon={icon} tone={tone} size="lg" /> : null}
        <View style={styles.titles}>
          {eyebrow ? (
            <Text style={[TYPE.label, { color: theme.inkFaint }]} numberOfLines={1}>
              {eyebrow}
            </Text>
          ) : null}
          <Txt variant="title" numberOfLines={1}>
            {title}
          </Txt>
        </View>
        {right}
        {onPress ? (
          <View style={[styles.arrow, { backgroundColor: theme.fill, borderColor: theme.outline }]}>
            <Icon name="chevron" size={15} color={theme.ink} strokeWidth={3} />
          </View>
        ) : null}
      </View>
      {children ? <View style={styles.body}>{children}</View> : null}
    </>
  );

  const surface = [
    common.panel,
    styles.card,
    { backgroundColor: theme.tile, borderColor: theme.outline },
    style,
  ];

  if (!onPress) return <View style={surface}>{content}</View>;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => {
        down.value = withTiming(1, { duration: 60 });
      }}
      onPressOut={() => {
        down.value = withSpring(0, SPRING_PRESS);
      }}
      style={[...surface, pressStyle]}
    >
      {content}
    </AnimatedPressable>
  );
}

/** How far a breath swells, and how long each way takes. */
const BREATH = { scale: 1.04, ms: 1600 } as const;
const BREATH_CURVE = { duration: BREATH.ms, easing: Easing.inOut(Easing.sin) };
/** A glint crossing the face, and the rest before the next one. */
const GLINT = { ms: 900, rest: 2600 } as const;

/**
 * The lobby's play button — today's game. A big gold slab that breathes,
 * 1 → 1.04 and back, with a glint crossing its face every few seconds: the
 * one thing on the lobby that moves on its own, because the game is waiting.
 *
 * `breathing` pauses both while the lobby is covered; a phone set to reduce
 * motion never starts them. Pressing sinks it into its lip like any button.
 */
export function PlayButton({
  label,
  onPress,
  icon = 'play',
  loading,
  disabled,
  breathing = true,
  tone = 'play',
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  breathing?: boolean;
  tone?: 'play' | 'onBrand' | 'primary';
  /** Where the button sits; the breath scales this box. */
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const live = breathing && !reduced && !loading;
  const scale = useSharedValue(1);
  const glint = useSharedValue(-1);
  const [width, setWidth] = useState(0);
  const colors = buttonColors(theme, tone);

  useEffect(() => {
    if (!live) {
      cancelAnimation(scale);
      cancelAnimation(glint);
      scale.value = 1;
      glint.value = -1;
      return;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(BREATH.scale, BREATH_CURVE),
        withTiming(1, BREATH_CURVE),
      ),
      -1,
    );
    glint.value = withRepeat(
      withSequence(
        withTiming(-1, { duration: 0 }),
        withDelay(
          GLINT.rest,
          withTiming(1, { duration: GLINT.ms, easing: Easing.inOut(Easing.quad) }),
        ),
      ),
      -1,
    );
    return () => {
      cancelAnimation(scale);
      cancelAnimation(glint);
    };
  }, [live, scale, glint]);

  const breath = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glintStyle = useAnimatedStyle(() => ({
    opacity: glint.value <= -1 ? 0 : 1,
    transform: [
      { translateX: ((glint.value + 1) / 2) * (width + 120) - 90 },
      { rotate: '18deg' },
    ],
  }));

  const inactive = Boolean(disabled || loading);

  return (
    <Animated.View style={[breath, style]}>
      <Slab
        colors={colors}
        radius={RADIUS.panel}
        onPress={onPress}
        disabled={inactive}
        accessibilityLabel={label}
        accessibilityState={{ busy: Boolean(loading) }}
        faceStyle={styles.playFace}
      >
        <View
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        >
          <Animated.View
            style={[
              styles.glint,
              { backgroundColor: withAlpha(theme.onBrand, 0.55) },
              glintStyle,
            ]}
          />
        </View>
        {loading ? null : (
          <Icon name={icon} size={30} color={colors.ink} strokeWidth={2.6} fill={colors.ink} />
        )}
        <Text style={[styles.playLabel, { color: loading ? withAlpha(colors.ink, 0.5) : colors.ink }]}>
          {label}
        </Text>
      </Slab>
    </Animated.View>
  );
}

/**
 * Where you stand on each board — today, this week, this month, all time:
 * one well per board, the place in gold over its name, "—" where you have not
 * placed. The ranks are the API's; nothing here counts.
 */
export function RankChips({
  items,
}: {
  items: Array<{ label: string; rank: number | null | undefined }>;
}) {
  const theme = useTheme();
  return (
    <View style={styles.ranks}>
      {items.map((item) => (
        <View
          key={item.label}
          accessible
          accessibilityLabel={`${item.label}: ${
            item.rank ? formatRank(item.rank) : 'sıralamada değilsin'
          }`}
          style={[
            styles.rank,
            { backgroundColor: theme.well, borderColor: theme.wellLine },
          ]}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[
              styles.rankValue,
              { color: item.rank ? theme.gold : theme.inkFaint },
            ]}
          >
            {formatRank(item.rank)}
          </Text>
          <Text
            style={[TYPE.micro, { color: theme.inkFaint }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: SPACE.md },
  edge: { height: 3, left: 0, position: 'absolute', right: 0, top: 0 },
  head: { alignItems: 'center', flexDirection: 'row', gap: SPACE.md },
  titles: { flex: 1, gap: 1 },
  arrow: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  body: { gap: SPACE.sm },
  playFace: {
    flexDirection: 'row',
    gap: SPACE.md,
    minHeight: 76,
    paddingHorizontal: SPACE.xl,
  },
  playLabel: { fontFamily: FONT.display, fontSize: 30, lineHeight: 36 },
  glint: {
    height: '220%',
    left: 0,
    position: 'absolute',
    top: '-60%',
    width: 34,
  },
  ranks: { flexDirection: 'row', gap: SPACE.sm },
  rank: {
    alignItems: 'center',
    borderRadius: RADIUS.control,
    borderWidth: 1.5,
    flex: 1,
    gap: 1,
    paddingHorizontal: SPACE.xs,
    paddingVertical: SPACE.ms,
  },
  rankValue: { fontFamily: FONT.display, fontSize: 19, lineHeight: 23 },
});
