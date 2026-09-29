import { RULES, type ReelKind } from '@quezby/engine';
import type { LeagueTier } from '@quezby/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BONUS_ORDER, REEL_ORDER, bonusGuide, reelGuide } from '@/game/howTo';
import { useT } from '@/i18n';
import type { RootStackParamList } from '@/navigation/types';
import { Icon, type IconName } from '@/ui/icons';
import {
  BonusChip,
  Divider,
  Eyebrow,
  IconChip,
  Meter,
  Panel,
  Row,
  Screen,
  Shine,
  TierBadge,
  TopBar,
  Txt,
  type TagTone,
} from '@/ui/kit';
import { DEPTH, RADIUS, SPACE, useTheme, withAlpha } from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Help'>;

const TIERS: readonly LeagueTier[] = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'master',
];

/** Each reel in the feed's own colours, so the guide teaches what the eye will see. */
const REEL_FACE: Record<ReelKind, { face: string; ink: string }> = {
  skip: { face: REEL.skip[0], ink: REEL.ink },
  like: { face: REEL.like, ink: REEL.ink },
  hold: { face: REEL.hold, ink: REEL.goldInk },
  freeze: { face: REEL.freeze, ink: REEL.ink },
};

/** The dopamine bar as it drains: full, going, nearly gone — its words are `t.help.dopamine.levels`. */
const DOPAMINE: ReadonlyArray<{
  value: number;
  tone: TagTone;
  level: 'full' | 'draining' | 'low';
}> = [
  { value: 0.9, tone: 'ok', level: 'full' },
  { value: 0.5, tone: 'warn', level: 'draining' },
  { value: 0.16, tone: 'bad', level: 'low' },
];

/**
 * Yardım: the rules, from the reels to the leagues, in the order a new
 * player meets them, then what players ask. The words are `t.help`; the reel
 * and combo copy is `game/howTo`'s and every number is the engine's `RULES`,
 * so nothing here can promise a rule the game does not keep.
 */
export function HelpScreen({ navigation }: Props) {
  const t = useT();
  const words = t.help;
  const reels = reelGuide(t);
  const bonuses = bonusGuide(t);
  const comboStart = t.fmt.combo(RULES.comboStart);
  const comboMax = t.fmt.combo(RULES.comboMax);
  /** `x0,05` as a step: `+0,05`. */
  const comboStep = t.fmt.combo(RULES.comboStep).replace('x', '+');

  return (
    <Screen>
      <TopBar
        title={words.title}
        subtitle={words.subtitle}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Section icon="grid" title={words.posts.title}>
          <Txt tone="muted">{words.posts.intro}</Txt>
          {REEL_ORDER.map((kind) => {
            const reel = reels[kind];
            return (
              <View key={kind} style={styles.guide}>
                <ReelGem kind={kind} icon={reel.icon} />
                <View style={styles.flex}>
                  <Txt variant="heading">{reel.title}</Txt>
                  <Txt variant="meta" tone="muted">
                    {reel.body}
                  </Txt>
                </View>
              </View>
            );
          })}
        </Section>

        <Section icon="flame" title={words.dopamine.title}>
          <Txt>{words.dopamine.lead}</Txt>
          <View
            style={styles.meters}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {DOPAMINE.map((step, index) => (
              <View key={step.level} style={styles.meterRow}>
                <View style={styles.flex}>
                  <Meter value={step.value} tone={step.tone} index={index} />
                </View>
                <Txt variant="micro" tone="muted" style={styles.meterLabel}>
                  {words.dopamine.levels[step.level]}
                </Txt>
              </View>
            ))}
          </View>
          <More lines={[...words.dopamine.more, words.dopamine.blind(`${RULES.blindMs}`)]} />
        </Section>

        <Section icon="sparkle" title={words.scoring.title}>
          <Txt tone="muted">{words.scoring.intro}</Txt>
          <Row
            leading={<IconChip icon="mountain" tone="secondary" />}
            title={words.scoring.level}
            subtitle={words.scoring.levelBody(RULES.levelEvery)}
          />
          <Divider />
          <Row
            leading={<IconChip icon="flame" tone="primary" />}
            title={words.scoring.combo}
            subtitle={words.scoring.comboBody(comboStart, comboStep, comboMax)}
          />
          <Divider />
          <View style={styles.lead}>
            <Txt variant="heading">{words.scoring.named}</Txt>
            <Txt variant="meta" tone="muted">
              {words.scoring.namedBody}
            </Txt>
          </View>
          {BONUS_ORDER.map((kind) => (
            <Well key={kind}>
              <BonusChip kind={kind} />
              <Txt variant="meta" tone="muted">
                {bonuses[kind].body}
              </Txt>
            </Well>
          ))}
        </Section>

        <Section icon="calendar" title={words.daily.title}>
          <Txt>{words.daily.lead}</Txt>
          <More lines={words.daily.more} />
        </Section>

        <Section icon="shield" title={words.leagues.title}>
          <Well>
            <View style={styles.tiers}>
              {TIERS.map((tier) => (
                <TierBadge key={tier} tier={tier} size="md" showLabel />
              ))}
            </View>
          </Well>
          <Txt>{words.leagues.lead}</Txt>
          <More lines={words.leagues.more} />
        </Section>

        <Section icon="podium" title={words.boards.title}>
          <Txt>{words.boards.lead}</Txt>
          <More lines={words.boards.more} />
        </Section>

        <Section icon="check" title={words.fairPlay.title}>
          <Txt>{words.fairPlay.lead}</Txt>
          <More lines={words.fairPlay.more} />
        </Section>

        <Section icon="account" title={words.account.title}>
          <Txt>{words.account.lead}</Txt>
          <More lines={words.account.more} />
        </Section>

        <Section icon="help" title={words.faq.title}>
          {words.faq.items.map((item, index) => (
            <View key={item.question} style={styles.faqItem}>
              {index > 0 ? <Divider /> : null}
              <Question question={item.question} answer={item.answer} />
            </View>
          ))}
        </Section>
      </ScrollView>
    </Screen>
  );
}

