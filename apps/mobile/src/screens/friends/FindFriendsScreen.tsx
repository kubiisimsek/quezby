import { USERNAME_MAX_LENGTH, validateUsername } from '@quezby/config';
import type { PlayerSummary } from '@quezby/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState, type ReactElement } from 'react';
import { FlatList, Keyboard, StyleSheet, View } from 'react-native';

import { FriendButton } from '@/components/FriendButton';
import { PlayerSheet } from '@/components/PlayerSheet';
import { useUserSearch } from '@/hooks/useBoards';
import { useFriendRequests, useFriendship } from '@/hooks/useSocial';
import { useT, type Messages } from '@/i18n';
import { messageFor, usernameMessage } from '@/lib/errors';
import type { RootStackParamList } from '@/navigation/types';
import {
  Button,
  Callout,
  EmptyState,
  Eyebrow,
  Field,
  Panel,
  PlayerRow,
  Screen,
  SkeletonList,
  TopBar,
} from '@/ui/kit';
import { SPACE } from '@/ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FindFriends'>;

type Friendship = ReturnType<typeof useFriendship>;

const SEARCH_MIN_LENGTH = 2;

/**
 * Arkadaş bul: a player by the start of their name, and from their row what
 * the two of you can do — ask to be friends, take the request back, answer
 * theirs, or talk once you are friends. With nothing typed, the requests you
 * sent that still wait.
 */
export function FindFriendsScreen({ navigation }: Props) {
  const t = useT();
  const words = t.friends.search;
  const [query, setQuery] = useState('');
  const [opened, setOpened] = useState<string | null>(null);
  const friendship = useFriendship();
  const search = useUserSearch(query);

  const term = query.trim();
  const problem = nameProblem(term, t);
  const open = (username: string) => {
    Keyboard.dismiss();
    setOpened(username);
  };
  const chat = (username: string) => navigation.navigate('Thread', { username });

  let body: ReactElement | null = null;
  if (term === '') {
    body = <SentRequests friendship={friendship} onOpen={open} onChat={chat} />;
  } else if (!problem && term.length >= SEARCH_MIN_LENGTH) {
    body = <Results term={term} search={search} friendship={friendship} onOpen={open} onChat={chat} />;
  }

  return (
    <Screen>
      <TopBar title={words.title} subtitle={words.tagline} onBack={() => navigation.goBack()} />
      <View style={styles.head}>
        <Field
          label={words.field}
          icon="search"
          value={query}
          onChangeText={(text) => setQuery(text.toLowerCase())}
          placeholder={words.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          returnKeyType="search"
          maxLength={USERNAME_MAX_LENGTH}
          error={problem ?? undefined}
          hint={term !== '' && term.length < SEARCH_MIN_LENGTH ? words.tooShort(SEARCH_MIN_LENGTH) : undefined}
        />
        {friendship.isError ? <Callout tone="bad">{messageFor(friendship.error, t)}</Callout> : null}
      </View>

      <View style={styles.fill}>{body}</View>

      <PlayerSheet username={opened} onClose={() => setOpened(null)} />
    </Screen>
  );
}

/**
 * Why what was typed cannot be the start of a name, in the rules' own words
 * (`usernameMessage`) — or null. Length is not a problem here: a search
 * is a prefix.
 */
function nameProblem(term: string, t: Messages): string | null {
  if (term === '') return null;
  const checked = validateUsername(term);
  if (checked.ok) return null;
  return checked.problem === 'turkish_char' || checked.problem === 'invalid_char'
    ? usernameMessage(checked.problem, t)
    : null;
}

type ListProps = {
  friendship: Friendship;
  onOpen: (username: string) => void;
  onChat: (username: string) => void;
};

/**
 * The players whose names start with `term`. While the answer for what was
 * just typed is on its way, the last answer stays up, narrowed to the names
 * that still match; "nobody" is only said once the API has said it.
 */
function Results({ term, search, ...list }: ListProps & { term: string; search: ReturnType<typeof useUserSearch> }) {
  const t = useT();
  const words = t.friends.search;
  const data = search.data;
  const players = (data?.users ?? []).filter((player) => player.username.startsWith(term));
  const nobody = data !== undefined && !search.isPlaceholderData && !search.isFetching && data.users.length === 0;

  if (search.isError && players.length === 0) {
    return (
      <View style={styles.pad}>
        <Callout tone="bad" title={words.failed}>
          {messageFor(search.error, t)}
        </Callout>
        <Button label={words.retry} tone="neutral" icon="refresh" onPress={() => void search.refetch()} />
      </View>
    );
  }

  if (players.length === 0) {
    return nobody ? (
      <EmptyState icon="search" title={words.nobody} hint={words.nobodyHint(term)} />
    ) : (
      <View style={styles.pad}>
        <SkeletonList rows={3} />
      </View>
    );
  }

  return <PlayerList players={players} updatedAt={search.dataUpdatedAt} {...list} />;
}

/** With nothing typed: the requests the player sent that still wait, to take back. */
function SentRequests(list: ListProps) {
  const t = useT();
  const words = t.friends.search;
  const requests = useFriendRequests();
  const sent = (requests.data?.outgoing ?? []).map((request) => request.player);

  if (requests.isLoading) {
    return (
      <View style={styles.pad}>
        <SkeletonList rows={2} />
      </View>
    );
  }

  if (sent.length === 0) {
    return <EmptyState icon="userPlus" title={words.idleTitle} hint={words.idleHint} />;
  }

  return (
    <PlayerList
      players={sent}
      updatedAt={requests.dataUpdatedAt}
      header={<Eyebrow icon="userCheck">{words.sent}</Eyebrow>}
      {...list}
    />
  );
}

function PlayerList({
  players,
  updatedAt,
  header,
  friendship,
  onOpen,
  onChat,
}: ListProps & {
  players: PlayerSummary[];
  /** When the rows were fetched. */
  updatedAt: number;
  header?: ReactElement;
}) {
  return (
    <FlatList
      data={players}
      keyExtractor={(player) => player.username}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={Gap}
      ListHeaderComponent={header ? <View style={styles.listHead}>{header}</View> : null}
      renderItem={({ item }) => (
        <Panel style={styles.tile}>
          <PlayerRow
            username={item.username}
            src={item.avatarUrl}
            tier={item.league}
            best={item.best}
            onPress={() => onOpen(item.username)}
            action={
              <FriendButton
                player={item}
                friendship={friendship}
                updatedAt={updatedAt}
                onChat={() => onChat(item.username)}
              />
            }
          />
        </Panel>
      )}
    />
  );
}

/** Air between two players' tiles. */
function Gap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  head: { gap: SPACE.md, paddingBottom: SPACE.md, paddingHorizontal: SPACE.xl },
  pad: { gap: SPACE.md, padding: SPACE.xl },
  list: { paddingBottom: SPACE.xxl, paddingHorizontal: SPACE.xl, paddingTop: SPACE.xs },
  listHead: { paddingBottom: SPACE.md },
  tile: { paddingHorizontal: SPACE.md, paddingVertical: SPACE.xxs },
  gap: { height: SPACE.ms },
});
