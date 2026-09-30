import type { BestScore, LeagueTier } from '@quezby/types';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useT } from '@/i18n';
import { initialsOf } from '@/lib/format';
import { Icon } from '@/ui/icons';
import { FramedAvatar, IconButton, Stamp, Txt, gemColors } from '@/ui/kit';
import { DEPTH, FONT, RADIUS, SPACE, embossed, lh, useTheme, withAlpha } from '@/ui/theme';

/**
 * The pieces a player card is built from — the profile's own card and the
 * card any row opens: the player's portrait, big, and their season best as
 * the one gold number on it.
 */

/**
 * A player's portrait at card size: the kit's `Avatar` drawn big — their
 * photo, or their initials in Rubik on a dark card, in a thick frame of their
 * tone (magenta for you, violet for everyone else) that stands on its lip
 * like a tile. The name is always written beside it, so a screen reader skips
 * the picture; `onEdit` pins a small camera slab to its corner.
 */
export function Portrait({
  name,
  src,
  isMe = false,
  size = 'lg',
  tier = null,
  onEdit,
  editLabel,
}: {
  name: string;
  /** Their photo (`avatarUrl`); null draws the initials. */
  src?: string | null;
  isMe?: boolean;
  size?: 'md' | 'lg';
  /** Their league: the portrait sits in its frame, alive (`FramedAvatar`). */
  tier?: LeagueTier | null;
  onEdit?: () => void;
  /** What the camera slab does, as a screen reader says it. */
  editLabel?: string;
}) {
  const theme = useTheme();
  const colors = gemColors(theme, isMe ? 'primary' : 'secondary');
  const lg = size === 'lg';

  if (tier) {
    return (
      <View>
        <FramedAvatar
          tier={tier}
          name={name}
          src={src}
          size={lg ? FRAMED.lg : FRAMED.md}
          tone={isMe ? 'primary' : 'secondary'}
          animated
        />
        {onEdit ? (
          <IconButton icon="camera" label={editLabel ?? ''} onPress={onEdit} style={styles.editFramed} />
        ) : null}
      </View>
    );
  }

  return (
    <View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.frame,
          lg ? styles.frameLg : styles.frameMd,
          { backgroundColor: colors.solid, borderColor: theme.outline },
        ]}
      >
        <View
          style={[
            styles.card,
            lg ? styles.cardLg : styles.cardMd,
            { backgroundColor: colors.deep },
          ]}
        >
          <View
            pointerEvents="none"
            style={[
              styles.shine,
              { backgroundColor: withAlpha(theme.onBrand, 0.12) },
            ]}
          />
          <Text
            style={[
              styles.initials,
              lg ? styles.initialsLg : styles.initialsMd,
              { color: theme.onBrand },
              embossed(3),
            ]}
          >
            {initialsOf(name)}
          </Text>
          {src ? (
            <Image source={{ uri: src }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : null}
        </View>
      </View>
      {onEdit ? (
        <IconButton
          icon="camera"
          label={editLabel ?? ''}
          onPress={onEdit}
          style={styles.edit}
        />
      ) : null}
    </View>
  );
}

/**
 * This season's best, the way a player card shows it: stamped in gold Rubik
 * into a well cut into the card, under its name, with how many reels the run
 * lasted. "—" before the season's first ranked run. The number is the API's.
 */
export function SeasonBest({
  best,
  delay = 0,
}: {
  best: BestScore | null;
  /** When the number lands, after whatever arrives before it. */
  delay?: number;
}) {
  const theme = useTheme();
  const t = useT();
  const value = best ? t.fmt.score(best.score) : '—';

  return (
    <View
      accessible
      accessibilityLabel={t.friends.best.said(value)}
      style={[
        styles.best,
        { backgroundColor: theme.well, borderColor: theme.wellLine },
      ]}
    >
      <View style={styles.bestHead}>
        <Icon name="trophy" size={14} color={theme.gold} strokeWidth={2.6} />
        <Txt variant="micro" tone="muted">
          {t.friends.best.title}
        </Txt>
      </View>
      <Stamp delay={delay} from={1.6}>
        <Txt
          variant="score"
          numberOfLines={1}
          style={{ color: best ? theme.gold : theme.inkFaint }}
        >
          {value}
        </Txt>
      </Stamp>
      {best ? (
        <Txt variant="micro" tone="faint">
          {t.board.posts(best.reels)}
        </Txt>
      ) : null}
    </View>
  );
}

/** A framed portrait's box: the frame's ornaments take room round the picture. */
const FRAMED = { md: 128, lg: 176 } as const;

const PORTRAIT = {
  md: { box: 72, frame: 4, radius: 22 },
  lg: { box: 92, frame: 5, radius: 28 },
} as const;

const styles = StyleSheet.create({
  frame: {
    borderBottomWidth: DEPTH.outline + DEPTH.lipSm,
    borderWidth: DEPTH.outline,
  },
  frameMd: {
    borderRadius: PORTRAIT.md.radius,
    height: PORTRAIT.md.box + DEPTH.lipSm,
    padding: PORTRAIT.md.frame,
    width: PORTRAIT.md.box,
  },
  frameLg: {
    borderRadius: PORTRAIT.lg.radius,
    height: PORTRAIT.lg.box + DEPTH.lipSm,
    padding: PORTRAIT.lg.frame,
    width: PORTRAIT.lg.box,
  },
  card: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardMd: { borderRadius: PORTRAIT.md.radius - PORTRAIT.md.frame - 1 },
  cardLg: { borderRadius: PORTRAIT.lg.radius - PORTRAIT.lg.frame - 1 },
  shine: { height: '45%', left: 0, position: 'absolute', right: 0, top: 0 },
  initials: { fontFamily: FONT.display, includeFontPadding: false },
  initialsMd: { fontSize: 26, lineHeight: lh(31) },
  initialsLg: { fontSize: 34, lineHeight: lh(40) },
  best: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: RADIUS.control,
    borderWidth: 1.5,
    gap: SPACE.xxs,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.ms,
  },
  bestHead: { alignItems: 'center', flexDirection: 'row', gap: SPACE.xs },
  edit: { bottom: -SPACE.sm, end: -SPACE.md, position: 'absolute' },
  editFramed: { bottom: SPACE.lg, end: SPACE.xs, position: 'absolute' },
});
