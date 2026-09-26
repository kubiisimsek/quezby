import { USERNAME_MAX_LENGTH, validateUsername } from '@quezby/config';
import type { FollowListResponse, PlayerSummary } from '@quezby/types';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useState, type ReactElement } from 'react';
import { FlatList, Keyboard, StyleSheet, View } from 'react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { PlayerSheet } from '@/components/PlayerSheet';
import {
  useFollow,
  useFollowers,
  useFollowing,
  useUserSearch,
} from '@/hooks/useBoards';
import { useT, type Messages } from '@/i18n';
import { messageFor, usernameMessage } from '@/lib/errors';
import type { TabParamList } from '@/navigation/types';
import {
  Button,
  Callout,
  EmptyState,
  Field,
  Panel,
  PlayerRow,
  Screen,
  Segmented,
  SkeletonList,
  TopBar,
} from '@/ui/kit';
import { SPACE } from '@/ui/theme';

type Props = BottomTabScreenProps<TabParamList, 'Search'>;

type FollowKind = 'following' | 'followers';

type Follow = ReturnType<typeof useFollow>;

const SEARCH_MIN_LENGTH = 2;

/**
 * Arkadaşlar, the dock's friends tab: find a player by the start of their
 * name, follow them from their tile, or open their card. With nothing typed,
 * the people you follow and the people who follow you — the ones your
 * friends boards race you against.
 */
export function SearchScreen(_props: Props) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<FollowKind>('following');
  const [opened, setOpened] = useState<string | null>(null);
  const follow = useFollow();
  const search = useUserSearch(query);

  const term = query.trim();
  const problem = nameProblem(term, t);
  const open = (username: string) => {
    Keyboard.dismiss();
    setOpened(username);
  };

  let body: ReactElement | null = null;
  if (term === '') {
    body =
      tab === 'following' ? (
        <FollowingList follow={follow} onOpen={open} />
      ) : (
        <FollowersList follow={follow} onOpen={open} />
      );
  } else if (!problem && term.length >= SEARCH_MIN_LENGTH) {
    body = (
      <Results term={term} search={search} follow={follow} onOpen={open} />
    );
  }

  return (
    <Screen>
      <TopBar
        title={t.friends.search.title}
        subtitle={t.friends.search.tagline}
      />
      <View style={styles.head}>
        <Field
          label={t.friends.search.field}
          icon="search"
          value={query}
          onChangeText={(text) => setQuery(text.toLowerCase())}
          placeholder={t.friends.search.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          returnKeyType="search"
          maxLength={USERNAME_MAX_LENGTH}
          error={problem ?? undefined}
          hint={
            term !== '' && term.length < SEARCH_MIN_LENGTH
              ? t.friends.search.tooShort(SEARCH_MIN_LENGTH)
              : undefined
          }
        />
        {follow.isError ? (
          <Callout tone="bad">{messageFor(follow.error, t)}</Callout>
        ) : null}
        {term === '' ? (
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              {
                value: 'following',
                label: t.friends.search.tabs.following,
                icon: 'userCheck',
              },
              {
                value: 'followers',
                label: t.friends.search.tabs.followers,
                icon: 'users',
              },
            ]}
          />
        ) : null}
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
  return checked.problem === 'turkish_char' ||
    checked.problem === 'invalid_char'
    ? usernameMessage(checked.problem, t)
    : null;
}

/**
 * The players whose names start with `term`. While the answer for what was
 * just typed is on its way, the last answer stays up, narrowed to the names
 * that still match; "nobody" is only said once the API has said it.
 */
function Results({
  term,
  search,
  follow,
  onOpen,
}: {
  term: string;
  search: ReturnType<typeof useUserSearch>;
  follow: Follow;
  onOpen: (username: string) => void;
}) {
  const t = useT();
  const data = search.data;
  const players = (data?.users ?? []).filter((player) =>
    player.username.startsWith(term),
  );
  const nobody =
    data !== undefined &&
    !search.isPlaceholderData &&
    !search.isFetching &&
    data.users.length === 0;

  if (search.isError && players.length === 0) {
    return (
      <View style={styles.pad}>
        <Callout tone="bad" title={t.friends.search.failed}>
          {messageFor(search.error, t)}
        </Callout>
        <Button
          label={t.friends.search.retry}
          tone="neutral"
          icon="refresh"
          onPress={() => void search.refetch()}
        />
      </View>
    );
  }

  if (players.length === 0) {
    return nobody ? (
      <EmptyState
        icon="search"
        title={t.friends.search.nobody}
        hint={t.friends.search.nobodyHint(term)}
      />
    ) : (
      <View style={styles.pad}>
        <SkeletonList rows={3} />
      </View>
    );
  }

  return (
    <PlayerList
      players={players}
      updatedAt={search.dataUpdatedAt}
      follow={follow}
      onOpen={onOpen}
    />
  );
}

type ListProps = { follow: Follow; onOpen: (username: string) => void };

function FollowingList(props: ListProps) {
  const t = useT();
  const first = useFollowing();
  return (
    <FollowPages
      kind="following"
      first={first}
      empty={
        <EmptyState
          icon="userPlus"
          title={t.friends.notFollowing}
          hint={t.friends.search.followingHint}
        />
      }
      {...props}
    />
  );
}

