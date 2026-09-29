import type {
  LeaderboardBoard,
  LeaderboardResponse,
  LeaderboardScope,
} from '@quezby/types';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { api } from '@/api/client';
import { iso } from '@/i18n';
import { useLanguage } from '@/i18n/language';
import { LeaderboardScreen } from '@/screens/leaderboard/LeaderboardScreen';
import { buildEntries, buildEntry } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: {
    leaderboards: { get: jest.fn() },
    rating: { board: jest.fn() },
    me: { friends: jest.fn() },
    users: { get: jest.fn(), follow: jest.fn(), unfollow: jest.fn() },
  },
}));

const mocked = api as unknown as {
  leaderboards: { get: jest.Mock };
  rating: { board: jest.Mock };
  me: { friends: jest.Mock };
  users: { get: jest.Mock };
};

type Props = ComponentProps<typeof LeaderboardScreen>;

const NOW = '2026-09-24T10:00:00.000Z';

/** A board as the API answers it: six players, nobody of them you. */
function board(
  overrides: Partial<LeaderboardResponse> = {},
): LeaderboardResponse {
  const entries = overrides.entries ?? buildEntries(6);
  return {
    board: 'weekly',
    periodKey: '2026-W39',
    season: 1,
    scope: 'everyone',
    startsAt: '2026-09-23T21:00:00.000Z',
    endsAt: '2026-09-24T21:00:00.000Z',
    serverTime: NOW,
    entries,
    me: null,
    neighbors: [],
    rival: null,
    nextRankProgress: null,
    players: entries.length,
    ...overrides,
  };
}

/** Answers every board and scope, echoing back what was asked. */
function answerEvery(overrides: Partial<LeaderboardResponse> = {}) {
  mocked.leaderboards.get.mockImplementation(
    async (period: LeaderboardBoard, { scope }: { scope: LeaderboardScope }) =>
      board({
        board: period,
        scope,
        endsAt: period === 'all' ? null : '2026-09-24T21:00:00.000Z',
        ...overrides,
      }),
  );
}

/** A player's card, enough for the sheet to draw. */
function playerCard(username: string) {
  return {
    player: {
      username,
      createdAt: '2026-09-01T12:00:00.000Z',
      best: { score: 20_280, reels: 64, achievedAt: NOW },
      league: 'gold',
      ranks: { weekly: 4, all: 40 },
      stats: { runs: 12, reels: 800, likes: 90, perfects: 14 },
      avatarUrl: null,
      friends: 3,
      relation: 'none',
      isMe: false,
    },
  };
}

async function renderZirve() {
  const navigation = { navigate: jest.fn(), setOptions: jest.fn() };
  await renderWithProviders(
    <LeaderboardScreen
      navigation={navigation as unknown as Props['navigation']}
      route={{ key: 'Leaderboard-test', name: 'Leaderboard' } as Props['route']}
    />,
  );
  return navigation;
}

/** Waits for the podium's winner, which only stands once the board is in. */
async function boardArrived() {
  return screen.findByRole('button', { name: /^1\. sıra, @ekin/ });
}

