import { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { handle, ltr, useT } from '@/i18n';
import { SHRINK_TO_FIT } from '@/i18n/native';
import { medalColors } from '@/ui/kit/badges';
import { Button } from '@/ui/kit/buttons';
import { Avatar } from '@/ui/kit/identity';
import { Meter } from '@/ui/kit/meter';
import { AnimatedPressable } from '@/ui/kit/shared';
import { Txt } from '@/ui/kit/text';
import { FADE, SPRING_PRESS, stagger } from '@/ui/motion';
import {
  DEPTH,
  FONT,
  RADIUS,
  SPACE,
  TYPE,
  embossed,
  lh,
  shadow,
  useTheme,
  withAlpha,
  type Theme,
} from '@/ui/theme';

/**
 * One player on the climb under the podium — rank 4 and down, or a whole
 * league group. A tile: the place on a coin (in its metal for the top three),
 * the portrait, the name, and the score in Rubik; beside the score, in green,
 * the one number that makes a row worth reading — how many points it takes to
 * pass the row above. Your own tile is tinted magenta with your place in gold.
 */
export function ClimbRow({
  rank,
  username,
  score,
  reels,
  detail,
  gap,
  isMe,
  onPress,
  index = 0,
}: {
  rank: number;
  username: string;
  score: number;
  reels?: number;
  /**
   * One more fact under the name, after the reels when both are given —
   * "3 gün" on a league row. Read aloud after the score.
   */
  detail?: string;
  /** Points to pass the row above; null hides the pill. */
  gap: number | null;
  isMe: boolean;
  onPress?: () => void;
  /** Position in the list — drives the entrance stagger. */
  index?: number;
}) {
  const theme = useTheme();
  const t = useT();
  const reduced = useReducedMotion();
  const enter = useSharedValue(reduced ? 1 : 0);
  const down = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      enter.value = 1;
      return;
    }
    enter.value = withDelay(
      stagger(index),
      withTiming(1, { ...FADE, duration: 320 }),
    );
  }, [enter, index, reduced]);

  const motion = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 12 + down.value * 3 }],
  }));

  const label = t.board.row({ rank, name: username, isMe, score, detail, gap });

  const facts = [
    reels === undefined ? null : t.board.posts(reels),
    detail || null,
  ]
    .filter(Boolean)
    .join(' · ');

  const face = isMe
    ? { bg: theme.primarySoft, hi: theme.primaryLine }
    : { bg: theme.tile, hi: theme.tileHi };

  const body = (
    <>
      <View
        pointerEvents="none"
        style={[styles.edge, { backgroundColor: face.hi }]}
      />
      {isMe ? (
        <View
          pointerEvents="none"
          style={[styles.ring, { borderColor: withAlpha(theme.primary, 0.75) }]}
        />
      ) : null}
      <View style={styles.coinSlot}>
        <RankCoin rank={rank} isMe={isMe} />
      </View>
      <Avatar name={username} tone={isMe ? 'primary' : 'neutral'} size="md" />
      <View style={styles.who}>
        <View style={styles.nameLine}>
          <Txt variant="heading" numberOfLines={1} style={styles.shrink}>
            {handle(username)}
          </Txt>
          {isMe ? (
            <Txt variant="heading" tone="primary">
              {` · ${t.board.you}`}
            </Txt>
          ) : null}
        </View>
        {facts === '' ? null : (
          <Txt variant="meta" tone="muted" numberOfLines={1}>
            {facts}
          </Txt>
        )}
      </View>
      <View style={styles.numbers}>
        <Txt variant="title" numberOfLines={1}>
          {t.fmt.score(score)}
        </Txt>
        {gap === null ? null : <GapPill gap={gap} mine={isMe} />}
      </View>
    </>
  );

  const surface = [
    styles.row,
    { backgroundColor: face.bg, borderColor: theme.outline },
    motion,
  ];

  if (!onPress) {
    return (
      <Animated.View accessible accessibilityLabel={label} style={surface}>
        {body}
      </Animated.View>
    );
  }

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => {
        down.value = withTiming(1, { duration: 60 });
      }}
      onPressOut={() => {
        down.value = withSpring(0, SPRING_PRESS);
      }}
      style={surface}
    >
      {body}
    </AnimatedPressable>
  );
}

