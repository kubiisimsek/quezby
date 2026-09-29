import { fireEvent, screen } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { iso } from '@/i18n';
import { useLanguage } from '@/i18n/language';
import { SettingsSheet } from '@/screens/profile/SettingsSheet';
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
    expect(screen.getByText('Misafir hesap')).toBeOnTheScreen();
    // A guest has no way back in: no way out either.
    expect(screen.queryByText('Çıkış yap')).not.toBeOnTheScreen();

    for (const [name, door] of [
      [/^Yardım/, 'help'],
      [/^Hesap bilgileri/, 'account'],
    ] as const) {
      await fireEvent.press(screen.getByRole('button', { name }));
      expect(onPick).toHaveBeenLastCalledWith(door);
    }
    expect(onPick).toHaveBeenCalledTimes(2);
  });

  it('keeps the name, the ways in and deleting on Hesap bilgileri, not here', async () => {
    await renderSheet();

    expect(screen.queryByText('Kullanıcı adın')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Adını seç/ })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Hesabını koru/ })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Giriş yolları/ })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Hesabı sil/ })).not.toBeOnTheScreen();
  });

  it('opens with the language, named in its own words, as the first setting of the game', async () => {
    const onPick = await renderSheet();

    await fireEvent.press(screen.getByRole('button', { name: /^Dil.*Türkçe/ }));
    expect(onPick).toHaveBeenLastCalledWith('language');
  });

  it('names the language in its own words whatever the game speaks', async () => {
    useLanguage.setState({ locale: 'de', account: buildMe().id });
    await renderSheet();

    expect(screen.getByText('Sprache')).toBeOnTheScreen();
    expect(screen.getByText('Deutsch')).toBeOnTheScreen();
  });

  it('puts Hesap bilgileri right above Çıkış yap, the last door, for a kept account', async () => {
    useSession.setState({
      user: buildMe({ isGuest: false, identities: ['google'] }),
    });
    const onPick = await renderSheet();

    expect(screen.getByText('@ekin · Google bağlı')).toBeOnTheScreen();
    expect(screen.getByText('Tekrar Google ile girebilirsin.')).toBeOnTheScreen();
    const doors = screen
      .getAllByText(/^(Dil|Yardım|Bildirimler|Engellenenler|Hesap bilgileri|Çıkış yap)$/)
      .map((node) => node.props.children as string);
    expect(doors.slice(-2)).toEqual(['Hesap bilgileri', 'Çıkış yap']);

    await fireEvent.press(screen.getByRole('button', { name: /^Hesap bilgileri/ }));
    expect(onPick).toHaveBeenLastCalledWith('account');
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

  it('turns Kullanım verisi on and off on the phone, for the account to take it next', async () => {
    useSettings.setState({ analytics: false, consent: 'synced', hydrated: true });
    await renderSheet();

    expect(screen.getByText('Yalnızca oyunun çalışması için gereken cihaz bilgisi gider.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('switch', { name: 'Kullanım verisi' }));

    expect(useSettings.getState()).toMatchObject({ analytics: true, consent: 'pending' });
    expect(screen.getByRole('switch', { name: 'Kullanım verisi' })).toBeChecked();
    expect(screen.getByText('Hangi ekranlara girdiğini ve ne kadar oynadığını sayarız.')).toBeOnTheScreen();
    // `useConsentSync` takes it to the account, not the sheet.
    expect(mocked.me.updateSettings).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('switch', { name: 'Kullanım verisi' }));
    expect(useSettings.getState()).toMatchObject({ analytics: false, consent: 'pending' });
  });

  it('keeps the phone’s choice when the API cannot be reached', async () => {
    mocked.me.updateSettings.mockRejectedValue(new Error('offline'));
    await renderSheet();

    await fireEvent.press(screen.getByRole('switch', { name: 'Titreşim' }));

    expect(useSettings.getState().haptics).toBe(false);
    expect(screen.getByText('Oyun sessizce oynanır.')).toBeOnTheScreen();
  });

  describe('in other languages', () => {
    /** Plays in `locale` on an account this phone has seen, so the account's own language does not take over. */
    const speak = (locale: 'en' | 'ar') => {
      useLanguage.setState({ locale, account: buildMe().id });
    };

    it('speaks English', async () => {
      speak('en');
      const onPick = await renderSheet();

      expect(screen.getByText('Settings')).toBeOnTheScreen();
      expect(screen.getByText('Game')).toBeOnTheScreen();
      expect(screen.getByRole('switch', { name: 'Vibration' })).toBeChecked();
      expect(screen.getByText('Vibrates on every swipe and every mistake.')).toBeOnTheScreen();
      expect(screen.getByRole('switch', { name: 'Usage data' })).not.toBeChecked();
      expect(
        screen.getByText('Only the device info the game needs to run is sent.'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Guest account')).toBeOnTheScreen();
      expect(screen.getByText(/^Quezby .+ · Local$/)).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: /^Help/ }));
      expect(onPick).toHaveBeenLastCalledWith('help');
      await fireEvent.press(screen.getByRole('button', { name: /^Account info/ }));
      expect(onPick).toHaveBeenLastCalledWith('account');
    });

    it('names a kept account’s ways in and the way out in English', async () => {
      speak('en');
      useSession.setState({
        user: buildMe({ isGuest: false, identities: ['google'] }),
      });
      await renderSheet();

      expect(screen.getByText('@ekin · Google linked')).toBeOnTheScreen();
      expect(screen.getByText('You can sign back in with Google.')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: /^Account info/ })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: /^Sign out/ })).toBeOnTheScreen();
    });

    it('speaks Arabic, a name kept whole inside its line', async () => {
      speak('ar');
      useSession.setState({ user: buildMe({ isGuest: false, identities: ['apple'] }) });
      const onPick = await renderSheet();

      expect(screen.getByText('الإعدادات')).toBeOnTheScreen();
      expect(screen.getByRole('switch', { name: 'الاهتزاز' })).toBeChecked();
      expect(screen.getByRole('switch', { name: 'بيانات الاستخدام' })).toBeOnTheScreen();
      expect(screen.getByText(`${iso('@ekin')} · مرتبط بـ Apple`)).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: /^معلومات الحساب/ }));
      expect(onPick).toHaveBeenCalledWith('account');
    });
  });
});
