import type { PlayerCard, ReportReason } from '@quezby/types';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { track } from '@/analytics/track';
import { Portrait, SeasonBest } from '@/components/PlayerCard';
import { VsSheet, type VsOpponent } from '@/components/VsSheet';
import { usePlayer } from '@/hooks/useBoards';
import { useBlock, useFriendship, useReport } from '@/hooks/useSocial';
import { handle, useT } from '@/i18n';
import { messageFor } from '@/lib/errors';
import type { RootStackParamList } from '@/navigation/types';
import {
  Button,
  Callout,
  SkeletonList,
  Stamp,
  StatGrid,
  Tag,
  TierBadge,
  Txt,
  type TagTone,
} from '@/ui/kit';
import { ActionList, Sheet, type SheetAction } from '@/ui/sheet';
import { SPACE } from '@/ui/theme';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

/** What waits for the card to leave the screen. */
type Then =
  | { to: 'vs'; opponent: VsOpponent }
  | { to: 'thread'; username: string }
  /** A friend list: a friend's, or yours (no username). */
  | { to: 'friends'; username?: string };

/**
 * A player's card, over whatever board or list it was opened from: their
 * portrait, league and Elo, their best this season in gold, their places and a
 * few lifetime numbers — then what the two of you can do, by what you are to
 * each other: ask to be friends, answer their request, send a VS or open the
 * conversation, lift a block. The rarer actions — ending the friendship,
 * blocking, reporting a photo or a name — wait under "Diğer".
 */
export function PlayerSheet({
  username,
  onClose,
  inThread = false,
  rating = true,
}: {
  /** Null keeps the sheet closed. */
  username: string | null;
  onClose: () => void;
  /** Opened from the conversation itself: no way into it. */
  inThread?: boolean;
  /** The player's league and Elo; Zirve, the score boards' screen, shows neither. */
  rating?: boolean;
}) {
  const t = useT();
  const words = t.friends.sheet;
  const navigation = useNavigation<Navigation>();
  const player = usePlayer(username);
  const friendship = useFriendship();
  const block = useBlock();
  const report = useReport();
  const [more, setMore] = useState(false);
  const [vs, setVs] = useState<VsOpponent | null>(null);
  const then = useRef<Then | null>(null);
  const card = player.data?.player;

  useEffect(() => {
    if (!username) return;
    track('player_card');
    setMore(false);
    friendship.reset();
    block.reset();
    report.reset();
    // Only a new card starts clean.
  }, [username]);

  const leaveFor = (next: Then) => {
    then.current = next;
    onClose();
    // For a platform that never says the sheet is gone (ActionSheet does the same).
    setTimeout(settle, 650);
  };

  const settle = () => {
    const next = then.current;
    then.current = null;
    if (next?.to === 'vs') setVs(next.opponent);
    if (next?.to === 'thread') navigation.navigate('Thread', { username: next.username });
    if (next?.to === 'friends') {
      navigation.navigate('Friends', next.username ? { username: next.username } : undefined);
    }
  };

  const failure = friendship.error ?? block.error ?? report.error;

  return (
    <>
      <Sheet
        open={username !== null}
        onClose={onClose}
        onClosed={settle}
        title={username ? handle(username) : ''}
      >
        {player.isLoading ? (
          <SkeletonList rows={3} />
        ) : player.isError ? (
          <Callout tone="bad" title={words.failed}>
            {messageFor(player.error, t)}
          </Callout>
        ) : card ? (
          <View style={styles.body}>
            <View style={styles.identity}>
              <Stamp from={1.25}>
                <Portrait
                  name={card.username}
                  src={card.avatarUrl}
                  isMe={card.isMe}
                  size="md"
                  tier={rating ? card.league : null}
                />
              </Stamp>
              <View style={styles.who}>
                {rating && card.league ? (
                  <View style={styles.league}>
                    <TierBadge tier={card.league} size="md" showLabel />
                    {card.rating !== null ? (
                      <Tag label={t.rating.elo(t.fmt.score(card.rating))} tone="warn" icon="trophy" />
                    ) : null}
                  </View>
                ) : null}
                <RelationTag card={card} />
                {card.isMe || card.relation === 'friend' ? (
                  // Your list, or a friend's: theirs to show you.
                  <Button
                    label={words.friends(card.friends)}
                    icon="users"
                    tone="neutral"
                    size="sm"
                    onPress={() =>
                      leaveFor({ to: 'friends', username: card.isMe ? undefined : card.username })
                    }
                    style={styles.friends}
                  />
                ) : (
                  <Txt variant="meta" tone="muted">
                    {words.friends(card.friends)}
                  </Txt>
                )}
              </View>
            </View>

            <SeasonBest best={card.best} delay={120} />

            <StatGrid
              columns={3}
              items={[
                { label: words.stats.weekly, value: t.fmt.rank(card.ranks.weekly), icon: 'podium', tone: 'warn' },
                { label: words.stats.all, value: t.fmt.rank(card.ranks.all), icon: 'crown', tone: 'warn' },
                { label: words.stats.runs, value: t.fmt.score(card.stats.runs), icon: 'play' },
                { label: words.stats.posts, value: t.fmt.score(card.stats.reels), icon: 'arrowUp' },
                { label: words.stats.likes, value: t.fmt.score(card.stats.likes), icon: 'heart', tone: 'primary' },
                { label: words.stats.perfects, value: t.fmt.score(card.stats.perfects), icon: 'star' },
              ]}
            />

            {card.isMe ? null : (
              <>
                <Actions
                  card={card}
                  inThread={inThread}
                  busy={friendship.isPending || block.isPending}
                  onFriend={(add) => friendship.mutate({ username: card.username, add })}
                  onUnblock={() => block.mutate({ username: card.username, block: false })}
                  onVs={() =>
                    leaveFor({ to: 'vs', opponent: { username: card.username, avatarUrl: card.avatarUrl } })
                  }
                  onThread={() => leaveFor({ to: 'thread', username: card.username })}
                />
                {failure ? <Callout tone="bad">{messageFor(failure, t)}</Callout> : null}
                {report.isSuccess ? <Callout tone="info">{words.reported}</Callout> : null}
                <Button
                  label={words.more}
                  icon={more ? 'chevronDown' : 'more'}
                  tone="ghost"
                  size="md"
                  onPress={() => setMore((open) => !open)}
                />
                {more ? (
                  <ActionList
                    actions={moreActions(card, t, {
                      unfriend: () => friendship.mutate({ username: card.username, add: false }),
                      block: () => block.mutate({ username: card.username, block: true }),
                      report: (reason) => {
                        setMore(false);
                        report.mutate({ username: card.username, reason });
                      },
                    })}
                  />
                ) : null}
              </>
            )}
          </View>
        ) : null}
      </Sheet>
      <VsSheet
        opponent={vs}
        onClose={() => setVs(null)}
        onPlay={(opponent) => navigation.navigate('Game', { mode: 'vs', opponent })}
      />
    </>
  );
}

