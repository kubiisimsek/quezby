import { postsOf } from '@quezby/config';
import type { LeagueTier, Me, Ranks } from '@quezby/types';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { Portrait, SeasonBest } from '@/components/PlayerCard';
import { CredentialsSheet } from '@/components/CredentialsSheet';
import { LanguageSheet } from '@/components/LanguageSheet';
import { SignInWaysSheet, signInWays } from '@/components/SignInWaysSheet';
import { UsernameField } from '@/components/UsernameField';
import { BONUS_ORDER } from '@/game/howTo';
import { useLeague, useStats } from '@/hooks/useBoards';
import { rememberMe } from '@/hooks/useMe';
import { useUsernameCheck } from '@/hooks/useUsernameCheck';
import { handle, useLocale, useT } from '@/i18n';
import { SHRINK_TO_FIT } from '@/i18n/native';
import { messageFor } from '@/lib/errors';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import {
  SettingsSheet,
  keepHint,
  type SettingsDoor,
} from '@/screens/profile/SettingsSheet';
import {
  ArrowNub,
  BonusChip,
  BrandBand,
  Button,
  Callout,
  Divider,
  Eyebrow,
  Field,
  IconButton,
  IconChip,
  Panel,
  RankChips,
  Ribbon,
  Screen,
  SkeletonList,
  Stamp,
  StatGrid,
  Tag,
  TierBadge,
  Txt,
} from '@/ui/kit';
import { FormSheet } from '@/ui/sheet';
import {
  DEPTH,
  RADIUS,
  SPACE,
  TYPE,
  embossed,
  useTheme,
  withAlpha,
} from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

type SheetName =
  'settings' | 'language' | 'username' | 'ways' | 'credentials' | 'delete' | null;

/** What waits for the open sheet to leave the screen: another sheet, or a door out. */
type Next = Exclude<SheetName, 'settings' | null> | SettingsDoor;

/** How far the portrait reaches up into the card's banner. */
const PORTRAIT_RISE = 46;

/**
 * The player's card, the way a game shows one: who you are, your league,
 * your season best and places — then every count the API keeps, the named
 * combos you have pulled off and the friends' posts you liked most. What is
 * opened now and then — the language, Titreşim, Yardım, the account's doors — waits in
 * Ayarlar behind the gear; a guest's nudge to keep the account stays out
 * front.
 */
export function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const user = useSession((state) => state.user);
  const ranks = useSession((state) => state.ranks);
  const league = useLeague();
  const [sheet, setSheet] = useState<SheetName>(null);
  /** What opens once the open sheet has left the screen — never over it. */
  const next = useRef<Next | null>(null);

  if (!user) return null;

  /** Closes the open sheet; `then` happens once it has left the screen. */
  const leaveFor = (then: Next) => {
    next.current = then;
    setSheet(null);
  };

  const settle = () => {
    const then = next.current;
    next.current = null;
    if (then === 'help') {
      navigation.navigate('Help');
    } else if (then === 'signOut') {
      void api.auth.logout().catch(() => undefined);
      void useSession.getState().signOut();
    } else if (then) {
      setSheet(then);
    }
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + SPACE.sm },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <PlayerHero
          user={user}
          ranks={ranks}
          tier={league.data && !league.data.unlock ? league.data.tier : null}
          onSettings={() => setSheet('settings')}
        />

        {user.isGuest ? <KeepNudge onPress={() => setSheet('ways')} /> : null}

        <Statistics />
      </ScrollView>

      <SettingsSheet
        open={sheet === 'settings'}
        onClose={() => setSheet(null)}
        onClosed={settle}
        onPick={leaveFor}
      />
      <LanguageSheet open={sheet === 'language'} onClose={() => setSheet(null)} />
      <UsernameSheet
        open={sheet === 'username'}
        current={user.username}
        onClose={() => setSheet(null)}
      />
      <SignInWaysSheet
        open={sheet === 'ways'}
        onClose={() => setSheet(null)}
        onEmail={() => leaveFor('credentials')}
        onClosed={settle}
      />
      <CredentialsSheet
        open={sheet === 'credentials'}
        guest={user.isGuest}
        onClose={() => setSheet(null)}
      />
      <DeleteSheet
        open={sheet === 'delete'}
        username={user.username ?? ''}
        onClose={() => setSheet(null)}
      />
    </Screen>
  );
}

