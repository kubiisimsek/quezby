import type { InboxSummary } from '@quezby/types';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/api/client';
import { getT, iso } from '@/i18n';
import { useLanguage } from '@/i18n/language';
import { AlertsScreen, alertLine } from '@/screens/alerts/AlertsScreen';
import {
  buildBrief,
  buildCard,
  buildInbox,
  buildNotification,
  buildSummary,
} from '@/test/factories';
import { createTestQueryClient, renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: {
    me: { notifications: jest.fn(), seeNotifications: jest.fn() },
    users: { get: jest.fn(), addFriend: jest.fn(), removeFriend: jest.fn() },
    duels: { decline: jest.fn() },
  },
}));

const mocked = api as unknown as {
  me: { notifications: jest.Mock; seeNotifications: jest.Mock };
  users: { get: jest.Mock; addFriend: jest.Mock; removeFriend: jest.Mock };
  duels: { decline: jest.Mock };
};

type Props = Parameters<typeof AlertsScreen>[0];

const request = buildNotification({
  id: 'request:mert',
  kind: 'friend_request',
  player: buildSummary({ username: 'mert', relation: 'incoming' }),
  duel: null,
});

async function renderAlerts(queryClient = createTestQueryClient()) {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  await renderWithProviders(
    <AlertsScreen
      navigation={navigation as unknown as Props['navigation']}
      route={{ key: 'Alerts-test', name: 'Alerts' } as Props['route']}
    />,
    { queryClient },
  );
  return navigation;
}

beforeEach(() => {
  jest.clearAllMocks();
  mocked.me.notifications.mockResolvedValue({ notifications: [], unseen: 0 });
  mocked.me.seeNotifications.mockResolvedValue(undefined);
  mocked.users.get.mockResolvedValue({ player: buildCard({ username: 'mert', relation: 'incoming' }) });
});

