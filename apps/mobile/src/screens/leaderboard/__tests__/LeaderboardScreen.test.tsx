import type {
  LeaderboardBoard,
  LeaderboardResponse,
  LeaderboardScope,
} from '@quezby/types';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { api } from '@/api/client';
import { LeaderboardScreen } from '@/screens/leaderboard/LeaderboardScreen';
import { buildEntries, buildEntry } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: {
    leaderboards: { get: jest.fn() },
    me: { following: jest.fn() },
    users: { get: jest.fn(), follow: jest.fn(), unfollow: jest.fn() },
  },
}));

const mocked = api as unknown as {
  leaderboards: { get: jest.Mock };
  me: { following: jest.Mock };
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
    board: 'daily',
    periodKey: '2026-09-24',
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
      followers: 2,
      following: 1,
      isFollowing: false,
      followsMe: false,
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
    expect(mocked.leaderboards.get).toHaveBeenCalledWith('daily', {
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
    expect(mocked.leaderboards.get).toHaveBeenLastCalledWith('daily', {
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
    mocked.me.following.mockResolvedValue({ users: [], nextCursor: null });
    const navigation = await renderZirve();
    await boardArrived();

    await fireEvent.press(screen.getByRole('tab', { name: 'Arkadaşlar' }));

    expect(
      await screen.findByText('Henüz kimseyi takip etmiyorsun'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('SENİN KATIN')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Oyuncu ara'));
    expect(navigation.navigate).toHaveBeenCalledWith('Search');
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

    await fireEvent.press(screen.getByRole('button', { name: 'Oyuncu ara' }));

    expect(navigation.navigate).toHaveBeenCalledWith('Search');
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
