import type { RatingChange } from '@quezby/types';
import { StyleSheet, Text, View } from 'react-native';

import { useT } from '@/i18n';
import type { IconName } from '@/ui/icons';
import { IconChip, QbCoin, Txt, type TagTone } from '@/ui/kit';
import { Sheet } from '@/ui/sheet';
import { FONT, SPACE, embossed, lh, useTheme } from '@/ui/theme';

/** A change that set the rating rather than moved it: it shows the rating it set. */
export function placing(change: RatingChange): boolean {
  return change.before === null && (change.kind === 'placement' || change.kind === 'forfeit');
}

/** Each move's gem: which way a run went, a placement's flag, an owner's hand. */
function gemOf(change: RatingChange): { icon: IconName; tone: TagTone } {
  switch (change.kind) {
    case 'placement':
      return { icon: 'flag', tone: 'secondary' };
    case 'forfeit':
      return { icon: 'close', tone: 'bad' };
    case 'reversal':
      return { icon: 'refresh', tone: 'warn' };
    case 'adjust':
      return { icon: 'sliders', tone: 'secondary' };
    case 'void':
      return { icon: 'ban', tone: 'neutral' };
    default:
      return change.delta > 0
        ? { icon: 'trendUp', tone: 'ok' }
        : change.delta < 0
          ? { icon: 'trendDown', tone: 'bad' }
          : { icon: 'play', tone: 'neutral' };
  }
}

/**
 * qb hareketleri: the rating's moves, newest first, opened from the league
 * stage's coin. Over them, the qb the player has now on its coin; each move
 * says why (a run, a placement, a forfeit, a run taken back, an owner's
 * correction), when, the run's score against its target, and by how much —
 * in green up, red down — with where it left the qb. A placement shows the
 * qb it set.
 */
export function QbHistorySheet({
  open,
  onClose,
  changes,
  current,
}: {
  open: boolean;
  onClose: () => void;
  changes: RatingChange[];
  /** The qb now; null before placement. */
  current: number | null;
}) {
  const theme = useTheme();
  const t = useT();
  const words = t.rating.history;

  return (
    <Sheet open={open} onClose={onClose} title={words.title}>
      <View style={styles.body}>
        {current !== null ? (
          <View style={styles.now}>
            <QbCoin size={44} />
            <Text
              accessibilityLabel={t.rating.elo(t.fmt.score(current))}
              style={[styles.nowValue, { color: theme.gold }, embossed(3)]}
            >
              {t.fmt.score(current)}
            </Text>
          </View>
        ) : null}

        {changes.length === 0 ? (
          <Txt variant="meta" tone="muted" align="center">
            {words.empty}
          </Txt>
        ) : (
          <View style={styles.list}>
            {changes.map((change, index) => {
              const gem = gemOf(change);
              const set = placing(change);
              const detail = [
                change.score !== null && change.target !== null
                  ? words.run(t.fmt.score(change.score), t.fmt.score(change.target))
                  : null,
                t.fmt.ago(change.at),
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <View key={`${change.at}-${index}`} style={styles.row} testID="qb-move">
                  <IconChip icon={gem.icon} tone={gem.tone} size="sm" />
                  <View style={styles.text}>
                    <Txt variant="heading" numberOfLines={1}>
                      {words.kinds[change.kind]}
                    </Txt>
                    <Txt variant="micro" tone="muted" numberOfLines={1}>
                      {detail}
                    </Txt>
                  </View>
                  <View style={styles.amount}>
                    <Text
                      style={[
                        styles.delta,
                        {
                          color: set
                            ? theme.ink
                            : change.delta > 0
                              ? theme.ok
                              : change.delta < 0
                                ? theme.bad
                                : theme.inkMuted,
                        },
                        embossed(1.5),
                      ]}
                    >
                      {set && change.after !== null
                        ? t.fmt.score(change.after)
                        : t.rating.delta(change.delta)}
                    </Text>
                    {!set && change.after !== null ? (
                      <Txt variant="micro" tone="muted">
                        {t.rating.elo(t.fmt.score(change.after))}
                      </Txt>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: SPACE.lg },
  now: { alignItems: 'center', flexDirection: 'row', gap: SPACE.sm, justifyContent: 'center' },
  nowValue: { fontFamily: FONT.display, fontSize: 30, lineHeight: lh(36) },
  list: { gap: SPACE.md },
  row: { alignItems: 'center', flexDirection: 'row', gap: SPACE.md },
  text: { flex: 1, gap: SPACE.xxs },
  amount: { alignItems: 'flex-end', gap: SPACE.xxs },
  delta: { fontFamily: FONT.display, fontSize: 18, lineHeight: lh(22) },
});