describe('AlertsScreen', () => {
  it('lists what happened among friends, newest first, each as a notice', async () => {
    mocked.me.notifications.mockResolvedValue({
      notifications: [
        buildNotification(),
        buildNotification({
          id: 'message:6',
          kind: 'vs_result',
          player: buildSummary({ username: 'oya', relation: 'friend' }),
          duel: buildBrief({ status: 'finished', turn: null, outcome: 'won', expiresAt: null }),
          unseen: false,
        }),
        buildNotification({ id: 'message:5', kind: 'friends', player: buildSummary({ username: 'ada', relation: 'friend' }), duel: null, unseen: false }),
      ],
      unseen: 1,
    });
    await renderAlerts();

    expect(await screen.findByText('@deniz sana VS attı')).toBeOnTheScreen();
    expect(screen.getByText('@oya ile VS’i kazandın')).toBeOnTheScreen();
    expect(screen.getByText('@ada isteğini kabul etti')).toBeOnTheScreen();
    expect(screen.getByText('VS SONUCU')).toBeOnTheScreen();
    expect(screen.getByText('YENİ ARKADAŞ')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Yeni, @deniz sana VS attı, /)).toBeOnTheScreen();
    expect(screen.getByLabelText(/^@oya ile VS’i kazandın, /)).toBeOnTheScreen();
  });

  it('takes the bell\'s badge to zero once it is on screen, and only when something was new', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData<InboxSummary>(['inbox'], buildInbox({ notifications: 2 }));
    mocked.me.notifications.mockResolvedValue({ notifications: [buildNotification()], unseen: 2 });
    await renderAlerts(queryClient);

    await waitFor(() => expect(mocked.me.seeNotifications).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(queryClient.getQueryData<InboxSummary>(['inbox'])?.notifications).toBe(0));
    // What was new stays lit while the list is open.
    expect(screen.getByLabelText(/^Yeni, /)).toBeOnTheScreen();
  });

  it('asks nothing to be marked when all of it was seen', async () => {
    mocked.me.notifications.mockResolvedValue({ notifications: [buildNotification({ unseen: false })], unseen: 0 });
    await renderAlerts();

    expect(await screen.findByText('@deniz sana VS attı')).toBeOnTheScreen();
    expect(mocked.me.seeNotifications).not.toHaveBeenCalled();
  });

  it('answers a friend request right here', async () => {
    mocked.me.notifications.mockResolvedValue({ notifications: [request], unseen: 0 });
    mocked.users.addFriend.mockResolvedValue({ relation: 'friend' });
    mocked.users.removeFriend.mockResolvedValue({ relation: 'none' });
    await renderAlerts();

    expect(await screen.findByText('@mert sana arkadaşlık isteği gönderdi')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Kabul et' }));
    expect(mocked.users.addFriend).toHaveBeenCalledWith('mert');

    await fireEvent.press(screen.getByRole('button', { name: 'Reddet' }));
    expect(mocked.users.removeFriend).toHaveBeenCalledWith('mert');
  });

  it('opens the player\'s card from a request', async () => {
    mocked.me.notifications.mockResolvedValue({ notifications: [request], unseen: 0 });
    await renderAlerts();

    await fireEvent.press(await screen.findByLabelText(/^Yeni, @mert sana arkadaşlık isteği gönderdi/));

    await waitFor(() => expect(mocked.users.get).toHaveBeenCalledWith('mert'));
  });

  it('plays a VS waiting for you with ✓, and turns it down with ✗', async () => {
    mocked.me.notifications.mockResolvedValue({ notifications: [buildNotification({ unseen: false })], unseen: 0 });
    mocked.duels.decline.mockResolvedValue({ duel: {} });
    const navigation = await renderAlerts();

    await fireEvent.press(await screen.findByRole('button', { name: 'Kabul et' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Game', {
      mode: 'vs',
      opponent: 'deniz',
      duelId: '01jduel0000000000000000001',
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Reddet' }));
    expect(mocked.duels.decline).toHaveBeenCalledWith('01jduel0000000000000000001');
  });

  it('offers no answer to a VS that is no longer waiting, and opens the conversation', async () => {
    mocked.me.notifications.mockResolvedValue({
      notifications: [
        buildNotification({ duel: buildBrief({ status: 'expired', turn: null, expiresAt: null }), unseen: false }),
      ],
      unseen: 0,
    });
    const navigation = await renderAlerts();

    await fireEvent.press(await screen.findByLabelText(/^@deniz sana VS attı/));

    expect(screen.queryByRole('button', { name: 'Kabul et' })).toBeNull();
    expect(navigation.navigate).toHaveBeenCalledWith('Thread', { username: 'deniz' });
  });

  it('says so while nothing has happened yet', async () => {
    await renderAlerts();

    expect(await screen.findByText('Henüz bildirim yok')).toBeOnTheScreen();
    expect(screen.getByText('Arkadaşlık istekleri ve VS’ler burada görünür.')).toBeOnTheScreen();
  });

  it('says so when the list does not come, and asks again', async () => {
    mocked.me.notifications.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ notifications: [], unseen: 0 });
    await renderAlerts();

    expect(await screen.findByText('Bildirimler yüklenemedi')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));

    expect(await screen.findByText('Henüz bildirim yok')).toBeOnTheScreen();
  });

  it('goes back', async () => {
    const navigation = await renderAlerts();

    await fireEvent.press(await screen.findByRole('button', { name: 'Geri' }));

    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('speaks English', async () => {
    await act(async () => useLanguage.setState({ locale: 'en' }));
    mocked.me.notifications.mockResolvedValue({ notifications: [request], unseen: 0 });
    await renderAlerts();

    expect(await screen.findByText('@mert sent you a friend request')).toBeOnTheScreen();
    expect(screen.getByText('FRIEND REQUEST')).toBeOnTheScreen();
    expect(screen.getByText('Notifications')).toBeOnTheScreen();
    await act(async () => useLanguage.setState({ locale: 'tr' }));
  });
});

describe('a notification\'s line', () => {
  it('says what became of a VS you sent', () => {
    const t = getT();
    const result = (outcome: 'won' | 'lost' | 'draw' | null) =>
      alertLine(
        buildNotification({
          kind: 'vs_result',
          duel: buildBrief({ status: 'finished', turn: null, outcome, expiresAt: null }),
        }),
        t,
      );

    expect(result('lost')).toBe('@deniz ile VS’i kaybettin');
    expect(result('draw')).toBe('@deniz ile VS berabere bitti');
    expect(result(null)).toBe('@deniz ile VS bitti');
    expect(alertLine(buildNotification({ kind: 'vs_declined' }), t)).toBe('@deniz VS’ini reddetti');
    expect(alertLine(buildNotification({ kind: 'vs_expired' }), t)).toBe('@deniz VS’ine zamanında bakmadı');
  });

  it('keeps a name whole inside an Arabic line', () => {
    useLanguage.setState({ locale: 'ar' });
    expect(alertLine(buildNotification(), getT())).toBe(`${iso('@deniz')} أرسل لك تحديًا`);
    useLanguage.setState({ locale: 'tr' });
  });
});
