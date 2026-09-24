import { StyleSheet, View } from 'react-native';

import { Portrait, SeasonBest } from '@/components/PlayerCard';
import { useFollow, usePlayer } from '@/hooks/useBoards';
import { messageFor } from '@/lib/errors';
import { formatRank, formatScore } from '@/lib/format';
import {
  Button,
  Callout,
  SkeletonList,
  Stamp,
  StatGrid,
  Tag,
  TierBadge,
  Txt,
} from '@/ui/kit';
import { Sheet } from '@/ui/sheet';
import { SPACE } from '@/ui/theme';

/**
 * A player's card, over whatever board it was opened from: their portrait
 * and league, their best this season in gold, their places and a few
 * lifetime numbers as stat tiles, and the one action — follow them, so they
 * show up on your friends boards.
 */
export function PlayerSheet({
  username,
  onClose,
}: {
  /** Null keeps the sheet closed. */
  username: string | null;
  onClose: () => void;
}) {
  const player = usePlayer(username);
  const follow = useFollow();
  const card = player.data?.player;

  return (
    <Sheet
      open={username !== null}
      onClose={onClose}
      title={username ? `@${username}` : ''}
    >
      {player.isLoading ? (
        <SkeletonList rows={3} />
      ) : player.isError ? (
        <Callout tone="bad" title="Oyuncu yüklenemedi">
          {messageFor(player.error)}
        </Callout>
      ) : card ? (
        <View style={styles.body}>
          <View style={styles.identity}>
            <Stamp from={1.25}>
              <Portrait name={card.username} isMe={card.isMe} size="md" />
            </Stamp>
            <View style={styles.who}>
              {card.league ? (
                <TierBadge tier={card.league} size="md" showLabel />
              ) : null}
              {card.isMe || card.followsMe ? (
                <View style={styles.tags}>
                  {card.isMe ? (
                    <Tag label="Sen" tone="primary" icon="account" />
                  ) : null}
                  {card.followsMe ? (
                    <Tag
                      label="Seni takip ediyor"
                      tone="secondary"
                      icon="userCheck"
                    />
                  ) : null}
                </View>
              ) : null}
              <Txt variant="meta" tone="muted">
                {`${formatScore(card.followers)} takipçi · ${formatScore(card.following)} takip`}
              </Txt>
            </View>
          </View>

          <SeasonBest best={card.best} delay={120} />

          <StatGrid
            columns={3}
            items={[
              {
                label: 'Bu hafta',
                value: formatRank(card.ranks.weekly),
                icon: 'podium',
                tone: 'warn',
              },
              {
                label: 'Tüm zamanlar',
                value: formatRank(card.ranks.all),
                icon: 'crown',
                tone: 'warn',
              },
              {
                label: 'Tur',
                value: formatScore(card.stats.runs),
                icon: 'play',
              },
              {
                label: 'Reel',
                value: formatScore(card.stats.reels),
                icon: 'arrowUp',
              },
              {
                label: 'Beğeni',
                value: formatScore(card.stats.likes),
                icon: 'heart',
                tone: 'primary',
              },
              {
                label: 'Mükemmel',
                value: formatScore(card.stats.perfects),
                icon: 'star',
              },
            ]}
          />

          {card.isMe ? null : (
            <Button
              label={card.isFollowing ? 'Takibi bırak' : 'Takip et'}
              icon={card.isFollowing ? 'userCheck' : 'userPlus'}
              tone={card.isFollowing ? 'neutral' : 'primary'}
              loading={follow.isPending}
              onPress={() =>
                follow.mutate({
                  username: card.username,
                  follow: !card.isFollowing,
                })
              }
            />
          )}
          {follow.isError ? (
            <Callout tone="bad">{messageFor(follow.error)}</Callout>
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: SPACE.lg },
  identity: { alignItems: 'center', flexDirection: 'row', gap: SPACE.lg },
  who: { alignItems: 'flex-start', flex: 1, gap: SPACE.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs },
});
