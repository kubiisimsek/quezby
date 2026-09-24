import { fireEvent, screen } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { SettingsSheet, keepHint } from '@/screens/profile/SettingsSheet';
import { useSettings } from '@/stores/settings';
import { buildMe } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/config/env', () => ({
  ...jest.requireActual('@/config/env'),
  GOOGLE_CLIENTS: null,
}));

jest.mock('@/api/client', () => ({
  api: { me: { updateSettings: jest.fn() } },
}));

const mocked = api as unknown as { me: { updateSettings: jest.Mock } };

async function renderSheet() {
  const onPick = jest.fn();
  await renderWithProviders(
    <SettingsSheet open onClose={jest.fn()} onPick={onPick} />,
  );
  return onPick;
}

describe('SettingsSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ token: 'token', user: buildMe(), hydrated: true });
    useSettings.setState({ haptics: true });
    mocked.me.updateSettings.mockResolvedValue({ user: buildMe() });
  });

  it('names the door a guest picks and leaves opening it to the profile', async () => {
    const onPick = await renderSheet();

    expect(screen.getByText('Ayarlar')).toBeOnTheScreen();
    expect(screen.getByText('Şu an @ekin')).toBeOnTheScreen();
    expect(screen.getByText(keepHint())).toBeOnTheScreen();
    expect(screen.queryByText('Çıkış yap')).not.toBeOnTheScreen();

    for (const [name, door] of [
      [/^Yardım/, 'help'],
      [/^Kullanıcı adını değiştir/, 'username'],
      [/^Hesabını koru/, 'ways'],
      [/^Hesabı sil/, 'delete'],
    ] as const) {
      await fireEvent.press(screen.getByRole('button', { name }));
      expect(onPick).toHaveBeenLastCalledWith(door);
    }
    expect(onPick).toHaveBeenCalledTimes(4);
  });

  it('offers a kept account its ways in and the way out', async () => {
    useSession.setState({
      user: buildMe({ isGuest: false, identities: ['google'] }),
    });
    const onPick = await renderSheet();

    expect(screen.getByText('Google bağlı')).toBeOnTheScreen();
    expect(
      screen.getByText('Tekrar Google ile girebilirsin.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Hesabını koru')).not.toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: /^Giriş yolları/ }),
    );
    expect(onPick).toHaveBeenLastCalledWith('ways');
    await fireEvent.press(screen.getByRole('button', { name: /^Çıkış yap/ }));
    expect(onPick).toHaveBeenLastCalledWith('signOut');
  });

  it('says which build this is', async () => {
    await renderSheet();

    expect(screen.getByText(/^Quezby .+ · Local$/)).toBeOnTheScreen();
  });

  it('turns Titreşim off on the phone at once, then on the account', async () => {
    await renderSheet();

    const toggle = screen.getByRole('switch', { name: 'Titreşim' });
    expect(toggle).toBeChecked();
    await fireEvent.press(toggle);

    expect(useSettings.getState().haptics).toBe(false);
    expect(useSession.getState().user?.settings.haptics).toBe(false);
    expect(mocked.me.updateSettings).toHaveBeenCalledWith({ haptics: false });
    expect(screen.getByRole('switch', { name: 'Titreşim' })).not.toBeChecked();
    expect(screen.getByText('Oyun sessizce oynanır.')).toBeOnTheScreen();
  });

  it('keeps the phone’s choice when the API cannot be reached', async () => {
    mocked.me.updateSettings.mockRejectedValue(new Error('offline'));
    await renderSheet();

    await fireEvent.press(screen.getByRole('switch', { name: 'Titreşim' }));

    expect(useSettings.getState().haptics).toBe(false);
    expect(screen.getByText('Oyun sessizce oynanır.')).toBeOnTheScreen();
  });
});
