import { StyleSheet, View } from 'react-native';

import { useT } from '@/i18n';
import { Button } from '@/ui/kit/buttons';
import { IconChip } from '@/ui/kit/identity';
import { Stamp } from '@/ui/kit/juice';
import { Panel } from '@/ui/kit/surfaces';
import { Ribbon, Txt } from '@/ui/kit/text';
import { SPACE } from '@/ui/theme';

/**
 * The one question about usage analytics, asked before anything is
 * counted: on the welcome, and once in the lobby of a phone that never saw
 * it. Two slabs of the same size, so no is as easy as yes — and neither in
 * gold, which only ever starts a game.
 */
export function ConsentCard({ onAnswer }: { onAnswer: (yes: boolean) => void }) {
  const t = useT();
  return (
    <Stamp from={1.08}>
      <Panel style={styles.card}>
        <Ribbon label={t.consent.ribbon} tone="ink" />
        <View style={styles.head}>
          <IconChip icon="trendUp" tone="secondary" size="lg" />
          <Txt variant="title" align="center">
            {t.consent.title}
          </Txt>
        </View>
        <Txt variant="body" tone="muted" align="center">
          {t.consent.body}
        </Txt>
        <Txt variant="meta" tone="faint" align="center">
          {t.consent.later}
        </Txt>
        <View style={styles.answers}>
          <Button label={t.consent.deny} tone="secondary" size="md" onPress={() => onAnswer(false)} style={styles.answer} />
          <Button label={t.consent.allow} tone="primary" size="md" onPress={() => onAnswer(true)} style={styles.answer} />
        </View>
      </Panel>
    </Stamp>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'stretch', gap: SPACE.md, padding: SPACE.xl },
  head: { alignItems: 'center', gap: SPACE.sm },
  answers: { flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.xs },
  answer: { flex: 1 },
});
