import { getApps, type ReactNativeFirebase } from '@react-native-firebase/app';
import { requestPermission } from '@react-native-firebase/messaging';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { PushNudge } from '@/components/PushNudge';
import { useLanguage } from '@/i18n/language';
import { usePush } from '@/stores/push';
import { renderWithProviders } from '@/test/renderWithProviders';

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getApps).mockReturnValue([{ name: '[DEFAULT]' } as ReactNativeFirebase.FirebaseApp]);
  usePush.setState({ hydrated: true, permission: 'undetermined', nudgeHiddenUntil: 0, androidBlocked: false });
});

describe('PushNudge', () => {
  it('asks the system while the question can still come', async () => {
    jest.mocked(requestPermission).mockResolvedValueOnce(1);
    await renderWithProviders(<PushNudge />);

    expect(screen.getByText('Bildirimler kapalı')).toBeOnTheScreen();
    expect(screen.getByText('Sana VS atılınca ya da isteğin kabul edilince haberin olmaz.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Bildirimleri aç' }));

    expect(requestPermission).toHaveBeenCalledTimes(1);
    // A yes puts the card away by itself.
    expect(screen.queryByText('Bildirimler kapalı')).toBeNull();
  });

  it('sends a player who turned them down to the phone’s settings', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    usePush.setState({ permission: 'denied' });
    await renderWithProviders(<PushNudge />);

    expect(screen.getByText('Telefonunun ayarlarından aç; VS’ler ve istekler sana ulaşsın.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Ayarları aç' }));

    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('speaks for where it is shown', async () => {
    await renderWithProviders(<PushNudge line="@ekin oynayınca haberin olsun diye bildirimleri aç." />);

    expect(screen.getByText('@ekin oynayınca haberin olsun diye bildirimleri aç.')).toBeOnTheScreen();
  });

  it('shows nothing while notifications are on, before the phone was looked at, or in a build without push', async () => {
    for (const permission of ['granted', 'unavailable', null] as const) {
      usePush.setState({ permission });
      const view = await renderWithProviders(<PushNudge />);
      expect(screen.queryByText('Bildirimler kapalı')).toBeNull();
      await view.unmount();
    }
  });

  it('puts itself away for a week where it may', async () => {
    await renderWithProviders(<PushNudge hideable />);

    await fireEvent.press(screen.getByRole('button', { name: 'Gizle' }));

    expect(screen.queryByText('Bildirimler kapalı')).toBeNull();
    expect(usePush.getState().nudgeHiddenUntil).toBeGreaterThan(Date.now());
  });

  it('comes back for the same player where it may not be put away', async () => {
    usePush.setState({ nudgeHiddenUntil: Date.now() + 60_000 });
    await renderWithProviders(<PushNudge />);

    expect(screen.getByText('Bildirimler kapalı')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Gizle' })).toBeNull();
  });

  it('speaks English', async () => {
    await act(async () => useLanguage.setState({ locale: 'en' }));
    usePush.setState({ permission: 'denied' });
    await renderWithProviders(<PushNudge />);

    expect(screen.getByText('Notifications are off')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Open settings' })).toBeOnTheScreen();
    await act(async () => useLanguage.setState({ locale: 'tr' }));
  });
});
