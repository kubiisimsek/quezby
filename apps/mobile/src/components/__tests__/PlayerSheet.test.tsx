import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/api/client';
import { PlayerSheet } from '@/components/PlayerSheet';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: {
    users: { get: jest.fn(), follow: jest.fn(), unfollow: jest.fn() },
  },
}));

const mocked = api as unknown as {
  users: { get: jest.Mock; follow: jest.Mock; unfollow: jest.Mock };
};

function player(overrides: Record<string, unknown> = {}) {
  return {
    player: {
      username: 'ekin',
      createdAt: '2026-09-01T12:00:00.000Z',
      best: {
        score: 41_200,
        reels: 210,
        achievedAt: '2026-09-24T09:30:00.000Z',
      },
      league: 'gold',
      ranks: { weekly: 12, all: 311 },
      stats: { runs: 40, reels: 5_200, likes: 610, perfects: 90 },
      followers: 8,
      following: 3,
      isFollowing: false,
      followsMe: true,
      isMe: false,
      ...overrides,
    },
  };
}

describe('PlayerSheet', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the card the API sends', async () => {
    mocked.users.get.mockResolvedValue(player());

    await renderWithProviders(
      <PlayerSheet username="ekin" onClose={jest.fn()} />,
    );

    expect(await screen.findByText('41.200')).toBeTruthy();
    expect(screen.getByLabelText('Sezon rekoru: 41.200')).toBeTruthy();
    expect(screen.getByText('210 reel')).toBeTruthy();
    expect(screen.getByLabelText('Altın lig')).toBeTruthy();
    expect(screen.getByText('#12')).toBeTruthy();
    expect(screen.getByText('#311')).toBeTruthy();
    expect(screen.getByText('5.200')).toBeTruthy();
    expect(screen.getByText('90')).toBeTruthy();
    expect(screen.getByText('Seni takip ediyor')).toBeTruthy();
    expect(screen.getByText('8 takipçi · 3 takip')).toBeTruthy();
    expect(mocked.users.get).toHaveBeenCalledWith('ekin');
  });

  it('shows "—" before a season best and no emblem without a league', async () => {
    mocked.users.get.mockResolvedValue(
      player({ best: null, league: null, followsMe: false }),
    );

    await renderWithProviders(
      <PlayerSheet username="ekin" onClose={jest.fn()} />,
    );

    expect(await screen.findByLabelText('Sezon rekoru: —')).toBeTruthy();
    expect(screen.queryByLabelText(/ lig$/)).toBeNull();
    expect(screen.queryByText('Seni takip ediyor')).toBeNull();
  });

  it('follows the player, then shows the card the API sends back', async () => {
    mocked.users.get
      .mockResolvedValueOnce(player())
      .mockResolvedValue(player({ isFollowing: true, followers: 9 }));
    mocked.users.follow.mockResolvedValue(undefined);

    await renderWithProviders(
      <PlayerSheet username="ekin" onClose={jest.fn()} />,
    );
    await fireEvent.press(await screen.findByText('Takip et'));

    expect(mocked.users.follow).toHaveBeenCalledWith('ekin');
    expect(await screen.findByText('9 takipçi · 3 takip')).toBeTruthy();
    expect(screen.getByText('Takibi bırak')).toBeTruthy();
    expect(mocked.users.get).toHaveBeenCalledTimes(2);
  });

  it('offers to unfollow a followed player', async () => {
    mocked.users.get
      .mockResolvedValueOnce(player({ isFollowing: true }))
      .mockResolvedValue(player({ followers: 7 }));
    mocked.users.unfollow.mockResolvedValue(undefined);

    await renderWithProviders(
      <PlayerSheet username="ekin" onClose={jest.fn()} />,
    );
    await fireEvent.press(await screen.findByText('Takibi bırak'));

    expect(mocked.users.unfollow).toHaveBeenCalledWith('ekin');
    expect(await screen.findByText('7 takipçi · 3 takip')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Takip et')).toBeTruthy());
  });

  it('offers nothing to do on your own card', async () => {
    mocked.users.get.mockResolvedValue(player({ isMe: true }));

    await renderWithProviders(
      <PlayerSheet username="ekin" onClose={jest.fn()} />,
    );

    await screen.findByText('41.200');
    expect(screen.getByText('Sen')).toBeTruthy();
    expect(screen.queryByText('Takip et')).toBeNull();
    expect(screen.queryByText('Takibi bırak')).toBeNull();
  });

  it('says so when the card does not come', async () => {
    mocked.users.get.mockRejectedValue(new Error('offline'));

    await renderWithProviders(
      <PlayerSheet username="ekin" onClose={jest.fn()} />,
    );

    expect(await screen.findByText('Oyuncu yüklenemedi')).toBeTruthy();
  });

  it('asks nothing while closed', async () => {
    await renderWithProviders(
      <PlayerSheet username={null} onClose={jest.fn()} />,
    );

    expect(mocked.users.get).not.toHaveBeenCalled();
  });
});
