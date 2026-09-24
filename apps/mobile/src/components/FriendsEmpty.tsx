import { StyleSheet, View } from 'react-native';

import { useFollowing } from '@/hooks/useBoards';
import { Icon } from '@/ui/icons';
import { Button, IconChip, Panel, SkeletonList, Txt } from '@/ui/kit';
import { RADIUS, SPACE, useTheme, withAlpha } from '@/ui/theme';

/**
 * A friends board with nobody on it but you. Two different nothings: you
 * follow nobody yet — the fix is to find players — or the players you follow
 * have not played in this period — the fix is to set the bar yourself. Either
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
  const following = useFollowing();

  if (following.isLoading) {
    return (
      <View style={styles.pad}>
        <SkeletonList rows={2} />
      </View>
    );
  }

  const followsSomeone = (following.data?.users.length ?? 0) > 0;

  return (
    <View style={styles.pad}>
      <Panel style={styles.tile}>
        <View style={styles.seats}>
          <EmptySeat />
          <IconChip
            icon={followsSomeone ? 'users' : 'userPlus'}
            tone={followsSomeone ? 'secondary' : 'primary'}
            size="lg"
          />
          <EmptySeat />
        </View>
        {followsSomeone ? (
          <>
            <Txt variant="title" align="center">
              Takip ettiklerin henüz oynamadı
            </Txt>
            <Txt variant="meta" tone="muted" align="center">
              Onlar oynadıkça burada seninle yarışacaklar.
            </Txt>
            {onPlay ? (
              <Button
                label="Oyna"
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
              Henüz kimseyi takip etmiyorsun
            </Txt>
            <Txt variant="meta" tone="muted" align="center">
              Takip ettiğin oyuncular burada seninle yarışır.
            </Txt>
            <Button
              label="Oyuncu ara"
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
