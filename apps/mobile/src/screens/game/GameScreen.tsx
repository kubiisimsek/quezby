import { RULES } from '@quezby/engine';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
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

import { FeedbackLayer } from '@/game/FeedbackLayer';
import { Hud } from '@/game/Hud';
import { ReelCard } from '@/game/ReelCard';
import { ResultView } from '@/game/ResultView';
import { useGame } from '@/game/useGame';
import type { RootStackParamList } from '@/navigation/types';
import type { IconName } from '@/ui/icons';
import {
  Arena,
  Button,
  IconChip,
  Panel,
  Stamp,
  Txt,
  type TagTone,
} from '@/ui/kit';
import { SPRING_POP } from '@/ui/motion';
import {
  DEPTH,
  FONT,
  RADIUS,
  SPACE,
  embossed,
  useTheme,
  withAlpha,
} from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

/**
 * The game. Full screen, over the tabs, with no swipe-back: the only ways out
 * are the close button, which ends the run and scores it, or leaving the app,
 * which does the same. While a run is being prepared or verified, and when
 * one cannot start, the arena covers the feed.
 */
export function GameScreen({ navigation, route }: Props) {
  const mode = route.params?.mode ?? 'free';
  const game = useGame(mode);
  const queryClient = useQueryClient();
  const { start } = game;

  useEffect(() => {
    void start();
  }, [start]);

  useEffect(() => {
    if (game.phase !== 'result') return;
    for (const key of ['leaderboard', 'me', 'daily', 'league', 'stats']) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  }, [game.phase, queryClient]);

  const close = () => {
    if (game.phase === 'playing') {
      game.quit();
      return;
    }
    game.quit();
    navigation.goBack();
  };

  if (game.phase === 'result' && game.outcome) {
    return (
      <>
        <StatusBar barStyle="light-content" />
        <ResultView
          outcome={game.outcome}
          mode={mode}
          onReplay={() => void game.start()}
          onPlayFree={() => navigation.replace('Game', { mode: 'free' })}
          onClose={() => navigation.goBack()}
          onRetrySubmit={game.retrySubmit}
          onOpenDaily={() => navigation.replace('Daily')}
        />
      </>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      {game.reel ? (
        <ReelCard
          reel={game.reel}
          seed={game.seed}
          values={game.values}
          hint={
            game.phase === 'playing' && game.reel.index < RULES.intro.length
          }
        />
      ) : null}

      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(event) =>
          game.touches.onTouchStart(event.nativeEvent.pageY)
        }
        onResponderMove={(event) =>
          game.touches.onTouchMove(event.nativeEvent.pageY)
        }
        onResponderRelease={(event) =>
          game.touches.onTouchEnd(event.nativeEvent.pageY)
        }
        onResponderTerminate={(event) =>
          game.touches.onTouchEnd(event.nativeEvent.pageY)
        }
      />

      <FeedbackLayer feedback={game.feedback} />

      <Hud
        meter={game.values.meter}
        score={game.score}
        combo={game.combo}
        reelIndex={game.reel?.index ?? 0}
        onClose={close}
      />

      {game.phase === 'countdown' ? <Countdown value={game.countdown} /> : null}

      {game.phase === 'starting' || game.phase === 'finishing' ? (
        <Waiting
          label={
            game.phase === 'starting'
              ? 'Akış hazırlanıyor…'
              : 'Skorun doğrulanıyor…'
          }
        />
      ) : null}

      {game.phase === 'error' ? (
        <View accessibilityViewIsModal style={styles.cover}>
          <Arena />
          {game.startError?.code === 'daily_already_played' ? (
            <Trouble
              icon="calendar"
              tone="warn"
              title="Bugünün akışını oynadın"
              body={game.startError.message}
            >
              <Button
                label="Serbest oyna"
                icon="play"
                tone="play"
                onPress={() => navigation.replace('Game', { mode: 'free' })}
              />
              <Button
                label="Günün tablosu"
                icon="podium"
                tone="secondary"
                size="md"
                onPress={() => navigation.replace('Daily')}
              />
              <Button
                label="Vazgeç"
                tone="ghost"
                size="md"
                onPress={() => navigation.goBack()}
              />
            </Trouble>
          ) : (
            <Trouble
              icon="alert"
              tone="bad"
              title="Tur başlatılamadı"
              body={game.startError?.message ?? 'Sunucuya ulaşılamadı.'}
            >
              <Button
                label="Tekrar dene"
                icon="refresh"
                tone="play"
                onPress={() => void game.start()}
              />
              {mode === 'free' ? (
                <Button
                  label="Çevrimdışı antrenman"
                  tone="secondary"
                  size="md"
                  onPress={() => void game.start('offline')}
                />
              ) : null}
              <Button
                label="Vazgeç"
                tone="ghost"
                size="md"
                onPress={() => navigation.goBack()}
              />
            </Trouble>
          )}
        </View>
      ) : null}
    </View>
  );
}

