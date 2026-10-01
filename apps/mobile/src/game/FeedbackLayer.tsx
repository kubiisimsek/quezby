import { RULES, blindFactor, type BonusHit } from '@quezby/engine';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { bonusGuide } from '@/game/howTo';
import type { Feedback } from '@/game/useGame';
import { ltr, useT } from '@/i18n';
import { Icon } from '@/ui/icons';
import { Shine, useShake } from '@/ui/kit';
import { SPRING_POP } from '@/ui/motion';
import { DEPTH, FONT, SPACE, embossed, lh, withAlpha } from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

/** A burst's whole life — in, held, gone — short enough to never cover the next reel. */
const LIFE_MS = 680;

/** 1 until `from` of a burst's life has passed, then down to 0 at its end. */
function fadeAfter(t: number, from: number): number {
  'worklet';
  return t <= from ? 1 : Math.max(0, (1 - t) / (1 - from));
}

/**
 * What the thumb just did, told once over the reel: points rising in Rubik
 * on a hard shadow, a heart on a like, named combos stamped on gold ribbons,
 * and on a miss a red flash and a word slammed onto a red slab — every miss
 * says what happened, in the game's voice (`t.game.verdicts`). Keyed by the
 * feedback id, so each one plays in full even when two arrive close together.
 * With reduced motion nothing flies, grows or shakes; it only comes and goes.
 */
export function FeedbackLayer({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) return null;
  return <Burst key={feedback.id} feedback={feedback} />;
}

