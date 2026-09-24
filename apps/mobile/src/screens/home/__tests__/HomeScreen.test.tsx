import type {
  DailyAttempt,
  DailyResponse,
  LeaderboardResponse,
  LeagueMember,
  LeagueResponse,
  LeagueZone,
} from '@quezby/types';
import type { QueryClient } from '@tanstack/react-query';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import {
  useReducedMotion,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { REEL_GUIDE } from '@/game/howTo';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { buildEntry, buildMe, buildRanks } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

/** The official mock has no `useReducedMotion`; the breath is spied on. */
jest.mock('react-native-reanimated', () => {
  const reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...reanimated,
    useReducedMotion: jest.fn(() => false),
    withRepeat: jest.fn(reanimated.withRepeat),
    withTiming: jest.fn(reanimated.withTiming),
  };
});

jest.mock('@/api/client', () => ({
  api: {
    me: { get: jest.fn() },
    daily: { get: jest.fn() },
    leagues: { current: jest.fn() },
    leaderboards: { get: jest.fn() },
  },
}));

const mocked = api as unknown as {
  me: { get: jest.Mock };
  daily: { get: jest.Mock };
  leagues: { current: jest.Mock };
  leaderboards: { get: jest.Mock };
};

type Props = Parameters<typeof HomeScreen>[0];

const navigate = jest.fn();
const props = {
  navigation: { navigate },
  route: { key: 'Home', name: 'Home' },
} as unknown as Props;

const NOW = '2026-09-24T10:00:00.000Z';

function daily(attempt: DailyAttempt | null = null): DailyResponse {
  return {
    dayKey: '2026-09-24',
    number: 17,
    endsAt: '2026-09-24T21:00:00.000Z',
    serverTime: NOW,
    attempt,
    top: [],
    me: null,
    players: 1_204,
  };
}

/** A group of thirty, 500 points between neighbours, you at `me`. */
function group(me: number, zone: LeagueZone): LeagueMember[] {
  return Array.from({ length: 30 }, (_, index) => {
    const rank = index + 1;
    return {
      rank,
      username: rank === me ? 'ekin' : `oyuncu${rank}`,
      points: 20_000 - index * 500,
      daysPlayed: 3,
      isMe: rank === me,
      isFollowing: false,
      zone:
        rank === me
          ? zone
          : rank <= 5
            ? 'promote'
            : rank > 25
              ? 'demote'
              : 'stay',
      gap: rank === 1 ? null : 501,
    };
  });
}

function league(overrides: Partial<LeagueResponse> = {}): LeagueResponse {
  return {
    season: 2,
    weekKey: '2026-W39',
    tier: 'gold',
    endsAt: '2026-09-27T21:00:00.000Z',
    serverTime: NOW,
    joined: false,
    members: [],
    me: null,
    promoteCount: 0,
    demoteCount: 0,
    promotionGap: null,
    nextRankProgress: null,
    lastWeek: null,
    ...overrides,
  };
}

function joined(rank: number, zone: LeagueZone): LeagueResponse {
  const members = group(rank, zone);
  return league({
    joined: true,
    members,
    me: members[rank - 1] ?? null,
    promoteCount: 5,
    demoteCount: 5,
    // What the API sends: fifth place's points − yours + 1, null once you are in.
    promotionGap: rank > 5 ? (members[4]?.points ?? 0) - (members[rank - 1]?.points ?? 0) + 1 : null,
    nextRankProgress: null,
  });
}

function weekly(
  rival: LeaderboardResponse['rival'] = null,
): LeaderboardResponse {
  return {
    board: 'weekly',
    periodKey: '2026-W39',
    season: 2,
    scope: 'everyone',
    startsAt: null,
    endsAt: null,
    serverTime: NOW,
    entries: [],
    me: null,
    neighbors: [],
    rival,
    nextRankProgress: null,
    players: 0,
  };
}

/**
 * Every answer asked for has landed and been drawn: the cache settles first,
 * then its batched notifications reach the screen a tick later.
 */
async function settle(client: QueryClient) {
  await waitFor(() => expect(client.isFetching()).toBe(0));
  await act(async () => {
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 10);
    });
  });
}

