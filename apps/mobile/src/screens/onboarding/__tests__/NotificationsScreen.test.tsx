import { getApps, type ReactNativeFirebase } from '@react-native-firebase/app';
import { hasPermission, requestPermission } from '@react-native-firebase/messaging';
import { act, fireEvent, screen } from '@testing-library/react-native';

import { useSession } from '@/auth/session';
import { NotificationsScreen } from '@/screens/onboarding/NotificationsScreen';
import { useOnboarding } from '@/stores/onboarding';
import { usePush } from '@/stores/push';
import { buildMe } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

async function settle() {
  await act(async () => {
    for (let tick = 0; tick < 10; tick += 1) await Promise.resolve();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getApps).mockReturnValue([{ name: '[DEFAULT]' } as ReactNativeFirebase.FirebaseApp]);
  usePush.setState({ hydrated: true, permission: null, androidBlocked: false });
  useSession.setState({ token: 'token', user: buildMe({ id: 'u1', isGuest: true }), ranks: null, hydrated: true });
  useOnboarding.setState({ userId: 'u1', step: 'notifications', remindedFor: null, hydrated: true });
});

describe('NotificationsScreen', () => {
  it('asks a new player whether the game may tell them, and asks the system on a yes', async () => {
    jest.mocked(hasPermission).mockResolvedValue(-1);
    jest.mocked(requestPermission).mockResolvedValue(1);
    await renderWithProviders(<NotificationsScreen />);
    await settle();

    expect(screen.getByText('Haberin olsun mu?')).toBeOnTheScreen();
    expect(screen.getByText('Bir arkadaşın sana VS attığında ve VS bittiğinde')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Bildirimleri aç' }));
    await settle();

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(usePush.getState().permission).toBe('granted');
    // A guest goes on to keeping the account.
    expect(useOnboarding.getState().step).toBe('protect');
  });

  it('moves on, whatever the system is told', async () => {
    jest.mocked(hasPermission).mockResolvedValue(-1);
    jest.mocked(requestPermission).mockResolvedValue(0);
    await renderWithProviders(<NotificationsScreen />);
    await settle();

    await fireEvent.press(screen.getByRole('button', { name: 'Bildirimleri aç' }));
    await settle();

    expect(usePush.getState().permission).toBe('denied');
    expect(useOnboarding.getState().step).toBe('protect');
  });

  it('leaves the question for later on "Şimdi değil"', async () => {
    jest.mocked(hasPermission).mockResolvedValue(-1);
    useSession.setState({ user: buildMe({ id: 'u1', isGuest: false, identities: ['apple'] }) });
    await renderWithProviders(<NotificationsScreen />);
    await settle();

    await fireEvent.press(screen.getByRole('button', { name: 'Şimdi değil' }));

    expect(requestPermission).not.toHaveBeenCalled();
    // A kept account has no step after this one.
    expect(useOnboarding.getState().step).toBeNull();
  });

  it('never shows to a phone whose notifications are on already, or to a build without push', async () => {
    jest.mocked(hasPermission).mockResolvedValue(1);
    await renderWithProviders(<NotificationsScreen />);
    await settle();
    expect(screen.queryByText('Haberin olsun mu?')).toBeNull();
    expect(useOnboarding.getState().step).toBe('protect');

    useOnboarding.setState({ step: 'notifications' });
    jest.mocked(getApps).mockReturnValue([]);
    await renderWithProviders(<NotificationsScreen />);
    await settle();
    expect(useOnboarding.getState().step).toBe('protect');
  });
});
