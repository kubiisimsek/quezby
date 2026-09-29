import { PHRASES } from '@quezby/config';
import { ApiError } from '@quezby/sdk';
import type { DuelView, HeadToHead, InboxMessage, PlayerSummary } from '@quezby/types';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/auth/session';
import { PlayerSheet } from '@/components/PlayerSheet';
import { PushNudge } from '@/components/PushNudge';
import { VsSheet, type VsOpponent } from '@/components/VsSheet';
import { useDeclineDuel, useReadThread, useSendPhrase, useThread } from '@/hooks/useSocial';
import { handle, ltr, useT, type Messages } from '@/i18n';
import { messageFor } from '@/lib/errors';
import type { RootStackParamList } from '@/navigation/types';
import { scoreOf } from '@/screens/friends/InboxScreen';
import {
  Bubble,
  Button,
  Callout,
  CountdownChip,
  EmptyState,
  EventLine,
  Eyebrow,
  FaceOff,
  IconButton,
  Panel,
  PhraseChip,
  Screen,
  SkeletonList,
  TopBar,
  Txt,
} from '@/ui/kit';
import { SPACE, useTheme } from '@/ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Thread'>;

/**
 * The conversation with a friend. Under the name, how the two of you stand
 * over every VS; then the lines, newest at the bottom — the phrases each of
 * you sent and what happened between you, VS by VS. Above the phrase tray,
 * the VS open between you: send one, answer theirs with the screen's one
 * gold "Oyna", or wait for them. Opening it reads it; while it is open it
 * asks for new lines now and then.
 */
export function ThreadScreen({ navigation, route }: Props) {
  const { username } = route.params;
  const t = useT();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const words = t.inbox.thread;
  const focused = useIsFocused();
  const user = useSession((state) => state.user);
  const thread = useThread(username);
  const { mutate: markRead } = useReadThread();
  const send = useSendPhrase(username);
  const decline = useDeclineDuel(username);
  const [card, setCard] = useState(false);
  const [vs, setVs] = useState<VsOpponent | null>(null);

  const pages = thread.data?.pages ?? [];
  const newest = pages[0];
  const player = newest?.player ?? null;
  const name = handle(username);
  // Newest first: the list is drawn upside down, so the newest line sits at the bottom.
  const lines = pages.flatMap((page) => [...page.messages].reverse());
  const newestId = lines[0]?.id ?? null;

  useEffect(() => {
    if (newestId !== null && focused) markRead(username);
  }, [focused, markRead, newestId, username]);

  const gone = thread.error instanceof ApiError && thread.error.status === 404;

  return (
    <Screen>
      <TopBar
        title={name}
        subtitle={newest ? h2hLine(newest.h2h, t) : undefined}
        onBack={() => navigation.goBack()}
        right={gone ? undefined : <IconButton icon="more" label={words.card} onPress={() => setCard(true)} />}
      />

      {thread.isLoading ? (
        <View style={styles.pad}>
          <SkeletonList rows={4} />
        </View>
      ) : gone ? (
        <EmptyState
          icon="users"
          title={words.gone}
          action={<Button label={t.kit.topBar.back} tone="neutral" icon="back" onPress={() => navigation.goBack()} />}
        />
      ) : !newest ? (
        <View style={styles.pad}>
          <Callout tone="bad" title={words.failed}>
            {messageFor(thread.error, t)}
          </Callout>
          <Button label={words.retry} tone="neutral" icon="refresh" onPress={() => void thread.refetch()} />
        </View>
      ) : (
        <>
          <FlatList
            inverted
            data={lines}
            keyExtractor={(line) => String(line.id)}
            style={styles.fill}
            contentContainerStyle={styles.lines}
            ItemSeparatorComponent={Gap}
            onEndReached={() => {
              if (thread.hasNextPage && !thread.isFetchingNextPage) void thread.fetchNextPage();
            }}
            onEndReachedThreshold={0.3}
            renderItem={({ item }) => <Line message={item} name={name} />}
            // Drawn under the newest line, the list being upside down.
            ListHeaderComponent={
              <View style={styles.nudge}>
                <PushNudge line={t.push.nudge.vs(name)} hideable />
              </View>
            }
            ListFooterComponent={
              user && player ? <Rivals me={user.username ?? '?'} mySrc={user.avatarUrl} friend={player} h2h={newest.h2h} /> : null
            }
          />

          <View
            style={[
              styles.dock,
              { backgroundColor: theme.rail, borderColor: theme.outline, paddingBottom: insets.bottom + SPACE.sm },
            ]}
          >
            <VsCard
              duel={newest.duel}
              name={name}
              busy={decline.isPending}
              onSend={() => setVs({ username, avatarUrl: player?.avatarUrl ?? null })}
              onPlay={(duel) => navigation.navigate('Game', { mode: 'vs', opponent: username, duelId: duel.id })}
              onDecline={(duel) => decline.mutate(duel.id)}
              onElapsed={() => void thread.refetch()}
            />
            {send.isError || decline.isError ? (
              <Callout tone="bad">{messageFor(send.error ?? decline.error, t)}</Callout>
            ) : null}
            <Eyebrow icon="message">{words.tray}</Eyebrow>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tray}
              keyboardShouldPersistTaps="handled"
            >
              {PHRASES.map((phrase) => {
                const text = t.inbox.phrases[phrase];
                return (
                  <PhraseChip
                    key={phrase}
                    text={text}
                    label={words.send(text)}
                    disabled={send.isPending}
                    onPress={() => send.mutate(phrase)}
                  />
                );
              })}
            </ScrollView>
          </View>
        </>
      )}

      <PlayerSheet username={card ? username : null} onClose={() => setCard(false)} inThread />
      <VsSheet
        opponent={vs}
        onClose={() => setVs(null)}
        onPlay={(opponent) => navigation.navigate('Game', { mode: 'vs', opponent })}
      />
    </Screen>
  );
}