async function renderLobby() {
  const result = await renderWithProviders(<HomeScreen {...props} />);
  await settle(result.queryClient);
  return result;
}

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useReducedMotion).mockReturnValue(false);
    useSession.setState({
      token: 'token',
      user: buildMe(),
      ranks: buildRanks(),
      hydrated: true,
    });
    mocked.me.get.mockResolvedValue({ user: buildMe(), ranks: buildRanks() });
    mocked.daily.get.mockResolvedValue(daily());
    mocked.leagues.current.mockResolvedValue(league());
    mocked.leaderboards.get.mockResolvedValue(weekly());
  });

  it('is a lobby, not a manual: the how-to section is gone', async () => {
    await renderLobby();

    expect(screen.queryByText('Nasıl oynanır')).not.toBeOnTheScreen();
    for (const guide of Object.values(REEL_GUIDE)) {
      expect(screen.queryByText(guide.title)).not.toBeOnTheScreen();
    }
  });

  it('shows who is playing, in which league, and opens help', async () => {
    mocked.leagues.current.mockResolvedValue(league({ tier: 'platinum' }));
    await renderLobby();

    expect(screen.getByText('@ekin')).toBeOnTheScreen();
    expect(await screen.findByText('Platin lig')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Yardım' }));
    expect(navigate).toHaveBeenCalledWith('Help');
  });

  it("plays today's daily while it is open, with free play beside it", async () => {
    await renderLobby();

    expect(
      screen.getByText('Herkes aynı akışı oynar · tek hak'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Günün akışı #17')).toBeOnTheScreen();
    expect(screen.getByText('Bitmesine 11 sa 0 dk')).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Günün akışını oyna' }),
    );
    expect(navigate).toHaveBeenCalledWith('Game', { mode: 'daily' });

    await fireEvent.press(screen.getByRole('button', { name: 'Serbest oyna' }));
    expect(navigate).toHaveBeenCalledWith('Game', { mode: 'free' });
  });

  it("shows today's result once played, and the button turns to free play", async () => {
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.sharedAction });
    const shareText = 'Quezby · Günün akışı #17 · 18.420\n🟩🟩🟨⬛';
    mocked.daily.get.mockResolvedValue(
      daily({
        status: 'ranked',
        score: 18_420,
        rank: 12,
        grid: '🟩🟩🟨⬛',
        shareText,
      }),
    );
    await renderLobby();

    expect(screen.getByText('18.420')).toBeOnTheScreen();
    expect(screen.getByText('#12 / 1.204 oyuncu')).toBeOnTheScreen();
    expect(screen.getByText('Yeni akışa 11 sa 0 dk')).toBeOnTheScreen();
    expect(screen.queryByText('Günün akışını oyna')).not.toBeOnTheScreen();
    expect(screen.queryByText('Serbest oyna')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Paylaş' }));
    expect(share).toHaveBeenCalledWith({ message: shareText });

    await fireEvent.press(
      screen.getByRole('button', { name: 'Sıralamayı gör' }),
    );
    expect(navigate).toHaveBeenCalledWith('Daily');

    await fireEvent.press(screen.getByRole('button', { name: 'Oyna' }));
    expect(navigate).toHaveBeenCalledWith('Game', { mode: 'free' });
    expect(navigate).not.toHaveBeenCalledWith('Game', { mode: 'daily' });
  });

  it('says so when today’s score is held for a look', async () => {
    mocked.daily.get.mockResolvedValue(
      daily({
        status: 'review',
        score: 250_000,
        rank: null,
        grid: null,
        shareText: null,
      }),
    );
    await renderLobby();

    expect(screen.getByText('250.000')).toBeOnTheScreen();
    expect(screen.getByText('Skorun inceleniyor')).toBeOnTheScreen();
    expect(screen.queryByText('Paylaş')).not.toBeOnTheScreen();
  });

  it('still offers a game when the daily cannot be loaded', async () => {
    mocked.daily.get.mockRejectedValue(new Error('offline'));
    await renderLobby();

    expect(
      screen.getByText('Bir şeyler ters gitti. Tekrar dene.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Oyna' }));
    expect(navigate).toHaveBeenCalledWith('Game', { mode: 'free' });
    expect(
      screen.getByRole('button', { name: 'Tekrar dene' }),
    ).toBeOnTheScreen();
  });

  it('shows your place in the league and what promotion takes', async () => {
    mocked.leagues.current.mockResolvedValue(joined(7, 'stay'));
    await renderLobby();

    expect(await screen.findByText('#7/30 · 17.000 puan')).toBeOnTheScreen();
    // Fifth place holds 18.000; a tie goes to whoever got there first.
    expect(screen.getByText('Terfiye 1.001 puan')).toBeOnTheScreen();
    expect(screen.getByText(/^Bitmesine 3 g/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Terfiye 1.001 puan'));
    expect(navigate).toHaveBeenCalledWith('League');
  });

  it.each<[LeagueZone, number, string]>([
    ['promote', 2, 'Terfi bölgesindesin'],
    ['demote', 28, 'Düşme bölgesindesin'],
  ])('names the %s zone', async (zone, rank, line) => {
    mocked.leagues.current.mockResolvedValue(joined(rank, zone));
    await renderLobby();

    expect(await screen.findByText(line)).toBeOnTheScreen();
  });

  it('invites you into the league before your first ranked run', async () => {
    await renderLobby();

    expect(
      await screen.findByText('Bu hafta ilk turunu oyna, ligine katıl.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/Terfi/)).not.toBeOnTheScreen();
  });

  it('points at the player to pass this week', async () => {
    mocked.leaderboards.get.mockResolvedValue(
      weekly({
        entry: buildEntry({ username: 'deniz', rank: 11 }),
        gap: 1_001,
      }),
    );
    await renderLobby();

    expect(await screen.findByText('Hedefin')).toBeOnTheScreen();
    expect(screen.getByText("@deniz'e 1.001 puan")).toBeOnTheScreen();
    expect(
      screen.getByText('@deniz haftalık sıralamada hemen önünde.'),
    ).toBeOnTheScreen();
    expect(mocked.leaderboards.get).toHaveBeenCalledWith('weekly', {
      scope: 'everyone',
      limit: 3,
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Geç onu' }));
    expect(navigate).toHaveBeenCalledWith('Game', { mode: 'free' });
  });

  it('shows no target with nobody right above you', async () => {
    await renderLobby();

    expect(screen.queryByText('Hedefin')).not.toBeOnTheScreen();
    expect(screen.queryByText('Geç onu')).not.toBeOnTheScreen();
  });

  it('keeps your records on a strip that opens the boards', async () => {
    await renderLobby();

    expect(screen.getByText('Sezon rekoru')).toBeOnTheScreen();
    expect(screen.getByText('12.345')).toBeOnTheScreen();
    for (const rank of ['#44', '#120', '#310', '#1.204']) {
      expect(screen.getByText(rank)).toBeOnTheScreen();
    }
    for (const label of ['Bugün', 'Hafta', 'Ay', 'Tüm zamanlar']) {
      expect(screen.getByText(label)).toBeOnTheScreen();
    }

    await fireEvent.press(screen.getByText('#310'));
    expect(navigate).toHaveBeenCalledWith('Leaderboard');
  });

  it('breathes the play button while the lobby is up', async () => {
    await renderLobby();

    expect(withRepeat).toHaveBeenCalledWith(expect.anything(), -1);
    expect(withTiming).toHaveBeenCalledWith(
      1.04,
      expect.objectContaining({ duration: 1600 }),
    );
  });

  it('does not loop for a player who reduces motion', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    await renderLobby();

    expect(
      screen.getByRole('button', { name: 'Günün akışını oyna' }),
    ).toBeOnTheScreen();
    expect(withTiming).not.toHaveBeenCalledWith(1.04, expect.anything());
    expect(withRepeat).not.toHaveBeenCalledWith(expect.anything(), -1);
  });

  it('pulls to refresh you, the daily, the league and the week', async () => {
    const { queryClient } = await renderLobby();
    const before = {
      me: mocked.me.get.mock.calls.length,
      daily: mocked.daily.get.mock.calls.length,
      league: mocked.leagues.current.mock.calls.length,
      board: mocked.leaderboards.get.mock.calls.length,
    };

    await act(async () => {
      screen.getByTestId('lobby').props.refreshControl.props.onRefresh();
    });
    await settle(queryClient);

    expect(mocked.me.get).toHaveBeenCalledTimes(before.me + 1);
    expect(mocked.daily.get).toHaveBeenCalledTimes(before.daily + 1);
    expect(mocked.leagues.current).toHaveBeenCalledTimes(before.league + 1);
    expect(mocked.leaderboards.get).toHaveBeenCalledTimes(before.board + 1);
  });

  it('spins only for a pull, never for a refetch of its own', async () => {
    const { queryClient } = await renderLobby();
    let resolve: (value: ReturnType<typeof daily>) => void = () => undefined;
    mocked.daily.get.mockImplementation(
      () => new Promise((done) => {
        resolve = done;
      }),
    );

    await act(async () => {
      void queryClient.invalidateQueries();
    });
    expect(screen.getByTestId('lobby').props.refreshControl.props.refreshing).toBe(false);

    await act(async () => {
      resolve(daily());
    });
    await settle(queryClient);
  });
});
