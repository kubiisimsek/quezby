import type { LeagueTier, Me, PlayerStats, Ranks } from '@quezby/types';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { BlockedSheet } from '@/components/BlockedSheet';
import { Portrait } from '@/components/PlayerCard';
import { CredentialsSheet } from '@/components/CredentialsSheet';
import { LanguageSheet } from '@/components/LanguageSheet';
import { NotificationsSheet } from '@/components/NotificationsSheet';
import { SignInWaysSheet } from '@/components/SignInWaysSheet';
import { useRemoveAvatar } from '@/hooks/useAvatar';
import { useRating, useStats } from '@/hooks/useBoards';
import { forgetPush } from '@/hooks/usePush';
import { useInboxSummary } from '@/hooks/useSocial';
import { handle, useT } from '@/i18n';
import { SHRINK_TO_FIT } from '@/i18n/native';
import { messageFor } from '@/lib/errors';
import { pickPhoto } from '@/lib/photoPicker';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import {
  SettingsSheet,
  keepHint,
  type SettingsDoor,
} from '@/screens/profile/SettingsSheet';
import { StatsSheet, headlines } from '@/screens/profile/StatsSheet';
import {
  ArrowNub,
  BrandBand,
  Button,
  Callout,
  Counters,
  IconButton,
  IconChip,
  LobbyCard,
  Panel,
  RankChips,
  Ribbon,
  Screen,
  Skeleton,
  Stamp,
  Tag,
  TierBadge,
  Txt,
} from '@/ui/kit';
import { ActionSheet } from '@/ui/sheet';
import { DEPTH, RADIUS, SPACE, TYPE, embossed, useTheme } from '@/ui/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

type SheetName =
  | 'settings'
  | 'language'
  | 'ways'
  | 'credentials'
  | 'notifications'
  | 'blocked'
  | 'photo'
  | 'stats'
  | null;

/** What waits for the open sheet to leave the screen: another sheet, or a door out. */
type Next = Exclude<SheetName, 'settings' | null> | SettingsDoor;

/** How far the portrait reaches up into the card's banner. */
const PORTRAIT_RISE = 46;

/**
 * The player's card, kept short: who you are — your photo, changed from the
 * camera slab on it — and three numbers under your name, as a profile shows
 * them: your season best, your friends (the door to the list, with the
 * requests waiting), your runs; your places; then one tile with the
 * statistics that matter most (the rest in a sheet) and the door to every
 * game you played. What is opened now and then — the language, Titreşim,
 * Yardım, notifications, blocked players, Hesap bilgileri — waits in
 * Ayarlar behind the gear; a guest's nudge to keep the account stays out
 * front.
 */
