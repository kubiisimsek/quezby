import type { RatingResponse } from '@quezby/types';
import { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useT } from '@/i18n';
import type { PlayMode } from '@/i18n/messages/modes';
import type { IconName } from '@/ui/icons';
import { IconChip, Meter, Txt, type TagTone } from '@/ui/kit';
import { ArrowNub } from '@/ui/kit/rows';
import { Sheet } from '@/ui/sheet';
import { DEPTH, RADIUS, SPACE, useTheme } from '@/ui/theme';

/**
 * What the lobby's Oyna opens: the three ways to play, one tile each —
 * Günlük (the day's feed, or the day's board once its shot is used), Normal,
 * and Dereceli with what it plays for now: the next target, the placement
 * count, or, while it is shut, a lock and how far it is. The game starts once
 * the sheet is off the screen.
 */
export function ModeSheet({
  open,
  onClose,
  rating,
  dailyPlayed,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  /** `GET /rating` — undefined while it loads, when Dereceli waits for it. */
  rating: RatingResponse | undefined;
  dailyPlayed: boolean;
  onPick: (mode: PlayMode) => void;
}) {
  const t = useT();
  const words = t.modes;
  const picked = useRef<PlayMode | null>(null);

  /** Starts the picked mode once, whichever of the two signals comes first. */
  const start = useCallback(() => {
    const mode = picked.current;
    picked.current = null;
    if (mode) onPick(mode);
  }, [onPick]);

  const pick = (mode: PlayMode) => {
    // The game opens once the sheet has left, so it never presents over a
    // sheet still leaving; the timer is the fallback for a platform that
    // never says so.
    picked.current = mode;
    onClose();
    setTimeout(start, 650);
  };

  const unlock = rating?.unlock ?? null;
  const placement = rating?.placement ?? null;
  let ratedLine: string;
  if (unlock) ratedLine = words.lockedTitle(unlock.remaining);
  else if (placement) ratedLine = t.rating.placement.title(placement.played, placement.required);
  else ratedLine = words.lines.rated(t.fmt.score(rating?.target ?? 0));

  return (
    <Sheet open={open} onClose={onClose} onClosed={start} title={words.sheet}>
      <View style={styles.tiles}>
        <ModeTile
          icon="calendar"
          tone="primary"
          name={words.names.daily}
          line={dailyPlayed ? words.lines.dailyPlayed : t.daily.rule}
          onPress={() => pick('daily')}
        />
        <ModeTile
          icon="play"
          tone="warn"
          name={words.names.free}
          line={words.lines.free}
          onPress={() => pick('free')}
        />
        <ModeTile
          icon={unlock ? 'lock' : 'shield'}
          tone={unlock ? 'neutral' : 'secondary'}
          name={words.names.rated}
          line={rating ? ratedLine : ''}
          said={unlock ? words.lockedLabel(unlock.remaining) : undefined}
          progress={unlock ? (unlock.required - unlock.remaining) / unlock.required : undefined}
          disabled={!rating || unlock !== null}
          onPress={() => pick('rated')}
        />
      </View>
    </Sheet>
  );
}

/** One way to play: its gem, its name, what it plays for; a shut one shows how far it is instead of an arrow. */
function ModeTile({
  icon,
  tone,
  name,
  line,
  said,
  progress,
  disabled = false,
  onPress,
}: {
  icon: IconName;
  tone: TagTone;
  name: string;
  line: string;
  said?: string;
  progress?: number;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={said ?? name}
      accessibilityHint={said ? undefined : line}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: theme.raised,
          borderColor: theme.outline,
          opacity: disabled ? 0.72 : 1,
          transform: [{ translateY: pressed ? 3 : 0 }],
        },
      ]}
    >
      <IconChip icon={icon} tone={tone} size="lg" />
      <View style={styles.text}>
        <Txt variant="title">{name}</Txt>
        {line ? (
          <Txt variant="meta" tone="muted" numberOfLines={2}>
            {line}
          </Txt>
        ) : null}
        {progress !== undefined ? <Meter value={progress} tone="secondary" /> : null}
      </View>
      {disabled ? null : <ArrowNub />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tiles: { gap: SPACE.ms },
  tile: {
    alignItems: 'center',
    borderBottomWidth: DEPTH.outline + DEPTH.lipSm,
    borderRadius: RADIUS.panel,
    borderWidth: DEPTH.outline,
    flexDirection: 'row',
    gap: SPACE.md,
    padding: SPACE.lg,
  },
  text: { flex: 1, gap: SPACE.xxs },
});
