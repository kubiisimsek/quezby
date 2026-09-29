import { postsOf } from '@quezby/config';
import type { PlayerStats, StatsResponse } from '@quezby/types';
import { act, fireEvent, screen } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useLanguage } from '@/i18n/language';
import { StatsSheet } from '@/screens/profile/StatsSheet';
import { buildMe } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: { me: { stats: jest.fn() } },
}));

const mocked = api as unknown as { me: { stats: jest.Mock } };

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

async function renderSheet() {
  const onClose = jest.fn();
  await renderWithProviders(<StatsSheet open onClose={onClose} />);
  return onClose;
}

beforeEach(() => {
  jest.clearAllMocks();
  mocked.me.stats.mockResolvedValue(stats());
});

describe('StatsSheet', () => {
  it('groups every number the API counted: the game, the moves, the bests', async () => {
    await renderSheet();

    expect(await screen.findByText('5.210')).toBeOnTheScreen();
    for (const group of ['Oyun', 'Hareketler', 'En iyiler']) {
      expect(screen.getByText(group)).toBeOnTheScreen();
    }
    const shown: Array<[string, string]> = [
      ['Tur', '42'],
      ['Post', '5.210'],
      ['Oyun süresi', '2 sa 14 dk'],
      ['Kaydırma', '3.904'],
      ['Beğeni', '610'],
      ['Mükemmel', '95'],
      ['En iyi tepki', '312 ms'],
      ['En yüksek kombo', 'x1,45'],
    ];
    for (const [label, value] of shown) {
      expect(screen.getByText(label)).toBeOnTheScreen();
      expect(screen.getByText(value)).toBeOnTheScreen();
    }
    expect(mocked.me.stats).toHaveBeenCalledTimes(1);
  });

  it('says "—" for what has not happened yet', async () => {
    mocked.me.stats.mockResolvedValue(stats({ runs: 0, bestReactionMs: null, maxCombo: 0, activeMs: 0 }));
    await renderSheet();

    expect(await screen.findByText('0 sn')).toBeOnTheScreen();
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('shows the named combos pulled off, with how often', async () => {
    await renderSheet();

    expect(await screen.findByText('Kusursuz seviye')).toBeOnTheScreen();
    expect(screen.getByText('×3')).toBeOnTheScreen();
    expect(screen.getByLabelText('Şimşek, 12 kez')).toBeOnTheScreen();
    expect(screen.getByLabelText('Geri dönüş, 1 kez')).toBeOnTheScreen();
    expect(screen.queryByText('Soğukkanlı')).not.toBeOnTheScreen();
  });

  it('says how named combos and liked posts come before the first one', async () => {
    mocked.me.stats.mockResolvedValue(stats({ bonuses: { flawless: 0, lightning: 0, coolHead: 0, comeback: 0 } }));
    await renderSheet();

    expect(
      await screen.findByText('Henüz isimli kombo yapmadın. Nasıl yapıldıkları Yardım’da.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Arkadaşlarının postlarını beğendikçe en sevdiklerin burada görünür.'),
    ).toBeOnTheScreen();
  });

  it('shows the posts liked most with their emoji and account, five at most', async () => {
    const ids = ['like-001', 'like-002', 'like-003', 'like-004', 'like-005', 'like-006'];
    mocked.me.stats.mockResolvedValue(stats({}, ids.map((contentId, index) => ({ contentId, likes: 12 - index }))));
    await renderSheet();

    const posts = postsOf();
    const first = posts.get('like-001');
    expect(first).toBeDefined();
    expect(await screen.findByText(first?.emoji ?? '')).toBeOnTheScreen();
    expect(screen.getByText(first?.user.tr ?? '')).toBeOnTheScreen();
    expect(screen.getByText('12 kez')).toBeOnTheScreen();
    expect(screen.getByText('8 kez')).toBeOnTheScreen();
    expect(screen.queryByText('7 kez')).not.toBeOnTheScreen();
    expect(screen.queryByText(posts.get('like-006')?.caption.tr ?? '')).not.toBeOnTheScreen();
  });

  it('offers another try when the numbers do not come', async () => {
    mocked.me.stats.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(stats());
    await renderSheet();

    expect(await screen.findByText('İstatistikler yüklenemedi')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));

    expect(await screen.findByText('5.210')).toBeOnTheScreen();
  });

  describe('in other languages', () => {
    const speak = (locale: 'en' | 'ar') => {
      useLanguage.setState({ locale, account: buildMe().id });
    };

    afterEach(async () => {
      await act(async () => useLanguage.setState({ locale: 'tr' }));
    });

    it('speaks English, the English way', async () => {
      speak('en');
      mocked.me.stats.mockResolvedValue(
        stats({}, [
          { contentId: 'like-001', likes: 12 },
          { contentId: 'like-002', likes: 1 },
        ]),
      );
      await renderSheet();

      expect(await screen.findByText('5,210')).toBeOnTheScreen();
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
      expect(screen.getByText('12 times')).toBeOnTheScreen();
      expect(screen.getByText('1 time')).toBeOnTheScreen();
    });

    it('speaks Arabic: its numbers and its counts', async () => {
      speak('ar');
      mocked.me.stats.mockResolvedValue(
        stats({}, [
          { contentId: 'like-001', likes: 12 },
          { contentId: 'like-002', likes: 8 },
          { contentId: 'like-003', likes: 2 },
        ]),
      );
      await renderSheet();

      expect(await screen.findByText('5,210')).toBeOnTheScreen();
      expect(screen.getByText('الإحصاءات')).toBeOnTheScreen();
      expect(screen.getByText('312 مللي ثانية')).toBeOnTheScreen();
      expect(screen.getByText('2 س 14 د')).toBeOnTheScreen();
      expect(screen.getByText('12 مرة')).toBeOnTheScreen();
      expect(screen.getByText('8 مرات')).toBeOnTheScreen();
      expect(screen.getByText('مرتان')).toBeOnTheScreen();
    });
  });
});
