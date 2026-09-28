import { fireEvent, screen } from '@testing-library/react-native';

import { api } from '@/api/client';
import { FriendsEmpty } from '@/components/FriendsEmpty';
import { useLanguage } from '@/i18n/language';
import { buildThread } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: { me: { friends: jest.fn() } },
}));

const mocked = api as unknown as { me: { friends: jest.Mock } };

describe('FriendsEmpty', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends a player with no friends to find some', async () => {
    mocked.me.friends.mockResolvedValue({ friends: [], nextCursor: null });
    const onSearch = jest.fn();
    await renderWithProviders(<FriendsEmpty onSearch={onSearch} onPlay={jest.fn()} />);

    expect(await screen.findByText('Henüz arkadaşın yok')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Arkadaş bul' }));

    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('tells a player whose friends have not played yet to set the bar', async () => {
    mocked.me.friends.mockResolvedValue({ friends: [buildThread()], nextCursor: null });
    const onPlay = jest.fn();
    await renderWithProviders(<FriendsEmpty onSearch={jest.fn()} onPlay={onPlay} />);

    expect(await screen.findByText('Arkadaşların henüz oynamadı')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Oyna' }));

    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('offers no run where playing now is not an option', async () => {
    mocked.me.friends.mockResolvedValue({ friends: [buildThread()], nextCursor: null });
    await renderWithProviders(<FriendsEmpty onSearch={jest.fn()} />);

    expect(await screen.findByText('Arkadaşların henüz oynamadı')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });

  it('still offers the search when the list cannot be read', async () => {
    mocked.me.friends.mockRejectedValue(new Error('offline'));
    await renderWithProviders(<FriendsEmpty onSearch={jest.fn()} />);

    expect(await screen.findByRole('button', { name: 'Arkadaş bul' })).toBeOnTheScreen();
  });
});

describe('FriendsEmpty — in English', () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => useLanguage.setState({ locale: 'tr' }));

  it('sends a player with no friends to find some, in English', async () => {
    useLanguage.setState({ locale: 'en' });
    mocked.me.friends.mockResolvedValue({ friends: [], nextCursor: null });
    await renderWithProviders(<FriendsEmpty onSearch={jest.fn()} />);

    expect(await screen.findByText('No friends yet')).toBeOnTheScreen();
    expect(screen.getByText('Your friends race you here.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Find friends' })).toBeOnTheScreen();
  });

  it('asks the player to set the bar, in English', async () => {
    useLanguage.setState({ locale: 'en' });
    mocked.me.friends.mockResolvedValue({ friends: [buildThread()], nextCursor: null });
    await renderWithProviders(<FriendsEmpty onSearch={jest.fn()} onPlay={jest.fn()} />);

    expect(await screen.findByText("Your friends haven't played yet")).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Play' })).toBeOnTheScreen();
  });
});
