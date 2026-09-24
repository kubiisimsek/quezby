import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { screen } from '@testing-library/react-native';
import { trigger } from 'react-native-haptic-feedback';
import * as Keychain from 'react-native-keychain';
import { NativeModules } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP_ENV, APP_VERSION } from '@/config/env';
import { feel } from '@/lib/haptics';
import { buildEntries, buildMe, buildRanks } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';
import { Txt } from '@/ui/kit';

describe('native modules under test', () => {
  it('keeps keychain entries in memory, one per service', async () => {
    await Keychain.setGenericPassword('player', 'token-1', {
      service: 'quezby.auth',
    });

    await expect(
      Keychain.getGenericPassword({ service: 'quezby.auth' }),
    ).resolves.toMatchObject({ username: 'player', password: 'token-1' });
    await expect(
      Keychain.getGenericPassword({ service: 'other' }),
    ).resolves.toBe(false);

    await Keychain.resetGenericPassword({ service: 'quezby.auth' });
    await expect(
      Keychain.getGenericPassword({ service: 'quezby.auth' }),
    ).resolves.toBe(false);
  });

  it('stores AsyncStorage values in memory', async () => {
    await AsyncStorage.setItem('quezby.settings.v1', '{"haptics":false}');

    await expect(AsyncStorage.getItem('quezby.settings.v1')).resolves.toBe(
      '{"haptics":false}',
    );
  });

  it('runs as a local debug build', () => {
    expect(APP_ENV).toBe('local');
    expect(APP_VERSION).toBe('1.0.0');
  });

  it('answers as a phone that cannot vouch for itself unless a test says otherwise', async () => {
    const integrity = (NativeModules as {
      QuezbyIntegrity: { isAvailable: () => Promise<boolean>; isSupported: () => Promise<boolean> };
    }).QuezbyIntegrity;

    await expect(integrity.isAvailable()).resolves.toBe(false);
    await expect(integrity.isSupported()).resolves.toBe(false);
  });

  it('records haptics instead of buzzing', () => {
    feel('hit');

    expect(trigger).toHaveBeenCalledWith('impactLight', expect.any(Object));
  });
});

describe('renderWithProviders', () => {
  function Probe() {
    const client = useQueryClient();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    return (
      <Txt>
        {`${client.getDefaultOptions().queries?.retry} ${typeof navigation.navigate} ${insets.top}`}
      </Txt>
    );
  }

  it('gives a fresh cache that never retries, a navigator and safe-area insets', async () => {
    const { queryClient } = await renderWithProviders(<Probe />);

    expect(screen.getByText('false function 0')).toBeOnTheScreen();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});

describe('factories', () => {
  it('builds a valid player and lets a test override what matters', () => {
    expect(buildMe()).toMatchObject({
      username: 'ekin',
      isGuest: true,
      identities: [],
    });
    expect(buildMe({ username: null, best: null })).toMatchObject({
      username: null,
      best: null,
    });
    expect(buildRanks({ daily: null })).toEqual({
      daily: null,
      weekly: 120,
      monthly: 310,
      all: 1_204,
    });
  });

  it('builds a board the way the API ranks it', () => {
    const rows = buildEntries(5, { me: 3, top: 10_000, step: 500 });

    expect(rows.map((row) => row.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(rows.map((row) => row.score)).toEqual([
      10_000, 9_500, 9_000, 8_500, 8_000,
    ]);
    expect(rows.map((row) => row.gap)).toEqual([null, 501, 501, 501, 501]);
    expect(rows.filter((row) => row.isMe).map((row) => row.rank)).toEqual([3]);
    expect(new Set(rows.map((row) => row.username)).size).toBe(5);
  });

  it('starts further down the board when asked', () => {
    const rows = buildEntries(2, { from: 4 });

    expect(rows.map((row) => row.rank)).toEqual([4, 5]);
    expect(rows[0]?.gap).not.toBeNull();
  });
});