function FollowersList(props: ListProps) {
  const t = useT();
  const first = useFollowers();
  const username = useSession((state) => state.user?.username);
  return (
    <FollowPages
      kind="followers"
      first={first}
      empty={
        <EmptyState
          icon="users"
          title={t.friends.search.noFollowers}
          hint={t.friends.search.noFollowersHint(username ?? '')}
        />
      }
      {...props}
    />
  );
}

/**
 * A follow list: the first page from `useFollowing` / `useFollowers`, and one
 * more page each time "Daha fazla" is pressed, for as long as the API hands
 * out a cursor. The pages share their list's key, so a follow refreshes them
 * all.
 */
function FollowPages({
  kind,
  first,
  empty,
  follow,
  onOpen,
}: ListProps & {
  kind: FollowKind;
  first: UseQueryResult<FollowListResponse>;
  empty: ReactElement;
}) {
  const t = useT();
  const [cursors, setCursors] = useState<string[]>([]);
  const more = useQueries({
    queries: cursors.map((cursor) => ({
      queryKey: [kind, cursor],
      queryFn: () =>
        kind === 'following'
          ? api.me.following(cursor)
          : api.me.followers(cursor),
    })),
  });

  if (first.isLoading) {
    return (
      <View style={styles.pad}>
        <SkeletonList rows={3} />
      </View>
    );
  }

  if (!first.data) {
    return (
      <View style={styles.pad}>
        <Callout tone="bad" title={t.friends.search.listFailed}>
          {messageFor(first.error, t)}
        </Callout>
        <Button
          label={t.friends.search.retry}
          tone="neutral"
          icon="refresh"
          onPress={() => void first.refetch()}
        />
      </View>
    );
  }

  const pages = [first, ...more];
  const seen = new Set<string>();
  const players: PlayerSummary[] = [];
  for (const page of pages) {
    for (const player of page.data?.users ?? []) {
      if (seen.has(player.username)) continue;
      seen.add(player.username);
      players.push(player);
    }
  }

  const last = more[more.length - 1] ?? first;
  const next = last.data?.nextCursor ?? null;
  const failed = last !== first && last.isError;
  const updatedAt = Math.min(...pages.map((page) => page.dataUpdatedAt));

  return (
    <PlayerList
      players={players}
      updatedAt={updatedAt}
      follow={follow}
      onOpen={onOpen}
      empty={empty}
      footer={
        next || failed || last.isLoading ? (
          <Button
            label={failed ? t.friends.search.retry : t.friends.search.more}
            icon={failed ? 'refresh' : undefined}
            tone="neutral"
            size="md"
            loading={last.isLoading}
            onPress={() => {
              if (failed) {
                void last.refetch();
              } else if (next) {
                setCursors((known) =>
                  known.includes(next) ? known : [...known, next],
                );
              }
            }}
            style={styles.more}
          />
        ) : null
      }
    />
  );
}

function PlayerList({
  players,
  updatedAt,
  follow,
  onOpen,
  empty,
  footer,
}: {
  players: PlayerSummary[];
  /** When the rows were fetched — a follow sent after it still shows. */
  updatedAt: number;
  follow: Follow;
  onOpen: (username: string) => void;
  empty?: ReactElement;
  footer?: ReactElement | null;
}) {
  return (
    <FlatList
      data={players}
      keyExtractor={(player) => player.username}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={
        players.length === 0 ? styles.emptyList : styles.list
      }
      ItemSeparatorComponent={Gap}
      ListEmptyComponent={empty}
      ListFooterComponent={footer}
      renderItem={({ item }) => (
        <Panel style={styles.tile}>
          <PlayerRow
            username={item.username}
            tier={item.league}
            best={item.best}
            onPress={() => onOpen(item.username)}
            action={
              <FollowButton
                player={item}
                updatedAt={updatedAt}
                follow={follow}
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

/**
 * Follow or unfollow from the tile, as a small slab: magenta to follow,
 * quiet once you do. What was just asked shows at once and stays until the
 * list comes back from the API with the answer.
 */
function FollowButton({
  player,
  updatedAt,
  follow,
}: {
  player: PlayerSummary;
  updatedAt: number;
  follow: Follow;
}) {
  const t = useT();
  const asked =
    follow.variables?.username === player.username ? follow.variables : null;
  const pending = asked !== null && follow.isPending;
  const following =
    asked && !follow.isError && follow.submittedAt >= updatedAt
      ? asked.follow
      : player.isFollowing;

  return (
    <Button
      label={following ? t.friends.unfollow : t.friends.follow}
      icon={following ? 'userCheck' : 'userPlus'}
      tone={following ? 'neutral' : 'primary'}
      size="sm"
      loading={pending}
      onPress={() =>
        follow.mutate({ username: player.username, follow: !following })
      }
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  head: {
    gap: SPACE.md,
    paddingBottom: SPACE.md,
    paddingHorizontal: SPACE.xl,
  },
  pad: { gap: SPACE.md, padding: SPACE.xl },
  list: {
    paddingBottom: SPACE.xxl,
    paddingHorizontal: SPACE.xl,
    paddingTop: SPACE.xs,
  },
  emptyList: { flexGrow: 1 },
  tile: { paddingHorizontal: SPACE.md, paddingVertical: SPACE.xxs },
  gap: { height: SPACE.ms },
  more: { marginTop: SPACE.lg },
});