/** The coin a place is struck on: a medal's metal, your gold, or plain night. */
function coinLook(
  theme: Theme,
  rank: number,
  isMe: boolean,
): { face: string; rim: string; lip: string; ink: string; lit: boolean } {
  if (rank === 1 || rank === 2 || rank === 3) {
    const metal = medalColors(theme, rank);
    return {
      face: metal.solid,
      rim: theme.outline,
      lip: metal.lip,
      ink: metal.ink,
      lit: true,
    };
  }
  if (isMe) {
    return {
      face: theme.outline,
      rim: theme.gold,
      lip: theme.goldLip,
      ink: theme.gold,
      lit: false,
    };
  }
  return {
    face: theme.tileLip,
    rim: theme.outline,
    lip: theme.outline,
    ink: theme.ink,
    lit: false,
  };
}

function RankCoin({ rank, isMe }: { rank: number; isMe: boolean }) {
  const theme = useTheme();
  const t = useT();
  const look = coinLook(theme, rank, isMe);

  return (
    <View
      style={[
        styles.coin,
        {
          backgroundColor: look.face,
          borderBottomColor: look.lip,
          borderColor: look.rim,
        },
      ]}
    >
      {look.lit ? (
        <View
          pointerEvents="none"
          style={[
            styles.coinShine,
            { backgroundColor: withAlpha(theme.onBrand, 0.35) },
          ]}
        />
      ) : null}
      <Text
        numberOfLines={1}
        style={[
          styles.coinText,
          { color: look.ink },
          look.lit ? null : embossed(1.5),
        ]}
      >
        {t.fmt.score(rank)}
      </Text>
    </View>
  );
}

/** "▲ 1.240" — what it takes to pass the row above, in the colour of going up. */
function GapPill({ gap, mine }: { gap: number; mine: boolean }) {
  const theme = useTheme();
  const t = useT();
  return (
    <View
      style={[
        styles.pill,
        mine
          ? { backgroundColor: theme.ok, borderColor: theme.outline }
          : { backgroundColor: theme.okSoft, borderColor: theme.okLine },
      ]}
    >
      <Text
        style={[
          styles.pillText,
          { color: mine ? theme.outline : theme.okText },
        ]}
      >
        {ltr(`▲ ${t.fmt.gap(gap)}`)}
      </Text>
    </View>
  );
}

/**
 * "Senin katın" — your own floor, pinned under a board as a slab of its own:
 * your place big in gold, who is right above you and what it takes to pass
 * them, a bar of how close you are, and the gold button that goes and does it.
 */
export function FloorCard({
  rank,
  score,
  targetUsername,
  gapToNext,
  progress,
  onPlay,
  style,
}: {
  /** Null when you have no ranked run in this period. */
  rank: number | null;
  score: number | null;
  /** The player right above you. */
  targetUsername?: string | null;
  /** Points to pass them. */
  gapToNext?: number | null;
  /** How far your score is towards passing them, per-mille. */
  progress?: number | null;
  /** `chasing`: the slab said "Geç onu" — there was someone right above to pass. */
  onPlay: (chasing: boolean) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const t = useT();
  const words = t.board.floor;
  const top = rank === 1;
  const chasing = rank !== null && !top && gapToNext != null;

  let line: string | null = null;
  if (rank === null) line = words.unranked;
  else if (top) line = words.top;
  else if (gapToNext != null) {
    line = targetUsername
      ? words.toPass(targetUsername, gapToNext)
      : words.toNext(gapToNext);
  }

  const permille =
    progress == null ? null : Math.min(1000, Math.max(0, progress));

  return (
    <View
      style={[
        styles.floor,
        shadow(theme, 'raised'),
        { backgroundColor: theme.primarySoft, borderColor: theme.outline },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[styles.floorEdge, { backgroundColor: theme.primaryLine }]}
      />
      <View
        style={[
          styles.floorTab,
          { backgroundColor: theme.outline, borderColor: theme.primaryLine },
        ]}
      >
        <Text
          accessibilityLabel={words.name}
          numberOfLines={1}
          style={[TYPE.label, { color: theme.gold }]}
        >
          {words.ribbon}
        </Text>
      </View>
      <View style={styles.floorRow}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit={SHRINK_TO_FIT}
          style={[
            styles.floorRank,
            { color: rank === null ? theme.inkFaint : theme.gold },
            embossed(3),
          ]}
        >
          {t.fmt.rank(rank)}
        </Text>
        <View style={styles.floorText}>
          <Txt variant="heading" numberOfLines={1}>
            {score === null ? words.you : words.youScored(score)}
          </Txt>
          {line ? (
            <Txt variant="meta" tone="muted" numberOfLines={2}>
              {line}
            </Txt>
          ) : null}
        </View>
        <Button
          label={chasing ? words.pass : words.play}
          icon="play"
          tone="play"
          size="md"
          onPress={() => onPlay(chasing)}
        />
      </View>
      {permille === null ? null : (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={words.progress}
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(permille / 10),
          }}
          style={styles.floorMeter}
        >
          <Meter value={permille / 1000} tone="ok" />
        </View>
      )}
    </View>
  );
}

