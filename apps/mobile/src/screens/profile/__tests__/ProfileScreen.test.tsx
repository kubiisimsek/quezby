import { postsOf } from '@quezby/config';
import type { LeagueResponse, PlayerStats, StatsResponse } from '@quezby/types';
import { ApiError } from '@quezby/sdk';
import { getApps, type ReactNativeFirebase } from '@react-native-firebase/app';
import { deleteToken } from '@react-native-firebase/messaging';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { launchImageLibrary } from 'react-native-image-picker';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { iso } from '@/i18n';
import { useLanguage } from '@/i18n/language';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { usePush } from '@/stores/push';
import { buildMe, buildRanks } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/config/env', () => ({
  ...jest.requireActual('@/config/env'),
  GOOGLE_CLIENTS: null,
}));

jest.mock('@/api/client', () => ({
  api: {
    me: {
      stats: jest.fn(),
      updateSettings: jest.fn(),
      updateUsername: jest.fn(),
      delete: jest.fn(),
      removeAvatar: jest.fn(),
      unregisterPushToken: jest.fn(),
      blocks: jest.fn(),
    },
    auth: { logout: jest.fn() },
    leagues: { current: jest.fn() },
    usernames: { check: jest.fn() },
  },
}));

const mocked = api as unknown as {
  me: {
    stats: jest.Mock;
    updateSettings: jest.Mock;
    updateUsername: jest.Mock;
    delete: jest.Mock;
    removeAvatar: jest.Mock;
    unregisterPushToken: jest.Mock;
    blocks: jest.Mock;
  };
  auth: { logout: jest.Mock };
  leagues: { current: jest.Mock };
  usernames: { check: jest.Mock };
};

const PICK_DESCRIPTION =
  'Şimdilik @guest48128742 olarak görünüyorsun. Seçtiğin ad bütün skorlarında görünür ve bir daha değişmez.';

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