/** 3, 2, 1 — each number slammed down in gold over the first reel. */
function Countdown({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const pop = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      pop.value = 1;
      return;
    }
    pop.value = withSequence(
      withTiming(0, { duration: 0 }),
      withSpring(1, SPRING_POP),
    );
  }, [pop, reduced, value]);

  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.6),
    transform: [{ scale: 1.9 - 0.9 * pop.value }],
  }));

  return (
    <View pointerEvents="none" style={styles.countdown}>
      <Animated.Text style={[styles.count, style]}>{value}</Animated.Text>
      <View style={styles.ready}>
        <Text style={styles.readyText}>Başparmağını hazırla</Text>
      </View>
    </View>
  );
}

/**
 * The arena while the API is asked — to start a run, or to replay and verify
 * it. It covers the feed for a screen reader too: no number before the API
 * has answered.
 */
function Waiting({ label }: { label: string }) {
  return (
    <View accessibilityViewIsModal style={[styles.cover, styles.centred]}>
      <Arena />
      <Drumroll />
      <Txt variant="title" align="center">
        {label}
      </Txt>
    </View>
  );
}

const COINS = [0, 1, 2] as const;

/** Three gold coins bouncing in turn: the drumroll before a verdict. */
function Drumroll() {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.roll,
        { backgroundColor: theme.well, borderColor: theme.outline },
      ]}
    >
      {COINS.map((index) => (
        <Coin key={index} index={index} />
      ))}
    </View>
  );
}

/** One coin of the drumroll. With reduced motion it glows in turn instead of bouncing. */
function Coin({ index }: { index: number }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const beat = useSharedValue(0);

  useEffect(() => {
    const step = { duration: 170, easing: Easing.inOut(Easing.quad) };
    beat.value = withDelay(
      index * 110,
      withRepeat(
        withSequence(
          withTiming(1, step),
          withTiming(0, step),
          withTiming(0, { duration: 190 }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(beat);
  }, [beat, index]);

  const style = useAnimatedStyle(() =>
    reduced
      ? { opacity: 0.4 + beat.value * 0.6 }
      : {
          transform: [
            { translateY: -beat.value * 12 },
            { scale: 1 + beat.value * 0.18 },
          ],
        },
  );

  return (
    <Animated.View
      style={[
        styles.coin,
        { backgroundColor: theme.gold, borderColor: theme.outline },
        style,
      ]}
    >
      <View
        style={[
          styles.coinShine,
          { backgroundColor: withAlpha(theme.onBrand, 0.5) },
        ]}
      />
    </Animated.View>
  );
}

/** Why a run could not start, on a tile, with the ways on under it. */
function Trouble({
  icon,
  tone,
  title,
  body,
  children,
}: {
  icon: IconName;
  tone: TagTone;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <Stamp from={1.12}>
      <Panel style={styles.trouble}>
        <View style={styles.troubleHead}>
          <IconChip icon={icon} tone={tone} size="lg" />
          <Txt variant="display" align="center">
            {title}
          </Txt>
          <Txt variant="body" tone="muted" align="center">
            {body}
          </Txt>
        </View>
        {children}
      </Panel>
    </Stamp>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: REEL.skip[0], flex: 1 },
  cover: {
    ...StyleSheet.absoluteFill,
    gap: SPACE.lg,
    justifyContent: 'center',
    padding: SPACE.xl,
  },
  centred: { alignItems: 'center' },
  countdown: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    backgroundColor: withAlpha(REEL.outline, 0.6),
    gap: SPACE.lg,
    justifyContent: 'center',
    padding: SPACE.xxl,
  },
  count: {
    color: REEL.gold,
    fontFamily: FONT.display,
    fontSize: 150,
    lineHeight: 172,
    ...embossed(8),
  },
  ready: {
    backgroundColor: REEL.track,
    borderColor: REEL.outline,
    borderRadius: RADIUS.pill,
    borderWidth: DEPTH.outline,
    paddingHorizontal: SPACE.xl,
    paddingVertical: SPACE.sm,
  },
  readyText: {
    color: REEL.ink,
    fontFamily: FONT.displayBold,
    fontSize: 17,
    lineHeight: 21,
  },
  roll: {
    borderRadius: RADIUS.pill,
    borderWidth: DEPTH.outline,
    flexDirection: 'row',
    gap: SPACE.md,
    paddingBottom: SPACE.md,
    paddingHorizontal: SPACE.xl,
    paddingTop: SPACE.xl,
  },
  coin: {
    borderRadius: RADIUS.pill,
    borderWidth: DEPTH.outline,
    height: 22,
    overflow: 'hidden',
    width: 22,
  },
  coinShine: {
    borderRadius: RADIUS.pill,
    height: 6,
    left: 4,
    position: 'absolute',
    right: 4,
    top: 2,
  },
  trouble: { gap: SPACE.md, padding: SPACE.xl },
  troubleHead: { alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.xs },
});
