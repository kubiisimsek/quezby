import type {
  DailyAttempt,
  DailyResponse,
  LeaderboardResponse,
  LeagueMember,
  LeagueResponse,
  LeagueZone,
  Locale,
} from '@quezby/types';
import type { QueryClient } from '@tanstack/react-query';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import {
  useReducedMotion,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { track } from '@/analytics/track';
import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { reelGuide } from '@/game/howTo';
import { getT, iso } from '@/i18n';
import { useLanguage } from '@/i18n/language';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { useDeviceVerdict } from '@/stores/deviceVerdict';
import { useOnboarding } from '@/stores/onboarding';
import { useSettings } from '@/stores/settings';
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

jest.mock('@/analytics/track', () => ({ track: jest.fn() }));

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
    unlock: null,
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

/**
 * The game speaks `locale` on a phone that already knows this account — an
 * account seen for the first time would bring its own language (`useMe`).
 */
function speak(locale: Locale) {
  useLanguage.setState({ locale, account: buildMe().id });
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
    useDeviceVerdict.setState({ userId: null, verdict: null, validUntil: null, hydrated: true });
    useSettings.setState({ hydrated: true, consent: 'synced', analytics: true });
    // Asked already — the reminder has tests of its own below.
    useOnboarding.setState({ userId: null, step: null, remindedFor: 'player-1', hydrated: true });
  });

  it('is a lobby, not a manual: the how-to section is gone', async () => {
    await renderLobby();

    expect(screen.queryByText('Nasıl oynanır')).not.toBeOnTheScreen();
    for (const guide of Object.values(reelGuide(getT()))) {
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
    expect(track).toHaveBeenCalledWith('share_daily');

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

  it('shows a locked league with the runs it waits for, and no tier yet', async () => {
    mocked.leagues.current.mockResolvedValue(league({ unlock: { required: 3, remaining: 2 } }));
    await renderLobby();

    expect(await screen.findByText('Lige 2 oyun kaldı')).toBeOnTheScreen();
    expect(screen.getByText('KİLİTLİ')).toBeOnTheScreen();
    expect(screen.getByText('Lig, ilk 3 oyunundan sonra açılır. Deneme turu sayılmaz.')).toBeOnTheScreen();
    expect(screen.queryByText('Altın lig')).not.toBeOnTheScreen();
    expect(screen.queryByText('Bu hafta ilk turunu oyna, ligine katıl.')).not.toBeOnTheScreen();
  });

  describe('on a phone that never answered the usage question', () => {
    beforeEach(() => {
      useSettings.setState({ hydrated: true, consent: 'unasked', analytics: false });
    });

    it('asks it once, up top, with no as easy as yes', async () => {
      await renderLobby();

      expect(screen.getByText('Oyunu birlikte geliştirelim mi?')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'İzin verme' }));

      expect(useSettings.getState()).toMatchObject({ analytics: false, consent: 'pending' });
      expect(screen.queryByText('Oyunu birlikte geliştirelim mi?')).not.toBeOnTheScreen();
    });

    it('keeps the league reminder for after the answer', async () => {
      useOnboarding.setState({ userId: null, step: null, remindedFor: null, hydrated: true });
      mocked.leagues.current.mockResolvedValue(joined(7, 'stay'));
      await renderLobby();

      expect(screen.queryByText(/^Ligdesin!/)).not.toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'İzin ver' }));

      expect(useSettings.getState()).toMatchObject({ analytics: true, consent: 'pending' });
      expect(await screen.findByText(/^Ligdesin! Telefonun değişirse/)).toBeOnTheScreen();
    });
  });

  describe('once a guest\'s league opens', () => {
    beforeEach(() => {
      useOnboarding.setState({ userId: null, step: null, remindedFor: null, hydrated: true });
      mocked.leagues.current.mockResolvedValue(joined(7, 'stay'));
    });

    it('asks, once, to keep the account', async () => {
      const first = await renderLobby();

      expect(await screen.findByText(/^Ligdesin! Telefonun değişirse/)).toBeOnTheScreen();
      expect(useOnboarding.getState().remindedFor).toBe('player-1');
      expect(track).toHaveBeenCalledWith('protect_reminder');

      await first.unmount();
      await renderLobby();
      expect(screen.queryByText(/^Ligdesin!/)).not.toBeOnTheScreen();
    });

    it('never asks an account that is kept already', async () => {
      const kept = buildMe({ isGuest: false, identities: ['apple'] });
      useSession.setState({ user: kept });
      mocked.me.get.mockResolvedValue({ user: kept, ranks: buildRanks() });
      await renderLobby();

      expect(screen.queryByText(/^Ligdesin!/)).not.toBeOnTheScreen();
      expect(useOnboarding.getState().remindedFor).toBeNull();
    });
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
    expect(track).toHaveBeenCalledWith('rival');
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

  it('warns up top when this phone failed the integrity check: its scores never rank', async () => {
    useDeviceVerdict.setState({
      userId: buildMe().id,
      verdict: 'fail',
      validUntil: '2999-01-01T00:00:00.000Z',
      enforced: true,
    });
    await renderLobby();

    expect(screen.getByText('SIRALAMA')).toBeOnTheScreen();
    expect(screen.getByText('Bu cihazda kapalı')).toBeOnTheScreen();
    expect(
      screen.getByText(/güvenlik kontrolü bu cihazı onaylamadı: .* Oynayabilirsin ama skorların sıralamaya girmez\./),
    ).toBeOnTheScreen();
    // The game is still there to play.
    expect(screen.getByRole('button', { name: 'Günün akışını oyna' })).toBeOnTheScreen();
  });

  it.each([
    ['a phone that passed', { userId: 'player-1', verdict: 'pass', validUntil: '2999-01-01T00:00:00.000Z', enforced: true }],
    ['a phone that could not be checked', { userId: 'player-1', verdict: 'unavailable', validUntil: '2999-01-01T00:00:00.000Z', enforced: true }],
    ['another player’s verdict', { userId: 'player-2', verdict: 'fail', validUntil: '2999-01-01T00:00:00.000Z', enforced: true }],
    ['a verdict that ran out', { userId: 'player-1', verdict: 'fail', validUntil: '2000-01-01T00:00:00.000Z', enforced: true }],
    ['no verdict yet', { userId: null, verdict: null, validUntil: null, enforced: true }],
    ['a failing verdict the API only records (local, staging)', { userId: 'player-1', verdict: 'fail', validUntil: '2999-01-01T00:00:00.000Z', enforced: false }],
  ] as const)('shows no warning for %s', async (_case, verdict) => {
    useDeviceVerdict.setState(verdict);
    await renderLobby();

    expect(screen.queryByText('Bu cihazda kapalı')).not.toBeOnTheScreen();
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

  describe('in the player\'s language', () => {
    it('speaks English: today\'s feed, the league, the rival and the records', async () => {
      speak('en');
      mocked.leagues.current.mockResolvedValue(joined(7, 'stay'));
      mocked.leaderboards.get.mockResolvedValue(
        weekly({
          entry: buildEntry({ username: 'deniz', rank: 11 }),
          gap: 1_001,
        }),
      );
      await renderLobby();

      expect(screen.getByText('DAILY FEED')).toBeOnTheScreen();
      expect(screen.getByText('Daily Feed #17')).toBeOnTheScreen();
      expect(
        screen.getByText('Everyone plays the same feed · one shot'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Ends in 11h 0m')).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: 'Play the Daily Feed' }),
      ).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Free play' })).toBeOnTheScreen();

      expect(await screen.findByText('#7/30 · 17,000 points')).toBeOnTheScreen();
      expect(screen.getByText('Gold league')).toBeOnTheScreen();
      expect(screen.getByText('1,001 points to promotion')).toBeOnTheScreen();
      expect(screen.getByText('Ends in 3d 11h')).toBeOnTheScreen();
      expect(screen.getAllByText('THIS WEEK')).toHaveLength(2);

      expect(screen.getByText('Your target')).toBeOnTheScreen();
      expect(screen.getByText('1,001 points to pass @deniz')).toBeOnTheScreen();
      expect(
        screen.getByText('@deniz is right ahead of you in the weekly ranking.'),
      ).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Pass them' })).toBeOnTheScreen();

      expect(screen.getByText('Season record')).toBeOnTheScreen();
      expect(screen.getByText('12,345')).toBeOnTheScreen();
      for (const label of ['Today', 'Week', 'Month', 'All time']) {
        expect(screen.getByText(label)).toBeOnTheScreen();
      }
      expect(screen.getByLabelText('All time: #1,204')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Help' })).toBeOnTheScreen();
    });

    it('counts one game to the league in English, and a played day', async () => {
      speak('en');
      mocked.daily.get.mockResolvedValue(
        daily({
          status: 'review',
          score: 250_000,
          rank: null,
          grid: null,
          shareText: null,
        }),
      );
      mocked.leagues.current.mockResolvedValue(
        league({ unlock: { required: 3, remaining: 1 } }),
      );
      await renderLobby();

      expect(await screen.findByText('1 game to the league')).toBeOnTheScreen();
      expect(screen.getByText('LOCKED')).toBeOnTheScreen();
      expect(
        screen.getByText(
          "The league opens after your first 3 games. The practice run doesn't count.",
        ),
      ).toBeOnTheScreen();

      expect(screen.getByText('Your score today')).toBeOnTheScreen();
      expect(screen.getByText('250,000')).toBeOnTheScreen();
      expect(screen.getByText('Your score is being reviewed')).toBeOnTheScreen();
      expect(screen.getByText('Next feed in 11h 0m')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'See ranking' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Play' })).toBeOnTheScreen();
    });

    it('warns in English when this phone failed the integrity check', async () => {
      speak('en');
      useDeviceVerdict.setState({
        userId: buildMe().id,
        verdict: 'fail',
        validUntil: '2999-01-01T00:00:00.000Z',
        enforced: true,
      });
      await renderLobby();

      expect(screen.getByText('RANKING')).toBeOnTheScreen();
      expect(screen.getByText('Off on this device')).toBeOnTheScreen();
      expect(
        screen.getByText(/security check didn't approve this device: .* You can still play, but your scores won't rank\.$/),
      ).toBeOnTheScreen();
    });

    it('speaks Arabic, with names and ranks kept whole inside the line', async () => {
      speak('ar');
      mocked.daily.get.mockResolvedValue(
        daily({
          status: 'ranked',
          score: 18_420,
          rank: 12,
          grid: '🟩🟩🟨⬛',
          shareText: 'Quezby',
        }),
      );
      mocked.leagues.current.mockResolvedValue(
        league({ unlock: { required: 3, remaining: 2 } }),
      );
      mocked.leaderboards.get.mockResolvedValue(
        weekly({
          entry: buildEntry({ username: 'deniz', rank: 11 }),
          gap: 1_001,
        }),
      );
      await renderLobby();

      expect(screen.getByText('خلاصة اليوم')).toBeOnTheScreen();
      expect(screen.getByText(`خلاصة اليوم ${iso('#17')}`)).toBeOnTheScreen();
      expect(screen.getByText('18,420')).toBeOnTheScreen();
      // 1.204 players: the tail 4 takes the plural of three to ten.
      expect(screen.getByText(`${iso('#12')} / 1,204 لاعبين`)).toBeOnTheScreen();
      expect(screen.getByText('الخلاصة التالية بعد 11 س 0 د')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'شارِك' })).toBeOnTheScreen();

      expect(await screen.findByText('مباراتان للوصول إلى الدوري')).toBeOnTheScreen();
      expect(screen.getByText('مقفل')).toBeOnTheScreen();

      expect(screen.getByText('ضد')).toBeOnTheScreen();
      expect(
        screen.getByText(`1,001 نقطة لتجاوز ${iso('@deniz')}`),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(`يسبقك ${iso('@deniz')} مباشرةً في ترتيب الأسبوع.`),
      ).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'تجاوزه' })).toBeOnTheScreen();
      expect(screen.getByLabelText(`اليوم: ${iso('#44')}`)).toBeOnTheScreen();
    });

    it('turns to a language picked while the lobby is up', async () => {
      speak('tr');
      await renderLobby();
      expect(screen.getByText('Günün akışı #17')).toBeOnTheScreen();

      await act(async () => {
        speak('es');
      });

      expect(screen.getByText('Feed del día #17')).toBeOnTheScreen();
      expect(screen.getByText('Termina en 11 h 0 min')).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: 'Jugar el Feed del día' }),
      ).toBeOnTheScreen();
    });
  });
});
