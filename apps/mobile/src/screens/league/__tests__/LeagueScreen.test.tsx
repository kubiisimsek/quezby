import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  LeagueMember,
  LeagueOutcome,
  LeagueResponse,
  LeagueTier,
} from '@quezby/types';
import { fireEvent, screen } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { api } from '@/api/client';
import { LeagueScreen } from '@/screens/league/LeagueScreen';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: {
    leagues: { current: jest.fn() },
    users: { get: jest.fn(), follow: jest.fn(), unfollow: jest.fn() },
  },
}));

const mocked = api as unknown as {
  leagues: { current: jest.Mock };
  users: { get: jest.Mock };
};

type Props = ComponentProps<typeof LeagueScreen>;

const NOW = '2026-09-24T10:00:00.000Z';
const SEEN_KEY = 'quezby.league.seen.v1';

function member(overrides: Partial<LeagueMember> = {}): LeagueMember {
  return {
    rank: 1,
    username: 'ekin',
    points: 30_000,
    daysPlayed: 4,
    isMe: false,
    isFollowing: false,
    zone: 'stay',
    gap: null,
    ...overrides,
  };
}

/** Six players: two promote, two stay (one of them you), two go down. */
const GROUP: LeagueMember[] = [
  member({
    rank: 1,
    username: 'ekin',
    points: 41_200,
    daysPlayed: 5,
    zone: 'promote',
  }),
  member({
    rank: 2,
    username: 'mert',
    points: 38_000,
    daysPlayed: 4,
    zone: 'promote',
    gap: 3_201,
  }),
  member({
    rank: 3,
    username: 'kubi',
    points: 30_500,
    daysPlayed: 3,
    isMe: true,
    gap: 7_501,
  }),
  member({
    rank: 4,
    username: 'oya',
    points: 22_000,
    daysPlayed: 2,
    gap: 8_501,
  }),
  member({
    rank: 5,
    username: 'deniz',
    points: 9_000,
    daysPlayed: 1,
    zone: 'demote',
    gap: 13_001,
  }),
  member({
    rank: 6,
    username: 'burak',
    points: 1_200,
    daysPlayed: 1,
    zone: 'demote',
    gap: 7_801,
  }),
];

function league(overrides: Partial<LeagueResponse> = {}): LeagueResponse {
  return {
    season: 1,
    weekKey: '2026-W39',
    tier: 'gold',
    endsAt: '2026-09-27T21:00:00.000Z',
    serverTime: NOW,
    joined: true,
    members: GROUP,
    me: GROUP[2] ?? null,
    promoteCount: 2,
    demoteCount: 2,
    promotionGap: null,
    nextRankProgress: null,
    lastWeek: null,
    ...overrides,
  };
}

function lastWeek(
  outcome: LeagueOutcome,
  tier: LeagueTier,
  newTier: LeagueTier,
): LeagueResponse['lastWeek'] {
  return { weekKey: '2026-W38', tier, rank: 3, members: 30, outcome, newTier };
}

async function renderLeague() {
  const navigation = { navigate: jest.fn(), setOptions: jest.fn() };
  await renderWithProviders(
    <LeagueScreen
      navigation={navigation as unknown as Props['navigation']}
      route={{ key: 'League-test', name: 'League' } as Props['route']}
    />,
  );
  return navigation;
}

