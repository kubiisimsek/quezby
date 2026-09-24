import { USERNAME_MESSAGES } from '@quezby/config';
import type { PlayerSummary } from '@quezby/types';
import { act, fireEvent, screen } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { SearchScreen } from '@/screens/search/SearchScreen';
import { buildMe } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: {
    users: {
      search: jest.fn(),
      get: jest.fn(),
      follow: jest.fn(),
      unfollow: jest.fn(),
    },
    me: { following: jest.fn(), followers: jest.fn() },
  },
}));

const mocked = api as unknown as {
  users: {
    search: jest.Mock;
    get: jest.Mock;
    follow: jest.Mock;
    unfollow: jest.Mock;
  };
  me: { following: jest.Mock; followers: jest.Mock };
};

type Props = Parameters<typeof SearchScreen>[0];

const props = {
  navigation: { navigate: jest.fn() },
  route: { key: 'Search', name: 'Search' },
} as unknown as Props;

function player(overrides: Partial<PlayerSummary> = {}): PlayerSummary {
  return {
    username: 'ekin',
    best: 41_200,
    league: 'gold',
    isFollowing: false,
    ...overrides,
  };
}

const field = () => screen.getByPlaceholderText('ör. ekin');

/** Types into the search box, then lets the pause pass. */
async function search(text: string) {
  await fireEvent.changeText(field(), text);
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
}