/** How the two stand over every VS they finished — the head's second line. */
function h2hLine(h2h: HeadToHead, t: Messages): string {
  return h2h.wins + h2h.losses + h2h.draws === 0
    ? t.inbox.thread.h2hNone
    : t.inbox.thread.h2hLine(h2h.wins, h2h.losses, h2h.draws);
}

/** The top of the conversation: the two of you face to face, and how you stand. */
function Rivals({
  me,
  mySrc,
  friend,
  h2h,
}: {
  me: string;
  mySrc: string | null;
  friend: PlayerSummary;
  h2h: HeadToHead;
}) {
  const t = useT();
  const words = t.inbox.thread;
  const played = h2h.wins + h2h.losses + h2h.draws > 0;
  return (
    <Panel style={styles.rivals}>
      <Eyebrow icon="swords">{words.h2hTitle}</Eyebrow>
      <FaceOff
        left={{ name: me, src: mySrc, caption: words.you }}
        right={{ name: friend.username, src: friend.avatarUrl, caption: handle(friend.username) }}
        middle={played ? ltr(`${h2h.wins} – ${h2h.losses}`) : undefined}
        label={h2hLine(h2h, t)}
      />
      <Txt variant="meta" tone="muted" align="center">
        {h2hLine(h2h, t)}
      </Txt>
    </Panel>
  );
}