describe('LeagueScreen — Lig', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('puts the tier, the time left and the rule on the stage', async () => {
    mocked.leagues.current.mockResolvedValue(league());

    await renderLeague();

    expect(await screen.findByText('Altın lig')).toBeOnTheScreen();
    expect(screen.getByRole('image', { name: 'Altın lig' })).toBeOnTheScreen();
    expect(screen.getByText('Bitmesine 3 g 11 sa')).toBeOnTheScreen();
    expect(
      screen.getByText('Puanın: her günün en iyi skorunun toplamı'),
    ).toBeOnTheScreen();
  });

  it('reads out only your own tier; the ladder round it is its picture', async () => {
    mocked.leagues.current.mockResolvedValue(league({ tier: 'silver' }));

    await renderLeague();

    expect(await screen.findByText('Gümüş lig')).toBeOnTheScreen();
    expect(
      screen.getAllByRole('image').map((node) => node.props.accessibilityLabel),
    ).toEqual(['Gümüş lig']);
  });

  it('keeps its head while the league is on its way', async () => {
    mocked.leagues.current.mockReturnValue(new Promise(() => {}));

    await renderLeague();

    expect(screen.getByText('HAFTALIK LİG')).toBeOnTheScreen();
    expect(screen.queryByText(/ lig$/)).not.toBeOnTheScreen();
  });

  it('invites a player who has not played this week to join', async () => {
    mocked.leagues.current.mockResolvedValue(
      league({ joined: false, members: [], me: null }),
    );
    const navigation = await renderLeague();

    expect(
      await screen.findByText('Bu hafta henüz oynamadın'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole('header', { name: 'Terfi bölgesi' }),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText('SENİN KATIN')).not.toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Oyna, ligine katıl' }),
    );
    expect(navigation.navigate).toHaveBeenCalledWith('Game', { mode: 'free' });
  });

  it('bands the group into its zones, with points, days played and gaps', async () => {
    mocked.leagues.current.mockResolvedValue(league());

    await renderLeague();

    expect(
      await screen.findByRole('header', { name: 'Terfi bölgesi' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('TERFİ BÖLGESİ')).toBeOnTheScreen();
    expect(
      screen.getByRole('header', { name: 'Düşme bölgesi' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('DÜŞME BÖLGESİ')).toBeOnTheScreen();
    expect(
      screen
        .getAllByRole('button', { name: /\. sıra, @/ })
        .map((row) => row.props.accessibilityLabel),
    ).toEqual([
      '1. sıra, @ekin, 41.200 puan, 5 gün',
      '2. sıra, @mert, 38.000 puan, 4 gün, geçmek için 3.201 puan',
      '3. sıra, @kubi, sen, 30.500 puan, 3 gün, geçmek için 7.501 puan',
      '4. sıra, @oya, 22.000 puan, 2 gün, geçmek için 8.501 puan',
      '5. sıra, @deniz, 9.000 puan, 1 gün, geçmek için 13.001 puan',
      '6. sıra, @burak, 1.200 puan, 1 gün, geçmek için 7.801 puan',
    ]);
    expect(screen.getByText('3 gün')).toBeOnTheScreen();
    expect(screen.getByText('▲ 7.501')).toBeOnTheScreen();
  });

  it('pins your floor with the player to pass', async () => {
    mocked.leagues.current.mockResolvedValue(league());
    const navigation = await renderLeague();

    expect(await screen.findByText("@mert'e 7.501 puan")).toBeOnTheScreen();
    expect(screen.getByText('SENİN KATIN')).toBeOnTheScreen();
    expect(screen.getByText('#3')).toBeOnTheScreen();
    expect(screen.getByText('Sen · 30.500')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Geç onu' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Game', { mode: 'free' });
  });

  it('opens a player card from a row', async () => {
    mocked.leagues.current.mockResolvedValue(league());
    mocked.users.get.mockReturnValue(new Promise(() => {}));
    await renderLeague();

    await fireEvent.press(
      await screen.findByRole('button', { name: /^4\. sıra, @oya/ }),
    );

    expect(mocked.users.get).toHaveBeenCalledWith('oya');
  });

  it.each([
    ['promoted', 'silver', 'gold', "Altın'a yükseldin!"],
    ['stayed', 'silver', 'silver', 'Gümüş ligde kaldın.'],
    ['demoted', 'gold', 'silver', "Gümüş'e düştün."],
  ] as const)(
    'tells a %s player how last week ended',
    async (outcome, tier, newTier, headline) => {
      mocked.leagues.current.mockResolvedValue(
        league({ lastWeek: lastWeek(outcome, tier, newTier) }),
      );

      await renderLeague();

      expect(await screen.findByText(headline)).toBeOnTheScreen();
      expect(
        screen.getByText(
          `Geçen hafta ${tier === 'gold' ? 'Altın' : 'Gümüş'} ligde #3 oldun.`,
        ),
      ).toBeOnTheScreen();
    },
  );

  it("shows last week's card once, and not again after it is put away", async () => {
    mocked.leagues.current.mockResolvedValue(
      league({ lastWeek: lastWeek('promoted', 'silver', 'gold') }),
    );

    await renderLeague();
    expect(await screen.findByText("Altın'a yükseldin!")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Kapat' }));

    expect(screen.queryByText("Altın'a yükseldin!")).not.toBeOnTheScreen();
    expect(await AsyncStorage.getItem(SEEN_KEY)).toBe('2026-W38');

    await screen.unmount();
    await renderLeague();

    expect(
      await screen.findByRole('header', { name: 'Terfi bölgesi' }),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Altın'a yükseldin!")).not.toBeOnTheScreen();
  });

  it('greets a new week even after an older card was put away', async () => {
    await AsyncStorage.setItem(SEEN_KEY, '2026-W37');
    mocked.leagues.current.mockResolvedValue(
      league({ lastWeek: lastWeek('stayed', 'gold', 'gold') }),
    );

    await renderLeague();

    expect(await screen.findByText('Altın ligde kaldın.')).toBeOnTheScreen();
  });

  it('explains a failed load and tries again', async () => {
    mocked.leagues.current
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(league());
    await renderLeague();

    expect(await screen.findByText('Lig yüklenemedi')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));

    expect(
      await screen.findByRole('header', { name: 'Terfi bölgesi' }),
    ).toBeOnTheScreen();
  });
});