/**
 * Your card: a banner in the brand's stage with the gear on it, your
 * portrait rising out of it, your name, league and how the account is
 * kept, then the season best in gold and your place on each board — all of
 * it the API's.
 */
function PlayerHero({
  user,
  ranks,
  tier,
  onSettings,
}: {
  user: Me;
  ranks: Ranks | null;
  tier: LeagueTier | null;
  onSettings: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const words = t.profile.hero;
  const periods = t.board.summit.periods;
  const ways = signInWays(user, t);

  return (
    <Panel tone="primary" style={styles.hero}>
      <BrandBand style={[styles.banner, { borderBottomColor: theme.outline }]}>
        <Ribbon label={words.ribbon} />
        <IconButton
          icon="sliders"
          label={t.profile.settings.title}
          tone="onBrand"
          onPress={onSettings}
        />
      </BrandBand>

      <View pointerEvents="box-none" style={styles.heroBody}>
        <Stamp from={1.3}>
          <Portrait name={user.username ?? '?'} isMe />
        </Stamp>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit={SHRINK_TO_FIT}
          minimumFontScale={0.6}
          style={[TYPE.display, styles.name, { color: theme.ink }, embossed(2)]}
        >
          {handle(user.username ?? '')}
        </Text>
        <View style={styles.badges}>
          {tier ? <TierBadge tier={tier} size="md" showLabel /> : null}
          {user.isGuest ? (
            <Tag label={words.guest} tone="warn" icon="alert" />
          ) : (
            <Tag
              label={user.email ?? words.linked(t.fmt.list(ways, 'and'))}
              tone="ok"
              icon="shield"
            />
          )}
        </View>
        <SeasonBest best={user.best} delay={140} />
        <View style={styles.stretch}>
          <RankChips
            items={[
              { label: periods.daily, rank: ranks?.daily },
              { label: periods.weekly, rank: ranks?.weekly },
              { label: periods.monthly, rank: ranks?.monthly },
              { label: periods.all, rank: ranks?.all },
            ]}
          />
        </View>
      </View>
    </Panel>
  );
}

/**
 * A guest's account lives on this phone only. The way to keep it stays on
 * the profile's face, in the colour of a warning, until it is kept.
 */
function KeepNudge({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const t = useT();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.nudge,
        { backgroundColor: theme.warnSoft, borderColor: theme.outline },
        pressed ? styles.sunk : null,
      ]}
    >
      <View
        pointerEvents="none"
        style={[styles.nudgeEdge, { backgroundColor: theme.warnLine }]}
      />
      <IconChip icon="shield" tone="warn" size="md" />
      <View style={styles.flex}>
        <Txt variant="heading">{t.auth.keepAccount}</Txt>
        <Txt variant="meta" tone="warn">
          {keepHint(t)}
        </Txt>
      </View>
      <ArrowNub />
    </Pressable>
  );
}

/**
 * What the player has played, as the API's replays counted it: the lifetime
 * numbers, the named combos they have pulled off, and the friends' posts
 * they liked most — known on the phone by id, drawn from the content catalog.
 */