/** A section's paragraphs after its first, set quieter. */
function More({ lines }: { lines: readonly string[] }) {
  return (
    <>
      {lines.map((line) => (
        <Txt key={line} tone="muted">
          {line}
        </Txt>
      ))}
    </>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Eyebrow icon={icon}>{title}</Eyebrow>
      <Panel style={styles.panel}>{children}</Panel>
    </View>
  );
}

/** A well cut into a section's tile, holding one thing to look at. */
function Well({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.well,
        { backgroundColor: theme.well, borderColor: theme.wellLine },
      ]}
    >
      {children}
    </View>
  );
}

/**
 * A reel as a gem in its own feed colours — slate, pink, gold, red — with
 * the glyph of the move it asks for: the colour is what a player reads first
 * in a run.
 */
function ReelGem({ kind, icon }: { kind: ReelKind; icon: IconName }) {
  const theme = useTheme();
  const look = REEL_FACE[kind];
  return (
    <View
      style={[
        styles.reelGem,
        { backgroundColor: look.face, borderColor: theme.outline },
      ]}
    >
      <Shine color={withAlpha(theme.onBrand, 0.2)} radius={13} height="38%" />
      <Icon name={icon} size={24} color={look.ink} strokeWidth={2.6} />
    </View>
  );
}

/** One question: tap it and its answer opens under it; tap again to close. */
function Question({ question, answer }: { question: string; answer: string }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.question}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [
          styles.questionHead,
          pressed ? styles.sunk : null,
        ]}
      >
        <View style={styles.flex}>
          <Txt variant="heading">{question}</Txt>
        </View>
        <View
          style={[
            styles.nub,
            {
              backgroundColor: open ? theme.primary : theme.fill,
              borderColor: theme.outline,
            },
          ]}
        >
          <View style={open ? styles.flip : null}>
            <Icon
              name="chevronDown"
              size={14}
              color={theme.ink}
              strokeWidth={3}
            />
          </View>
        </View>
      </Pressable>
      {open ? (
        <Txt variant="meta" tone="muted">
          {answer}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    gap: SPACE.xl,
    paddingBottom: SPACE.xxl * 2,
    paddingHorizontal: SPACE.xl,
    paddingTop: SPACE.xs,
  },
  section: { gap: SPACE.sm },
  panel: { gap: SPACE.ms },
  guide: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACE.md,
    paddingVertical: SPACE.xxs,
  },
  reelGem: {
    alignItems: 'center',
    borderBottomWidth: DEPTH.outline + 3,
    borderRadius: 13,
    borderWidth: DEPTH.outline,
    height: 58,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 44,
  },
  meters: { gap: SPACE.sm, paddingVertical: SPACE.xs },
  meterRow: { alignItems: 'center', flexDirection: 'row', gap: SPACE.md },
  meterLabel: { width: 84 },
  lead: { gap: SPACE.xxs, paddingTop: SPACE.xs },
  well: {
    alignItems: 'flex-start',
    borderRadius: RADIUS.control,
    borderWidth: 1.5,
    gap: SPACE.sm,
    padding: SPACE.md,
  },
  tiers: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.md,
    justifyContent: 'center',
  },
  faqItem: { gap: SPACE.ms },
  question: { gap: SPACE.sm },
  questionHead: { alignItems: 'center', flexDirection: 'row', gap: SPACE.md },
  sunk: { transform: [{ translateY: 2 }] },
  nub: {
    alignItems: 'center',
    borderBottomWidth: DEPTH.outline + 2,
    borderRadius: 9,
    borderWidth: DEPTH.outline - 0.5,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  flip: { transform: [{ rotate: '180deg' }] },
});
