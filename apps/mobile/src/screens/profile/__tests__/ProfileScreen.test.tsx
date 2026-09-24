import { postsOf } from '@quezby/config';
import type { LeagueResponse, PlayerStats, StatsResponse } from '@quezby/types';
import { act, fireEvent, screen } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { buildMe, buildRanks } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/config/env', () => ({
  ...jest.requireActual('@/config/env'),
  GOOGLE_CLIENTS: null,
}));

jest.mock('@/api/client', () => ({
  api: {
    me: { stats: jest.fn(), updateSettings: jest.fn() },
    auth: { logout: jest.fn() },
    leagues: { current: jest.fn() },
    usernames: { check: jest.fn() },
  },
}));

const mocked = api as unknown as {
  me: { stats: jest.Mock; updateSettings: jest.Mock };
  auth: { logout: jest.Mock };
  leagues: { current: jest.Mock };
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

function league(overrides: Partial<LeagueResponse> = {}): LeagueResponse {
  return {
    season: 1,
    weekKey: '2026-W39',
    tier: 'gold',
    endsAt: '2026-09-27T21:00:00.000Z',
    serverTime: '2026-09-24T10:00:00.000Z',
    joined: false,
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
  });

  describe('the player card', () => {
    it('shows who you are, your league, your season best and your places', async () => {
      await renderProfile();

      expect(screen.getByText('@ekin')).toBeOnTheScreen();
      expect(await screen.findByLabelText('Altın lig')).toBeOnTheScreen();
      expect(screen.getByText('Misafir hesap')).toBeOnTheScreen();
      expect(screen.getByLabelText('Sezon rekoru: 12.345')).toBeOnTheScreen();
      expect(screen.getByText('87 reel')).toBeOnTheScreen();
      for (const [board, rank] of [
        ['Bugün', '#44'],
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
        screen.getByLabelText('Bugün: sıralamada değilsin'),
      ).toBeOnTheScreen();
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
        ['Reel', '5.210'],
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
      expect(screen.getByText(first?.user ?? '')).toBeOnTheScreen();
      expect(screen.getByText('12 kez')).toBeOnTheScreen();
      expect(screen.getByText('8 kez')).toBeOnTheScreen();
      expect(screen.queryByText('7 kez')).not.toBeOnTheScreen();
      expect(
        screen.queryByText(posts.get('like-006')?.caption ?? ''),
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
      expect(screen.getByText('Kullanıcı adını değiştir')).toBeOnTheScreen();
      expect(
        screen.getAllByRole('button', { name: /^Hesabını koru/ }),
      ).toHaveLength(2);
      expect(screen.getByText('Hesabı sil')).toBeOnTheScreen();
      expect(screen.queryByText('Çıkış yap')).not.toBeOnTheScreen();
      expect(screen.getByText(/^Quezby .+ · Local$/)).toBeOnTheScreen();
    });

    it('opens Yardım once the sheet has left the screen', async () => {
      await renderProfile();
      await openSettings();

      await fireEvent.press(screen.getByRole('button', { name: /^Yardım/ }));
      expect(navigate).not.toHaveBeenCalled();

      await leave();
      expect(navigate).toHaveBeenCalledWith('Help');
    });

    it('opens the username form once the sheet has left the screen', async () => {
      await renderProfile();
      await openSettings();

      await fireEvent.press(
        screen.getByRole('button', { name: /^Kullanıcı adını değiştir/ }),
      );
      expect(
        screen.queryByText('Sıralamadaki tüm skorların yeni adla görünür.'),
      ).not.toBeOnTheScreen();

      await leave();
      expect(
        screen.getByText('Sıralamadaki tüm skorların yeni adla görünür.'),
      ).toBeOnTheScreen();
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

    it('opens nothing when it is closed without a choice', async () => {
      await renderProfile();
      await openSettings();

      const [scrim] = screen.getAllByRole('button', { name: 'Kapat' });
      expect(scrim).toBeDefined();
      if (scrim) await fireEvent.press(scrim);
      await leave();

      expect(navigate).not.toHaveBeenCalled();
      expect(
        screen.queryByText('Sıralamadaki tüm skorların yeni adla görünür.'),
      ).not.toBeOnTheScreen();
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
  });
});
