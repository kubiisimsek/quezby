import type { RunSummary } from '@quezby/types';
import { StyleSheet, Text, View } from 'react-native';

import { BONUS_ORDER } from '@/game/howTo';
import { runStats } from '@/game/ResultView';
import { useRunDetail } from '@/hooks/useHistory';
import { handle, ltr, useT, type Messages } from '@/i18n';
import { messageFor } from '@/lib/errors';
import type { IconName } from '@/ui/icons';
import {
  BonusChip,
  Callout,
  Panel,
  SkeletonList,
  StatGrid,
  Tag,
  Txt,
  type TagTone,
} from '@/ui/kit';
import { Sheet } from '@/ui/sheet';
import { FONT, SPACE, TYPE, embossed, lh, useTheme } from '@/ui/theme';

/** A past game's name: Normal, the day's challenge by its number, Dereceli, or a VS by who it was against. */
export function runTitle(summary: RunSummary, t: Messages): string {
  const words = t.history.kinds;
  switch (summary.mode) {
    case 'daily':
      return t.daily.numbered(t.fmt.score(summary.dailyNumber ?? 0));
    case 'vs':
      return summary.duel?.opponent ? words.vs(handle(summary.duel.opponent)) : words.vsGone;
    case 'rated':
      return words.rated;
    default:
      return words.free;
  }
}

/** A past game's gem: its kind, in the colour the game gives it. */
export function runLook(summary: RunSummary): { icon: IconName; tone: TagTone } {
  switch (summary.mode) {
    case 'daily':
      return { icon: 'calendar', tone: 'warn' };
    case 'vs':
      return { icon: 'swords', tone: 'secondary' };
    case 'rated':
      return { icon: 'shield', tone: 'ok' };
    default:
      return { icon: 'play', tone: 'primary' };
  }
}

/**
 * What became of a past game, as a tag: held for review, not counted — or,
 * for a VS, how it went or where it stands.
 */
export function runTag(summary: RunSummary, t: Messages): { label: string; tone: TagTone } | null {
  const tags = t.history.tags;
  if (summary.status === 'review') return { label: tags.review, tone: 'secondary' };
  if (summary.status === 'flagged') return { label: tags.flagged, tone: 'warn' };
  const duel = summary.duel;
  if (!duel) return null;
  switch (duel.status) {
    case 'finished':
      return duel.outcome === 'won'
        ? { label: tags.won, tone: 'ok' }
        : duel.outcome === 'lost'
          ? { label: tags.lost, tone: 'bad' }
          : { label: tags.draw, tone: 'warn' };
    case 'waiting':
      return duel.turn === 'you' ? { label: tags.yourTurn, tone: 'warn' } : { label: tags.waiting, tone: 'secondary' };
    case 'expired':
      return { label: tags.expired, tone: 'neutral' };
    case 'declined':
      return { label: tags.declined, tone: 'neutral' };
    case 'cancelled':
      return { label: tags.cancelled, tone: 'neutral' };
    case 'void':
      return { label: tags.void, tone: 'bad' };
    default:
      return null;
  }
}

/**
 * A past game, opened from the history: its score — gold when it is the
 * season's best — when it ended, what became of it, and everything the
 * API's replay counted: the stat tiles and the named combos it pulled off.
 * A VS also shows both scores, once the friend has played.
 */
export function RunSheet({ runId, onClose }: { runId: string | null; onClose: () => void }) {
  const theme = useTheme();
  const t = useT();
  const words = t.history.sheet;
  const detail = useRunDetail(runId);
  const data = detail.data?.summary.runId === runId ? detail.data : undefined;

  return (
    <Sheet open={runId !== null} onClose={onClose} title={data ? runTitle(data.summary, t) : ''}>
      {detail.isLoading ? (
        <SkeletonList rows={3} />
      ) : detail.isError ? (
        <Callout tone="bad" title={words.failed}>
          {messageFor(detail.error, t)}
        </Callout>
      ) : data ? (
        <View style={styles.body}>
          <View style={styles.head}>
            <Text style={[styles.score, { color: data.summary.isBest ? theme.gold : theme.ink }, embossed(3)]}>
              {t.fmt.score(data.summary.score)}
            </Text>
            {data.summary.isBest ? (
              <Text style={[TYPE.label, { color: theme.gold }]}>{t.history.tags.best}</Text>
            ) : null}
            <Txt variant="meta" tone="muted">
              {words.at(t.fmt.date(data.summary.finishedAt), t.fmt.time(data.summary.finishedAt))}
            </Txt>
          </View>

          {data.summary.status === 'review' ? (
            <Callout tone="info">{words.review}</Callout>
          ) : data.summary.status === 'flagged' ? (
            <Callout tone="warn">{words.flagged}</Callout>
          ) : data.summary.status === 'played' ? (
            <Callout tone="info">{words.played}</Callout>
          ) : null}

          {data.summary.duel ? <DuelScores summary={data.summary} /> : null}

          <StatGrid columns={3} items={runStats(data.run, t)} />

          {BONUS_ORDER.some((kind) => data.run.breakdown.bonuses[kind].count > 0) ? (
            <View style={styles.bonuses}>
              {BONUS_ORDER.filter((kind) => data.run.breakdown.bonuses[kind].count > 0).map((kind) => (
                <BonusChip
                  key={kind}
                  kind={kind}
                  count={data.run.breakdown.bonuses[kind].count}
                  points={data.run.breakdown.bonuses[kind].points}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
}

/** A VS's two scores, the friend's hidden until the player has seen them in the VS itself. */
function DuelScores({ summary }: { summary: RunSummary }) {
  const t = useT();
  const duel = summary.duel;
  if (!duel) return null;
  const tag = runTag(summary, t);
  const them = duel.them ? (duel.them.score === null ? '—' : t.fmt.score(duel.them.score)) : '?';
  const you = duel.you?.score === null || duel.you?.score === undefined ? '—' : t.fmt.score(duel.you.score);
  return (
    <Panel tone="sunken" elevation="flat" style={styles.duel}>
      {tag ? <Tag label={tag.label} tone={tag.tone} icon="swords" /> : null}
      <Txt variant="title">
        {ltr(`${you} – ${them}`)}
      </Txt>
      <Txt variant="micro" tone="muted">
        {duel.opponent ? `${t.vs.result.you} · ${handle(duel.opponent)}` : t.vs.result.you}
      </Txt>
    </Panel>
  );
}

const styles = StyleSheet.create({
  body: { gap: SPACE.lg },
  head: { alignItems: 'center', gap: SPACE.xxs },
  score: { fontFamily: FONT.display, fontSize: 48, lineHeight: lh(56) },
  bonuses: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  duel: { alignItems: 'center', gap: SPACE.xs, paddingVertical: SPACE.md },
});
