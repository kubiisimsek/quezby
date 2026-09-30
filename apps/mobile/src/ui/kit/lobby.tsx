import { useEffect, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useT } from '@/i18n';
import { IS_RTL, SHRINK_TO_FIT } from '@/i18n/native';
import { Icon, type IconName } from '@/ui/icons';
import { buttonColors } from '@/ui/kit/buttons';
import { IconChip } from '@/ui/kit/identity';
import { AnimatedPressable, common } from '@/ui/kit/shared';
import { Slab } from '@/ui/kit/slab';
import { LitEdge } from '@/ui/kit/surfaces';
import { Count } from '@/ui/kit/social';
import { Txt } from '@/ui/kit/text';
import { type TagTone } from '@/ui/kit/tones';
import { SPRING, SPRING_PRESS, usePressScale } from '@/ui/motion';
import {
  DEPTH,
  FONT,
  RADIUS,
  SPACE,
  TYPE,
  lh,
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
      <LitEdge color={theme.tileHi} />
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

/**
 * A notification on the lobby — the lobby is drawn as the phone's lock
 * screen, and what waits for the player comes in as its notifications: a VS,
 * today's feed, the league, the rival. Every one is the same height: a gem
 * or a portrait, what it is (small, in capitals) over one line, one live
 * line under it, and its answer at the end.
 *
 * The body and the answer are two targets side by side, never one inside
 * the other: pressing ✓ never opens the body, and a screen reader reaches
 * each on its own.
 */
export function NoticeCard({
  eyebrow,
  title,
  meta,
  icon,
  tone = 'primary',
  lead,
  right,
  onPress,
  accessibilityLabel,
  fresh = false,
  fit = true,
  style,
}: {
  /** What kind of notice — "GÜNÜN AKIŞI #17", typed in capitals. */
  eyebrow: string;
  title: string;
  /**
   * Shrinks a long title onto its one line. Off for a title that always
   * fits: iOS (Fabric) sometimes draws a shrink-to-fit line a few points
   * tall, past minimumFontScale.
   */
  fit?: boolean;
  /** One live line: a countdown, a meter, a tag or a few words. */
  meta?: ReactNode;
  icon?: IconName;
  /** The gem's colour. */
  tone?: TagTone;
  /** Drawn instead of the gem — a friend's portrait. */
  lead?: ReactNode;
  /** The notice's answer: a slab or two, a score, a badge. */
  right?: ReactNode;
  onPress?: () => void;
  /** What a screen reader says for the body; the visible lines otherwise. */
  accessibilityLabel?: string;
  /** Not seen yet: its top edge and its name lit in magenta. */
  fresh?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const down = useSharedValue(0);
  const sink = useAnimatedStyle(() => ({
    transform: [{ translateY: down.value * 3 }],
  }));

  const body = (
    <>
      {lead ?? (icon ? <IconChip icon={icon} tone={tone} size="md" /> : null)}
      <View style={styles.noticeText}>
        <Text style={[TYPE.label, { color: fresh ? theme.primaryText : theme.inkFaint }]} numberOfLines={1}>
          {eyebrow}
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit={fit && SHRINK_TO_FIT}
          minimumFontScale={0.8}
          style={[TYPE.heading, { color: theme.ink }]}
        >
          {title}
        </Text>
        {typeof meta === 'string' ? (
          <Txt variant="meta" tone="muted" numberOfLines={1}>
            {meta}
          </Txt>
        ) : meta ? (
          <View style={styles.noticeMeta}>{meta}</View>
        ) : null}
      </View>
    </>
  );

  return (
    <Animated.View
      style={[
        common.panel,
        styles.notice,
        { backgroundColor: theme.tile, borderColor: theme.outline },
        sink,
        style,
      ]}
    >
      <LitEdge color={fresh ? theme.primary : theme.tileHi} />
      {onPress ? (
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={onPress}
          onPressIn={() => {
            down.value = withTiming(1, { duration: 60 });
          }}
          onPressOut={() => {
            down.value = withSpring(0, SPRING_PRESS);
          }}
          style={styles.noticeBody}
        >
          {body}
        </AnimatedPressable>
      ) : (
        <View
          accessible={Boolean(accessibilityLabel)}
          accessibilityLabel={accessibilityLabel}
          style={styles.noticeBody}
        >
          {body}
        </View>
      )}
      {right ? <View style={styles.noticeRight}>{right}</View> : null}
    </Animated.View>
  );
}

/** How far a breath swells, and how long each way takes. */
const BREATH = { scale: 1.04, ms: 1600 } as const;
const BREATH_CURVE = { duration: BREATH.ms, easing: Easing.inOut(Easing.sin) };
/** A glint crossing the face, and the rest before the next one. */
const GLINT = { ms: 900, rest: 2600 } as const;
/**
 * The way the glint crosses: along the line, so from the right when the game
 * reads right to left — a transform the layout does not turn by itself.
 */
const ALONG = IS_RTL ? -1 : 1;

/**
 * The lobby's play button. A gold slab that breathes,
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
      { translateX: ALONG * (((glint.value + 1) / 2) * (width + 120) - 90) },
      { rotate: `${ALONG * 18}deg` },
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
          <Icon name={icon} size={24} color={colors.ink} strokeWidth={2.6} fill={colors.ink} />
        )}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit={SHRINK_TO_FIT}
          minimumFontScale={0.72}
          style={[styles.playLabel, { color: loading ? withAlpha(colors.ink, 0.5) : colors.ink }]}
        >
          {label}
        </Text>
      </Slab>
    </Animated.View>
  );
}

/** How far the slab follows the thumb, and how far (or how fast) a swipe must go to start a game. */
const LIFT = { max: 56, start: 44, flick: -700 } as const;

/**
 * The lobby's one gold action, drawn as the lock screen's "swipe up to
 * unlock": the breathing `PlayButton` with chevrons climbing over it. A tap
 * starts a game like any button; so does a swipe up, the move the whole feed
 * is made of — the slab follows the thumb and springs back if the swipe was
 * too short. The chevrons climb on the slab's breath, the lobby's one loop;
 * they stand still wherever the slab does.
 */
export function SwipePlay({
  label,
  hint,
  onPlay,
  breathing = true,
  style,
}: {
  label: string;
  /** A line under the slab — "Yukarı kaydır, oyna". */
  hint?: string;
  onPlay: () => void;
  breathing?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const live = breathing && !reduced;
  const lift = useSharedValue(0);
  const climb = useSharedValue(0);

  useEffect(() => {
    if (!live) {
      cancelAnimation(climb);
      climb.value = 0;
      return;
    }
    climb.value = withRepeat(
      withSequence(withTiming(1, BREATH_CURVE), withTiming(0, BREATH_CURVE)),
      -1,
    );
    return () => cancelAnimation(climb);
  }, [live, climb]);

  const pan = usePanGesture({
    activeOffsetY: -10,
    failOffsetX: [-24, 24],
    onUpdate: (event) => {
      'worklet';
      lift.value = Math.min(LIFT.max, Math.max(0, -event.translationY));
    },
    onDeactivate: (event) => {
      'worklet';
      if (event.canceled) return;
      if (-event.translationY >= LIFT.start || event.velocityY <= LIFT.flick) {
        runOnJS(onPlay)();
      }
    },
    onFinalize: () => {
      'worklet';
      lift.value = reduced ? 0 : withSpring(0, SPRING);
    },
  });

  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.value }],
  }));
  const chevrons = [0, 1];

  return (
    <View style={[styles.swipe, style]}>
      <View pointerEvents="none" style={styles.chevrons}>
        {chevrons.map((i) => (
          <Chevron key={i} step={i} climb={climb} color={theme.gold} />
        ))}
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View style={liftStyle}>
          <PlayButton label={label} onPress={onPlay} breathing={breathing} />
        </Animated.View>
      </GestureDetector>
      {hint ? (
        <Txt variant="micro" tone="faint" align="center" numberOfLines={1}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

/** One of the chevrons over the slab: the higher, the fainter; all rise a little on the breath. */
function Chevron({
  step,
  climb,
  color,
}: {
  step: number;
  climb: SharedValue<number>;
  color: string;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: (1 - step * 0.3) * (0.55 + 0.45 * climb.value),
    transform: [{ translateY: -3 * climb.value }],
  }));
  return (
    <Animated.View style={[styles.chevron, style]}>
      <Icon name="chevronUp" size={22} color={color} strokeWidth={3.4} />
    </Animated.View>
  );
}

export type CounterItem = {
  label: string;
  value: string;
  /** A record, drawn in gold. */
  gold?: boolean;
  /** What waits behind it: a red count on the corner. */
  badge?: number;
  onPress?: () => void;
  /** What a screen reader says; the value and the label otherwise. */
  accessibilityLabel?: string;
};

/**
 * A few numbers side by side, each in its own well: the value in Rubik over
 * its name — a profile's REKOR · ARKADAŞ · TUR, a stats tile's headlines. A
 * counter that opens something sinks under the thumb and may wear a count.
 */
export function Counters({ items }: { items: CounterItem[] }) {
  return (
    <View style={styles.ranks}>
      {items.map((item) => (
        <Counter key={item.label} item={item} />
      ))}
    </View>
  );
}

function Counter({ item }: { item: CounterItem }) {
  const theme = useTheme();
  const press = usePressScale(0.95);
  const well = [styles.rank, { backgroundColor: theme.well, borderColor: theme.wellLine }];
  const content = (
    <>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit={SHRINK_TO_FIT}
        style={[styles.rankValue, { color: item.gold ? theme.gold : theme.ink }]}
      >
        {item.value}
      </Text>
      <Text
        style={[TYPE.micro, { color: theme.inkFaint }]}
        numberOfLines={1}
        adjustsFontSizeToFit={SHRINK_TO_FIT}
        minimumFontScale={0.7}
      >
        {item.label}
      </Text>
      {item.badge ? (
        <View pointerEvents="none" style={styles.counterBadge}>
          <Count value={item.badge} />
        </View>
      ) : null}
    </>
  );
  const label = item.accessibilityLabel ?? `${item.value} ${item.label}`;

  if (!item.onPress) {
    return (
      <View accessible accessibilityLabel={label} style={well}>
        {content}
      </View>
    );
  }
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={item.onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[...well, press.style]}
    >
      {content}
    </AnimatedPressable>
  );
}

