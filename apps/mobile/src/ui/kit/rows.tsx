import type { LeagueTier } from '@quezby/types';
import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { handle, useT } from '@/i18n';
import { IS_RTL } from '@/i18n/native';
import { TierBadge } from '@/ui/kit/badges';
import { Avatar } from '@/ui/kit/identity';
import { AnimatedPressable, common } from '@/ui/kit/shared';
import { Txt } from '@/ui/kit/text';
import { Icon } from '@/ui/icons';
import { SPRING, usePressScale } from '@/ui/motion';
import { DEPTH, RADIUS, SPACE, useTheme, withAlpha } from '@/ui/theme';

/**
 * A line in a tile that opens something: the small arrow slab on the right
 * says so, and the line sinks a touch under the thumb.
 */
export function ArrowNub() {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.nub,
        { backgroundColor: theme.fill, borderColor: theme.outline },
      ]}
    >
      <Icon name="chevron" size={14} color={theme.ink} strokeWidth={3} />
    </View>
  );
}

/** A tappable list line. Rows are how the app navigates; the arrow says so. */
export function Row({
  title,
  subtitle,
  right,
  onPress,
  leading,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  leading?: ReactNode;
}) {
  const press = usePressScale(0.985);

  const body = (
    <View style={styles.row}>
      {leading}
      <View style={common.flex}>
        <Txt variant="heading">{title}</Txt>
        {subtitle ? (
          <Txt variant="meta" tone="muted">
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
      {onPress ? <ArrowNub /> : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={press.style}
    >
      {body}
    </AnimatedPressable>
  );
}

/**
 * A setting that is on or off, as a row: what it does on the left, the
 * game's toggle on the right — a groove with a knob that springs across and
 * turns green — and the consequence under the title so nobody flips it blind.
 */
export function SwitchRow({
  title,
  subtitle,
  value,
  onChange,
  leading,
  disabled,
}: {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  leading?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.row, { opacity: disabled ? 0.5 : 1 }]}>
      {leading}
      <View style={common.flex}>
        <Txt variant="heading">{title}</Txt>
        {subtitle ? (
          <Txt variant="meta" tone="muted">
            {subtitle}
          </Txt>
        ) : null}
      </View>
      <Toggle label={title} value={value} onChange={onChange} disabled={disabled} />
    </View>
  );
}

const TRACK = { width: 56, height: 32, knob: 24 } as const;

/**
 * How far the knob slides to "on": toward the end of the line, which is the
 * left when the game reads right to left — a transform is the one thing the
 * layout does not turn around by itself.
 */
const KNOB_TRAVEL = (IS_RTL ? -1 : 1) * (TRACK.width - TRACK.knob - 8 - DEPTH.outline * 2);

/** On or off, the game's way: a green groove with the knob to the right. */
export function Toggle({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const on = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    on.value = withSpring(value ? 1 : 0, SPRING);
  }, [on, value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [theme.well, theme.ok]),
  }));
  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: on.value * KNOB_TRAVEL }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onChange(!value)}
    >
      <Animated.View
        style={[styles.track, { borderColor: theme.outline }, trackStyle]}
      >
        <Animated.View
          style={[
            styles.knob,
            { backgroundColor: theme.onBrand, borderColor: theme.outline },
            knobStyle,
          ]}
        >
          <View style={[styles.knobShine, { backgroundColor: withAlpha(theme.outline, 0.12) }]} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

/**
 * A player in a list — a search result, a friend request: who they are,
 * their league and season best, and one action on the right. The player and
 * the action are two targets side by side, so a tap on the button never
 * opens the card and a screen reader reaches both.
 */
export function PlayerRow({
  username,
  src,
  tier,
  best,
  isMe = false,
  action,
  onPress,
}: {
  username: string;
  /** Their photo; null draws their initials. */
  src?: string | null;
  /** Their league this week; null when they have none. */
  tier: LeagueTier | null;
  /** This season's best; null before their first ranked run. */
  best: number | null;
  isMe?: boolean;
  /** One small button — add, accept. */
  action?: ReactNode;
  /** Opens their card. */
  onPress?: () => void;
}) {
  const press = usePressScale(0.985);
  const t = useT();
  const words = t.kit.playerRow;
  const name = handle(username);
  const record = best === null ? words.noRecord : words.record(t.fmt.score(best));
  const label = words.label({
    name,
    me: isMe,
    league: tier ? t.tiers.league(tier) : null,
    record,
  });

  const who = (
    <>
      <Avatar name={username} src={src} tone={isMe ? 'primary' : 'neutral'} size="sm" />
      <View style={styles.playerText}>
        <Txt variant="heading" numberOfLines={1}>
          {isMe ? words.me(name) : name}
        </Txt>
        <View style={styles.playerMeta}>
          {tier ? <TierBadge tier={tier} size="sm" showLabel /> : null}
          <Txt variant="meta" tone="muted">
            {record}
          </Txt>
        </View>
      </View>
    </>
  );

  return (
    <View style={styles.row}>
      {onPress ? (
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={onPress}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
          style={[styles.player, press.style]}
        >
          {who}
        </AnimatedPressable>
      ) : (
        <View accessible accessibilityLabel={label} style={styles.player}>
          {who}
        </View>
      )}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  nub: {
    alignItems: 'center',
    borderBottomWidth: DEPTH.outline + 2,
    borderRadius: 9,
    borderWidth: DEPTH.outline - 0.5,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  track: {
    borderRadius: RADIUS.pill,
    borderWidth: DEPTH.outline,
    height: TRACK.height,
    justifyContent: 'center',
    paddingHorizontal: 2,
    width: TRACK.width,
  },
  knob: {
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    height: TRACK.knob,
    overflow: 'hidden',
    width: TRACK.knob,
  },
  knobShine: { bottom: 0, height: '40%', left: 0, position: 'absolute', right: 0 },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACE.md,
    paddingVertical: SPACE.ms,
  },
  player: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: SPACE.md,
  },
  playerText: { flex: 1, gap: SPACE.xxs },
  playerMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.sm,
  },
});