function Burst({ feedback }: { feedback: Feedback }) {
  const t = useT();
  const reduced = useReducedMotion();
  const hit = feedback.verdict === 'hit' || feedback.verdict === 'perfect';
  const life = useSharedValue(0);
  const pop = useSharedValue(reduced ? 1 : 0);
  const flash = useSharedValue(0);
  const heart = useSharedValue(0);
  const { style: shakeStyle, shake } = useShake(9);
  const shakeOnce = useRef(shake);

  useEffect(() => {
    life.value = withTiming(1, { duration: LIFE_MS, easing: Easing.linear });
    if (!reduced) pop.value = withSpring(1, SPRING_POP);
    if (!hit) {
      flash.value = withSequence(
        withTiming(1, { duration: 60 }),
        withTiming(0, { duration: 320 }),
      );
      shakeOnce.current();
    }
    if (hit && feedback.kind === 'like') {
      heart.value = withSequence(
        reduced ? withTiming(1, { duration: 90 }) : withSpring(1, SPRING_POP),
        withDelay(160, withTiming(0, { duration: 220 })),
      );
    }
  }, [feedback.kind, flash, heart, hit, life, pop, reduced]);

  const pointsStyle = useAnimatedStyle(() => {
    const t = life.value;
    const up = 1 - (1 - t) * (1 - t);
    return {
      opacity: fadeAfter(t, 0.55) * Math.min(1, pop.value * 2),
      transform: [
        { translateY: reduced ? 0 : -up * 84 },
        { scale: 0.5 + pop.value * 0.5 },
      ],
    };
  });
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value * 0.45 }));
  const heartStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, heart.value * 1.4),
    transform: [{ scale: reduced ? 1 : 0.4 + heart.value * 0.9 }],
  }));
  const missStyle = useAnimatedStyle(() => ({
    opacity: fadeAfter(life.value, 0.7) * Math.min(1, pop.value * 2),
    transform: [{ scale: 1.7 - 0.7 * pop.value }],
  }));

  const label = t.game.verdicts[feedback.verdict];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {!hit ? <Animated.View style={[styles.flash, flashStyle]} /> : null}

      <View style={styles.center}>
        {hit && feedback.kind === 'like' ? (
          <Animated.View style={[styles.heart, heartStyle]}>
            <Icon
              name="heart"
              size={150}
              color={REEL.likeGlow}
              fill={REEL.likeGlow}
              strokeWidth={1.2}
            />
          </Animated.View>
        ) : null}

        {hit ? (
          <>
            <Animated.View style={[styles.pointsBlock, pointsStyle]}>
              {label ? <Text style={styles.perfect}>{label}</Text> : null}
              <Text style={styles.points}>{ltr(`+${t.fmt.score(feedback.points)}`)}</Text>
              {feedback.combo > RULES.comboStart ? (
                <Text style={styles.combo}>
                  {t.game.feedback.combo(t.fmt.combo(feedback.combo))}
                </Text>
              ) : null}
            </Animated.View>
            {feedback.bonuses.length > 0 ? (
              <View style={styles.ribbons}>
                {feedback.bonuses.map((bonus, index) => (
                  <ComboRibbon
                    key={bonus.kind}
                    bonus={bonus}
                    index={index}
                    life={life}
                    reduced={reduced}
                  />
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <Animated.View style={[styles.missBlock, shakeStyle]}>
            <Animated.View style={[styles.miss, missStyle]}>
              <Shine
                color={withAlpha(REEL.ink, 0.16)}
                radius={18}
                outline={DEPTH.outline + 0.5}
                height="50%"
              />
              <Text style={styles.missText}>
                {feedback.blind > 0 ? t.game.feedback.blind : label}
              </Text>
            </Animated.View>
            {blindFactor(feedback.blind) > 1 ? (
              <Animated.View style={[styles.penalty, missStyle]}>
                <Text style={styles.penaltyText}>
                  {t.game.feedback.penalty(blindFactor(feedback.blind))}
                </Text>
              </Animated.View>
            ) : null}
          </Animated.View>
        )}
      </View>
    </View>
  );
}

/** A named combo — "Kusursuz seviye! +480" — stamped onto a gold ribbon, a beat apart. */
function ComboRibbon({
  bonus,
  index,
  life,
  reduced,
}: {
  bonus: BonusHit;
  index: number;
  life: SharedValue<number>;
  reduced: boolean;
}) {
  const t = useT();
  const land = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    land.value = withDelay(40 + index * 80, withSpring(1, SPRING_POP));
  }, [index, land, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, land.value * 1.6) * fadeAfter(life.value, 0.72),
    transform: [
      { scale: 1.8 - 0.8 * land.value },
      { rotate: index % 2 === 0 ? '-3deg' : '2deg' },
    ],
  }));

  return (
    <Animated.View style={[styles.ribbon, style]}>
      <Shine color={withAlpha(REEL.ink, 0.28)} radius={12} height="50%" />
      <Text style={styles.ribbonText}>
        {t.game.feedback.bonus(bonusGuide(t)[bonus.kind].toast, t.fmt.score(bonus.points))}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flash: { ...StyleSheet.absoluteFill, backgroundColor: REEL.miss },
  center: {
    alignItems: 'center',
    flex: 1,
    gap: SPACE.md,
    justifyContent: 'center',
    paddingBottom: 60,
    paddingHorizontal: SPACE.xl,
  },
  heart: { position: 'absolute' },
  pointsBlock: { alignItems: 'center', gap: SPACE.xxs },
  perfect: {
    color: REEL.hit,
    fontFamily: FONT.display,
    fontSize: 28,
    lineHeight: lh(34),
    transform: [{ rotate: '-4deg' }],
    ...embossed(3),
  },
  points: {
    color: REEL.ink,
    fontFamily: FONT.display,
    fontSize: 48,
    lineHeight: lh(56),
    ...embossed(4),
  },
  combo: {
    color: REEL.gold,
    fontFamily: FONT.displayBold,
    fontSize: 18,
    lineHeight: lh(22),
    ...embossed(2),
  },
  ribbons: { alignItems: 'center', gap: SPACE.sm },
  ribbon: {
    backgroundColor: REEL.gold,
    borderBottomWidth: DEPTH.outline + 3,
    borderColor: REEL.outline,
    borderRadius: 12,
    borderWidth: DEPTH.outline,
    overflow: 'hidden',
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.xs,
  },
  ribbonText: {
    color: REEL.goldInk,
    fontFamily: FONT.display,
    fontSize: 20,
    lineHeight: lh(25),
  },
  miss: {
    backgroundColor: REEL.miss,
    borderBottomWidth: DEPTH.outline + 5,
    borderColor: REEL.outline,
    borderRadius: 18,
    borderWidth: DEPTH.outline + 0.5,
    overflow: 'hidden',
    paddingHorizontal: SPACE.xxl,
    paddingVertical: SPACE.sm,
  },
  missBlock: { alignItems: 'center', gap: SPACE.sm },
  /** A blind move's doubled penalty, from the second in a row, stamped under the miss: "Ceza x2". */
  penalty: {
    backgroundColor: REEL.outline,
    borderColor: REEL.miss,
    borderRadius: 12,
    borderWidth: DEPTH.outline,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.xxs,
    transform: [{ rotate: '-3deg' }],
  },
  penaltyText: {
    color: REEL.ink,
    fontFamily: FONT.display,
    fontSize: 22,
    lineHeight: lh(28),
  },
  missText: {
    color: REEL.ink,
    fontFamily: FONT.display,
    fontSize: 34,
    lineHeight: lh(41),
    ...embossed(3),
  },
});
