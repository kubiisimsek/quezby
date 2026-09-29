import { ApiError } from '@quezby/sdk';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { useLanguage } from '@/i18n/language';
import { FriendsScreen } from '@/screens/friends/FriendsScreen';
import { buildCard, buildMe, buildSummary } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: {
    me: { friendRequests: jest.fn() },
    users: {
      friends: jest.fn(),
      get: jest.fn(),
      addFriend: jest.fn(),
      removeFriend: jest.fn(),
    },
  },
}));

const mocked = api as unknown as {
  me: { friendRequests: jest.Mock };
  users: { friends: jest.Mock; get: jest.Mock; addFriend: jest.Mock; removeFriend: jest.Mock };
};

type Props = Parameters<typeof FriendsScreen>[0];

async function renderList(username?: string) {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  await renderWithProviders(
    <FriendsScreen
      navigation={navigation as unknown as Props['navigation']}
      route={{ key: 'Friends-test', name: 'Friends', params: username ? { username } : undefined } as Props['route']}
    />,
  );
  return { navigation };
}

const request = {
  player: buildSummary({ username: 'deniz', relation: 'incoming' }),
  requestedAt: '2026-09-24T08:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  useSession.setState({ user: buildMe({ username: 'ekin' }) });
  mocked.me.friendRequests.mockResolvedValue({ incoming: [], outgoing: [] });
  mocked.users.friends.mockResolvedValue({ friends: [], total: 0, nextCursor: null });
  mocked.users.get.mockResolvedValue({ player: buildCard({ username: 'oya', relation: 'friend' }) });
});

describe('FriendsScreen — your own list', () => {
  it('lists your friends A to Z under the count, and opens a friend’s card', async () => {
    mocked.users.friends.mockResolvedValue({
      friends: [
        buildSummary({ username: 'mert', relation: 'friend' }),
        buildSummary({ username: 'oya', relation: 'friend' }),
      ],
      total: 2,
      nextCursor: null,
    });
    await renderList();

    expect(await screen.findByText('Arkadaşlar')).toBeOnTheScreen();
    expect(await screen.findByText('2 arkadaş')).toBeOnTheScreen();
    expect(mocked.users.friends).toHaveBeenCalledWith('ekin', undefined);
    expect(screen.getByText('@mert')).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText(/^@oya/));
    await waitFor(() => expect(mocked.users.get).toHaveBeenCalledWith('oya'));
  });

  it('puts the requests waiting for you first, and accepts one', async () => {
    mocked.me.friendRequests
      .mockResolvedValueOnce({ incoming: [request], outgoing: [] })
      .mockResolvedValue({ incoming: [], outgoing: [] });
    mocked.users.addFriend.mockResolvedValue({ relation: 'friend' });
    await renderList();

    expect(await screen.findByText('İstekler')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Kabul et' }));

    expect(mocked.users.addFriend).toHaveBeenCalledWith('deniz');
    expect(await screen.findByText('Henüz arkadaşın yok')).toBeOnTheScreen();
  });

  it('turns a request down', async () => {
    mocked.me.friendRequests
      .mockResolvedValueOnce({ incoming: [request], outgoing: [] })
      .mockResolvedValue({ incoming: [], outgoing: [] });
    mocked.users.removeFriend.mockResolvedValue({ relation: 'none' });
    await renderList();

    await fireEvent.press(await screen.findByRole('button', { name: 'Reddet' }));

    expect(mocked.users.removeFriend).toHaveBeenCalledWith('deniz');
    await waitFor(() => expect(screen.queryByText('İstekler')).toBeNull());
  });

  it('finds new players from the corner and from the empty list', async () => {
    const { navigation } = await renderList();

    expect(await screen.findByText('Henüz arkadaşın yok')).toBeOnTheScreen();
    const finds = screen.getAllByRole('button', { name: 'Arkadaş bul' });
    expect(finds).toHaveLength(2);
    for (const find of finds) await fireEvent.press(find);

    expect(navigation.navigate).toHaveBeenCalledTimes(2);
    expect(navigation.navigate).toHaveBeenCalledWith('FindFriends');
  });

  it('goes back', async () => {
    const { navigation } = await renderList();

    await fireEvent.press(await screen.findByRole('button', { name: 'Geri' }));

    expect(navigation.goBack).toHaveBeenCalled();
  });
});

describe('FriendsScreen — a friend’s list', () => {
  it('shows who they are friends with, you among them, and never your requests', async () => {
    mocked.users.friends.mockResolvedValue({
      friends: [
        buildSummary({ username: 'ekin', relation: 'none' }),
        buildSummary({ username: 'oya', relation: 'friend' }),
      ],
      total: 2,
      nextCursor: null,
    });
    await renderList('deniz');

    expect(await screen.findByText('@deniz')).toBeOnTheScreen();
    expect(mocked.users.friends).toHaveBeenCalledWith('deniz', undefined);
    expect(await screen.findByLabelText(/^@ekin, sen/)).toBeOnTheScreen();
    expect(mocked.me.friendRequests).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Arkadaş bul' })).toBeNull();
  });

  it('is locked to anyone who is not their friend', async () => {
    mocked.users.friends.mockRejectedValue(new ApiError(403, 'friends_hidden', 'x'));
    await renderList('deniz');

    expect(await screen.findByText('Bu liste kilitli')).toBeOnTheScreen();
    expect(screen.getByText('@deniz ile arkadaş olunca listesini görürsün.')).toBeOnTheScreen();
    expect(mocked.users.friends).toHaveBeenCalledTimes(1);
  });

  it('says a friend with nobody on the list has nobody yet', async () => {
    await renderList('deniz');

    expect(await screen.findByText('Burada henüz kimse yok')).toBeOnTheScreen();
  });

  it('says so when the list does not come, and asks again', async () => {
    mocked.users.friends
      .mockRejectedValueOnce(new ApiError(500, 'server_error', 'x'))
      .mockRejectedValueOnce(new ApiError(500, 'server_error', 'x'))
      .mockResolvedValue({ friends: [], total: 0, nextCursor: null });
    await renderList('deniz');

    // A server's hiccup is asked once more on its own, a second later.
    expect(await screen.findByText('Liste yüklenemedi', {}, { timeout: 4000 })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));

    expect(await screen.findByText('Burada henüz kimse yok')).toBeOnTheScreen();
  });

  it('speaks English', async () => {
    await act(async () => useLanguage.setState({ locale: 'en' }));
    mocked.users.friends.mockRejectedValue(new ApiError(403, 'friends_hidden', 'x'));
    await renderList('deniz');

    expect(await screen.findByText('This list is locked')).toBeOnTheScreen();
    expect(screen.getByText('Become friends with @deniz to see their list.')).toBeOnTheScreen();
    await act(async () => useLanguage.setState({ locale: 'tr' }));
  });
});
