import type { PlayerStats, StatsResponse } from '@quezby/types';
import { getApps, type ReactNativeFirebase } from '@react-native-firebase/app';
import { deleteToken } from '@react-native-firebase/messaging';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { launchImageLibrary } from 'react-native-image-picker';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { useLanguage } from '@/i18n/language';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { usePush } from '@/stores/push';
import { buildInbox, buildMe, buildPlacing, buildRanks, buildRating } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/config/env', () => ({
  ...jest.requireActual('@/config/env'),
  GOOGLE_CLIENTS: null,
}));

jest.mock('@/api/client', () => ({
  api: {
    me: {
      stats: jest.fn(),
      inbox: jest.fn(),
      updateSettings: jest.fn(),
      removeAvatar: jest.fn(),
      unregisterPushToken: jest.fn(),
      blocks: jest.fn(),
    },
    auth: { logout: jest.fn() },
    rating: { current: jest.fn() },
  },
}));

const mocked = api as unknown as {
  me: {
    stats: jest.Mock;
    inbox: jest.Mock;
    updateSettings: jest.Mock;
    removeAvatar: jest.Mock;
    unregisterPushToken: jest.Mock;
    blocks: jest.Mock;
  };
  auth: { logout: jest.Mock };
  rating: { current: jest.Mock };
};

type Props = Parameters<typeof ProfileScreen>[0];

const navigate = jest.fn();
const props = {
  navigation: { navigate },
  route: { key: 'Profile', name: 'Profile' },
} as unknown as Props;

function stats(
  overrides: Partial<PlayerStats> = {},
  topLiked: StatsResponse['topLiked'] = [],
): StatsResponse {
  return {
    stats: {
      runs: 42,
      reels: 5_210,
      swipes: 3_904,
      likes: 610,
      holds: 402,
      perfects: 95,
      freezes: 288,
      caught: 17,
      misses: 140,
      activeMs: (2 * 60 + 14) * 60_000 + 25_000,
      bestReactionMs: 312,
      maxCombo: 1_450,
      bonuses: { flawless: 3, lightning: 12, coolHead: 0, comeback: 1 },
      ...overrides,
    },
    topLiked,
  };
}

/** Renders the profile and waits for the API's numbers. */
async function renderProfile() {
  await renderWithProviders(<ProfileScreen {...props} />);
  await screen.findByText('5.210');
}

async function openSettings() {
  await fireEvent.press(screen.getByRole('button', { name: 'Ayarlar' }));
}

/**
 * iOS says a sheet has left the screen through its modal's `onDismiss`,
 * which the Modal mock never calls. This says it for every sheet still up —
 * what happens once a sheet is gone happens here.
 */
