import { StyleSheet, Text, View } from 'react-native';

import { useT } from '@/i18n';
import { SHRINK_TO_FIT } from '@/i18n/native';
import { type IconName } from '@/ui/icons';
import { buttonColors } from '@/ui/kit/buttons';
import { Avatar, IconChip, gemColors } from '@/ui/kit/identity';
import { AnimatedPressable, common } from '@/ui/kit/shared';
import { Slab } from '@/ui/kit/slab';
import { Tag } from '@/ui/kit/status';
import { Shine } from '@/ui/kit/surfaces';
import { Txt } from '@/ui/kit/text';
import { type TagTone } from '@/ui/kit/tones';
import { usePressScale } from '@/ui/motion';
import { DEPTH, FONT, RADIUS, SPACE, embossed, lh, useTheme, withAlpha } from '@/ui/theme';

/**
 * The pieces friends are drawn with: two players face to face, a friend in
 * the inbox, the lines of a conversation and the phrases that can be sent.
 */

type Side = {
  name: string;
  /** Their photo; null draws their initials. */
  src?: string | null;
  /** Under the portrait — "SEN", `@ekin`. */
  caption?: string;
};

/**
 * Two players face to face: you on the start side in magenta, them on the
 * end side in violet, and between you a gold "VS" — or, for two who have
 * played before, how they stand (`middle`).
 */
export function FaceOff({
  left,
  right,
  middle,
  label,
}: {
  left: Side;
  right: Side;
  /** In place of "VS": `3 – 2`. */
  middle?: string;
  /** What a screen reader says for the whole; two names face to face by default. */
  label?: string;
}) {
  const theme = useTheme();
  const t = useT();
  const said = label ?? t.kit.faceOff.label(left.caption ?? left.name, right.caption ?? right.name);

  return (
    <View accessible accessibilityLabel={said} style={styles.faceOff}>
      <Seat side={left} tone="primary" />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit={SHRINK_TO_FIT}
        minimumFontScale={0.7}
        style={[styles.versus, { color: theme.gold }, embossed(3)]}
      >
        {middle ?? t.kit.faceOff.versus}
      </Text>
      <Seat side={right} tone="secondary" />
    </View>
  );
}

function Seat({ side, tone }: { side: Side; tone: TagTone }) {
  return (
    <View style={styles.seat}>
      <Avatar name={side.name} src={side.src} tone={tone} size="lg" />
      {side.caption ? (
        <Txt variant="micro" tone="muted" numberOfLines={1}>
          {side.caption}
        </Txt>
      ) : null}
    </View>
  );
}

/**
 * A friend in the inbox: their portrait, their name over the conversation's
 * newest line, when it came and how many lines wait unread. A VS waiting on
 * either of you hangs a tag under the line. An unread conversation's line is
 * lit; a read one is quiet.
 */
export function ThreadRow({
  name,
  title,
  src,
  line,
  when,
  unread,
  tag,
  label,
  onPress,
}: {
  /** The friend's username — their initials, when there is no photo. */
  name: string;
  /** Their name as the game writes it, `@ekin`. */
  title: string;
  src?: string | null;
  line: string;
  when: string;
  unread: number;
  tag?: { label: string; tone: TagTone } | null;
  /** The whole row, as a screen reader says it. */
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const press = usePressScale(0.985);
  const fresh = unread > 0;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        common.panel,
        styles.thread,
        { backgroundColor: theme.tile, borderColor: theme.outline },
        press.style,
      ]}
    >
      <Avatar name={name} src={src} size="md" />
      <View style={styles.threadText}>
        <Txt variant="heading" numberOfLines={1}>
          {title}
        </Txt>
        <Txt variant="meta" tone={fresh ? 'ink' : 'muted'} numberOfLines={1}>
          {line}
        </Txt>
        {tag ? (
          <View style={styles.threadTag}>
            <Tag label={tag.label} tone={tag.tone} icon="swords" />
          </View>
        ) : null}
      </View>
      <View style={styles.threadSide}>
        <Txt variant="micro" tone={fresh ? 'primary' : 'faint'}>
          {when}
        </Txt>
        {fresh ? <Count value={unread} /> : null}
      </View>
    </AnimatedPressable>
  );
}

/** How many wait: a red pill, `9+` past nine. */
export function Count({ value }: { value: number }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.count, { backgroundColor: theme.bad, borderColor: theme.outline }]}
    >
      <Text style={[styles.countText, { color: theme.onBrand }]}>
        {value > 9 ? '9+' : value}
      </Text>
    </View>
  );
}

/**
 * A phrase in a conversation: yours on the end side as a magenta slab, your
 * friend's on the start side as a violet tile, each with the time under it.
 */