export function ProfileScreen({ navigation }: Props) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const user = useSession((state) => state.user);
  const ranks = useSession((state) => state.ranks);
  const rating = useRating();
  const inbox = useInboxSummary();
  const stats = useStats();
  const removePhoto = useRemoveAvatar();
  const [sheet, setSheet] = useState<SheetName>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
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
    } else if (then === 'account') {
      navigation.navigate('Account');
    } else if (then === 'signOut') {
      // Both calls leave with the session's token, before it is gone.
      forgetPush();
      void api.auth.logout().catch(() => undefined);
      void useSession.getState().signOut();
    } else if (then) {
      setSheet(then);
    }
  };

  /** A photo from the library, framed next. */
  const pick = async () => {
    setPhotoFailed(false);
    try {
      const photo = await pickPhoto();
      if (photo) navigation.navigate('AvatarEditor', photo);
    } catch {
      setPhotoFailed(true);
    }
  };

  const counts = stats.data?.stats;
  const friends = inbox.data?.friends;
  const requests = inbox.data?.requests ?? 0;
  const words = t.profile.counters;

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
          tier={rating.data?.tier ?? null}
          elo={rating.data?.rating ?? null}
          onSettings={() => setSheet('settings')}
          onPhoto={() => setSheet('photo')}
          counters={
            <Counters
              items={[
                {
                  label: words.record,
                  value: user.best ? t.fmt.score(user.best.score) : '—',
                  gold: Boolean(user.best),
                },
                {
                  label: words.friends,
                  value: friends === undefined ? '—' : t.fmt.score(friends),
                  badge: requests,
                  // The friends' side of Mesajlar: the search, the requests, the list.
                  onPress: () => navigation.navigate('Inbox', { segment: 'friends' }),
                  accessibilityLabel:
                    requests > 0
                      ? t.kit.iconButton.badge(t.friends.sheet.friends(friends ?? 0), requests)
                      : t.friends.sheet.friends(friends ?? 0),
                },
                {
                  label: words.runs,
                  value: counts ? t.fmt.score(counts.runs) : '—',
                },
              ]}
            />
          }
        />

        {photoFailed || removePhoto.isError ? (
          <Callout tone="bad">
            {removePhoto.isError ? messageFor(removePhoto.error, t) : t.profile.photo.failed}
          </Callout>
        ) : null}

        {user.isGuest ? <KeepNudge onPress={() => setSheet('ways')} /> : null}

        <LobbyCard
          title={t.profile.stats.open}
          eyebrow={t.profile.stats.ribbon}
          icon="grid"
          tone="primary"
          onPress={() => setSheet('stats')}
        >
          {counts ? (
            <StatHeadlines stats={counts} />
          ) : stats.isError ? (
            <>
              <Txt variant="meta" tone="muted">
                {messageFor(stats.error, t)}
              </Txt>
              <Button
                label={t.profile.stats.retry}
                tone="neutral"
                size="sm"
                icon="refresh"
                onPress={() => void stats.refetch()}
              />
            </>
          ) : (
            <Skeleton height={52} />
          )}
        </LobbyCard>

        <LobbyCard
          title={t.history.door.title}
          eyebrow={t.history.door.eyebrow}
          icon="history"
          tone="secondary"
          onPress={() => navigation.navigate('History')}
        />
      </ScrollView>

      <SettingsSheet
        open={sheet === 'settings'}
        onClose={() => setSheet(null)}
        onClosed={settle}
        onPick={leaveFor}
      />
      <StatsSheet open={sheet === 'stats'} onClose={() => setSheet(null)} />
      <LanguageSheet open={sheet === 'language'} onClose={() => setSheet(null)} />
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
      <NotificationsSheet open={sheet === 'notifications'} onClose={() => setSheet(null)} />
      <BlockedSheet open={sheet === 'blocked'} onClose={() => setSheet(null)} />
      <ActionSheet
        open={sheet === 'photo'}
        onClose={() => setSheet(null)}
        title={t.profile.photo.title}
        actions={[
          {
            label: t.profile.photo.pick,
            hint: t.profile.photo.pickHint,
            icon: 'image',
            onPress: () => void pick(),
          },
          ...(user.avatarUrl
            ? [
                {
                  label: t.profile.photo.remove,
                  hint: t.profile.photo.removeHint,
                  icon: 'trash' as const,
                  tone: 'bad' as const,
                  onPress: () => removePhoto.mutate(),
                },
              ]
            : []),
        ]}
      />
    </Screen>
  );
}

/**
 * Your card: a banner in the brand's stage with the gear on it, your
 * portrait rising out of it, your name, league and Elo, your three numbers
 * and your place on each board — all of it the API's.
 */
function PlayerHero({
  user,
  ranks,
  tier,
  elo,
  counters,
  onSettings,
  onPhoto,
}: {
  user: Me;
  ranks: Ranks | null;
  tier: LeagueTier | null;
  elo: number | null;
  counters: ReactNode;
  onSettings: () => void;
  /** The camera slab on the portrait: pick a photo, or take it away. */
  onPhoto: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const words = t.profile.hero;
  const periods = t.board.summit.periods;

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
          <Portrait
            name={user.username ?? '?'}
            src={user.avatarUrl}
            isMe
            onEdit={onPhoto}
            editLabel={user.avatarUrl ? t.profile.photo.change : t.profile.photo.add}
          />
        </Stamp>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit={SHRINK_TO_FIT}
          minimumFontScale={0.6}
          style={[TYPE.display, styles.name, { color: theme.ink }, embossed(2)]}
        >
          {handle(user.username ?? '')}
        </Text>
        {tier || user.isGuest ? (
          <View style={styles.badges}>
            {tier ? <TierBadge tier={tier} size="md" showLabel /> : null}
            {elo !== null ? (
              <Tag label={t.rating.elo(t.fmt.score(elo))} tone="warn" icon="trophy" />
            ) : null}
            {user.isGuest ? <Tag label={words.guest} tone="warn" icon="alert" /> : null}
          </View>
        ) : null}
        <View style={styles.stretch}>{counters}</View>
        <View style={styles.stretch}>
          <RankChips
            items={[
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

/** The four numbers the statistics tile shows, two by two; the sheet has the rest. */
function StatHeadlines({ stats }: { stats: PlayerStats }) {
  const t = useT();
  const best = headlines(stats, t);
  const counted = t.friends.sheet.stats;
  return (
    <View style={styles.headlines}>
      <Counters
        items={[
          { label: counted.posts, value: best.posts },
          { label: counted.perfects, value: best.perfects },
        ]}
      />
      <Counters
        items={[
          { label: t.profile.stats.bestReaction, value: best.reaction },
          { label: t.result.stats.maxCombo, value: best.combo },
        ]}
      />
    </View>
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
  headlines: { gap: SPACE.sm },
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
});
