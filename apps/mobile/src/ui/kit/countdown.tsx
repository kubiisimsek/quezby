import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatCountdown } from '@/lib/format';
import { Icon } from '@/ui/icons';
import { FONT, RADIUS, SPACE, useTheme, withAlpha } from '@/ui/theme';

const HOUR = 3_600_000;

/**
 * Milliseconds until the text next changes. `formatCountdown` rounds seconds
 * up, so `5 sa 12 dk` turns into `5 sa 11 dk` at 5:11:59, not at 5:12:00.
 */
function nextTick(remaining: number): number {
  const seconds = Math.ceil(remaining / 1000);
  const unit = remaining <= HOUR ? 1 : 60;
  const shown = Math.floor(seconds / unit) * unit;
  return remaining - (shown - 1) * 1000;
}

/**
 * Time left on a board, on the server's clock, in the arena's colour for
 * time — cyan, on a dark pill: a phone's clock can be minutes
 * off, and a period ends for everyone at once. The offset is taken once per
 * `serverTime`; the chip then ticks every second in the last hour and every
 * minute before it.
 */
export function CountdownChip({
  endsAt,
  serverTime,
  prefix,
  tone = 'neutral',
  onElapsed,
}: {
  /** ISO time the period turns over. */
  endsAt: string;
  /** ISO time the server stamped on the response that carried `endsAt`. */
  serverTime: string;
  /** "Bitmesine" — left out once the time is up. */
  prefix?: string;
  tone?: 'onBrand' | 'neutral';
  /** Once, when the time runs out — refetch the board here. */
  onElapsed?: () => void;
}) {
  const theme = useTheme();
  const offset = useMemo(() => {
    const server = Date.parse(serverTime);
    return Number.isNaN(server) ? 0 : server - Date.now();
  }, [serverTime]);
  /** Only makes the chip render again; the time is read fresh each render. */
  const [, tick] = useState(0);
  const end = Date.parse(endsAt);
  const remaining = Number.isNaN(end) ? 0 : end - (Date.now() + offset);

  const elapsed = useRef(onElapsed);
  elapsed.current = onElapsed;
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    if (remaining <= 0) {
      if (firedFor.current !== endsAt) {
        firedFor.current = endsAt;
        elapsed.current?.();
      }
      return;
    }
    const timer = setTimeout(
      () => tick((count) => count + 1),
      nextTick(remaining),
    );
    return () => clearTimeout(timer);
  }, [endsAt, remaining]);

  const over = remaining <= 0;
  const time = over ? 'Sona erdi' : formatCountdown(remaining);
  const text = prefix && !over ? `${prefix} ${time}` : time;
  const onBrand = tone === 'onBrand';
  const color = over ? theme.inkMuted : theme.accent;

  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={text}
      style={[
        styles.chip,
        {
          backgroundColor: onBrand ? withAlpha(theme.outline, 0.5) : theme.well,
          borderColor: withAlpha(theme.accent, over ? 0.15 : 0.4),
        },
      ]}
    >
      <Icon name="hourglass" size={14} color={color} strokeWidth={2.6} />
      <Text style={[styles.digits, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    flexDirection: 'row',
    gap: SPACE.xs,
    paddingHorizontal: SPACE.ms,
    paddingVertical: 5,
  },
  digits: {
    fontFamily: FONT.displayBold,
    fontSize: 13.5,
    fontVariant: ['tabular-nums'],
    lineHeight: 17,
  },
});