async function leave() {
  const modals = screen.container.queryAll((node) => node.type === 'Modal');
  await act(async () => {
    for (const modal of modals) {
      const dismissed = modal.props.onDismiss as (() => void) | undefined;
      dismissed?.();
    }
  });
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({
      token: 'token',
      user: buildMe(),
      ranks: buildRanks(),
      hydrated: true,
    });
    mocked.me.stats.mockResolvedValue(stats());
    mocked.me.inbox.mockResolvedValue(buildInbox({ friends: 12 }));
    mocked.me.updateSettings.mockResolvedValue({ user: buildMe() });
    mocked.auth.logout.mockResolvedValue(undefined);
    mocked.rating.current.mockResolvedValue(buildRating({ rating: 2_450, tier: 'gold' }));
    mocked.me.unregisterPushToken.mockResolvedValue(undefined);
    mocked.me.blocks.mockResolvedValue({ users: [] });
    usePush.setState({ token: null, permission: 'granted' });
  });

  describe('the photo and the history', () => {
    it('picks a photo from the library, and frames it next', async () => {
      jest.mocked(launchImageLibrary).mockResolvedValueOnce({
        assets: [{ uri: 'file:///photo.jpg', width: 1200, height: 900 }],
      });
      await renderProfile();

      await fireEvent.press(screen.getByRole('button', { name: 'Fotoğraf ekle' }));
      expect(screen.queryByText('Fotoğrafı kaldır')).not.toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Galeriden seç' }));
      await leave();

      await waitFor(() =>
        expect(navigate).toHaveBeenCalledWith('AvatarEditor', { uri: 'file:///photo.jpg', width: 1200, height: 900 }),
      );
    });

    it('takes the photo away', async () => {
      const photo = 'https://api.test/api/v1/media/avatars/0123456789abcdef01234567.jpg';
      useSession.setState({ user: buildMe({ avatarUrl: photo }) });
      mocked.me.removeAvatar.mockResolvedValue({ user: buildMe({ avatarUrl: null }) });
      await renderProfile();

      await fireEvent.press(screen.getByRole('button', { name: 'Fotoğrafını değiştir' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Fotoğrafı kaldır' }));
      await leave();

      await waitFor(() => expect(useSession.getState().user?.avatarUrl).toBeNull());
      expect(mocked.me.removeAvatar).toHaveBeenCalledTimes(1);
    });

    it('opens every game the player finished', async () => {
      await renderProfile();

      await fireEvent.press(screen.getByRole('button', { name: /Oynadığın her tur/ }));

      expect(navigate).toHaveBeenCalledWith('History');
    });
  });

  describe('the player card', () => {
    it('shows who you are, your league, your three numbers and your places', async () => {
      await renderProfile();

      expect(screen.getByText('@ekin')).toBeOnTheScreen();
      expect(await screen.findByLabelText('Altın lig')).toBeOnTheScreen();
      expect(screen.getByText('2.450 Elo')).toBeOnTheScreen();
      expect(screen.getByText('Misafir hesap')).toBeOnTheScreen();
      expect(screen.getByLabelText('12.345 Rekor')).toBeOnTheScreen();
      expect(await screen.findByLabelText('12 arkadaş')).toBeOnTheScreen();
      expect(screen.getByLabelText('42 Tur')).toBeOnTheScreen();
      for (const [board, rank] of [
        ['Hafta', '#120'],
        ['Ay', '#310'],
        ['Tüm zamanlar', '#1.204'],
      ]) {
        expect(screen.getByLabelText(`${board}: ${rank}`)).toBeOnTheScreen();
      }
    });

    it('opens the friends side of Mesajlar from the friend count, which wears the requests waiting', async () => {
      mocked.me.inbox.mockResolvedValue(buildInbox({ friends: 12, requests: 2 }));
      await renderProfile();

      await fireEvent.press(await screen.findByRole('button', { name: '12 arkadaş, 2 yeni' }));

      expect(navigate).toHaveBeenCalledWith('Inbox', { segment: 'friends' });
    });

    it('waits for numbers the API has not named', async () => {
      useSession.setState({ user: buildMe({ best: null }), ranks: null });
      mocked.rating.current.mockRejectedValue(new Error('offline'));
      mocked.me.inbox.mockReturnValue(new Promise(() => undefined));
      await renderProfile();

      expect(screen.getByLabelText('— Rekor')).toBeOnTheScreen();
      expect(screen.queryByLabelText(/ lig$/)).not.toBeOnTheScreen();
      expect(screen.getByLabelText('Hafta: sıralamada değilsin')).toBeOnTheScreen();
    });

    it('names no league and no Elo while the player is still placing', async () => {
      mocked.rating.current.mockResolvedValue(buildPlacing(2));
      await renderProfile();
      // The rating's answer has landed and been drawn.
      await waitFor(() => expect(mocked.rating.current).toHaveBeenCalled());
      await act(async () => {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 20);
        });
      });

      expect(screen.queryByLabelText(/ lig$/)).not.toBeOnTheScreen();
      expect(screen.queryByText(/Elo$/)).not.toBeOnTheScreen();
    });

    it('keeps how the account is kept for Hesap bilgileri', async () => {
      useSession.setState({ user: buildMe({ isGuest: false, identities: ['apple'], email: 'ekin@example.com' }) });
      await renderProfile();

      expect(screen.queryByText('Apple ile bağlı')).not.toBeOnTheScreen();
      expect(screen.queryByText('ekin@example.com')).not.toBeOnTheScreen();
      expect(screen.queryByText('Misafir hesap')).not.toBeOnTheScreen();
    });
  });

  describe('statistics', () => {
    it('shows four numbers on one tile, and the rest in its sheet', async () => {
      await renderProfile();

      for (const [label, value] of [
        ['Post', '5.210'],
        ['Mükemmel', '95'],
        ['En iyi tepki', '312 ms'],
        ['En yüksek kombo', 'x1,45'],
      ]) {
        expect(screen.getByLabelText(`${value} ${label}`)).toBeOnTheScreen();
      }
      expect(screen.getByText('İSTATİSTİKLER')).toBeOnTheScreen();
      expect(screen.queryByText('Kaydırma')).not.toBeOnTheScreen();
      expect(screen.queryByText('İsimli kombolar')).not.toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: /^İSTATİSTİKLER/ }));

      expect(screen.getByText('Kaydırma')).toBeOnTheScreen();
      expect(screen.getByText('İsimli kombolar')).toBeOnTheScreen();
      expect(mocked.me.stats).toHaveBeenCalledTimes(1);
    });

    it('offers another try when the numbers do not come', async () => {
      mocked.me.stats.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(stats());
      await renderWithProviders(<ProfileScreen {...props} />);

      await fireEvent.press(await screen.findByRole('button', { name: 'Tekrar dene' }));

      expect(await screen.findByText('5.210')).toBeOnTheScreen();
    });
  });

  describe('a guest', () => {
    it('is offered, out front, the ways this build has to keep the account', async () => {
      await renderProfile();

      expect(
        screen.getByText('Apple ya da e-posta bağla; telefon değişse de skorların kaybolmaz.'),
      ).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: /^Hesabını koru/ }));

      expect(screen.getByRole('button', { name: 'Apple ile devam et' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'E-postayla koru' })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Google ile devam et' })).not.toBeOnTheScreen();
    });

    it('opens the email form only once the ways have left the screen', async () => {
      await renderProfile();
      await fireEvent.press(screen.getByRole('button', { name: /^Hesabını koru/ }));

      await fireEvent.press(screen.getByRole('button', { name: 'E-postayla koru' }));
      expect(screen.queryByRole('button', { name: 'Hesabı koru' })).not.toBeOnTheScreen();

      await leave();
      expect(screen.getByRole('button', { name: 'Hesabı koru' })).toBeOnTheScreen();
    });
  });

  describe('Ayarlar', () => {
    it('holds the settings, Yardım and Hesap bilgileri', async () => {
      await renderProfile();
      expect(screen.queryByText('Titreşim')).not.toBeOnTheScreen();

      await openSettings();

      expect(screen.getByText('Titreşim')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: /^Yardım/ })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: /^Hesap bilgileri/ })).toBeOnTheScreen();
      expect(screen.queryByText('Çıkış yap')).not.toBeOnTheScreen();
      expect(screen.getByText(/^Quezby .+ · Local$/)).toBeOnTheScreen();
    });

    it('opens notifications and the players blocked, once the sheet has left the screen', async () => {
      await renderProfile();
      await openSettings();

      await fireEvent.press(screen.getByRole('button', { name: /^Bildirimler/ }));
      await leave();
      expect(await screen.findByText('Hangi haberler telefonuna gelsin?')).toBeOnTheScreen();
      await leave();

      await openSettings();
      await fireEvent.press(screen.getByRole('button', { name: /^Engellenenler/ }));
      await leave();
      expect(await screen.findByText('Kimseyi engellemedin.')).toBeOnTheScreen();
    });

    it('opens Yardım once the sheet has left the screen', async () => {
      await renderProfile();
      await openSettings();

      await fireEvent.press(screen.getByRole('button', { name: /^Yardım/ }));
      expect(navigate).not.toHaveBeenCalled();

      await leave();
      expect(navigate).toHaveBeenCalledWith('Help');
    });

    it('opens Hesap bilgileri once the sheet has left the screen', async () => {
      await renderProfile();
      await openSettings();

      await fireEvent.press(screen.getByRole('button', { name: /^Hesap bilgileri/ }));
      expect(navigate).not.toHaveBeenCalled();

      await leave();
      expect(navigate).toHaveBeenCalledWith('Account');
    });

    it('opens nothing when it is closed without a choice', async () => {
      await renderProfile();
      await openSettings();

      const [scrim] = screen.getAllByRole('button', { name: 'Kapat' });
      expect(scrim).toBeDefined();
      if (scrim) await fireEvent.press(scrim);
      await leave();

      expect(navigate).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: 'Apple ile devam et' })).not.toBeOnTheScreen();
    });
  });

  describe('a kept account', () => {
    it('signs out once the sheet has left the screen', async () => {
      useSession.setState({
        user: buildMe({ isGuest: false, identities: ['apple'] }),
      });
      await renderProfile();
      await openSettings();

      expect(screen.getByText('@ekin · Apple bağlı')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: /^Çıkış yap/ }));
      expect(mocked.auth.logout).not.toHaveBeenCalled();
      expect(useSession.getState().token).toBe('token');

      await leave();
      expect(mocked.auth.logout).toHaveBeenCalledTimes(1);
      expect(useSession.getState().token).toBeNull();
    });

    it('stops the account’s notifications on this phone as it signs out', async () => {
      jest.mocked(getApps).mockReturnValue([{ name: '[DEFAULT]' } as ReactNativeFirebase.FirebaseApp]);
      useSession.setState({ user: buildMe({ isGuest: false, identities: ['apple'] }) });
      usePush.setState({ token: 'fcm-token' });
      await renderProfile();
      await openSettings();

      await fireEvent.press(screen.getByRole('button', { name: /^Çıkış yap/ }));
      await leave();

      expect(mocked.me.unregisterPushToken).toHaveBeenCalledWith('fcm-token');
      await waitFor(() => expect(deleteToken).toHaveBeenCalled());
      jest.mocked(getApps).mockReturnValue([]);
    });
  });

  describe('in other languages', () => {
    /** Plays in `locale` on an account this phone has seen, so the account's own language does not take over. */
    const speak = (locale: 'en' | 'ar') => {
      useLanguage.setState({ locale, account: buildMe().id });
    };

    it('shows the card and the numbers in English, the English way', async () => {
      speak('en');
      await renderWithProviders(<ProfileScreen {...props} />);
      expect(await screen.findByText('5,210')).toBeOnTheScreen();

      expect(screen.getByText('PROFILE')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Settings' })).toBeOnTheScreen();
      expect(screen.getByText('@ekin')).toBeOnTheScreen();
      expect(screen.getByText('Guest account')).toBeOnTheScreen();
      expect(screen.getByLabelText('12,345 Record')).toBeOnTheScreen();
      expect(await screen.findByLabelText('12 friends')).toBeOnTheScreen();
      expect(screen.getByLabelText('42 Runs')).toBeOnTheScreen();
      expect(screen.getByText('STATS')).toBeOnTheScreen();
      for (const [label, value] of [
        ['Posts', '5,210'],
        ['Perfect', '95'],
        ['Best reaction', '312 ms'],
        ['Best combo', 'x1.45'],
      ]) {
        expect(screen.getByLabelText(`${value} ${label}`)).toBeOnTheScreen();
      }
      expect(screen.getByText('Protect your account')).toBeOnTheScreen();
    });

    it('speaks Arabic: its numbers and its counters', async () => {
      speak('ar');
      await renderWithProviders(<ProfileScreen {...props} />);

      expect(await screen.findByText('5,210')).toBeOnTheScreen();
      expect(screen.getByText('الملف')).toBeOnTheScreen();
      expect(screen.getByText('حساب ضيف')).toBeOnTheScreen();
      expect(screen.getByText('الرقم القياسي')).toBeOnTheScreen();
      expect(screen.getByText('الجولات')).toBeOnTheScreen();
      expect(screen.getByText('312 مللي ثانية')).toBeOnTheScreen();
    });
  });
});
