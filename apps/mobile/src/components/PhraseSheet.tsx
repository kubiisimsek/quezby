import { PHRASES } from '@quezby/config';
import type { Phrase } from '@quezby/types';
import { StyleSheet, View } from 'react-native';

import { useT } from '@/i18n';
import { PhraseChip } from '@/ui/kit';
import { Sheet } from '@/ui/sheet';
import { SPACE } from '@/ui/theme';

/**
 * Every phrase a friend can be sent, laid out whole — greetings first, then
 * the game's banter (`PHRASES`). One tap sends it and the sheet goes.
 */
export function PhraseSheet({
  open,
  onClose,
  onSend,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onSend: (phrase: Phrase) => void;
  /** A phrase is on its way: the rest wait for it. */
  busy?: boolean;
}) {
  const t = useT();
  const words = t.inbox.thread;

  return (
    <Sheet open={open} onClose={onClose} title={words.tray} description={words.trayHint}>
      <View style={styles.grid}>
        {PHRASES.map((phrase) => {
          const text = t.inbox.phrases[phrase];
          return (
            <PhraseChip
              key={phrase}
              text={text}
              label={words.send(text)}
              disabled={busy}
              onPress={() => onSend(phrase)}
            />
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, paddingBottom: SPACE.md },
});
