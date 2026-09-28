import type { PlayerSummary } from '@quezby/types';
import { StyleSheet, View } from 'react-native';

import type { useFriendship } from '@/hooks/useSocial';
import { useT } from '@/i18n';
import { Button, IconButton } from '@/ui/kit';
import { SPACE } from '@/ui/theme';

type Friendship = ReturnType<typeof useFriendship>;

/**
 * What can be done with a player from their row, by what they are to you —
 * a small slab, or two: Ekle; Geri al once your request waits; Kabul et and
 * Reddet when theirs waits for you; Sohbet once you are friends. A request
 * on its way shows its spinner on the player's own slab only, and the API's
 * answer shows at once, until the list comes back with it.
 */
export function FriendButton({
  player,
  friendship,
  updatedAt = 0,
  onChat,
}: {
  player: PlayerSummary;
  friendship: Friendship;
  /** When the row was fetched: an answer sent after it wins over the row. */
  updatedAt?: number;
  /** Opens the conversation with a friend. */
  onChat: () => void;
}) {
  const t = useT();
  const words = t.friends.relation;
  const mine = friendship.variables?.username === player.username;
  const busy = friendship.isPending && mine;
  const answered =
    mine && friendship.isSuccess && friendship.submittedAt >= updatedAt ? friendship.data.relation : null;
  const send = (add: boolean) => friendship.mutate({ username: player.username, add });

  switch (answered ?? player.relation) {
    case 'friend':
      return <Button label={words.chat} icon="message" tone="secondary" size="sm" onPress={onChat} />;
    case 'requested':
      return <Button label={words.cancel} tone="neutral" size="sm" loading={busy} onPress={() => send(false)} />;
    case 'incoming':
      // A slab and a glyph, so the player's name keeps its room.
      return (
        <View style={styles.pair}>
          <Button label={words.accept} icon="check" tone="primary" size="sm" loading={busy} onPress={() => send(true)} />
          <IconButton icon="close" label={words.decline} onPress={() => (busy ? undefined : send(false))} />
        </View>
      );
    case 'blocked':
      return null;
    default:
      return <Button label={words.add} icon="userPlus" tone="primary" size="sm" loading={busy} onPress={() => send(true)} />;
  }
}

const styles = StyleSheet.create({
  pair: { alignItems: 'center', flexDirection: 'row', gap: SPACE.xs },
});
