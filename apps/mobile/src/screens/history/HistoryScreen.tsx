import type { RunSummary } from '@quezby/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';

import { RunSheet, runLook, runTag, runTitle } from '@/components/RunSheet';
import { useRunHistory } from '@/hooks/useHistory';
import { useT, type Messages } from '@/i18n';
import { messageFor } from '@/lib/errors';
import type { RootStackParamList } from '@/navigation/types';
import {
  Button,
  Callout,
  EmptyState,
  Eyebrow,
  RunTile,
  Screen,
  Segmented,
  SkeletonList,
  TopBar,
} from '@/ui/kit';
import { SPACE } from '@/ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

type Filter = 'all' | 'daily' | 'vs';

type Day = { key: string; title: string; data: RunSummary[] };

/**
 * Geçmiş oyunlar: every run the player played to its end, the newest first,
 * day by day — its kind, its score as the API's replay found it, and what
 * became of it. All of them, only the day's challenges, or only VS. A run
 * opens its card; with none yet, the one gold "Oyna".
 */
export function HistoryScreen({ navigation }: Props) {
  const t = useT();
  const words = t.history;
  const [filter, setFilter] = useState<Filter>('all');
  const [opened, setOpened] = useState<string | null>(null);
  const history = useRunHistory(filter === 'all' ? null : filter);
  const runs = history.data?.pages.flatMap((page) => page.runs) ?? [];
  const days = byDay(runs, t);

  return (
    <Screen>
      <TopBar title={words.title} subtitle={words.tagline} onBack={() => navigation.goBack()} />
      <View style={styles.head}>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: words.filters.all, icon: 'history' },
            { value: 'daily', label: words.filters.daily, icon: 'calendar' },
            { value: 'vs', label: words.filters.vs, icon: 'swords' },
          ]}
        />
      </View>
      <SectionList
        sections={days}
        keyExtractor={(run) => run.runId}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={runs.length === 0 ? styles.emptyList : styles.list}
        ItemSeparatorComponent={Gap}
        renderSectionHeader={({ section }) => (
          <View style={styles.day}>
            <Eyebrow icon="calendar">{section.title}</Eyebrow>
          </View>
        )}
        renderItem={({ item }) => <Run summary={item} onPress={() => setOpened(item.runId)} />}
        onEndReached={() => {
          if (history.hasNextPage && !history.isFetchingNextPage) void history.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          history.isLoading ? (
            <SkeletonList rows={4} />
          ) : history.isError ? (
            <View style={styles.pad}>
              <Callout tone="bad" title={words.failed}>
                {messageFor(history.error, t)}
              </Callout>
              <Button label={words.retry} tone="neutral" icon="refresh" onPress={() => void history.refetch()} />
            </View>
          ) : (
            <EmptyState
              icon="history"
              title={words.emptyTitle}
              hint={words.emptyHint}
              action={
                <Button
                  label={words.play}
                  icon="play"
                  tone="play"
                  onPress={() => navigation.navigate('Game', { mode: 'free' })}
                />
              }
            />
          )
        }
        ListFooterComponent={
          history.isFetchingNextPage ? (
            <View style={styles.more}>
              <SkeletonList rows={1} />
            </View>
          ) : null
        }
      />
      <RunSheet runId={opened} onClose={() => setOpened(null)} />
    </Screen>
  );
}

function Run({ summary, onPress }: { summary: RunSummary; onPress: () => void }) {
  const t = useT();
  const words = t.history;
  const look = runLook(summary);
  const title = runTitle(summary, t);
  const score = t.fmt.score(summary.score);
  const at = t.fmt.time(summary.finishedAt);
  return (
    <RunTile
      icon={look.icon}
      tone={look.tone}
      title={title}
      meta={words.meta(summary.reels, t.fmt.playTime(summary.activeMs), at)}
      score={score}
      best={summary.isBest}
      bestLabel={words.tags.best}
      tag={runTag(summary, t)}
      label={words.row(title, score, at)}
      onPress={onPress}
    />
  );
}

/** The phone's calendar day of an instant: `2026-09-24`. */
function dayOf(iso: string): string {
  const at = new Date(iso);
  return `${at.getFullYear()}-${at.getMonth() + 1}-${at.getDate()}`;
}

/** Runs, newest first, in the days they ended on — today and yesterday by name. */
export function byDay(runs: readonly RunSummary[], t: Messages, now: Date = new Date()): Day[] {
  const today = dayOf(now.toISOString());
  const yesterday = dayOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12).toISOString());
  const days: Day[] = [];
  for (const run of runs) {
    const key = dayOf(run.finishedAt);
    let day = days[days.length - 1];
    if (!day || day.key !== key) {
      const title = key === today ? t.history.today : key === yesterday ? t.history.yesterday : t.fmt.date(run.finishedAt);
      day = { key, title, data: [] };
      days.push(day);
    }
    day.data.push(run);
  }
  return days;
}

function Gap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  head: { paddingBottom: SPACE.md, paddingHorizontal: SPACE.xl },
  list: { paddingBottom: SPACE.xxl, paddingHorizontal: SPACE.xl },
  emptyList: { flexGrow: 1, paddingHorizontal: SPACE.xl },
  pad: { gap: SPACE.md },
  day: { paddingBottom: SPACE.sm, paddingTop: SPACE.md },
  gap: { height: SPACE.ms },
  more: { paddingTop: SPACE.md },
});