/**
 * A place's type size, by its length — "#12" and "—" big, "#12.345" smaller
 * — so it fits its well. Not iOS's shrink-to-fit: on the profile it drew "—"
 * a few points tall.
 */
export function rankSize(text: string): { fontSize: number; lineHeight: number } {
  const size = text.length <= 6 ? 19 : text.length <= 8 ? 16 : 14;
  return { fontSize: size, lineHeight: lh(size + 4) };
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
  const t = useT();
  return (
    <View style={styles.ranks}>
      {items.map((item) => (
        <View
          key={item.label}
          accessible
          accessibilityLabel={
            item.rank
              ? t.home.rankChips.ranked(item.label, t.fmt.rank(item.rank))
              : t.home.rankChips.unranked(item.label)
          }
          style={[
            styles.rank,
            { backgroundColor: theme.well, borderColor: theme.wellLine },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.rankValue,
              rankSize(t.fmt.rank(item.rank)),
              { color: item.rank ? theme.gold : theme.inkFaint },
            ]}
          >
            {t.fmt.rank(item.rank)}
          </Text>
          <Text
            style={[TYPE.micro, { color: theme.inkFaint }]}
            numberOfLines={1}
            adjustsFontSizeToFit={SHRINK_TO_FIT}
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
  notice: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACE.md,
    minHeight: 76,
    paddingVertical: SPACE.md,
  },
  noticeBody: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: SPACE.md },
  noticeText: { flex: 1, gap: 1 },
  noticeMeta: { alignItems: 'flex-start', marginTop: 2 },
  noticeRight: { alignItems: 'center', flexDirection: 'row', gap: SPACE.sm },
  swipe: { gap: SPACE.xs },
  chevrons: { alignItems: 'center', marginBottom: -SPACE.xs },
  chevron: { height: 12, justifyContent: 'center' },
  counterBadge: { position: 'absolute', right: -DEPTH.outline, top: -DEPTH.outline },
  playFace: {
    flexDirection: 'row',
    gap: SPACE.sm,
    minHeight: 60,
    paddingHorizontal: SPACE.xl,
  },
  playLabel: { flexShrink: 1, fontFamily: FONT.display, fontSize: 24, lineHeight: lh(30) },
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
  rankValue: { fontFamily: FONT.display },
});