describe('SearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    useSession.setState({ token: 'token', user: buildMe(), hydrated: true });
    mocked.me.following.mockResolvedValue({ users: [], nextCursor: null });
    mocked.me.followers.mockResolvedValue({ users: [], nextCursor: null });
    mocked.users.search.mockResolvedValue({ users: [player()] });
    mocked.users.follow.mockResolvedValue(undefined);
    mocked.users.unfollow.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('searching', () => {
    it('lower-cases as you type and asks the API once typing pauses', async () => {
      await renderWithProviders(<SearchScreen {...props} />);

      await fireEvent.changeText(field(), 'EK');
      expect(screen.getByDisplayValue('ek')).toBeOnTheScreen();

      await act(async () => {
        jest.advanceTimersByTime(299);
      });
      expect(mocked.users.search).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(1);
      });
      expect(mocked.users.search).toHaveBeenCalledWith('ek');
      expect(mocked.users.search).toHaveBeenCalledTimes(1);
    });

    it('shows each player found with their league and record', async () => {
      await renderWithProviders(<SearchScreen {...props} />);

      await search('ek');

      expect(await screen.findByText('@ekin')).toBeOnTheScreen();
      expect(screen.getByText('Altın')).toBeOnTheScreen();
      expect(screen.getByText('Sezon rekoru 41.200')).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: 'Takip et' }),
      ).toBeOnTheScreen();
    });

    it('asks for two characters before searching', async () => {
      await renderWithProviders(<SearchScreen {...props} />);

      await search('e');

      expect(
        screen.getByText('Aramak için en az 2 karakter yaz.'),
      ).toBeOnTheScreen();
      expect(mocked.users.search).not.toHaveBeenCalled();
      expect(screen.queryByText('Takip ettiklerin')).not.toBeOnTheScreen();
    });

    it('says so when nobody has a name like that', async () => {
      mocked.users.search.mockResolvedValue({ users: [] });
      await renderWithProviders(<SearchScreen {...props} />);

      await search('zz');

      expect(await screen.findByText('Kimse bulunamadı')).toBeOnTheScreen();
    });

    it('explains, in the name rules’ words, a letter no name can have', async () => {
      await renderWithProviders(<SearchScreen {...props} />);

      await search('şu');

      expect(
        screen.getByText(USERNAME_MESSAGES.turkish_char),
      ).toBeOnTheScreen();
      expect(mocked.users.search).not.toHaveBeenCalled();
    });

    it('follows a player from the list', async () => {
      mocked.users.search
        .mockResolvedValueOnce({ users: [player()] })
        .mockResolvedValue({ users: [player({ isFollowing: true })] });
      await renderWithProviders(<SearchScreen {...props} />);
      await search('ek');

      await fireEvent.press(
        await screen.findByRole('button', { name: 'Takip et' }),
      );

      expect(mocked.users.follow).toHaveBeenCalledWith('ekin');
      expect(
        await screen.findByRole('button', { name: 'Takibi bırak' }),
      ).toBeOnTheScreen();
    });

    it('unfollows a player you follow', async () => {
      mocked.users.search.mockResolvedValue({
        users: [player({ isFollowing: true })],
      });
      await renderWithProviders(<SearchScreen {...props} />);
      await search('ek');

      await fireEvent.press(
        await screen.findByRole('button', { name: 'Takibi bırak' }),
      );

      expect(mocked.users.unfollow).toHaveBeenCalledWith('ekin');
    });

    it("opens a player's card from their row", async () => {
      mocked.users.get.mockResolvedValue({
        player: {
          username: 'ekin',
          createdAt: '2026-09-01T12:00:00.000Z',
          best: null,
          league: 'gold',
          ranks: { weekly: 12, all: 311 },
          stats: { runs: 40, reels: 5_200, likes: 610, perfects: 90 },
          followers: 8,
          following: 3,
          isFollowing: false,
          followsMe: true,
          isMe: false,
        },
      });
      await renderWithProviders(<SearchScreen {...props} />);
      await search('ek');

      await fireEvent.press(
        await screen.findByRole('button', { name: /^@ekin/ }),
      );

      expect(await screen.findByText('Seni takip ediyor')).toBeOnTheScreen();
      expect(mocked.users.get).toHaveBeenCalledWith('ekin');
    });
  });

  describe('with nothing typed', () => {
    it('is the friends tab, with its name on top', async () => {
      await renderWithProviders(<SearchScreen {...props} />);

      expect(screen.getByText('Arkadaşlar')).toBeOnTheScreen();
      expect(screen.getByText('Oyuncu ara, takip et, yarış')).toBeOnTheScreen();
      expect(
        await screen.findByText('Henüz kimseyi takip etmiyorsun'),
      ).toBeOnTheScreen();
    });

    it('lists who you follow, then who follows you', async () => {
      mocked.me.following.mockResolvedValue({
        users: [player({ username: 'mert', isFollowing: true })],
        nextCursor: null,
      });
      mocked.me.followers.mockResolvedValue({
        users: [player({ username: 'oya', league: 'silver' })],
        nextCursor: null,
      });
      await renderWithProviders(<SearchScreen {...props} />);

      expect(await screen.findByText('@mert')).toBeOnTheScreen();
      expect(
        screen.getByRole('tab', { name: 'Takip ettiklerin' }),
      ).toBeSelected();
      expect(mocked.me.followers).not.toHaveBeenCalled();

      await fireEvent.press(screen.getByRole('tab', { name: 'Takipçilerin' }));

      expect(await screen.findByText('@oya')).toBeOnTheScreen();
      expect(screen.queryByText('@mert')).not.toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: 'Takip et' }),
      ).toBeOnTheScreen();
    });

    it('offers more only while the API has another page', async () => {
      mocked.me.following
        .mockResolvedValueOnce({
          users: [player({ username: 'mert', isFollowing: true })],
          nextCursor: 'page-2',
        })
        .mockResolvedValue({
          users: [player({ username: 'zeynep', isFollowing: true })],
          nextCursor: null,
        });
      await renderWithProviders(<SearchScreen {...props} />);

      await fireEvent.press(
        await screen.findByRole('button', { name: 'Daha fazla' }),
      );

      expect(await screen.findByText('@zeynep')).toBeOnTheScreen();
      expect(screen.getByText('@mert')).toBeOnTheScreen();
      expect(mocked.me.following).toHaveBeenLastCalledWith('page-2');
      expect(screen.queryByText('Daha fazla')).not.toBeOnTheScreen();
    });

    it('says what to do when you follow nobody yet', async () => {
      await renderWithProviders(<SearchScreen {...props} />);

      expect(
        await screen.findByText('Henüz kimseyi takip etmiyorsun'),
      ).toBeOnTheScreen();
      expect(screen.queryByText('Daha fazla')).not.toBeOnTheScreen();
    });

    it('tells you how to get followers when nobody follows you yet', async () => {
      await renderWithProviders(<SearchScreen {...props} />);
      await screen.findByText('Henüz kimseyi takip etmiyorsun');

      await fireEvent.press(screen.getByRole('tab', { name: 'Takipçilerin' }));

      expect(await screen.findByText('Henüz takipçin yok')).toBeOnTheScreen();
      expect(
        screen.getByText(
          'Seni takip edenler burada görünür. Adını arkadaşlarına söyle: @ekin',
        ),
      ).toBeOnTheScreen();
    });

    it('offers another try when a list does not load', async () => {
      mocked.me.following
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValue({
          users: [player({ username: 'mert', isFollowing: true })],
          nextCursor: null,
        });
      await renderWithProviders(<SearchScreen {...props} />);

      expect(await screen.findByText('Liste yüklenemedi')).toBeOnTheScreen();
      await fireEvent.press(
        screen.getByRole('button', { name: 'Tekrar dene' }),
      );

      expect(await screen.findByText('@mert')).toBeOnTheScreen();
    });
  });
});
