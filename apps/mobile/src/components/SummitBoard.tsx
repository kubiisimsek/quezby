import type { LeaderboardEntry, LeaderboardResponse } from '@quezby/types';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useT } from '@/i18n';
import { ClimbRow, Podium, Txt } from '@/ui/kit';
import { RADIUS, SPACE, lh, useTheme, withAlpha } from '@/ui/theme';

/** One line under the podium: a player, or the quiet break before your own rows. */
export type ClimbItem =
  { kind: 'row'; entry: LeaderboardEntry } | { kind: 'gap' };

export type BoardLayout = {
  /** One player per place, first to third, as the podium stands them. */
  podium: LeaderboardEntry[];
  /**
   * Everyone listed under the podium; then, when you are further down than
   * the list reaches, a break and the rows around you.
   */
  climb: ClimbItem[];
  /** Nobody on the board but you — or nobody at all. */
  alone: boolean;
};

/**
 * How a board the API answered is drawn: who stands on the podium, who is
 * on the climb, and where the break before your own neighbourhood goes. A
 * tie can put two players on one place; the first keeps the pedestal and the
 * other climbs, so nobody listed goes missing.
 */
export function layoutBoard(
  board: Pick<LeaderboardResponse, 'entries' | 'me' | 'neighbors'>,
): BoardLayout {
  const podium: LeaderboardEntry[] = [];
  const places = new Set<number>();
  for (const entry of board.entries) {
    if (entry.rank >= 1 && entry.rank <= 3 && !places.has(entry.rank)) {
      places.add(entry.rank);
      podium.push(entry);
    }
  }

  const climb: ClimbItem[] = board.entries
    .filter((entry) => !podium.includes(entry))
    .map((entry) => ({ kind: 'row', entry }));

  const listed = new Set(board.entries.map((entry) => entry.username));
  const me = board.me;
  if (me && !listed.has(me.username)) {
    const around = board.neighbors.some((entry) => entry.isMe)
      ? board.neighbors
      : [...board.neighbors, me].sort((a, b) => a.rank - b.rank);
    const below = around.filter((entry) => !listed.has(entry.username));
    const last = board.entries[board.entries.length - 1];
    const first = below[0];
    if (last && first && first.rank > last.rank + 1) {
      climb.push({ kind: 'gap' });
    }
    for (const entry of below) climb.push({ kind: 'row', entry });
  }

  const alone =
    board.entries.every((entry) => entry.isMe) &&
    board.neighbors.every((entry) => entry.isMe);

  return { podium, climb, alone };
}

export function climbKey(item: ClimbItem): string {
  return item.kind === 'gap'
    ? 'gap'
    : `${item.entry.rank}-${item.entry.username}`;
}

/**
 * The podium in its place on a stage. Until the board arrives the stage
 * keeps the podium's height — its empty blocks standing faintly, a spinner
 * over them — so nothing jumps; each new board — another period, another
 * scope — raises the blocks afresh.
 */
export function SummitPodium({
  board,
  podium,
  onPressEntry,
}: {
  /** Undefined while the first answer is on its way. */
  board: Pick<LeaderboardResponse, 'board' | 'periodKey' | 'scope'> | undefined;
  podium: LeaderboardEntry[];
  onPressEntry?: (entry: LeaderboardEntry) => void;
}) {
  const theme = useTheme();

  if (!board) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={styles.ghost}>
          <Podium entries={[]} />
        </View>
        <ActivityIndicator
          color={theme.onBrand}
          size="large"
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  return (
    <Podium
      key={`${board.board}:${board.periodKey}:${board.scope}`}
      entries={podium}
      onPressEntry={onPressEntry}
    />
  );
}

/** A player on the climb, or the break before your own rows. */
export function ClimbItemView({
  item,
  index,
  onPressEntry,
}: {
  item: ClimbItem;
  /** Position in the list — drives the entrance stagger. */
  index: number;
  onPressEntry?: (entry: LeaderboardEntry) => void;
}) {
  if (item.kind === 'gap') {
    return <ClimbBreak />;
  }

  const { entry } = item;
  return (
    <ClimbRow
      {...entry}
      index={index}
      onPress={onPressEntry ? () => onPressEntry(entry) : undefined}
    />
  );
}

/**
 * The break between the list and your own rows: a groove across the climb
 * with the players left out sitting in a well on it.
 */
function ClimbBreak() {
  const theme = useTheme();
  const t = useT();
  const groove = { backgroundColor: withAlpha(theme.onBrand, 0.12) };
  return (
    <View accessible accessibilityLabel={t.board.between} style={styles.gap}>
      <View style={[styles.groove, groove]} />
      <View
        style={[
          styles.dots,
          { backgroundColor: theme.well, borderColor: theme.wellLine },
        ]}
      >
        <Txt
          variant="title"
          tone="faint"
          align="center"
          style={styles.ellipsis}
        >
          …
        </Txt>
      </View>
      <View style={[styles.groove, groove]} />
    </View>
  );
}

const styles = StyleSheet.create({
  ghost: { opacity: 0.4 },
  gap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACE.sm,
    paddingBottom: SPACE.xs,
    paddingHorizontal: SPACE.xs,
  },
  groove: { borderRadius: RADIUS.pill, flex: 1, height: 3 },
  dots: {
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    paddingHorizontal: SPACE.md,
  },
  ellipsis: { lineHeight: lh(22) },
});