function league(overrides: Partial<LeagueResponse> = {}): LeagueResponse {
  return {
    season: 1,
    weekKey: '2026-W39',
    tier: 'gold',
    endsAt: '2026-09-27T21:00:00.000Z',
    serverTime: '2026-09-24T10:00:00.000Z',
    joined: false,
    unlock: null,
    members: [],
    me: null,
    promoteCount: 5,
    demoteCount: 5,
    promotionGap: null,
    nextRankProgress: null,
    lastWeek: null,
    ...overrides,
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
    mocked.me.updateSettings.mockResolvedValue({ user: buildMe() });
    mocked.auth.logout.mockResolvedValue(undefined);
    mocked.leagues.current.mockResolvedValue(league());
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
    it('shows who you are, your league, your season best and your places', async () => {
      await renderProfile();

      expect(screen.getByText('@ekin')).toBeOnTheScreen();
      expect(await screen.findByLabelText('Altın lig')).toBeOnTheScreen();
      expect(screen.getByText('Misafir hesap')).toBeOnTheScreen();
      expect(screen.getByLabelText('Sezon rekoru: 12.345')).toBeOnTheScreen();
      expect(screen.getByText('87 post')).toBeOnTheScreen();
      for (const [board, rank] of [
        ['Hafta', '#120'],
        ['Ay', '#310'],
        ['Tüm zamanlar', '#1.204'],
      ]) {
        expect(screen.getByLabelText(`${board}: ${rank}`)).toBeOnTheScreen();
      }
    });

    it('waits for a season best and a league the API has not named', async () => {
      useSession.setState({ user: buildMe({ best: null }), ranks: null });
      mocked.leagues.current.mockRejectedValue(new Error('offline'));
      await renderProfile();

      expect(screen.getByLabelText('Sezon rekoru: —')).toBeOnTheScreen();
      expect(screen.queryByLabelText(/ lig$/)).not.toBeOnTheScreen();
      expect(
        screen.getByLabelText('Hafta: sıralamada değilsin'),
      ).toBeOnTheScreen();
    });

    it('names no league before it has opened to the player', async () => {
      mocked.leagues.current.mockResolvedValue(league({ unlock: { required: 3, remaining: 2 } }));
      await renderProfile();
      // The league's answer has landed and been drawn.
      await waitFor(() => expect(mocked.leagues.current).toHaveBeenCalled());
      await act(async () => {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 20);
        });
      });

      expect(screen.queryByLabelText(/ lig$/)).not.toBeOnTheScreen();
    });

    it('leaves friends to their own tab', async () => {
      await renderProfile();

      expect(
        screen.queryByRole('button', { name: /Arkadaşlar/ }),
      ).not.toBeOnTheScreen();
    });
  });

  describe('statistics', () => {
    it('shows the numbers the API counted, in a grid', async () => {
      await renderProfile();

      const shown: Array<[string, string]> = [
        ['Tur', '42'],
        ['Post', '5.210'],
        ['Kaydırma', '3.904'],
        ['Beğeni', '610'],
        ['Mükemmel', '95'],
        ['En iyi tepki', '312 ms'],
        ['Oyun süresi', '2 sa 14 dk'],
        ['En yüksek kombo', 'x1,45'],
      ];
      for (const [label, value] of shown) {
        expect(screen.getByText(label)).toBeOnTheScreen();
        expect(screen.getByText(value)).toBeOnTheScreen();
      }
      expect(mocked.me.stats).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Genel sıra')).not.toBeOnTheScreen();
    });

    it('says "—" for what has not happened yet', async () => {
      mocked.me.stats.mockResolvedValue(
        stats({ runs: 0, bestReactionMs: null, maxCombo: 0, activeMs: 0 }),
      );
      await renderWithProviders(<ProfileScreen {...props} />);

      expect(await screen.findByText('0 sn')).toBeOnTheScreen();
      expect(screen.getAllByText('—')).toHaveLength(2);
    });

    it('shows the named combos pulled off, with how often', async () => {
      await renderWithProviders(<ProfileScreen {...props} />);

      expect(await screen.findByText('Kusursuz seviye')).toBeOnTheScreen();
      expect(screen.getByText('×3')).toBeOnTheScreen();
      expect(screen.getByLabelText('Şimşek, 12 kez')).toBeOnTheScreen();
      expect(screen.getByLabelText('Geri dönüş, 1 kez')).toBeOnTheScreen();
      expect(screen.queryByText('Soğukkanlı')).not.toBeOnTheScreen();
    });

    it('says how named combos come before the first one', async () => {
      mocked.me.stats.mockResolvedValue(
        stats({
          bonuses: { flawless: 0, lightning: 0, coolHead: 0, comeback: 0 },
        }),
      );
      await renderProfile();

      expect(
        screen.getByText(
          'Henüz isimli kombo yapmadın. Nasıl yapıldıkları Yardım’da.',
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(
          'Arkadaşlarının postlarını beğendikçe en sevdiklerin burada görünür.',
        ),
      ).toBeOnTheScreen();
    });

    it('shows the posts liked most with their emoji and account, five at most', async () => {
      const ids = [
        'like-001',
        'like-002',
        'like-003',
        'like-004',
        'like-005',
        'like-006',
      ];
      mocked.me.stats.mockResolvedValue(
        stats(
          {},
          ids.map((contentId, index) => ({ contentId, likes: 12 - index })),
        ),
      );
      await renderWithProviders(<ProfileScreen {...props} />);

      const posts = postsOf();
      const first = posts.get('like-001');
      expect(first).toBeDefined();
      expect(await screen.findByText(first?.emoji ?? '')).toBeOnTheScreen();
      expect(screen.getByText(first?.user.tr ?? '')).toBeOnTheScreen();
      expect(screen.getByText('12 kez')).toBeOnTheScreen();
      expect(screen.getByText('8 kez')).toBeOnTheScreen();
      expect(screen.queryByText('7 kez')).not.toBeOnTheScreen();
      expect(
        screen.queryByText(posts.get('like-006')?.caption.tr ?? ''),
      ).not.toBeOnTheScreen();
    });

    it('offers another try when the numbers do not come', async () => {
      mocked.me.stats
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValue(stats());
      await renderWithProviders(<ProfileScreen {...props} />);

      expect(
        await screen.findByText('İstatistikler yüklenemedi'),
      ).toBeOnTheScreen();
      await fireEvent.press(
        screen.getByRole('button', { name: 'Tekrar dene' }),
      );

      expect(await screen.findByText('5.210')).toBeOnTheScreen();
    });
  });

  describe('a guest', () => {
    it('is offered, out front, the ways this build has to keep the account', async () => {
      await renderProfile();

      expect(
        screen.getByText(
          'Apple ya da e-posta bağla; telefon değişse de skorların kaybolmaz.',
        ),
      ).toBeOnTheScreen();

      await fireEvent.press(
        screen.getByRole('button', { name: /^Hesabını koru/ }),
      );

      expect(
        screen.getByRole('button', { name: 'Apple ile devam et' }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: 'E-postayla koru' }),
      ).toBeOnTheScreen();
      expect(
        screen.queryByRole('button', { name: 'Google ile devam et' }),
      ).not.toBeOnTheScreen();
    });

    it('opens the email form only once the ways have left the screen', async () => {
      await renderProfile();
      await fireEvent.press(
        screen.getByRole('button', { name: /^Hesabını koru/ }),
      );

      await fireEvent.press(
        screen.getByRole('button', { name: 'E-postayla koru' }),
      );
      expect(
        screen.queryByRole('button', { name: 'Hesabı koru' }),
      ).not.toBeOnTheScreen();

      await leave();
      expect(
        screen.getByRole('button', { name: 'Hesabı koru' }),
      ).toBeOnTheScreen();
    });
  });

  describe('Ayarlar', () => {
    it('holds the one setting, Yardım and the account doors', async () => {
      await renderProfile();
      expect(screen.queryByText('Titreşim')).not.toBeOnTheScreen();

      await openSettings();

      expect(screen.getByText('Titreşim')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: /^Yardım/ })).toBeOnTheScreen();
      expect(screen.getByText('Kullanıcı adın')).toBeOnTheScreen();
      expect(screen.getByText('@ekin · kalıcı')).toBeOnTheScreen();
      expect(
        screen.getAllByRole('button', { name: /^Hesabını koru/ }),
      ).toHaveLength(2);
      expect(screen.getByText('Hesabı sil')).toBeOnTheScreen();
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

    it('never offers to change a name the player picked', async () => {
      await renderProfile();
      await openSettings();

      expect(screen.queryByRole('button', { name: /Kullanıcı adın/ })).not.toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: /^Adını seç/ })).not.toBeOnTheScreen();
      expect(screen.queryByText(/değiştir/)).not.toBeOnTheScreen();
    });

    it('asks a player still on the automatic name to pick one, once the sheet has left the screen', async () => {
      useSession.setState({ user: buildMe({ username: 'guest48128742' }) });
      await renderProfile();
      await openSettings();

      await fireEvent.press(screen.getByRole('button', { name: /^Adını seç/ }));
      expect(screen.queryByText(PICK_DESCRIPTION)).not.toBeOnTheScreen();

      await leave();
      expect(screen.getByText(PICK_DESCRIPTION)).toBeOnTheScreen();
      expect(screen.getByPlaceholderText('ornek.kullanici').props.value ?? '').toBe('');
    });

    it('saves the one pick, and from then on shows the name locked', async () => {
      useSession.setState({ user: buildMe({ username: 'guest48128742' }) });
      mocked.usernames.check.mockResolvedValue({ username: 'ekin.su', available: true, reason: null });
      mocked.me.updateUsername.mockResolvedValue({ user: buildMe({ username: 'ekin.su' }) });
      await renderProfile();
      await openSettings();
      await fireEvent.press(screen.getByRole('button', { name: /^Adını seç/ }));
      await leave();

      await fireEvent.changeText(screen.getByPlaceholderText('ornek.kullanici'), 'Ekin.Su');
      await waitFor(() => expect(screen.getByRole('button', { name: 'Kaydet' })).toBeEnabled());
      await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));

      await waitFor(() => expect(mocked.me.updateUsername).toHaveBeenCalledWith('ekin.su'));
      await waitFor(() => expect(useSession.getState().user?.username).toBe('ekin.su'));
      await leave();
      await openSettings();
      expect(screen.getByText('@ekin.su · kalıcı')).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: /^Adını seç/ })).not.toBeOnTheScreen();
    });

    it('says why a second pick is refused', async () => {
      useSession.setState({ user: buildMe({ username: 'guest48128742' }) });
      mocked.usernames.check.mockResolvedValue({ username: 'ekin.su', available: true, reason: null });
      mocked.me.updateUsername.mockRejectedValue(
        new ApiError(409, 'username_locked', 'Kullanıcı adını zaten seçtin; seçilen ad değişmez.'),
      );
      await renderProfile();
      await openSettings();
      await fireEvent.press(screen.getByRole('button', { name: /^Adını seç/ }));
      await leave();

      await fireEvent.changeText(screen.getByPlaceholderText('ornek.kullanici'), 'ekin.su');
      await waitFor(() => expect(screen.getByRole('button', { name: 'Kaydet' })).toBeEnabled());
      await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));

      expect(await screen.findByText('Kullanıcı adını zaten seçtin; seçilen ad değişmez.')).toBeOnTheScreen();
    });

    it('keeps a guest account from here too', async () => {
      await renderProfile();
      await openSettings();

      const [, fromSettings] = screen.getAllByRole('button', {
        name: /^Hesabını koru/,
      });
      expect(fromSettings).toBeDefined();
      if (fromSettings) await fireEvent.press(fromSettings);
      expect(
        screen.queryByRole('button', { name: 'Apple ile devam et' }),
      ).not.toBeOnTheScreen();

      await leave();
      expect(
        screen.getByRole('button', { name: 'Apple ile devam et' }),
      ).toBeOnTheScreen();
    });

    it('asks before deleting the account', async () => {
      await renderProfile();
      await openSettings();

      await fireEvent.press(
        screen.getByRole('button', { name: /^Hesabı sil/ }),
      );
      await leave();

      expect(
        screen.getByRole('button', { name: 'Hesabı kalıcı olarak sil' }),
      ).toBeOnTheScreen();
    });

    it('deletes the account when the name is typed as the label shows it, with its @', async () => {
      mocked.me.delete.mockResolvedValue(undefined);
      await renderProfile();
      await openSettings();
      await fireEvent.press(screen.getByRole('button', { name: /^Hesabı sil/ }));
      await leave();

      await fireEvent.changeText(screen.getByLabelText('Onay için @ekin yaz'), '@Ekin ');
      await fireEvent.press(screen.getByRole('button', { name: 'Hesabı kalıcı olarak sil' }));

      await waitFor(() => expect(mocked.me.delete).toHaveBeenCalledTimes(1));
    });

    it('opens nothing when it is closed without a choice', async () => {
      useSession.setState({ user: buildMe({ username: 'guest48128742' }) });
      await renderProfile();
      await openSettings();

      const [scrim] = screen.getAllByRole('button', { name: 'Kapat' });
      expect(scrim).toBeDefined();
      if (scrim) await fireEvent.press(scrim);
      await leave();

      expect(navigate).not.toHaveBeenCalled();
      expect(screen.queryByText(PICK_DESCRIPTION)).not.toBeOnTheScreen();
      expect(
        screen.queryByRole('button', { name: 'Apple ile devam et' }),
      ).not.toBeOnTheScreen();
    });
  });

  describe('a kept account', () => {
    it('names the ways it signs in with', async () => {
      useSession.setState({
        user: buildMe({ isGuest: false, identities: ['apple'] }),
      });
      await renderProfile();

      expect(screen.getByText('Apple ile bağlı')).toBeOnTheScreen();
      expect(screen.queryByText('Hesabını koru')).not.toBeOnTheScreen();

      await openSettings();
      expect(screen.getByText('Apple bağlı')).toBeOnTheScreen();
      expect(
        screen.getByText('Tekrar Apple ile girebilirsin.'),
      ).toBeOnTheScreen();
      expect(screen.queryByText('Hesabını koru')).not.toBeOnTheScreen();

      await fireEvent.press(
        screen.getByRole('button', { name: /^Giriş yolları/ }),
      );
      await leave();

      expect(
        screen.getByRole('button', { name: 'Bağı kaldır' }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: 'E-posta ve şifre bağla' }),
      ).toBeOnTheScreen();
    });

    it('shows the email it was kept with', async () => {
      useSession.setState({
        user: buildMe({
          isGuest: false,
          identities: ['apple'],
          email: 'ekin@example.com',
        }),
      });
      await renderProfile();

      expect(screen.getByText('ekin@example.com')).toBeOnTheScreen();

      await openSettings();
      expect(screen.getByText('Apple ve e-posta bağlı')).toBeOnTheScreen();
      expect(
        screen.getByText('Tekrar Apple ya da e-posta ile girebilirsin.'),
      ).toBeOnTheScreen();
    });

    it('signs out once the sheet has left the screen', async () => {
      useSession.setState({
        user: buildMe({ isGuest: false, identities: ['apple'] }),
      });
      await renderProfile();
      await openSettings();

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
      expect(screen.getByText('Stats')).toBeOnTheScreen();
      const shown: Array<[string, string]> = [
        ['Runs', '42'],
        ['Posts', '5,210'],
        ['Swipes', '3,904'],
        ['Likes', '610'],
        ['Perfect', '95'],
        ['Best reaction', '312 ms'],
        ['Play time', '2h 14m'],
        ['Best combo', 'x1.45'],
      ];
      for (const [label, value] of shown) {
        expect(screen.getByText(label)).toBeOnTheScreen();
        expect(screen.getByText(value)).toBeOnTheScreen();
      }
      expect(screen.getByText('Protect your account')).toBeOnTheScreen();
      expect(
        screen.getByText('Link Apple or email and your scores stay with you, even on a new phone.'),
      ).toBeOnTheScreen();
    });

    it('counts likes in English and names what the delete door takes', async () => {
      speak('en');
      mocked.me.stats.mockResolvedValue(
        stats({}, [
          { contentId: 'like-001', likes: 12 },
          { contentId: 'like-002', likes: 1 },
        ]),
      );
      await renderWithProviders(<ProfileScreen {...props} />);

      expect(await screen.findByText('12 times')).toBeOnTheScreen();
      expect(screen.getByText('1 time')).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Settings' }));
      await fireEvent.press(screen.getByRole('button', { name: /^Delete account/ }));
      await leave();

      expect(
        screen.getByText(
          "This can't be undone: your name, your scores and your place in the rankings are deleted.",
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: 'Delete account permanently' }),
      ).toBeOnTheScreen();
      expect(screen.getByLabelText('Type @ekin to confirm')).toBeOnTheScreen();
    });

    it('speaks Arabic: its numbers, its counts and a name kept whole', async () => {
      speak('ar');
      useSession.setState({ user: buildMe({ username: 'guest48128742' }) });
      mocked.me.stats.mockResolvedValue(
        stats({}, [
          { contentId: 'like-001', likes: 12 },
          { contentId: 'like-002', likes: 8 },
          { contentId: 'like-003', likes: 2 },
        ]),
      );
      await renderWithProviders(<ProfileScreen {...props} />);

      expect(await screen.findByText('5,210')).toBeOnTheScreen();
      expect(screen.getByText('الملف')).toBeOnTheScreen();
      expect(screen.getByText('حساب ضيف')).toBeOnTheScreen();
      expect(screen.getByText('الإحصاءات')).toBeOnTheScreen();
      expect(screen.getByText('312 مللي ثانية')).toBeOnTheScreen();
      expect(screen.getByText('2 س 14 د')).toBeOnTheScreen();
      expect(screen.getByText('12 مرة')).toBeOnTheScreen();
      expect(screen.getByText('8 مرات')).toBeOnTheScreen();
      expect(screen.getByText('مرتان')).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'الإعدادات' }));
      await fireEvent.press(screen.getByRole('button', { name: /^اختر اسمك/ }));
      await leave();

      expect(
        screen.getByText(
          `تظهر حاليًا باسم ${iso('@guest48128742')}. الاسم الذي تختاره يظهر مع كل نتائجك ولن يتغيّر أبدًا.`,
        ),
      ).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'حفظ' })).toBeOnTheScreen();
    });
  });
});