describe('LeaderboardScreen — Zirve', () => {
  beforeEach(() => jest.clearAllMocks());

  it('stands the top three on the podium and the rest on the climb', async () => {
    mocked.leaderboards.get.mockResolvedValue(board({ players: 5_120 }));

    await renderZirve();

    expect(await boardArrived()).toBeOnTheScreen();
    expect(screen.getByText('Zirve')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: '2. sıra, @mert, 22.760 puan' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: '3. sıra, @oya, 21.520 puan' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', {
        name: '4. sıra, @deniz, 20.280 puan, geçmek için 1.241 puan',
      }),
    ).toBeOnTheScreen();
    expect(screen.getAllByText('▲ 1.241')).toHaveLength(3);
    expect(screen.getByText('5.120 oyuncu')).toBeOnTheScreen();
    expect(screen.getByText('Bitmesine 11 sa 0 dk')).toBeOnTheScreen();
    expect(mocked.leaderboards.get).toHaveBeenCalledWith('weekly', {
      scope: 'everyone',
      limit: 100,
    });
  });

  it('asks for the month when "Ay" is chosen, and drops the countdown for all time', async () => {
    answerEvery();
    await renderZirve();
    await boardArrived();

    await fireEvent.press(screen.getByRole('tab', { name: 'Ay' }));
    await waitFor(() =>
      expect(mocked.leaderboards.get).toHaveBeenLastCalledWith('monthly', {
        scope: 'everyone',
        limit: 100,
      }),
    );

    await fireEvent.press(screen.getByRole('tab', { name: 'Tüm zamanlar' }));
    await waitFor(() =>
      expect(mocked.leaderboards.get).toHaveBeenLastCalledWith('all', {
        scope: 'everyone',
        limit: 100,
      }),
    );
    await waitFor(() =>
      expect(screen.queryByText(/^Bitmesine/)).not.toBeOnTheScreen(),
    );
    expect(screen.getByRole('tab', { name: 'Tüm zamanlar' })).toBeSelected();
  });

  it('shows the Elo board from its tab: the ratings, each player’s league, and no posts or countdown', async () => {
    answerEvery();
    mocked.rating.board.mockImplementation(async (scope: LeaderboardScope) => ({
      scope,
      entries: [
        { rank: 1, username: 'ekin', avatarUrl: null, rating: 5_210, tier: 'master', isMe: false, isFriend: false, gap: null },
        { rank: 2, username: 'mert', avatarUrl: null, rating: 4_480, tier: 'diamond', isMe: false, isFriend: true, gap: 731 },
        { rank: 3, username: 'oya', avatarUrl: null, rating: 3_900, tier: 'platinum', isMe: false, isFriend: false, gap: 581 },
        { rank: 4, username: 'deniz', avatarUrl: null, rating: 2_640, tier: 'gold', isMe: false, isFriend: false, gap: 1_261 },
      ],
      me: { rank: 12, username: 'kubi', avatarUrl: null, rating: 1_640, tier: 'silver', isMe: true, isFriend: false, gap: 60 },
      players: 312,
    }));
    await renderZirve();
    await boardArrived();

    await fireEvent.press(screen.getByRole('tab', { name: 'Elo' }));

    expect(await screen.findByText('Son 14 günde oynayanlar')).toBeOnTheScreen();
    expect(mocked.rating.board).toHaveBeenLastCalledWith('everyone');
    expect(await screen.findByRole('button', { name: '1. sıra, @ekin, 5.210 Elo' })).toBeOnTheScreen();
    expect(
      await screen.findByRole('button', { name: '4. sıra, @deniz, 2.640 Elo, Altın lig, geçmek için 1.261 Elo' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^12\. sıra, @kubi, sen, 1\.640 Elo, Gümüş lig/ })).toBeOnTheScreen();
    expect(screen.queryByText(/post$/)).not.toBeOnTheScreen();
    expect(screen.queryByText(/^Bitmesine/)).not.toBeOnTheScreen();
    expect(screen.queryByText('SENİN KATIN')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: /^Arkadaşlar/ }));
    await waitFor(() => expect(mocked.rating.board).toHaveBeenLastCalledWith('friends'));
  });

  it('says so when nobody has a rating yet', async () => {
    answerEvery();
    mocked.rating.board.mockResolvedValue({ scope: 'everyone', entries: [], me: null, players: 0 });
    await renderZirve();
    await boardArrived();

    await fireEvent.press(screen.getByRole('tab', { name: 'Elo' }));

    expect(await screen.findByText('Henüz kimse yok')).toBeOnTheScreen();
    expect(screen.getByText('Yerleşme turlarını bitiren oyuncular burada görünür.')).toBeOnTheScreen();
  });

  it('asks for the friends board when "Arkadaşlar" is chosen', async () => {
    mocked.leaderboards.get.mockImplementation(
      async (
        period: LeaderboardBoard,
        { scope }: { scope: LeaderboardScope },
      ) =>
        board({
          board: period,
          scope,
          players: scope === 'friends' ? 7 : 5_120,
        }),
    );
    await renderZirve();
    await boardArrived();

    await fireEvent.press(screen.getByRole('tab', { name: 'Arkadaşlar' }));

    expect(await screen.findByText('7 oyuncu')).toBeOnTheScreen();
    expect(mocked.leaderboards.get).toHaveBeenLastCalledWith('weekly', {
      scope: 'friends',
      limit: 100,
    });
    expect(screen.getByRole('tab', { name: 'Arkadaşlar' })).toBeSelected();
  });

  it('sends a player who follows nobody to find players', async () => {
    mocked.leaderboards.get.mockImplementation(
      async (
        period: LeaderboardBoard,
        { scope }: { scope: LeaderboardScope },
      ) =>
        scope === 'friends'
          ? board({ board: period, scope, entries: [], players: 0 })
          : board({ board: period, scope }),
    );
    mocked.me.friends.mockResolvedValue({ friends: [], nextCursor: null });
    const navigation = await renderZirve();
    await boardArrived();

    await fireEvent.press(screen.getByRole('tab', { name: 'Arkadaşlar' }));

    expect(
      await screen.findByText('Henüz arkadaşın yok'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('SENİN KATIN')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Arkadaş bul'));
    expect(navigation.navigate).toHaveBeenCalledWith('FindFriends');
  });

  it('pins your floor with the rival to pass, and "Geç onu" starts a run', async () => {
    const me = buildEntry({
      rank: 311,
      username: 'kubi',
      score: 9_120,
      isMe: true,
      gap: 121,
    });
    const rival = buildEntry({ rank: 310, username: 'oya', score: 9_240 });
    mocked.leaderboards.get.mockResolvedValue(
      board({
        me,
        rival: { entry: rival, gap: 121 },
        nextRankProgress: 986,
        players: 5_120,
      }),
    );
    const navigation = await renderZirve();

    expect(await screen.findByText("@oya'ya 121 puan")).toBeOnTheScreen();
    expect(screen.getByText('SENİN KATIN')).toBeOnTheScreen();
    expect(screen.getByText('#311')).toBeOnTheScreen();
    expect(screen.getByText('Sen · 9.120')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({
      now: 99,
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Geç onu' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Game', { mode: 'free' });
  });

  it('shows the rows around you after a break when you are below the list', async () => {
    const me = buildEntry({
      rank: 311,
      username: 'kubi',
      score: 9_120,
      isMe: true,
      gap: 121,
    });
    const rival = buildEntry({
      rank: 310,
      username: 'oya',
      score: 9_240,
      gap: 161,
    });
    const neighbors = [
      buildEntry({ rank: 309, username: 'elif', score: 9_400, gap: 12 }),
      rival,
      me,
      buildEntry({ rank: 312, username: 'arda', score: 9_000, gap: 121 }),
      buildEntry({ rank: 313, username: 'nil', score: 8_700, gap: 301 }),
    ];
    mocked.leaderboards.get.mockResolvedValue(
      board({ me, neighbors, rival: { entry: rival, gap: 121 } }),
    );

    await renderZirve();
    await boardArrived();

    expect(
      screen.getByLabelText('Arada başka oyuncular var'),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: /^309\. sıra, @elif/ }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: /^311\. sıra, @kubi, sen,/ }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: /^313\. sıra, @nil/ }),
    ).toBeOnTheScreen();
  });

  it('opens the player search from the stage', async () => {
    mocked.leaderboards.get.mockResolvedValue(board());
    const navigation = await renderZirve();
    await boardArrived();

    await fireEvent.press(screen.getByRole('button', { name: 'Arkadaş bul' }));

    expect(navigation.navigate).toHaveBeenCalledWith('FindFriends');
  });

  it('invites a player with no run this period to play', async () => {
    mocked.leaderboards.get.mockResolvedValue(board());
    const navigation = await renderZirve();
    await boardArrived();

    expect(screen.getByText('Bu dönemde henüz sıran yok.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Oyna' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Game', { mode: 'free' });
  });

  it('opens a player card from the climb and from the podium', async () => {
    mocked.leaderboards.get.mockResolvedValue(board());
    mocked.users.get.mockImplementation(async (username: string) =>
      playerCard(username),
    );
    await renderZirve();
    await boardArrived();

    await fireEvent.press(
      screen.getByRole('button', { name: /^4\. sıra, @deniz/ }),
    );
    expect(await screen.findByText('Sezon rekoru')).toBeOnTheScreen();
    expect(mocked.users.get).toHaveBeenLastCalledWith('deniz');

    await fireEvent.press(
      screen.getByRole('button', { name: /^1\. sıra, @ekin/ }),
    );
    expect(mocked.users.get).toHaveBeenLastCalledWith('ekin');
    expect(await screen.findByText('Sezon rekoru')).toBeOnTheScreen();
  });

  it('says so when the summit is empty and offers the first run', async () => {
    mocked.leaderboards.get.mockResolvedValue(
      board({ entries: [], players: 0 }),
    );
    const navigation = await renderZirve();

    expect(await screen.findByText('Zirve boş')).toBeOnTheScreen();
    expect(screen.getByLabelText('1. sıra boş')).toBeOnTheScreen();
    expect(screen.queryByText('SENİN KATIN')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Oyna' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Game', { mode: 'free' });
  });

  it('explains a failed load and tries again', async () => {
    mocked.leaderboards.get
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(board());
    await renderZirve();

    expect(await screen.findByText('Sıralama yüklenemedi')).toBeOnTheScreen();
    expect(
      screen.getByText('Bir şeyler ters gitti. Tekrar dene.'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));

    expect(await boardArrived()).toBeOnTheScreen();
    expect(screen.queryByText('Sıralama yüklenemedi')).not.toBeOnTheScreen();
  });
});

