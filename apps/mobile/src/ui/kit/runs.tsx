import { StyleSheet, Text, View } from 'react-native';

import { SHRINK_TO_FIT } from '@/i18n/native';
import { type IconName } from '@/ui/icons';
import { IconChip } from '@/ui/kit/identity';
import { ArrowNub } from '@/ui/kit/rows';
import { AnimatedPressable, common } from '@/ui/kit/shared';
import { Tag } from '@/ui/kit/status';
import { Txt } from '@/ui/kit/text';
import { type TagTone } from '@/ui/kit/tones';
import { usePressScale } from '@/ui/motion';
import { FONT, SPACE, TYPE, embossed, lh, useTheme } from '@/ui/theme';

/**
 * A past game in the player's history: a gem for its kind — free play, the
 * day's challenge, a VS — its title over its posts, time and hour, and its
 * score on the end side in Rubik, gold when it is the season's best. What
 * became of it — held for review, not counted, how a VS went — is a tag
 * under the title.
 */
export function RunTile({
  icon,
  tone,
  title,
  meta,
  score,
  best = false,
  bestLabel,
  tag,
  label,
  onPress,
}: {
  icon: IconName;
  tone: TagTone;
  title: string;
  meta: string;
  /** The score as `t.fmt.score` writes it. */
  score: string;
  best?: boolean;
  /** Under a best score: "REKOR". */
  bestLabel?: string;
  tag?: { label: string; tone: TagTone } | null;
  /** The whole tile, as a screen reader says it. */
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const press = usePressScale(0.985);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        common.panel,
        styles.tile,
        { backgroundColor: theme.tile, borderColor: theme.outline },
        press.style,
      ]}
    >
      <IconChip icon={icon} tone={tone} size="md" />
      <View style={styles.text}>
        <Txt variant="heading" numberOfLines={1}>
          {title}
        </Txt>
        <Txt variant="meta" tone="muted" numberOfLines={1}>
          {meta}
        </Txt>
        {tag ? (
          <View style={styles.tag}>
            <Tag label={tag.label} tone={tag.tone} />
          </View>
        ) : null}
      </View>
      <View style={styles.score}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit={SHRINK_TO_FIT}
          minimumFontScale={0.7}
          style={[styles.points, { color: best ? theme.gold : theme.ink }, embossed(2)]}
        >
          {score}
        </Text>
        {best && bestLabel ? (
          <Text style={[TYPE.label, styles.best, { color: theme.gold }]}>{bestLabel}</Text>
        ) : null}
      </View>
      <ArrowNub />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACE.md,
    paddingVertical: SPACE.md,
  },
  text: { flex: 1, gap: 2 },
  tag: { alignItems: 'flex-start', marginTop: SPACE.xxs },
  score: { alignItems: 'flex-end', maxWidth: 120 },
  points: { fontFamily: FONT.display, fontSize: 22, lineHeight: lh(27) },
  best: { fontSize: 10.5, lineHeight: lh(13) },
});
