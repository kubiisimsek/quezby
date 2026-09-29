import { Pressable, StyleSheet, View } from 'react-native';

import { turnOnPush } from '@/hooks/usePush';
import { useT } from '@/i18n';
import { usePush } from '@/stores/push';
import { Icon } from '@/ui/icons';
import { Button, IconChip, LitEdge, Txt } from '@/ui/kit';
import { DEPTH, RADIUS, SPACE, useTheme } from '@/ui/theme';

/**
 * Notifications are off, said where it matters — the inbox, a conversation,
 * a VS just sent — with the one way to turn them on: the system's question
 * while it can still come, the phone's settings once it cannot. Nothing
 * shows while they are on, in a build without push, or — where the card
 * may be put away (`hideable`) — for a week after "Gizle".
 */
export function PushNudge({
  line,
  hideable = false,
}: {
  /** The card's own words for where it is; the general line otherwise. */
  line?: string;
  hideable?: boolean;
}) {
  const theme = useTheme();
  const t = useT();
  const words = t.push.nudge;
  const permission = usePush((state) => state.permission);
  const hiddenUntil = usePush((state) => state.nudgeHiddenUntil);

  if (permission !== 'undetermined' && permission !== 'denied') return null;
  if (hideable && hiddenUntil > Date.now()) return null;

  const blocked = permission === 'denied';

  return (
    <View
      style={[styles.card, { backgroundColor: theme.warnSoft, borderColor: theme.outline }]}
    >
      <LitEdge color={theme.warnLine} />
      <IconChip icon="bell" tone="warn" size="md" />
      <View style={styles.text}>
        <Txt variant="heading">{words.title}</Txt>
        <Txt variant="meta" tone="warn">
          {blocked ? words.blocked : (line ?? words.body)}
        </Txt>
        <Button
          label={blocked ? words.openSettings : words.allow}
          icon={blocked ? 'sliders' : 'bell'}
          tone="primary"
          size="sm"
          onPress={() => turnOnPush(permission)}
          style={styles.action}
        />
      </View>
      {hideable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={words.hide}
          hitSlop={10}
          onPress={() => usePush.getState().hideNudge()}
          style={styles.hide}
        >
          <Icon name="close" size={16} color={theme.inkMuted} strokeWidth={2.8} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'flex-start',
    borderBottomWidth: DEPTH.outline + DEPTH.lipSm,
    borderRadius: RADIUS.panel,
    borderWidth: DEPTH.outline,
    flexDirection: 'row',
    gap: SPACE.md,
    overflow: 'hidden',
    padding: SPACE.lg,
  },
  text: { flex: 1, gap: SPACE.xxs },
  action: { alignSelf: 'flex-start', marginTop: SPACE.sm },
  hide: { padding: SPACE.xxs },
});
