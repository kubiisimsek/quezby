import { StyleSheet, Text, View } from 'react-native';

import type { Media } from '@/game/dress';
import { CARD, shout } from '@/game/formats/shared';
import { useT } from '@/i18n';
import { SPACE, TYPE, withAlpha } from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

type PollMedia = Extract<Media, { format: 'poll' }>;

/** A poll: its ribbon, the question, each answer's bar filled to its share, and the votes. */
export function Poll({ media }: { media: PollMedia }) {
  const t = useT();
  return (
    <View testID="format-poll" style={[CARD, styles.card]}>
      <Text style={styles.ribbon}>{t.game.post.poll}</Text>
      <Text style={[shout(21), styles.question]}>{media.question}</Text>
      {media.options.map((option, i) => (
        <View key={i} style={styles.option}>
          <View style={[styles.fill, option.winner ? styles.fillWinner : null, { width: `${option.share}%` }]} />
          <Text style={[styles.answer, option.winner ? styles.answerWinner : null]} numberOfLines={1}>
            {option.text}
          </Text>
          <Text style={[styles.answer, styles.share, option.winner ? styles.answerWinner : null]}>
            {t.fmt.percent(option.share)}
          </Text>
        </View>
      ))}
      <Text style={styles.votes}>{t.game.post.votes(media.votes)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: REEL.glass, borderColor: REEL.glassStrong, borderWidth: 1.5, padding: SPACE.lg },
  ribbon: { ...TYPE.label, color: REEL.inkSoft },
  question: { marginBottom: SPACE.xs },
  option: {
    alignItems: 'center',
    backgroundColor: REEL.shade,
    borderRadius: 12,
    flexDirection: 'row',
    height: 40,
    overflow: 'hidden',
    paddingHorizontal: SPACE.md,
  },
  fill: { backgroundColor: REEL.glassStrong, bottom: 0, position: 'absolute', start: 0, top: 0 },
  fillWinner: { backgroundColor: withAlpha(REEL.ink, 0.34) },
  answer: { ...TYPE.heading, color: REEL.inkSoft, flex: 1, fontSize: 15 },
  answerWinner: { color: REEL.ink },
  share: { flex: 0, marginStart: SPACE.sm },
  votes: { ...TYPE.micro, alignSelf: 'center', color: REEL.inkFaint },
});
