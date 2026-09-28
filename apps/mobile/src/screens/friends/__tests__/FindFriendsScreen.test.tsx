import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/api/client';
import { FindFriendsScreen } from '@/screens/friends/FindFriendsScreen';
import { buildSummary } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: {
    me: { friendRequests: jest.fn() },
    users: { search: jest.fn(), get: jest.fn(), addFriend: jest.fn(), removeFriend: jest.fn() },
  },
}));

const mocked = api as unknown as {
  me: { friendRequests: jest.Mock };
  users: { search: jest.Mock; get: jest.Mock; addFriend: jest.Mock; removeFriend: jest.Mock };
};

type Props = Parameters<typeof FindFriendsScreen>[0];

async function renderFind() {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  await renderWithProviders(
    <FindFriendsScreen
      navigation={navigation as unknown as Props['navigation']}
      route={{ key: 'FindFriends-test', name: 'FindFriends' } as Props['route']}
    />,
  );
  return navigation;
}

/** Types into the field; a search the API is asked for waits out the typing pause. */
async function search(text: string, asked = true) {
  await fireEvent.changeText(screen.getByLabelText('Kullanıcı adı'), text);
  if (asked) await waitFor(() => expect(mocked.users.search).toHaveBeenCalledWith(text), { timeout: 3000 });
}

beforeEach(() => {
  jest.clearAllMocks();
  mocked.me.friendRequests.mockResolvedValue({ incoming: [], outgoing: [] });
  mocked.users.search.mockResolvedValue({ users: [] });
});

describe('FindFriendsScreen', () => {
  it('invites a search, with nothing sent yet', async () => {
    await renderFind();

    expect(await screen.findByText('Bir oyuncu ara')).toBeOnTheScreen();
  });

  it('lists the requests the player sent, and takes one back', async () => {
    mocked.me.friendRequests
      .mockResolvedValueOnce({
        incoming: [],
        outgoing: [{ player: buildSummary({ username: 'deniz', relation: 'requested' }), requestedAt: '2026-09-24T08:00:00.000Z' }],
      })
      .mockResolvedValue({ incoming: [], outgoing: [] });
    mocked.users.removeFriend.mockResolvedValue({ relation: 'none' });
    await renderFind();

    expect(await screen.findByText('Gönderdiğin istekler')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Geri al' }));

    expect(mocked.users.removeFriend).toHaveBeenCalledWith('deniz');
    expect(await screen.findByText('Bir oyuncu ara')).toBeOnTheScreen();
  });

  it('finds players by the start of their name, each with what the two can do', async () => {
    mocked.users.search.mockResolvedValue({
      users: [
        buildSummary({ username: 'deniz', relation: 'none' }),
        buildSummary({ username: 'derya', relation: 'incoming' }),
        buildSummary({ username: 'demet', relation: 'friend' }),
      ],
    });
    const navigation = await renderFind();

    await search('de');

    expect(await screen.findByText('@deniz')).toBeOnTheScreen();
    expect(mocked.users.search).toHaveBeenCalledWith('de');
    expect(screen.getByRole('button', { name: 'Ekle' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Kabul et' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Sohbet' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Thread', { username: 'demet' });
  });

  it('asks to be friends, and shows the API’s answer at once', async () => {
    mocked.users.search
      .mockResolvedValueOnce({ users: [buildSummary({ username: 'deniz', relation: 'none' })] })
      .mockResolvedValue({ users: [buildSummary({ username: 'deniz', relation: 'requested' })] });
    mocked.users.addFriend.mockResolvedValue({ relation: 'requested' });
    await renderFind();

    await search('den');
    await fireEvent.press(await screen.findByRole('button', { name: 'Ekle' }));

    expect(mocked.users.addFriend).toHaveBeenCalledWith('deniz');
    expect(await screen.findByRole('button', { name: 'Geri al' })).toBeOnTheScreen();
  });

  it('says when nobody’s name starts that way', async () => {
    await renderFind();

    await search('zzz');

    expect(await screen.findByText('Kimse bulunamadı')).toBeOnTheScreen();
    expect(screen.getByText('Adı “zzz” ile başlayan bir oyuncu yok. Yazdığını kontrol et.')).toBeOnTheScreen();
  });

  it('asks for two letters, and refuses a Turkish letter the names never have', async () => {
    await renderFind();

    await search('d', false);
    expect(screen.getByText('Aramak için en az 2 karakter yaz.')).toBeOnTheScreen();

    await search('dö', false);
    await waitFor(() => expect(mocked.users.search).not.toHaveBeenCalled());
  });

  it('goes back', async () => {
    const navigation = await renderFind();

    await fireEvent.press(screen.getByRole('button', { name: 'Geri' }));

    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });
});