function Statistics() {
  const t = useT();
  const words = t.profile.stats;
  /** The counts a player card shows too, in the card's words. */
  const counted = t.friends.sheet.stats;
  const stats = useStats();
  const posts = useMemo(() => postsOf(), []);
  const locale = useLocale();

  if (stats.isLoading) {
    return (
      <>
        <Eyebrow icon="grid">{words.title}</Eyebrow>
        <SkeletonList rows={2} />
      </>
    );
  }

  if (!stats.data) {
    return (
      <>
        <Eyebrow icon="grid">{words.title}</Eyebrow>
        <Callout tone="bad" title={words.failed}>
          {messageFor(stats.error, t)}
        </Callout>
        <Button
          label={words.retry}
          tone="neutral"
          icon="refresh"
          onPress={() => void stats.refetch()}
        />
      </>
    );
  }

  const { stats: counts, topLiked } = stats.data;
  const combos = BONUS_ORDER.filter((kind) => counts.bonuses[kind] > 0);
  const liked = topLiked.slice(0, 5).flatMap((item) => {
    const post = posts.get(item.contentId);
    return post ? [{ ...item, post }] : [];
  });

  return (
    <>
      <Eyebrow icon="grid">{words.title}</Eyebrow>
      <StatGrid
        items={[
          { label: counted.runs, value: t.fmt.score(counts.runs), icon: 'play' },
          { label: counted.posts, value: t.fmt.score(counts.reels), icon: 'grid' },
          {
            label: words.swipes,
            value: t.fmt.score(counts.swipes),
            icon: 'arrowUp',
          },
          {
            label: counted.likes,
            value: t.fmt.score(counts.likes),
            icon: 'heart',
            tone: 'primary',
          },
          {
            label: counted.perfects,
            value: t.fmt.score(counts.perfects),
            icon: 'star',
            tone: 'warn',
          },
          {
            label: words.bestReaction,
            value:
              counts.bestReactionMs === null
                ? '—'
                : words.milliseconds(t.fmt.score(counts.bestReactionMs)),
            icon: 'bolt',
            tone: 'warn',
          },
          {
            label: words.playTime,
            value: t.fmt.playTime(counts.activeMs),
            icon: 'clock',
          },
          {
            label: t.result.stats.maxCombo,
            value: counts.maxCombo > 0 ? t.fmt.combo(counts.maxCombo) : '—',
            icon: 'flame',
            tone: 'primary',
          },
        ]}
      />

      <Eyebrow icon="sparkle">{t.profile.combos.title}</Eyebrow>
      <Panel style={styles.section}>
        {combos.length > 0 ? (
          <View style={styles.chips}>
            {combos.map((kind) => (
              <BonusChip key={kind} kind={kind} count={counts.bonuses[kind]} />
            ))}
          </View>
        ) : (
          <Txt variant="meta" tone="muted">
            {t.profile.combos.empty}
          </Txt>
        )}
      </Panel>

      <Eyebrow icon="heart">{t.profile.liked.title}</Eyebrow>
      <Panel style={styles.section}>
        {liked.length > 0 ? (
          liked.map((item, index) => (
            <View key={item.contentId} style={styles.section}>
              {index > 0 ? <Divider /> : null}
              <LikedPost
                emoji={item.post.emoji}
                user={item.post.user[locale]}
                caption={item.post.caption[locale]}
                likes={item.likes}
              />
            </View>
          ))
        ) : (
          <Txt variant="meta" tone="muted">
            {t.profile.liked.empty}
          </Txt>
        )}
      </Panel>
    </>
  );
}

/**
 * One of the posts liked most: the post as a little pink reel — a friend's
 * post is a like reel in the feed — with its account, caption and how many
 * times you liked it.
 */
function LikedPost({
  emoji,
  user,
  caption,
  likes,
}: {
  emoji: string;
  user: string;
  caption: string;
  likes: number;
}) {
  const theme = useTheme();
  const t = useT();
  return (
    <View style={styles.post}>
      <View
        style={[
          styles.thumb,
          { backgroundColor: REEL.like, borderColor: theme.outline },
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.thumbShine,
            { backgroundColor: withAlpha(theme.onBrand, 0.16) },
          ]}
        />
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={styles.flex}>
        <Txt variant="heading" numberOfLines={1}>
          {user}
        </Txt>
        <Txt variant="meta" tone="muted" numberOfLines={2}>
          {caption}
        </Txt>
      </View>
      <Tag label={t.profile.liked.times(likes)} tone="primary" icon="heart" />
    </View>
  );
}

/**
 * The player's one pick of a name, over the automatic one (`guest48128742`)
 * — Ayarlar only opens it while the name can still be picked. What is saved
 * here never changes, and the sheet says so before it is saved.
 */