describe('LeaderboardScreen — in other languages', () => {
  beforeEach(() => jest.clearAllMocks());

  /** You below the list, with the player right above you to pass. */
  function chasing() {
    const me = buildEntry({
      rank: 311,
      username: 'kubi',
      score: 9_120,
      isMe: true,
      gap: 121,
    });
    const rival = buildEntry({ rank: 310, username: 'oya', score: 9_240 });
    mocked.leaderboards.get.mockResolvedValue(
      board({
        me,
        rival: { entry: rival, gap: 121 },
        nextRankProgress: 986,
        players: 5_120,
      }),
    );
  }

  it('speaks English: the summit, its switches, the climb and your floor', async () => {
    useLanguage.setState({ locale: 'en' });
    chasing();

    await renderZirve();

    expect(
      await screen.findByRole('button', {
        name: '1st place, @ekin, 24,000 points',
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText('Summit')).toBeOnTheScreen();
    expect(screen.getByText('5,120 players')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Week' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Everyone' })).toBeSelected();
    ['Month', 'All time', 'Friends'].forEach((name) =>
      expect(screen.getByRole('tab', { name })).toBeOnTheScreen(),
    );
    expect(screen.queryByRole('tab', { name: 'Today' })).not.toBeOnTheScreen();
    expect(
      screen.getByRole('button', {
        name: '4th place, @deniz, 20,280 points, 1,241 points to pass',
      }),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('More players in between')).toBeOnTheScreen();
    expect(screen.getByText('YOUR FLOOR')).toBeOnTheScreen();
    expect(screen.getByText('You · 9,120')).toBeOnTheScreen();
    expect(screen.getByText('121 pts to @oya')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Pass them' })).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Find friends' }),
    ).toBeOnTheScreen();
  });

  it('says in English when the summit is empty', async () => {
    useLanguage.setState({ locale: 'en' });
    mocked.leaderboards.get.mockResolvedValue(
      board({ entries: [], players: 0 }),
    );

    await renderZirve();

    expect(await screen.findByText('The summit is empty')).toBeOnTheScreen();
    expect(screen.getByLabelText('1st place, empty')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Play' })).toBeOnTheScreen();
  });

  it('speaks Arabic, keeping names whole in its lines', async () => {
    useLanguage.setState({ locale: 'ar' });
    chasing();

    await renderZirve();

    expect(
      await screen.findByRole('button', {
        name: `المركز 1، ${iso('@ekin')}، 24,000 نقطة`,
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText('القمة')).toBeOnTheScreen();
    expect(screen.getByText('5,120 لاعبًا')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'الأسبوع' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'الأصدقاء' })).toBeOnTheScreen();
    expect(screen.getByText('طابقك')).toBeOnTheScreen();
    expect(
      screen.getByText(`تفصلك 121 نقطة عن ${iso('@oya')}`),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'تجاوزه' })).toBeOnTheScreen();
  });
});