/** A line of the conversation: a phrase as a bubble, anything else as a strip. */
function Line({ message, name }: { message: InboxMessage; name: string }) {
  const t = useT();
  const words = t.inbox.thread.lines;
  const when = t.fmt.ago(message.createdAt);

  switch (message.kind) {
    case 'phrase': {
      const text = message.phrase ? t.inbox.phrases[message.phrase] : '';
      return (
        <Bubble
          text={text}
          mine={message.mine}
          when={when}
          label={words.said(message.mine ? words.me : name, text)}
        />
      );
    }
    case 'friends':
      return <EventLine icon="users" tone="ok" title={words.friends} when={when} />;
    case 'vs_invite':
      return (
        <EventLine
          icon="swords"
          tone="primary"
          title={message.mine ? words.inviteMine : words.inviteTheirs(name)}
          when={when}
        />
      );
    case 'vs_declined':
      return (
        <EventLine
          icon="close"
          tone="neutral"
          title={message.mine ? words.declinedMine : words.declinedTheirs(name)}
          when={when}
        />
      );
    case 'vs_expired':
      return <EventLine icon="hourglass" tone="neutral" title={words.expired} when={when} />;
    case 'vs_result': {
      const duel = message.duel;
      const outcome = duel?.outcome ?? 'draw';
      return (
        <EventLine
          icon={outcome === 'won' ? 'trophy' : 'swords'}
          tone={outcome === 'won' ? 'ok' : outcome === 'lost' ? 'bad' : 'warn'}
          title={words[outcome]}
          detail={ltr(`${scoreOf(duel?.you?.score, t)} – ${scoreOf(duel?.them?.score, t)}`)}
          when={when}
          strong
        />
      );
    }
    default:
      return null;
  }
}

/**
 * The VS open between the two, pinned over the phrases: none — send one;
 * theirs, waiting for you — the gold "Oyna" and a way to turn it down;
 * yours, waiting for them — your score and the time they have left.
 */
function VsCard({
  duel,
  name,
  busy,
  onSend,
  onPlay,
  onDecline,
  onElapsed,
}: {
  duel: DuelView | null;
  name: string;
  busy: boolean;
  onSend: () => void;
  onPlay: (duel: DuelView) => void;
  onDecline: (duel: DuelView) => void;
  onElapsed: () => void;
}) {
  const t = useT();
  const words = t.inbox.thread;

  if (!duel) {
    return (
      <View style={styles.vsRow}>
        <Txt variant="meta" tone="muted" style={styles.fill}>
          {words.newVsHint(name)}
        </Txt>
        <Button label={words.newVs} icon="swords" tone="primary" size="md" onPress={onSend} />
      </View>
    );
  }

  if (duel.status === 'playing') {
    return (
      <Txt variant="meta" tone="muted">
        {words.playing}
      </Txt>
    );
  }

  const countdown = duel.expiresAt ? (
    <CountdownChip endsAt={duel.expiresAt} serverTime={duel.serverTime} prefix={words.left} onElapsed={onElapsed} />
  ) : null;

  if (duel.turn === 'you') {
    return (
      <Panel tone="primary" style={styles.vs}>
        <Eyebrow icon="swords">{words.yourTurn}</Eyebrow>
        <Txt variant="meta">{words.yourTurnBody(name)}</Txt>
        {countdown}
        <View style={styles.vsActions}>
          <Button label={words.play} icon="play" tone="play" size="md" onPress={() => onPlay(duel)} style={styles.fill} />
          <Button label={words.decline} tone="ghost" size="md" loading={busy} onPress={() => onDecline(duel)} />
        </View>
      </Panel>
    );
  }

  return (
    <Panel style={styles.vs}>
      <Eyebrow icon="hourglass">{words.theirTurn}</Eyebrow>
      <Txt variant="meta" tone="muted">
        {words.theirTurnBody(name, scoreOf(duel.you?.score, t))}
      </Txt>
      {countdown}
    </Panel>
  );
}

function Gap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { gap: SPACE.md, padding: SPACE.xl },
  lines: { paddingHorizontal: SPACE.xl, paddingVertical: SPACE.md },
  gap: { height: SPACE.md },
  nudge: { paddingTop: SPACE.md },
  rivals: { alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.md },
  dock: {
    borderTopWidth: 2.5,
    gap: SPACE.sm,
    paddingHorizontal: SPACE.lg,
    paddingTop: SPACE.md,
  },
  tray: { gap: SPACE.sm, paddingBottom: SPACE.xs, paddingEnd: SPACE.lg },
  vsRow: { alignItems: 'center', flexDirection: 'row', gap: SPACE.md },
  vs: { gap: SPACE.sm, paddingVertical: SPACE.md },
  vsActions: { alignItems: 'center', flexDirection: 'row', gap: SPACE.sm },
});
