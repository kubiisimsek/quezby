import { getApps, type ReactNativeFirebase } from '@react-native-firebase/app';
import { hasPermission, requestPermission } from '@react-native-firebase/messaging';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { NotificationsSheet } from '@/components/NotificationsSheet';
import { usePush } from '@/stores/push';
import { buildMe } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({ api: { me: { updateSettings: jest.fn() } } }));

const mocked = api as unknown as { me: { updateSettings: jest.Mock } };

async function settle() {
  await act(async () => {
    for (let tick = 0; tick < 10; tick += 1) await Promise.resolve();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getApps).mockReturnValue([{ name: '[DEFAULT]' } as ReactNativeFirebase.FirebaseApp]);
  jest.mocked(hasPermission).mockResolvedValue(1);
  usePush.setState({ hydrated: true, permission: null, androidBlocked: false });
  useSession.setState({ token: 'token', user: buildMe(), ranks: null, hydrated: true });
});

describe('NotificationsSheet', () => {
  it('turns one kind of news off on the account at once, and keeps the API’s answer', async () => {
    const settings = { ...buildMe().settings, pushVs: false };
    mocked.me.updateSettings.mockResolvedValue({ settings });
    await renderWithProviders(<NotificationsSheet open onClose={jest.fn()} />);
    await settle();

    await fireEvent.press(screen.getByRole('switch', { name: 'VS' }));

    expect(useSession.getState().user?.settings.pushVs).toBe(false);
    expect(mocked.me.updateSettings).toHaveBeenCalledWith({ pushVs: false });
    await waitFor(() => expect(useSession.getState().user?.settings).toEqual(settings));
  });

  it('puts a setting back when the account could not take it', async () => {
    mocked.me.updateSettings.mockRejectedValue(new Error('offline'));
    await renderWithProviders(<NotificationsSheet open onClose={jest.fn()} />);
    await settle();

    await fireEvent.press(screen.getByRole('switch', { name: 'Hazır mesajlar' }));

    expect(await screen.findByText('Ayar kaydedilemedi')).toBeOnTheScreen();
    expect(useSession.getState().user?.settings.pushMessages).toBe(true);
  });

  it('asks the system on a phone that was never asked', async () => {
    jest.mocked(hasPermission).mockResolvedValue(-1);
    jest.mocked(requestPermission).mockResolvedValue(1);
    await renderWithProviders(<NotificationsSheet open onClose={jest.fn()} />);
    await settle();

    await fireEvent.press(screen.getByRole('button', { name: 'Bildirimlere izin ver' }));
    await settle();

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(usePush.getState().permission).toBe('granted');
  });

  it('sends a phone that turned them down to its settings', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    jest.mocked(hasPermission).mockResolvedValue(0);
    await renderWithProviders(<NotificationsSheet open onClose={jest.fn()} />);
    await settle();

    expect(screen.getByText('Bildirimler telefonunun ayarlarında kapalı.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Ayarları aç' }));

    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it('says a build without push has none yet', async () => {
    jest.mocked(getApps).mockReturnValue([]);
    await renderWithProviders(<NotificationsSheet open onClose={jest.fn()} />);
    await settle();

    expect(screen.getByText('Bu sürümde bildirimler henüz açık değil.')).toBeOnTheScreen();
  });
});
