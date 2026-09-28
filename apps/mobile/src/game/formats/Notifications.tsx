import { StyleSheet, Text, View } from 'react-native';

import type { Media } from '@/game/dress';
import { shout } from '@/game/formats/shared';
import { useT } from '@/i18n';
import { SPACE, TYPE } from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

type NotificationsMedia = Extract<Media, { format: 'notifications' }>;

/**
 * A lock screen: its clock, the post's own notification on top, the
 * everyday pile under it, the oldest fading at the bottom.
 */
export function Notifications({ media }: { media: NotificationsMedia }) {
  const t = useT();
  const last = media.notices.length - 1;
  return (
    <View testID="format-notifications" style={styles.screen}>
      <Text style={[shout(52), styles.clock]}>{media.clock}</Text>
      {media.notices.map((notice, i) => (
        <View key={i} style={[styles.notice, i === last ? styles.oldest : null]}>
          <View style={styles.icon}>
            <Text style={styles.iconFace}>{notice.icon}</Text>
          </View>
          <View style={styles.words}>
            <Text style={styles.app} numberOfLines={1}>
              {notice.app}
            </Text>
            <Text style={styles.text} numberOfLines={2}>
              {notice.text}
            </Text>
          </View>
          <Text style={styles.ago}>{t.game.post.ago(notice.minutes)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { alignSelf: 'stretch', gap: SPACE.sm },
  clock: { alignSelf: 'center', marginBottom: SPACE.xs },
  notice: {
    alignItems: 'center',
    backgroundColor: REEL.glassStrong,
    borderRadius: 16,
    flexDirection: 'row',
    gap: SPACE.ms,
    padding: SPACE.ms,
  },
  oldest: { opacity: 0.55, transform: [{ scale: 0.94 }] },
  icon: {
    alignItems: 'center',
    backgroundColor: REEL.shade,
    borderRadius: 9,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  iconFace: { fontSize: 18, lineHeight: 23 },
  words: { flex: 1 },
  app: { ...TYPE.heading, color: REEL.ink, fontSize: 13 },
  text: { ...TYPE.meta, color: REEL.inkSoft },
  ago: { ...TYPE.micro, alignSelf: 'flex-start', color: REEL.inkFaint },
});
