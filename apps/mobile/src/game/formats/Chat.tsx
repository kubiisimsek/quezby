import { StyleSheet, Text, View } from 'react-native';

import type { Media } from '@/game/dress';
import { CARD } from '@/game/formats/shared';
import { useT } from '@/i18n';
import { RADIUS, SPACE, TYPE } from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

type ChatMedia = Extract<Media, { format: 'chat' }>;

/**
 * A chat screenshot: the contact at the top with a face, then the messages —
 * theirs on glass, the poster's on the light bubble — with the time over the
 * first and, a while later, over the punchline. Right to left, the sides
 * swap by themselves.
 */
export function Chat({ media }: { media: ChatMedia }) {
  const t = useT();
  return (
    <View testID="format-chat" style={CARD}>
      <View style={styles.head}>
        <View style={styles.avatar}>
          <Text style={styles.avatarFace}>{media.avatar}</Text>
        </View>
        <View style={styles.headWords}>
          <Text style={styles.contact} numberOfLines={1}>
            {media.contact}
          </Text>
          <Text style={styles.online}>{t.game.post.online}</Text>
        </View>
      </View>
      {media.lines.map((line, i) => (
        <View key={i} style={styles.line}>
          {line.stamp ? <Text style={styles.stamp}>{line.stamp}</Text> : null}
          <View style={[styles.bubble, line.from === 'me' ? styles.mine : styles.theirs]}>
            <Text style={[styles.text, line.from === 'me' ? styles.mineText : null]}>{line.text}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    alignItems: 'center',
    borderBottomColor: REEL.glass,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: SPACE.sm,
    paddingBottom: SPACE.sm,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: REEL.glassStrong,
    borderRadius: RADIUS.pill,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  avatarFace: { fontSize: 17, lineHeight: 22 },
  headWords: { flex: 1 },
  contact: { ...TYPE.heading, color: REEL.ink, fontSize: 14 },
  online: { ...TYPE.micro, color: REEL.inkFaint },
  line: { gap: SPACE.xs },
  stamp: { ...TYPE.micro, alignSelf: 'center', color: REEL.inkFaint },
  bubble: {
    borderRadius: 14,
    maxWidth: '82%',
    paddingHorizontal: SPACE.ms,
    paddingVertical: SPACE.sm,
  },
  theirs: { alignSelf: 'flex-start', backgroundColor: REEL.glassStrong, borderBottomStartRadius: 4 },
  mine: { alignSelf: 'flex-end', backgroundColor: REEL.bubble, borderBottomEndRadius: 4 },
  text: { ...TYPE.body, color: REEL.ink, fontSize: 14 },
  mineText: { color: REEL.bubbleInk },
});
