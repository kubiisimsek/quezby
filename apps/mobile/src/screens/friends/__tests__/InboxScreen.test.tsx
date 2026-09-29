import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { getT } from '@/i18n';
import { useLanguage } from '@/i18n/language';
import { InboxScreen, previewOf } from '@/screens/friends/InboxScreen';
import { usePush } from '@/stores/push';
import {
  buildBrief,
  buildInbox,
  buildMe,
  buildMessage,
  buildSummary,
  buildThread,
} from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: {
    me: { friends: jest.fn(), friendRequests: jest.fn(), inbox: jest.fn() },
    users: { search: jest.fn(), friends: jest.fn(), get: jest.fn(), addFriend: jest.fn(), removeFriend: jest.fn() },
  },
}));

const mocked = api as unknown as {
  me: { friends: jest.Mock; friendRequests: jest.Mock; inbox: jest.Mock };
  users: { search: jest.Mock; friends: jest.Mock; get: jest.Mock; addFriend: jest.Mock; removeFriend: jest.Mock };
};

type Props = Parameters<typeof InboxScreen>[0];

async function renderInbox(segment?: 'messages' | 'friends') {
  const navigation = { navigate: jest.fn(), setParams: jest.fn() };
  await renderWithProviders(
    <InboxScreen
      navigation={navigation as unknown as Props['navigation']}
      route={{ key: 'Inbox-test', name: 'Inbox', params: segment ? { segment } : undefined } as Props['route']}
    />,
  );
  return navigation;
}

beforeEach(() => {
  jest.clearAllMocks();
  usePush.setState({ permission: 'granted' });
  useSession.setState({ user: buildMe({ username: 'ekin' }) });
  mocked.me.friends.mockResolvedValue({ friends: [], nextCursor: null });
  mocked.me.friendRequests.mockResolvedValue({ incoming: [], outgoing: [] });
  mocked.me.inbox.mockResolvedValue(buildInbox());
  mocked.users.friends.mockResolvedValue({ friends: [], total: 0, nextCursor: null });
  mocked.users.search.mockResolvedValue({ users: [] });
});

describe('InboxScreen', () => {
  it('opens on the conversations, the friends one switch away', async () => {
    await renderInbox();

    expect(await screen.findByRole('tab', { name: 'Mesajlar', selected: true })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Arkadaşlar', selected: false })).toBeOnTheScreen();
    expect(mocked.me.friendRequests).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('tab', { name: 'Arkadaşlar' }));

    expect(screen.getByRole('tab', { name: 'Arkadaşlar', selected: true })).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('ör. ekin')).toBeOnTheScreen();
    await waitFor(() => expect(mocked.users.friends).toHaveBeenCalledWith('ekin', undefined));
    expect(mocked.me.friendRequests).toHaveBeenCalled();
  });

  it('adds a new friend from the slab beside the title', async () => {
    const navigation = await renderInbox();

    await fireEvent.press(await screen.findByRole('button', { name: 'Arkadaş ekle' }));

    expect(navigation.navigate).toHaveBeenCalledWith('FindFriends');
  });

  it('counts what waits on each side: conversations, and requests', async () => {
    mocked.me.inbox.mockResolvedValue(buildInbox({ threads: 2, requests: 1 }));
    await renderInbox();

    expect(await screen.findByText('2')).toBeOnTheScreen();
    expect(screen.getByText('1')).toBeOnTheScreen();
  });

  it('opens on the friends side when asked to — the profile\'s counter', async () => {
    const navigation = await renderInbox('friends');

    expect(await screen.findByRole('tab', { name: 'Arkadaşlar', selected: true })).toBeOnTheScreen();
    expect(navigation.setParams).toHaveBeenCalledWith({ segment: undefined });
  });

  it('lists the requests and the friends on the friends side, and answers a request there', async () => {
    mocked.me.friendRequests
      .mockResolvedValueOnce({
        incoming: [{ player: buildSummary({ username: 'deniz', relation: 'incoming' }), requestedAt: '2026-09-24T08:00:00.000Z' }],
        outgoing: [],
      })
      .mockResolvedValue({ incoming: [], outgoing: [] });
    mocked.users.friends.mockResolvedValue({
      friends: [buildSummary({ username: 'mert', relation: 'friend' })],
      total: 1,
      nextCursor: null,
    });
    mocked.users.addFriend.mockResolvedValue({ relation: 'friend' });
    await renderInbox('friends');

    expect(await screen.findByText('İstekler')).toBeOnTheScreen();
    expect(await screen.findByText('@mert')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Kabul et' }));

    expect(mocked.users.addFriend).toHaveBeenCalledWith('deniz');
  });

  it('finds a player by name right on the friends side', async () => {
    mocked.users.search.mockResolvedValue({ users: [buildSummary({ username: 'oya', relation: 'none' })] });
    await renderInbox('friends');

    await fireEvent.changeText(await screen.findByPlaceholderText('ör. ekin'), 'Oy');

    await waitFor(() => expect(mocked.users.search).toHaveBeenCalledWith('oy'));
    expect(await screen.findByText('@oya')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ekle' })).toBeOnTheScreen();
  });

  it('lists a conversation per friend, its newest line and what is unread, and opens it', async () => {
    mocked.me.friends.mockResolvedValue({
      friends: [buildThread({ player: buildSummary({ username: 'ekin', relation: 'friend' }), unread: 2 })],
      nextCursor: null,
    });
    const navigation = await renderInbox();

    expect(await screen.findByText('İyi oyundu! 👏')).toBeOnTheScreen();
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
    await renderInbox();

    expect(await screen.findByText('SENİN SIRAN')).toBeOnTheScreen();
    expect(screen.getByText('ONUN SIRASI')).toBeOnTheScreen();
  });

  it('sends a player with no conversation yet to the friends side', async () => {
    const navigation = await renderInbox();

    expect(await screen.findByText('Henüz mesajın yok')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Arkadaş bul' }));

    expect(screen.getByRole('tab', { name: 'Arkadaşlar', selected: true })).toBeOnTheScreen();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('says so when the inbox does not come, and asks again', async () => {
    mocked.me.friends.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ friends: [], nextCursor: null });
    await renderInbox();

    expect(await screen.findByText('Mesajların yüklenemedi')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));

    expect(await screen.findByText('Henüz mesajın yok')).toBeOnTheScreen();
    expect(mocked.me.friends).toHaveBeenCalledTimes(2);
  });

  it('asks for notifications at the top while they are off', async () => {
    usePush.setState({ permission: 'undetermined', nudgeHiddenUntil: 0 });
    await renderInbox();

    expect(await screen.findByText('Bildirimler kapalı')).toBeOnTheScreen();
  });

  it('speaks English', async () => {
    await act(async () => useLanguage.setState({ locale: 'en' }));
    await renderInbox();

    expect(await screen.findByText('No messages yet')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Messages' })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Friends' })).toBeOnTheScreen();
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