/** What the two of you are, as a tag by the portrait; nothing between strangers. */
function RelationTag({ card }: { card: PlayerCard }) {
  const t = useT();
  const words = t.friends.relation;
  if (card.isMe) return <Tag label={t.friends.sheet.you} tone="primary" icon="account" />;
  const tag: Partial<Record<PlayerCard['relation'], { label: string; tone: TagTone }>> = {
    friend: { label: words.friend, tone: 'ok' },
    requested: { label: words.requested, tone: 'secondary' },
    incoming: { label: words.incoming, tone: 'warn' },
    blocked: { label: words.blocked, tone: 'bad' },
  };
  const shown = tag[card.relation];
  return shown ? <Tag label={shown.label} tone={shown.tone} icon="users" /> : null;
}

/** The card's main actions, by what the two of you are to each other. */
function Actions({
  card,
  inThread,
  busy,
  onFriend,
  onUnblock,
  onVs,
  onThread,
}: {
  card: PlayerCard;
  inThread: boolean;
  busy: boolean;
  onFriend: (add: boolean) => void;
  onUnblock: () => void;
  onVs: () => void;
  onThread: () => void;
}) {
  const t = useT();
  const words = t.friends.relation;

  switch (card.relation) {
    case 'friend':
      return (
        <View style={styles.pair}>
          <Button label={t.friends.sheet.vs} icon="swords" tone="primary" onPress={onVs} style={styles.grow} />
          {inThread ? null : (
            <Button label={words.chat} icon="message" tone="secondary" onPress={onThread} style={styles.grow} />
          )}
        </View>
      );
    case 'incoming':
      return (
        <View style={styles.pair}>
          <Button label={words.accept} icon="check" tone="primary" loading={busy} onPress={() => onFriend(true)} style={styles.grow} />
          <Button label={words.decline} tone="neutral" disabled={busy} onPress={() => onFriend(false)} style={styles.grow} />
        </View>
      );
    case 'requested':
      return <Button label={words.cancel} icon="close" tone="neutral" loading={busy} onPress={() => onFriend(false)} />;
    case 'blocked':
      return <Button label={words.unblock} icon="ban" tone="neutral" loading={busy} onPress={onUnblock} />;
    default:
      return <Button label={words.addLong} icon="userPlus" tone="primary" loading={busy} onPress={() => onFriend(true)} />;
  }
}

/** Under "Diğer": ending the friendship, blocking, and reporting what the player made — their photo, their name. */
function moreActions(
  card: PlayerCard,
  t: ReturnType<typeof useT>,
  on: { unfriend: () => void; block: () => void; report: (reason: ReportReason) => void },
): SheetAction[] {
  const words = t.friends.sheet;
  const actions: SheetAction[] = [];
  if (card.relation === 'friend') {
    actions.push({ label: words.unfriend, hint: words.unfriendHint, icon: 'userMinus', tone: 'warn', onPress: on.unfriend });
  }
  if (card.relation !== 'blocked') {
    actions.push({ label: words.block, hint: words.blockHint, icon: 'ban', tone: 'bad', onPress: on.block });
  }
  if (card.avatarUrl) {
    actions.push({ label: words.reportPhoto, hint: words.reportHint, icon: 'flag', tone: 'warn', onPress: () => on.report('photo') });
  }
  actions.push({ label: words.reportName, hint: words.reportHint, icon: 'flag', tone: 'warn', onPress: () => on.report('name') });
  return actions;
}

const styles = StyleSheet.create({
  league: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  body: { gap: SPACE.lg },
  identity: { alignItems: 'center', flexDirection: 'row', gap: SPACE.lg },
  who: { alignItems: 'flex-start', flex: 1, gap: SPACE.sm },
  friends: { alignSelf: 'flex-start' },
  pair: { flexDirection: 'row', gap: SPACE.sm },
  grow: { flex: 1 },
});
