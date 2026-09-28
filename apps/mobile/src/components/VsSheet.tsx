import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSession } from '@/auth/session';
import { handle, useT } from '@/i18n';
import type { IconName } from '@/ui/icons';
import { Button, FaceOff, IconChip, Panel, Txt } from '@/ui/kit';
import { Sheet } from '@/ui/sheet';
import { SPACE } from '@/ui/theme';

/** The friend a VS is sent to. */
export type VsOpponent = { username: string; avatarUrl: string | null };

/**
 * Sending a VS: you and your friend face to face, the four rules of a VS,
 * and the sheet's one gold "Oyna" — the challenger plays first. `onPlay`
 * opens the game once the sheet has left the screen.
 */
export function VsSheet({
  opponent,
  onClose,
  onPlay,
}: {
  /** Null keeps the sheet closed. */
  opponent: VsOpponent | null;
  onClose: () => void;
  onPlay: (username: string) => void;
}) {
  const t = useT();
  const words = t.vs.sheet;
  const user = useSession((state) => state.user);
  /** Who to play, once the sheet is gone — the prop is null by then. */
  const playing = useRef<string | null>(null);
  // The friend stays on the sheet while it slides away.
  const [friend, setFriend] = useState(opponent);
  if (
    opponent !== null &&
    (opponent.username !== friend?.username || opponent.avatarUrl !== friend.avatarUrl)
  ) {
    setFriend(opponent);
  }

  const rules: Array<{ icon: IconName; line: string }> = friend
    ? [
        { icon: 'refresh', line: words.rules.seed },
        { icon: 'eyeOff', line: words.rules.first(handle(friend.username)) },
        { icon: 'hourglass', line: words.rules.time },
        { icon: 'shield', line: words.rules.counts },
      ]
    : [];

  /** The game, once — whichever comes first: the sheet gone, or the fallback timer. */
  const play = () => {
    const username = playing.current;
    playing.current = null;
    if (username) onPlay(username);
  };

  return (
    <Sheet open={opponent !== null} onClose={onClose} onClosed={play} title={words.title}>
      {friend && user ? (
        <View style={styles.body}>
          <FaceOff
            left={{ name: user.username ?? '?', src: user.avatarUrl, caption: words.you }}
            right={{ name: friend.username, src: friend.avatarUrl, caption: handle(friend.username) }}
          />
          <Panel tone="sunken" elevation="flat" style={styles.rules}>
            {rules.map((rule) => (
              <View key={rule.icon} style={styles.rule}>
                <IconChip icon={rule.icon} tone="secondary" size="sm" />
                <Txt variant="meta" tone="muted" style={styles.flex}>
                  {rule.line}
                </Txt>
              </View>
            ))}
          </Panel>
          <Button
            label={words.play}
            icon="play"
            tone="play"
            onPress={() => {
              playing.current = friend.username;
              onClose();
              // For a platform that never says the sheet is gone (ActionSheet does the same).
              setTimeout(play, 650);
            }}
          />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: SPACE.lg },
  rules: { gap: SPACE.md, paddingVertical: SPACE.md },
  rule: { alignItems: 'center', flexDirection: 'row', gap: SPACE.md },
  flex: { flex: 1 },
});
