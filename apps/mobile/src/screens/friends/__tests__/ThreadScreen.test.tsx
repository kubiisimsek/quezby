import { ApiError } from '@quezby/sdk';
import type { ThreadResponse } from '@quezby/types';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { ThreadScreen } from '@/screens/friends/ThreadScreen';
import { usePush } from '@/stores/push';
import { buildBrief, buildDuel, buildMe, buildMessage, buildSummary } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: {
    me: { thread: jest.fn(), readThread: jest.fn(), sendPhrase: jest.fn() },
    duels: { decline: jest.fn() },
    users: { get: jest.fn() },
  },
}));

const mocked = api as unknown as {
  me: { thread: jest.Mock; readThread: jest.Mock; sendPhrase: jest.Mock };
  duels: { decline: jest.Mock };
  users: { get: jest.Mock };
};

type Props = Parameters<typeof ThreadScreen>[0];

const EKIN = buildSummary({ username: 'ekin', relation: 'friend' });

function thread(overrides: Partial<ThreadResponse> = {}): ThreadResponse {
  return {
    player: EKIN,
    h2h: { wins: 3, losses: 2, draws: 0 },
    duel: null,
    messages: [
      buildMessage({ id: 1, kind: 'friends', phrase: null }),
      buildMessage({ id: 2, phrase: 'gg' }),
      buildMessage({ id: 3, phrase: 'thanks', mine: true }),
    ],
    nextBefore: null,
    ...overrides,
  };
}

async function renderThread() {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  await renderWithProviders(
    <ThreadScreen
      navigation={navigation as unknown as Props['navigation']}
      route={{ key: 'Thread-test', name: 'Thread', params: { username: 'ekin' } } as Props['route']}
    />,
  );
  return navigation;
}

beforeEach(() => {
  jest.clearAllMocks();
  useSession.setState({ token: 'token', user: buildMe({ username: 'ben' }), ranks: null, hydrated: true });
  usePush.setState({ permission: 'granted' });
  mocked.me.thread.mockResolvedValue(thread());
  mocked.me.readThread.mockResolvedValue(undefined);
});

describe('ThreadScreen', () => {
  it('shows how the two stand and what was said, and reads the conversation', async () => {
    await renderThread();

    expect(await screen.findByText('Artık arkadaşsınız 🎉')).toBeOnTheScreen();
    expect(screen.getAllByText('3 galibiyet · 2 yenilgi · 0 beraberlik').length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/^@ekin: İyi oyundu! 👏\./)).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Sen: Teşekkürler! 🙏\./)).toBeOnTheScreen();
    await waitFor(() => expect(mocked.me.readThread).toHaveBeenCalledWith('ekin'));
  });

  it('sends a phrase from the tray, and it lands at the end of the conversation', async () => {
    mocked.me.sendPhrase.mockResolvedValue({ message: buildMessage({ id: 4, phrase: 'rematch', mine: true }) });
    await renderThread();

    await fireEvent.press(await screen.findByRole('button', { name: 'Gönder: Rövanş? 🔥' }));

    expect(mocked.me.sendPhrase).toHaveBeenCalledWith('ekin', 'rematch');
    expect(await screen.findByLabelText(/^Sen: Rövanş\? 🔥\./)).toBeOnTheScreen();
  });

  it('sends a VS from its sheet: the challenger plays first', async () => {
    jest.useFakeTimers();
    const navigation = await renderThread();

    await fireEvent.press(await screen.findByRole('button', { name: 'VS at' }));
    expect(screen.getByText('Aynı akış; ikinize de birer hak.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Oyna' }));
    await act(async () => {
      jest.advanceTimersByTime(700);
    });

    expect(navigation.navigate).toHaveBeenCalledWith('Game', { mode: 'vs', opponent: 'ekin' });
    jest.useRealTimers();
  });

  it('answers a friend’s VS with the gold slab, or turns it down', async () => {
    const duel = buildDuel({
      id: '01jduel0000000000000000001',
      sent: false,
      turn: 'you',
      you: null,
      opponent: EKIN,
    });
    mocked.me.thread.mockResolvedValue(thread({ duel }));
    mocked.duels.decline.mockResolvedValue({ duel: { ...duel, status: 'declined', turn: null } });
    const navigation = await renderThread();

    expect(await screen.findByText('SENİN SIRAN')).toBeOnTheScreen();
    expect(screen.getByText('@ekin seni VS’e çağırdı. Onun skoru, sen oynayınca açılır.')).toBeOnTheScreen();
    expect(screen.getByRole('timer')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Oyna' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Game', {
      mode: 'vs',
      opponent: 'ekin',
      duelId: '01jduel0000000000000000001',
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Reddet' }));
    await waitFor(() => expect(mocked.duels.decline).toHaveBeenCalledWith('01jduel0000000000000000001'));
  });

  it('waits for the friend with the player’s score, and no way to play', async () => {
    mocked.me.thread.mockResolvedValue(thread({ duel: buildDuel({ opponent: EKIN }) }));
    await renderThread();

    expect(await screen.findByText('SIRA ONDA')).toBeOnTheScreen();
    expect(screen.getByText('Skorun 12.450. @ekin oynayınca sonuç burada.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Oyna' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'VS at' })).toBeNull();
  });

  it('gives a VS result its word and both scores', async () => {
    const result = buildBrief({
      status: 'finished',
      turn: null,
      you: { score: 12_450, valid: true },
      them: { score: 9_800, valid: true },
      outcome: 'won',
      expiresAt: null,
    });
    mocked.me.thread.mockResolvedValue(thread({ messages: [buildMessage({ id: 5, kind: 'vs_result', phrase: null, duel: result })] }));
    await renderThread();

    expect(await screen.findByText('KAZANDIN')).toBeOnTheScreen();
    expect(screen.getByText('12.450 – 9.800')).toBeOnTheScreen();
  });

  it('says so when the two are no longer friends', async () => {
    mocked.me.thread.mockRejectedValue(new ApiError(404, 'not_found', 'Bulunamadı.'));
    const navigation = await renderThread();

    expect(await screen.findByText('Artık arkadaş değilsiniz.')).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Geri' })[0]!);
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('asks for notifications under the newest line while they are off', async () => {
    usePush.setState({ permission: 'undetermined', nudgeHiddenUntil: 0 });
    await renderThread();

    expect(await screen.findByText('@ekin oynayınca haberin olsun diye bildirimleri aç.')).toBeOnTheScreen();
  });
});
