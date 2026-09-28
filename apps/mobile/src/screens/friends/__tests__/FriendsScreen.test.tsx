import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/api/client';
import { getT } from '@/i18n';
import { useLanguage } from '@/i18n/language';
import { FriendsScreen, previewOf } from '@/screens/friends/FriendsScreen';
import { usePush } from '@/stores/push';
import { buildBrief, buildMessage, buildSummary, buildThread } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: {
    me: { friends: jest.fn(), friendRequests: jest.fn() },
    users: { get: jest.fn(), addFriend: jest.fn(), removeFriend: jest.fn() },
  },
}));

const mocked = api as unknown as {
  me: { friends: jest.Mock; friendRequests: jest.Mock };
  users: { get: jest.Mock; addFriend: jest.Mock; removeFriend: jest.Mock };
};

type Props = Parameters<typeof FriendsScreen>[0];

async function renderFriends() {
  const navigation = { navigate: jest.fn() };
  await renderWithProviders(
    <FriendsScreen
      navigation={navigation as unknown as Props['navigation']}
      route={{ key: 'Friends-test', name: 'Friends' } as Props['route']}
    />,
  );
  return navigation;
}

beforeEach(() => {
  jest.clearAllMocks();
  usePush.setState({ permission: 'granted' });
  mocked.me.friendRequests.mockResolvedValue({ incoming: [], outgoing: [] });
  mocked.me.friends.mockResolvedValue({ friends: [], nextCursor: null });
});

describe('FriendsScreen', () => {
  it('puts the requests waiting for the player first, and accepts one', async () => {
    mocked.me.friendRequests
      .mockResolvedValueOnce({
        incoming: [{ player: buildSummary({ username: 'deniz', relation: 'incoming' }), requestedAt: '2026-09-24T08:00:00.000Z' }],
        outgoing: [],
      })
      .mockResolvedValue({ incoming: [], outgoing: [] });
    mocked.users.addFriend.mockResolvedValue({ relation: 'friend' });
    await renderFriends();

    expect(await screen.findByText('İstekler')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Kabul et' }));

    expect(mocked.users.addFriend).toHaveBeenCalledWith('deniz');
    expect(await screen.findByText('Henüz arkadaşın yok')).toBeOnTheScreen();
  });

  it('turns a request down', async () => {
    mocked.me.friendRequests
      .mockResolvedValueOnce({
        incoming: [{ player: buildSummary({ username: 'deniz', relation: 'incoming' }), requestedAt: '2026-09-24T08:00:00.000Z' }],
        outgoing: [],
      })
      .mockResolvedValue({ incoming: [], outgoing: [] });
    mocked.users.removeFriend.mockResolvedValue({ relation: 'none' });
    await renderFriends();

    await fireEvent.press(await screen.findByRole('button', { name: 'Reddet' }));

    expect(mocked.users.removeFriend).toHaveBeenCalledWith('deniz');
    await waitFor(() => expect(screen.queryByText('İstekler')).toBeNull());
  });

  it('lists a conversation per friend, its newest line and what is unread, and opens it', async () => {
    mocked.me.friends.mockResolvedValue({
      friends: [buildThread({ player: buildSummary({ username: 'ekin', relation: 'friend' }), unread: 2 })],
      nextCursor: null,
    });
    const navigation = await renderFriends();

    expect(await screen.findByText('Mesaj kutusu')).toBeOnTheScreen();
    expect(screen.getByText('İyi oyundu! 👏')).toBeOnTheScreen();
    const row = screen.getByLabelText(/^@ekin\. İyi oyundu! 👏\. .+\. 2 okunmamış mesaj$/);
    await fireEvent.press(row);

    expect(navigation.navigate).toHaveBeenCalledWith('Thread', { username: 'ekin' });
  });

  it('tags a VS waiting on either of you', async () => {
    mocked.me.friends.mockResolvedValue({
      friends: [
        buildThread({ player: buildSummary({ username: 'ekin', relation: 'friend' }), duel: buildBrief({ turn: 'you' }) }),
        buildThread({ player: buildSummary({ username: 'mert', relation: 'friend' }), duel: buildBrief({ turn: 'them' }) }),
      ],
      nextCursor: null,
    });
    await renderFriends();

    expect(await screen.findByText('SENİN SIRAN')).toBeOnTheScreen();
    expect(screen.getByText('ONUN SIRASI')).toBeOnTheScreen();
  });

  it('sends a player with nobody yet to find friends, from the empty inbox and the corner', async () => {
    const navigation = await renderFriends();

    expect(await screen.findByText('Henüz arkadaşın yok')).toBeOnTheScreen();
    const finds = screen.getAllByRole('button', { name: 'Arkadaş bul' });
    for (const find of finds) await fireEvent.press(find);

    expect(navigation.navigate).toHaveBeenCalledTimes(finds.length);
    expect(navigation.navigate).toHaveBeenCalledWith('FindFriends');
  });

  it('says so when the inbox does not come, and asks again', async () => {
    mocked.me.friends.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ friends: [], nextCursor: null });
    await renderFriends();

    expect(await screen.findByText('Arkadaşların yüklenemedi')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));

    expect(await screen.findByText('Henüz arkadaşın yok')).toBeOnTheScreen();
    expect(mocked.me.friends).toHaveBeenCalledTimes(2);
  });

  it('asks for notifications at the top while they are off', async () => {
    usePush.setState({ permission: 'undetermined', nudgeHiddenUntil: 0 });
    await renderFriends();

    expect(await screen.findByText('Bildirimler kapalı')).toBeOnTheScreen();
  });

  it('speaks English', async () => {
    await act(async () => useLanguage.setState({ locale: 'en' }));
    await renderFriends();

    expect(await screen.findByText('No friends yet')).toBeOnTheScreen();
    await act(async () => useLanguage.setState({ locale: 'tr' }));
  });
});

describe('a conversation’s newest line', () => {
  const t = getT();

  it('says who said what, and what happened between the two', () => {
    expect(previewOf(null, t)).toBe('Henüz bir şey yok — bir VS at!');
    expect(previewOf(buildMessage({ kind: 'friends', phrase: null }), t)).toBe('Artık arkadaşsınız 🎉');
    expect(previewOf(buildMessage({ mine: true }), t)).toBe('Sen: İyi oyundu! 👏');
    expect(previewOf(buildMessage({ kind: 'vs_invite', phrase: null, mine: false }), t)).toBe('Seni VS’e çağırdı!');
    expect(previewOf(buildMessage({ kind: 'vs_declined', phrase: null, mine: true }), t)).toBe('VS’i reddettin');
    expect(previewOf(buildMessage({ kind: 'vs_expired', phrase: null }), t)).toBe('VS’in süresi doldu');
  });

  it('gives a VS result with both scores, a run left unfinished without one', () => {
    const won = buildBrief({
      status: 'finished',
      turn: null,
      you: { score: 12_450, valid: true },
      them: { score: null, valid: false },
      outcome: 'won',
      expiresAt: null,
    });

    expect(previewOf(buildMessage({ kind: 'vs_result', phrase: null, duel: won }), t)).toBe('VS’i kazandın · 12.450 – —');
  });
});