export function Bubble({
  text,
  mine,
  when,
  label,
}: {
  text: string;
  mine: boolean;
  when: string;
  /** Who said what, as a screen reader says it. */
  label: string;
}) {
  const theme = useTheme();
  const face = mine
    ? { backgroundColor: theme.primary, borderBottomColor: theme.primaryLip }
    : { backgroundColor: theme.tile, borderBottomColor: theme.tileLip };

  return (
    <View
      accessible
      accessibilityLabel={`${label}. ${when}`}
      style={[styles.bubbleLine, mine ? styles.end : styles.start]}
    >
      <View
        style={[
          styles.bubble,
          mine ? styles.bubbleMine : styles.bubbleTheirs,
          face,
          { borderColor: theme.outline },
        ]}
      >
        <Shine color={withAlpha(theme.onBrand, mine ? 0.16 : 0.08)} radius={BUBBLE_RADIUS} height="45%" />
        <Text style={[styles.bubbleText, { color: mine ? theme.onBrand : theme.ink }]}>{text}</Text>
      </View>
      <Txt variant="micro" tone="faint">
        {when}
      </Txt>
    </View>
  );
}

/**
 * Something that happened between two friends rather than something said —
 * you became friends, a VS was sent, won, turned down, ran out: a strip in
 * the middle of the conversation, its gem saying what kind. A VS result sets
 * its word in Rubik, in the colour of how it went, with the two scores under.
 */
export function EventLine({
  icon,
  tone = 'secondary',
  title,
  detail,
  when,
  strong = false,
}: {
  icon: IconName;
  tone?: TagTone;
  title: string;
  detail?: string;
  when: string;
  /** A result: the word in Rubik, in its tone's colour. */
  strong?: boolean;
}) {
  const theme = useTheme();
  const colors = gemColors(theme, tone);

  return (
    <View
      accessible
      accessibilityLabel={[title, detail, when].filter(Boolean).join('. ')}
      style={styles.event}
    >
      <View
        style={[styles.eventStrip, { backgroundColor: theme.well, borderColor: theme.wellLine }]}
      >
        <IconChip icon={icon} tone={tone} size="sm" />
        <View style={styles.eventText}>
          {strong ? (
            <Txt variant="title" style={{ color: colors.solid }}>
              {title}
            </Txt>
          ) : (
            <Txt variant="heading">{title}</Txt>
          )}
          {detail ? (
            <Txt variant="meta" tone="muted">
              {detail}
            </Txt>
          ) : null}
        </View>
      </View>
      <Txt variant="micro" tone="faint">
        {when}
      </Txt>
    </View>
  );
}

/** A phrase in the tray: a small slab that sends it. */
export function PhraseChip({
  text,
  label,
  onPress,
  disabled,
}: {
  text: string;
  /** What pressing does, as a screen reader says it: "Gönder: İyi oyundu!". */
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const colors = buttonColors(theme, 'neutral');

  return (
    <Slab
      colors={colors}
      radius={RADIUS.control}
      lip={DEPTH.lipSm}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={{ opacity: disabled ? 0.5 : 1 }}
      faceStyle={styles.phrase}
    >
      <Text numberOfLines={1} style={[styles.phraseText, { color: colors.ink }]}>
        {text}
      </Text>
    </Slab>
  );
}

/** A phrase bubble's corners — but the one its tail sits at. */
const BUBBLE_RADIUS = 20;

const styles = StyleSheet.create({
  faceOff: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACE.lg,
    justifyContent: 'center',
    marginVertical: SPACE.xs,
  },
  seat: { alignItems: 'center', gap: SPACE.xs, maxWidth: 110 },
  versus: {
    fontFamily: FONT.display,
    fontSize: 26,
    lineHeight: lh(30),
    maxWidth: 110,
    textAlign: 'center',
  },
  thread: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACE.md,
    paddingVertical: SPACE.md,
  },
  threadText: { flex: 1, gap: 2 },
  threadTag: { alignItems: 'flex-start', marginTop: SPACE.xxs },
  threadSide: { alignItems: 'flex-end', gap: SPACE.xs },
  count: {
    alignItems: 'center',
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    minWidth: 22,
    paddingHorizontal: 5,
  },
  countText: { fontFamily: FONT.display, fontSize: 11.5, lineHeight: lh(14) },
  bubbleLine: { gap: 3, maxWidth: '82%' },
  start: { alignItems: 'flex-start', alignSelf: 'flex-start' },
  end: { alignItems: 'flex-end', alignSelf: 'flex-end' },
  bubble: {
    borderBottomWidth: DEPTH.outline + 3,
    borderRadius: BUBBLE_RADIUS,
    borderWidth: DEPTH.outline,
    overflow: 'hidden',
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.ms,
  },
  bubbleMine: { borderBottomEndRadius: 6 },
  bubbleTheirs: { borderBottomStartRadius: 6 },
  bubbleText: { fontFamily: FONT.semibold, fontSize: 17, lineHeight: lh(23) },
  event: { alignItems: 'center', alignSelf: 'center', gap: 3, maxWidth: '92%' },
  eventStrip: {
    alignItems: 'center',
    borderRadius: RADIUS.panel,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: SPACE.md,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.ms,
  },
  eventText: { flexShrink: 1, gap: 1 },
  phrase: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: SPACE.lg,
  },
  phraseText: { fontFamily: FONT.semibold, fontSize: 15, lineHeight: lh(20) },
});