const ROW_RADIUS = RADIUS.control + 2;
/** The height of the floor card's name tab. */
const FLOOR_TAB = 22;

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderBottomWidth: DEPTH.outline + DEPTH.lipSm,
    borderRadius: ROW_RADIUS,
    borderWidth: DEPTH.outline,
    flexDirection: 'row',
    gap: SPACE.ms,
    overflow: 'hidden',
    paddingLeft: SPACE.sm,
    paddingRight: SPACE.md,
    paddingVertical: SPACE.sm + 1,
  },
  /** The lit top edge of the tile. */
  edge: { height: 3, left: 0, position: 'absolute', right: 0, top: 0 },
  /** Your tile's magenta frame, inside the outline. */
  ring: {
    borderRadius: ROW_RADIUS - DEPTH.outline,
    borderWidth: 2,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  coinSlot: { alignItems: 'center', minWidth: 38 },
  coin: {
    alignItems: 'center',
    borderBottomWidth: 2 + DEPTH.outline,
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    height: 32,
    justifyContent: 'center',
    minWidth: 32,
    overflow: 'hidden',
    paddingHorizontal: 6,
  },
  coinShine: {
    borderRadius: RADIUS.pill,
    height: '42%',
    left: 3,
    position: 'absolute',
    right: 3,
    top: 1,
  },
  coinText: {
    fontFamily: FONT.display,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    lineHeight: lh(18),
  },
  who: { flex: 1, gap: 1 },
  nameLine: { flexDirection: 'row' },
  shrink: { flexShrink: 1 },
  numbers: { alignItems: 'flex-end', gap: 3 },
  pill: {
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  pillText: {
    fontFamily: FONT.displayBold,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    lineHeight: lh(15),
  },
  floor: {
    borderBottomWidth: DEPTH.outline + DEPTH.lip,
    borderRadius: RADIUS.panel,
    borderWidth: DEPTH.outline,
    gap: SPACE.sm,
    paddingBottom: SPACE.ms,
    paddingHorizontal: SPACE.md,
    paddingTop: SPACE.md + 2,
  },
  floorEdge: {
    borderTopLeftRadius: RADIUS.panel - DEPTH.outline,
    borderTopRightRadius: RADIUS.panel - DEPTH.outline,
    height: 3,
    left: 0,
    opacity: 0.9,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  /** The card's name on a dark tab over its top edge, the way a game labels a slab. */
  floorTab: {
    borderRadius: 9,
    borderWidth: 1.5,
    left: SPACE.lg,
    paddingHorizontal: SPACE.ms,
    paddingVertical: 2,
    position: 'absolute',
    top: -FLOOR_TAB / 2 - DEPTH.outline,
  },
  floorRow: { alignItems: 'center', flexDirection: 'row', gap: SPACE.md },
  floorRank: {
    fontFamily: FONT.display,
    fontSize: 30,
    lineHeight: lh(36),
    maxWidth: 110,
  },
  floorText: { flex: 1, gap: 1 },
  floorMeter: { alignSelf: 'stretch' },
});
