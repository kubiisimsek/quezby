import { RULES, levelFor } from '@quezby/engine';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '@/i18n';
import { Icon } from '@/ui/icons';
import { SPRING_POP, SPRING_PRESS } from '@/ui/motion';
import { DEPTH, FONT, RADIUS, SPACE, embossed, lh, withAlpha } from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

/** How far the close slab sinks into its lip. */
const LIP = 4;

/**
 * The game's head-up display over the reel, drawn the way a game draws one:
 * the way out on a small dark slab, the dopamine meter as a thick bar that
 * says its name, the score in Rubik on a hard shadow, the level and the
 * combo on pills — and on a VS, who it is against. Every piece stands in the
 * outline, so it reads on any reel's colour.
 */
export function Hud({
  meter,
  score,
  combo,
  reelIndex,
  versus,
  rated,
  onClose,
}: {
  meter: SharedValue<number>;
  score: number;
  /** The combo the next hit builds on, per-mille. */
  combo: number;
  reelIndex: number;
  /** A VS run's pill: "VS · @ekin". */
  versus?: string;
  /** A rated run's pill: "Dereceli", or its difficulty once the rating made it harder: "Zorluk 7". */
  rated?: string;
  onClose: () => void;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const pop = useSharedValue(1);
  const flare = useSharedValue(1);
  const lastCombo = useRef(combo);

  useEffect(() => {
    if (score === 0 || reduced) return;
    pop.value = withSequence(
      withTiming(1.14, { duration: 70 }),
      withSpring(1, SPRING_POP),
    );
  }, [pop, reduced, score]);

  useEffect(() => {
    const grew = combo > lastCombo.current;
    lastCombo.current = combo;
    if (!grew || reduced) return;
    flare.value = withSequence(
      withTiming(1.3, { duration: 80 }),
      withSpring(1, SPRING_POP),
    );
  }, [combo, flare, reduced]);

  const scoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));
  const comboStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flare.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1000, meter.value)) / 10}%`,
    backgroundColor: interpolateColor(
      meter.value,
      [0, 250, 500, 1000],
      [REEL.meterLow, REEL.meterLow, REEL.meterMid, REEL.meter],
    ),
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.hud, { paddingTop: insets.top + SPACE.sm }]}
    >
      <View pointerEvents="box-none" style={styles.row}>
        <CloseSlab onPress={onClose} />

        <View style={styles.meterBlock}>
          <View style={styles.meterHead}>
            <Icon
              name="bolt"
              size={14}
              color={REEL.ink}
              fill={REEL.ink}
              strokeWidth={2}
            />
            <Text style={styles.meterLabel}>{t.game.hud.meter}</Text>
          </View>
          <View style={styles.meterTrack}>
            <Animated.View style={[styles.meterFill, fillStyle]}>
              <View style={styles.meterShine} />
            </Animated.View>
            <View style={[styles.notch, styles.quarter]} />
            <View style={[styles.notch, styles.half]} />
            <View style={[styles.notch, styles.threeQuarters]} />
          </View>
        </View>

        <View style={styles.scoreBox}>
          <Animated.Text style={[styles.score, scoreStyle]}>
            {t.fmt.score(score)}
          </Animated.Text>
        </View>
      </View>

      {/* A row of its own, so the combo coming and going never resizes the meter. */}
      <View style={styles.tags}>
        <View style={styles.level}>
          <Text style={styles.levelText}>{t.game.hud.level(levelFor(reelIndex))}</Text>
        </View>
        {versus ? (
          <View style={styles.level}>
            <Icon name="swords" size={13} color={REEL.ink} strokeWidth={2.8} />
            <Text style={styles.levelText} numberOfLines={1}>
              {versus}
            </Text>
          </View>
        ) : null}
        {rated ? (
          <View style={styles.level}>
            <Icon name="shield" size={13} color={REEL.ink} strokeWidth={2.8} />
            <Text style={styles.levelText} numberOfLines={1}>
              {rated}
            </Text>
          </View>
        ) : null}
        {combo > RULES.comboStart ? (
          <Animated.View style={[styles.combo, comboStyle]}>
            <Icon
              name="flame"
              size={13}
              color={REEL.goldInk}
              strokeWidth={2.8}
            />
            <Text style={styles.comboText}>{t.fmt.combo(combo)}</Text>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

/** The way out: a small dark slab that sinks into its lip under the thumb. */
function CloseSlab({ onPress }: { onPress: () => void }) {
  const t = useT();
  const down = useSharedValue(0);
  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: down.value * LIP }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.game.hud.close}
      hitSlop={12}
      onPress={onPress}
      onPressIn={() => {
        down.value = withTiming(1, { duration: 60 });
      }}
      onPressOut={() => {
        down.value = withSpring(0, SPRING_PRESS);
      }}
      style={styles.close}
    >
      <View style={styles.closeLip} />
      <Animated.View style={[styles.closeFace, faceStyle]}>
        <View style={styles.closeLight} />
        <View style={styles.closeHi} />
        <Icon name="close" size={18} color={REEL.ink} strokeWidth={3.2} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hud: {
    left: 0,
    paddingHorizontal: SPACE.lg,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  row: { alignItems: 'center', flexDirection: 'row', gap: SPACE.md },
  close: { paddingBottom: LIP, width: 40 },
  closeLip: {
    ...StyleSheet.absoluteFill,
    backgroundColor: REEL.outline,
    borderRadius: 12,
    top: LIP,
  },
  closeFace: {
    alignItems: 'center',
    backgroundColor: REEL.outline,
    borderColor: REEL.outline,
    borderRadius: 12,
    borderWidth: DEPTH.outline,
    height: 38,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  closeLight: {
    ...StyleSheet.absoluteFill,
    backgroundColor: withAlpha(REEL.ink, 0.16),
  },
  closeHi: {
    backgroundColor: withAlpha(REEL.ink, 0.1),
    height: '50%',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  meterBlock: { flex: 1, gap: SPACE.xs },
  meterHead: { alignItems: 'center', flexDirection: 'row', gap: SPACE.xs },
  meterLabel: {
    color: REEL.ink,
    fontFamily: FONT.displayBold,
    fontSize: 13,
    lineHeight: lh(16),
    ...embossed(1.5),
  },
  meterTrack: {
    backgroundColor: REEL.track,
    borderColor: REEL.outline,
    borderRadius: RADIUS.pill,
    borderWidth: DEPTH.outline,
    height: 18,
    overflow: 'hidden',
  },
  meterFill: { borderRadius: RADIUS.pill, height: '100%', overflow: 'hidden' },
  meterShine: {
    backgroundColor: withAlpha(REEL.ink, 0.45),
    borderRadius: RADIUS.pill,
    height: 4,
    left: 5,
    position: 'absolute',
    right: 5,
    top: 2,
  },
  notch: {
    backgroundColor: withAlpha(REEL.outline, 0.35),
    bottom: 0,
    position: 'absolute',
    top: 0,
    width: 2,
  },
  quarter: { left: '25%' },
  half: { left: '50%' },
  threeQuarters: { left: '75%' },
  scoreBox: { alignItems: 'flex-end', minWidth: 110 },
  score: {
    color: REEL.ink,
    fontFamily: FONT.display,
    fontSize: 30,
    fontVariant: ['tabular-nums'],
    lineHeight: lh(35),
    ...embossed(3),
  },
  tags: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    flexDirection: 'row',
    gap: SPACE.xs,
    marginTop: SPACE.xs,
  },
  level: {
    alignItems: 'center',
    backgroundColor: REEL.track,
    borderColor: REEL.outline,
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    flexDirection: 'row',
    flexShrink: 1,
    gap: 4,
    paddingHorizontal: SPACE.sm + 2,
    paddingVertical: 1,
  },
  levelText: {
    color: REEL.ink,
    fontFamily: FONT.displayBold,
    fontSize: 12,
    lineHeight: lh(16),
  },
  combo: {
    alignItems: 'center',
    backgroundColor: REEL.gold,
    borderBottomWidth: 3.5,
    borderColor: REEL.outline,
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: SPACE.sm + 2,
    paddingVertical: 1,
  },
  comboText: {
    color: REEL.goldInk,
    fontFamily: FONT.display,
    fontSize: 13,
    lineHeight: lh(16),
  },
});
