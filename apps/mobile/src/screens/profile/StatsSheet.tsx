import { postsOf } from '@quezby/config';
import type { PlayerStats } from '@quezby/types';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BONUS_ORDER } from '@/game/howTo';
import { useStats } from '@/hooks/useBoards';
import { useLocale, useT, type Messages } from '@/i18n';
import { messageFor } from '@/lib/errors';
import {
  BonusChip,
  Button,
  Callout,
  Divider,
  Eyebrow,
  Panel,
  Shine,
  SkeletonList,
  StatGrid,
  Tag,
  Txt,
} from '@/ui/kit';
import { Sheet } from '@/ui/sheet';
import { DEPTH, SPACE, useTheme, withAlpha } from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

/** The four numbers the profile's statistics tile shows, in its order. */
export function headlines(stats: PlayerStats, t: Messages) {
  return {
    posts: t.fmt.score(stats.reels),
    perfects: t.fmt.score(stats.perfects),
    reaction:
      stats.bestReactionMs === null
        ? '—'
        : t.profile.stats.milliseconds(t.fmt.score(stats.bestReactionMs)),
    combo: stats.maxCombo > 0 ? t.fmt.combo(stats.maxCombo) : '—',
  };
}

/**
 * Every count the API keeps of the player's play, grouped — the game (runs,
 * posts, time), the moves (swipes, likes, perfects), the bests (reaction,
 * combo) — then the named combos they have pulled off and the friends'
 * posts they liked most, known on the phone by id and drawn from the
 * content catalog. The profile shows four of them; the rest wait here.
 */
export function StatsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const words = t.profile.stats;
  /** The counts a player card shows too, in the card's words. */
  const counted = t.friends.sheet.stats;
  const stats = useStats();
  const posts = useMemo(() => postsOf(), []);
  const locale = useLocale();
  const data = stats.data;

  let body;
  if (stats.isLoading) {
    body = <SkeletonList rows={3} />;
  } else if (!data) {
    body = (
      <View style={styles.body}>
        <Callout tone="bad" title={words.failed}>
          {messageFor(stats.error, t)}
        </Callout>
        <Button label={words.retry} tone="neutral" icon="refresh" onPress={() => void stats.refetch()} />
      </View>
    );
  } else {
    const { stats: counts, topLiked } = data;
    const best = headlines(counts, t);
    const combos = BONUS_ORDER.filter((kind) => counts.bonuses[kind] > 0);
    const liked = topLiked.slice(0, 5).flatMap((item) => {
      const post = posts.get(item.contentId);
      return post ? [{ ...item, post }] : [];
    });
    body = (
      <View style={styles.body}>
        <Eyebrow icon="play">{words.groups.game}</Eyebrow>
        <StatGrid
          columns={3}
          items={[
            { label: counted.runs, value: t.fmt.score(counts.runs), icon: 'play' },
            { label: counted.posts, value: best.posts, icon: 'grid' },
            { label: words.playTime, value: t.fmt.playTime(counts.activeMs), icon: 'clock' },
          ]}
        />

        <Eyebrow icon="hand">{words.groups.moves}</Eyebrow>
        <StatGrid
          columns={3}
          items={[
            { label: words.swipes, value: t.fmt.score(counts.swipes), icon: 'arrowUp' },
            { label: counted.likes, value: t.fmt.score(counts.likes), icon: 'heart', tone: 'primary' },
            { label: counted.perfects, value: best.perfects, icon: 'star', tone: 'warn' },
          ]}
        />

        <Eyebrow icon="bolt">{words.groups.best}</Eyebrow>
        <StatGrid
          items={[
            { label: words.bestReaction, value: best.reaction, icon: 'bolt', tone: 'warn' },
            { label: t.result.stats.maxCombo, value: best.combo, icon: 'flame', tone: 'primary' },
          ]}
        />

        <Eyebrow icon="sparkle">{t.profile.combos.title}</Eyebrow>
        <Panel style={styles.section}>
          {combos.length > 0 ? (
            <View style={styles.chips}>
              {combos.map((kind) => (
                <BonusChip key={kind} kind={kind} count={counts.bonuses[kind]} />
              ))}
            </View>
          ) : (
            <Txt variant="meta" tone="muted">
              {t.profile.combos.empty}
            </Txt>
          )}
        </Panel>

        <Eyebrow icon="heart">{t.profile.liked.title}</Eyebrow>
        <Panel style={styles.section}>
          {liked.length > 0 ? (
            liked.map((item, index) => (
              <View key={item.contentId} style={styles.section}>
                {index > 0 ? <Divider /> : null}
                <LikedPost
                  emoji={item.post.emoji}
                  user={item.post.user[locale]}
                  caption={item.post.caption[locale]}
                  likes={item.likes}
                />
              </View>
            ))
          ) : (
            <Txt variant="meta" tone="muted">
              {t.profile.liked.empty}
            </Txt>
          )}
        </Panel>
      </View>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title={words.title}>
      {body}
    </Sheet>
  );
}

/**
 * One of the posts liked most: the post as a little pink reel — a friend's
 * post is a like reel in the feed — with its account, caption and how many
 * times you liked it.
 */
function LikedPost({
  emoji,
  user,
  caption,
  likes,
}: {
  emoji: string;
  user: string;
  caption: string;
  likes: number;
}) {
  const theme = useTheme();
  const t = useT();
  return (
    <View style={styles.post}>
      <View style={[styles.thumb, { backgroundColor: REEL.like, borderColor: theme.outline }]}>
        <Shine color={withAlpha(theme.onBrand, 0.16)} radius={12} height="40%" />
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={styles.flex}>
        <Txt variant="heading" numberOfLines={1}>
          {user}
        </Txt>
        <Txt variant="meta" tone="muted" numberOfLines={2}>
          {caption}
        </Txt>
      </View>
      <Tag label={t.profile.liked.times(likes)} tone="primary" icon="heart" />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { gap: SPACE.md },
  section: { gap: SPACE.ms },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  post: { alignItems: 'center', flexDirection: 'row', gap: SPACE.md },
  thumb: {
    alignItems: 'center',
    borderBottomWidth: DEPTH.outline + 3,
    borderRadius: 12,
    borderWidth: DEPTH.outline,
    height: 64,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 48,
  },
  emoji: { fontSize: 28, lineHeight: 34 },
});
