import { StyleSheet, View } from 'react-native';

import { useBlock, useBlocks } from '@/hooks/useSocial';
import { handle, useT } from '@/i18n';
import { messageFor } from '@/lib/errors';
import { Avatar, Button, Callout, Panel, SkeletonList, Txt } from '@/ui/kit';
import { Sheet } from '@/ui/sheet';
import { SPACE } from '@/ui/theme';

/**
 * Ayarlar → Engellenenler: everyone the player blocked, the latest first,
 * each with the way to lift it. A lifted block leaves the two strangers
 * again — friendship and requests do not come back.
 */
export function BlockedSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const words = t.friends.blocked;
  const blocks = useBlocks(open);
  const block = useBlock();
  const users = blocks.data?.users ?? [];

  return (
    <Sheet open={open} onClose={onClose} title={words.title} description={words.description}>
      <View style={styles.body}>
        {blocks.isLoading ? (
          <SkeletonList rows={2} />
        ) : blocks.isError ? (
          <Callout tone="bad" title={words.failed}>
            {messageFor(blocks.error, t)}
          </Callout>
        ) : users.length === 0 ? (
          <Txt variant="body" tone="muted" align="center">
            {words.none}
          </Txt>
        ) : (
          users.map((user) => (
            <Panel key={user.username} style={styles.tile}>
              <Avatar name={user.username} src={user.avatarUrl} size="sm" />
              <View style={styles.text}>
                <Txt variant="heading" numberOfLines={1}>
                  {handle(user.username)}
                </Txt>
                <Txt variant="micro" tone="muted">
                  {words.since(t.fmt.date(user.blockedAt))}
                </Txt>
              </View>
              <Button
                label={words.unblock}
                tone="neutral"
                size="sm"
                loading={block.isPending && block.variables?.username === user.username}
                onPress={() => block.mutate({ username: user.username, block: false })}
              />
            </Panel>
          ))
        )}
        {block.isError ? <Callout tone="bad">{messageFor(block.error, t)}</Callout> : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: SPACE.ms },
  tile: { alignItems: 'center', flexDirection: 'row', gap: SPACE.md, paddingVertical: SPACE.ms },
  text: { flex: 1, gap: 1 },
});
