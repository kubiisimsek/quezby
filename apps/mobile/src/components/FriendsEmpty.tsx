import { StyleSheet, View } from 'react-native';

import { useFriendThreads } from '@/hooks/useSocial';
import { useT } from '@/i18n';
import { Icon } from '@/ui/icons';
import { Button, IconChip, Panel, SkeletonList, Txt } from '@/ui/kit';
import { RADIUS, SPACE, useTheme, withAlpha } from '@/ui/theme';

/**
 * A friends board with nobody on it but you. Two different nothings: you
 * have no friends yet — the fix is to find players — or your friends have
 * not played in this period — the fix is to set the bar yourself. Either
 * way a tile with the empty seats of a friends' match, waiting to be filled.
 */
export function FriendsEmpty({
  onSearch,
  onPlay,
}: {
  onSearch: () => void;
  /** Left out where playing now is not an option — today's one attempt is used. */
  onPlay?: () => void;
}) {
  const t = useT();
  const words = t.friends.empty;
  const friends = useFriendThreads();

  if (friends.isLoading) {
    return (
      <View style={styles.pad}>
        <SkeletonList rows={2} />
      </View>
    );
  }

  const hasFriends = (friends.data?.pages[0]?.friends.length ?? 0) > 0;

  return (
    <View style={styles.pad}>
      <Panel style={styles.tile}>
        <View style={styles.seats}>
          <EmptySeat />
          <IconChip
            icon={hasFriends ? 'users' : 'userPlus'}
            tone={hasFriends ? 'secondary' : 'primary'}
            size="lg"
          />
          <EmptySeat />
        </View>
        {hasFriends ? (
          <>
            <Txt variant="title" align="center">
              {words.waiting}
            </Txt>
            <Txt variant="meta" tone="muted" align="center">
              {words.waitingHint}
            </Txt>
            {onPlay ? (
              <Button
                label={words.play}
                icon="play"
                tone="play"
                onPress={onPlay}
                style={styles.action}
              />
            ) : null}
          </>
        ) : (
          <>
            <Txt variant="title" align="center">
              {words.none}
            </Txt>
            <Txt variant="meta" tone="muted" align="center">
              {words.noneHint}
            </Txt>
            <Button
              label={words.find}
              icon="search"
              onPress={onSearch}
              style={styles.action}
            />
          </>
        )}
      </Panel>
    </View>
  );
}

/** A friend's seat nobody sits in yet. */
function EmptySeat() {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.seat,
        {
          backgroundColor: theme.well,
          borderColor: withAlpha(theme.onBrand, 0.22),
        },
      ]}
    >
      <Icon
        name="account"
        size={20}
        color={withAlpha(theme.onBrand, 0.35)}
        strokeWidth={2.2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: SPACE.xl },
  tile: {
    alignItems: 'center',
    gap: SPACE.sm,
    paddingBottom: SPACE.xl,
    paddingTop: SPACE.xl,
  },
  seats: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACE.md,
    marginBottom: SPACE.sm,
  },
  seat: {
    alignItems: 'center',
    borderRadius: RADIUS.control - 2,
    borderStyle: 'dashed',
    borderWidth: 2,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  action: { alignSelf: 'stretch', marginTop: SPACE.sm },
});