function UsernameSheet({
  open,
  current,
  onClose,
}: {
  open: boolean;
  current: string | null;
  onClose: () => void;
}) {
  const t = useT();
  const words = t.profile.pickName;
  const [value, setValue] = useState('');
  const [pending, setPending] = useState(false);
  /** What went wrong, kept as it came — its words are read in the language of the moment. */
  const [failure, setFailure] = useState<{ error: unknown } | null>(null);
  const check = useUsernameCheck(value, current);
  const queryClient = useQueryClient();

  const ready = check.state === 'available' || check.state === 'unknown';

  const save = async () => {
    if (check.state !== 'available' && check.state !== 'unknown') return;
    setPending(true);
    setFailure(null);
    try {
      const { user } = await api.me.updateUsername(check.normalized);
      rememberMe(user);
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      onClose();
    } catch (caught) {
      setFailure({ error: caught });
    } finally {
      setPending(false);
    }
  };

  return (
    <FormSheet
      open={open}
      onClose={onClose}
      title={words.title}
      description={
        current ? words.description(handle(current)) : words.descriptionNoName
      }
      onSubmit={() => void save()}
      pending={pending}
      disabled={!ready}
      error={failure ? messageFor(failure.error, t) : null}
    >
      <UsernameField value={value} onChange={setValue} check={check} />
    </FormSheet>
  );
}

function DeleteSheet({
  open,
  username,
  onClose,
}: {
  open: boolean;
  username: string;
  onClose: () => void;
}) {
  const t = useT();
  const words = t.profile.deleteAccount;
  const [typed, setTyped] = useState('');
  const [pending, setPending] = useState(false);
  /**
   * What went wrong, kept as it came — the name typed wrong, or the API's
   * answer — and put in words in the language of the moment.
   */
  const [failure, setFailure] = useState<'mismatch' | { error: unknown } | null>(null);
  // The label shows the name as `@ekin`: typed with or without its `@`, it confirms.
  const confirmed = typed.trim().toLowerCase().replace(/^@/, '') === username;

  const remove = async () => {
    if (!confirmed) {
      setFailure('mismatch');
      return;
    }
    setPending(true);
    setFailure(null);
    try {
      await api.me.delete();
      onClose();
      await useSession.getState().signOut();
    } catch (caught) {
      setFailure({ error: caught });
      setPending(false);
    }
  };

  const error =
    failure === 'mismatch' ? words.mismatch : failure ? messageFor(failure.error, t) : null;

  return (
    <FormSheet
      open={open}
      onClose={onClose}
      title={words.title}
      description={words.description}
      submitLabel={words.submit}
      submitIcon="trash"
      submitTone="danger"
      onSubmit={() => void remove()}
      pending={pending}
      disabled={!confirmed}
      error={error}
    >
      <Field
        label={words.confirm(handle(username))}
        value={typed}
        onChangeText={setTyped}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={username}
      />
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    gap: SPACE.md,
    paddingBottom: SPACE.xxl,
    paddingHorizontal: SPACE.lg,
  },
  hero: { gap: 0, padding: 0 },
  banner: {
    alignItems: 'center',
    borderBottomWidth: DEPTH.outline,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: PORTRAIT_RISE - SPACE.md,
    paddingHorizontal: SPACE.md,
    paddingTop: SPACE.md,
  },
  name: { alignSelf: 'stretch', textAlign: 'center' },
  stretch: { alignSelf: 'stretch' },
  heroBody: {
    alignItems: 'center',
    gap: SPACE.sm,
    marginTop: -PORTRAIT_RISE,
    paddingBottom: SPACE.lg,
    paddingHorizontal: SPACE.lg,
  },
  badges: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.sm,
    justifyContent: 'center',
  },
  nudge: {
    alignItems: 'center',
    borderBottomWidth: DEPTH.outline + DEPTH.lipSm,
    borderRadius: RADIUS.panel,
    borderWidth: DEPTH.outline,
    flexDirection: 'row',
    gap: SPACE.md,
    overflow: 'hidden',
    padding: SPACE.lg,
  },
  nudgeEdge: { height: 3, left: 0, position: 'absolute', right: 0, top: 0 },
  sunk: { transform: [{ translateY: 3 }] },
  section: { gap: SPACE.ms },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  post: { alignItems: 'center', flexDirection: 'row', gap: SPACE.md },
  thumb: {
    alignItems: 'center',
    borderBottomWidth: DEPTH.outline + 3,
    borderRadius: 12,
    borderWidth: DEPTH.outline,
    height: 64,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 48,
  },
  thumbShine: {
    height: '40%',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  emoji: { fontSize: 28, lineHeight: 34 },
});
