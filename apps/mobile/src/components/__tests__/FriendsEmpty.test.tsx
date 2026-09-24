import { fireEvent, screen } from '@testing-library/react-native';

import { api } from '@/api/client';
import { FriendsEmpty } from '@/components/FriendsEmpty';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: { me: { following: jest.fn() } },
}));

const mocked = api as unknown as { me: { following: jest.Mock } };

describe('FriendsEmpty', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends a player who follows nobody to find players', async () => {
    mocked.me.following.mockResolvedValue({ users: [], nextCursor: null });
    const onSearch = jest.fn();
    await renderWithProviders(
      <FriendsEmpty onSearch={onSearch} onPlay={jest.fn()} />,
    );

    expect(
      await screen.findByText('Henüz kimseyi takip etmiyorsun'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Oyuncu ara' }));

    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('tells a player whose friends have not played yet to set the bar', async () => {
    mocked.me.following.mockResolvedValue({
      users: [
        { username: 'oya', best: 9_000, league: null, isFollowing: true },
      ],
      nextCursor: null,
    });
    const onPlay = jest.fn();
    await renderWithProviders(
      <FriendsEmpty onSearch={jest.fn()} onPlay={onPlay} />,
    );

    expect(
      await screen.findByText('Takip ettiklerin henüz oynamadı'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Oyna' }));

    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('offers no run where playing now is not an option', async () => {
    mocked.me.following.mockResolvedValue({
      users: [
        { username: 'oya', best: 9_000, league: null, isFollowing: true },
      ],
      nextCursor: null,
    });
    await renderWithProviders(<FriendsEmpty onSearch={jest.fn()} />);

    expect(
      await screen.findByText('Takip ettiklerin henüz oynamadı'),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });

  it('still offers the search when the list cannot be read', async () => {
    mocked.me.following.mockRejectedValue(new Error('offline'));
    await renderWithProviders(<FriendsEmpty onSearch={jest.fn()} />);

    expect(
      await screen.findByRole('button', { name: 'Oyuncu ara' }),
    ).toBeOnTheScreen();
  });
});
