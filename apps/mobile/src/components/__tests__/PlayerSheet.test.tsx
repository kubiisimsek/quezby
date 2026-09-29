import type { PlayerCard } from '@quezby/types';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { track } from '@/analytics/track';
import { api } from '@/api/client';
import { PlayerSheet } from '@/components/PlayerSheet';
import { useLanguage } from '@/i18n/language';
import { buildCard } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/analytics/track', () => ({ track: jest.fn() }));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

/** iOS says the sheet has left the screen through its modal's `onDismiss`, which the Modal mock never calls. */
async function leave() {
  const modals = screen.container.queryAll((node) => node.type === 'Modal');
  await act(async () => {
    for (const modal of modals) (modal.props.onDismiss as (() => void) | undefined)?.();
  });
}

jest.mock('@/api/client', () => ({
  api: {
    users: {
      get: jest.fn(),
      addFriend: jest.fn(),
      removeFriend: jest.fn(),
      block: jest.fn(),
      unblock: jest.fn(),
      report: jest.fn(),
    },
  },
}));

const mocked = api as unknown as {
  users: {
    get: jest.Mock;
    addFriend: jest.Mock;
    removeFriend: jest.Mock;
    block: jest.Mock;
    unblock: jest.Mock;
    report: jest.Mock;
  };
};

function card(overrides: Partial<PlayerCard> = {}) {
  return {
    player: buildCard({
      username: 'ekin',
      best: { score: 41_200, reels: 210, achievedAt: '2026-09-24T09:30:00.000Z' },
      league: 'gold',
      ranks: { weekly: 12, all: 311 },
      stats: { runs: 40, reels: 5_200, likes: 610, perfects: 90 },
      friends: 8,
      ...overrides,
    }),
  };
}

describe('PlayerSheet', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the card the API sends', async () => {
    mocked.users.get.mockResolvedValue(card());

    await renderWithProviders(<PlayerSheet username="ekin" onClose={jest.fn()} />);

    expect(await screen.findByText('41.200')).toBeTruthy();
    expect(screen.getByLabelText('Sezon rekoru: 41.200')).toBeTruthy();
    expect(screen.getByText('210 post')).toBeTruthy();
    expect(screen.getByLabelText('Altın lig')).toBeTruthy();
    expect(screen.getByText('#12')).toBeTruthy();
    expect(screen.getByText('#311')).toBeTruthy();
    expect(screen.getByText('5.200')).toBeTruthy();
    expect(screen.getByText('8 arkadaş')).toBeTruthy();
    expect(mocked.users.get).toHaveBeenCalledWith('ekin');
    expect(track).toHaveBeenCalledWith('player_card');
  });

  it('shows "—" before a season best and no emblem without a league', async () => {
    mocked.users.get.mockResolvedValue(card({ best: null, league: null }));

    await renderWithProviders(<PlayerSheet username="ekin" onClose={jest.fn()} />);

    expect(await screen.findByLabelText('Sezon rekoru: —')).toBeTruthy();
    expect(screen.queryByLabelText(/ lig$/)).toBeNull();
  });

  it('shows a stranger’s friend count, and no way into the list', async () => {
    mocked.users.get.mockResolvedValue(card({ relation: 'none' }));

    await renderWithProviders(<PlayerSheet username="ekin" onClose={jest.fn()} />);

    expect(await screen.findByText('8 arkadaş')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '8 arkadaş' })).toBeNull();
  });

  it('opens a friend’s list from their count, once the card has left the screen', async () => {
    mocked.users.get.mockResolvedValue(card({ relation: 'friend' }));
    const onClose = jest.fn();

    await renderWithProviders(<PlayerSheet username="ekin" onClose={onClose} />);
    await fireEvent.press(await screen.findByRole('button', { name: '8 arkadaş' }));

    expect(onClose).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    await leave();
    expect(mockNavigate).toHaveBeenCalledWith('Friends', { username: 'ekin' });
  });

  it('opens your own list from your own card', async () => {
    mocked.users.get.mockResolvedValue(card({ isMe: true }));

    await renderWithProviders(<PlayerSheet username="ekin" onClose={jest.fn()} />);
    await fireEvent.press(await screen.findByRole('button', { name: '8 arkadaş' }));
    await leave();

    expect(mockNavigate).toHaveBeenCalledWith('Friends', undefined);
  });

  it('asks a stranger to be friends, then shows the card the API sends back', async () => {
    mocked.users.get.mockResolvedValueOnce(card()).mockResolvedValue(card({ relation: 'requested' }));
    mocked.users.addFriend.mockResolvedValue({ relation: 'requested' });

    await renderWithProviders(<PlayerSheet username="ekin" onClose={jest.fn()} />);
    await fireEvent.press(await screen.findByText('Arkadaş ekle'));

    expect(mocked.users.addFriend).toHaveBeenCalledWith('ekin');
    expect(await screen.findByText('İstek gönderildi')).toBeTruthy();
    expect(screen.getByText('Geri al')).toBeTruthy();
  });

  it('answers a request that waits for the player', async () => {
    mocked.users.get.mockResolvedValueOnce(card({ relation: 'incoming' })).mockResolvedValue(card({ relation: 'friend' }));
    mocked.users.addFriend.mockResolvedValue({ relation: 'friend' });

    await renderWithProviders(<PlayerSheet username="ekin" onClose={jest.fn()} />);
    expect(await screen.findByText('Seni eklemek istiyor')).toBeTruthy();
    await fireEvent.press(screen.getByText('Kabul et'));

    expect(mocked.users.addFriend).toHaveBeenCalledWith('ekin');
    expect(await screen.findByText('VS at')).toBeTruthy();
    expect(screen.getByText('Sohbet')).toBeTruthy();
  });

  it('turns a request down', async () => {
    mocked.users.get.mockResolvedValueOnce(card({ relation: 'incoming' })).mockResolvedValue(card());
    mocked.users.removeFriend.mockResolvedValue({ relation: 'none' });

    await renderWithProviders(<PlayerSheet username="ekin" onClose={jest.fn()} />);
    await fireEvent.press(await screen.findByText('Reddet'));

    expect(mocked.users.removeFriend).toHaveBeenCalledWith('ekin');
    expect(await screen.findByText('Arkadaş ekle')).toBeTruthy();
  });

  it('keeps ending a friendship and blocking under "Diğer"', async () => {
    mocked.users.get.mockResolvedValueOnce(card({ relation: 'friend' })).mockResolvedValue(card({ relation: 'blocked' }));
    mocked.users.block.mockResolvedValue({ relation: 'blocked' });

    await renderWithProviders(<PlayerSheet username="ekin" onClose={jest.fn()} />);
    await screen.findByText('VS at');
    expect(screen.queryByText('Engelle')).toBeNull();

    await fireEvent.press(screen.getByText('Diğer'));
    expect(screen.getByText('Arkadaşlıktan çıkar')).toBeTruthy();
    expect(screen.queryByText('Fotoğrafı bildir')).toBeNull();
    await fireEvent.press(screen.getByText('Engelle'));

    expect(mocked.users.block).toHaveBeenCalledWith('ekin');
    expect(await screen.findByText('Engeli kaldır')).toBeTruthy();
    expect(screen.getByText('Engelledin')).toBeTruthy();
  });

  it('lifts a block', async () => {
    mocked.users.get.mockResolvedValueOnce(card({ relation: 'blocked' })).mockResolvedValue(card());
    mocked.users.unblock.mockResolvedValue({ relation: 'none' });

    await renderWithProviders(<PlayerSheet username="ekin" onClose={jest.fn()} />);
    await fireEvent.press(await screen.findByText('Engeli kaldır'));

    expect(mocked.users.unblock).toHaveBeenCalledWith('ekin');
    expect(await screen.findByText('Arkadaş ekle')).toBeTruthy();
  });

  it('reports a photo, and thanks the player', async () => {
    mocked.users.get.mockResolvedValue(card({ avatarUrl: 'https://api.test/api/v1/media/avatars/a.jpg' }));
    mocked.users.report.mockResolvedValue(undefined);

    await renderWithProviders(<PlayerSheet username="ekin" onClose={jest.fn()} />);
    await fireEvent.press(await screen.findByText('Diğer'));
    await fireEvent.press(screen.getByText('Fotoğrafı bildir'));

    expect(mocked.users.report).toHaveBeenCalledWith('ekin', 'photo');
    expect(await screen.findByText('Teşekkürler, bildirdin. Bir moderatör bakacak.')).toBeTruthy();
  });

  it('reports a name', async () => {
    mocked.users.get.mockResolvedValue(card());
    mocked.users.report.mockResolvedValue(undefined);

    await renderWithProviders(<PlayerSheet username="ekin" onClose={jest.fn()} />);
    await fireEvent.press(await screen.findByText('Diğer'));
    await fireEvent.press(screen.getByText('Kullanıcı adını bildir'));

    await waitFor(() => expect(mocked.users.report).toHaveBeenCalledWith('ekin', 'name'));
  });

  it('offers nothing to do on your own card', async () => {
    mocked.users.get.mockResolvedValue(card({ isMe: true }));

    await renderWithProviders(<PlayerSheet username="ekin" onClose={jest.fn()} />);

    await screen.findByText('41.200');
    expect(screen.getByText('Sen')).toBeTruthy();
    expect(screen.queryByText('Arkadaş ekle')).toBeNull();
    expect(screen.queryByText('Diğer')).toBeNull();
  });

  it('says so when the card does not come', async () => {
    mocked.users.get.mockRejectedValue(new Error('offline'));

    await renderWithProviders(<PlayerSheet username="ekin" onClose={jest.fn()} />);

    expect(await screen.findByText('Oyuncu yüklenemedi')).toBeTruthy();
  });

  it('asks nothing while closed', async () => {
    await renderWithProviders(<PlayerSheet username={null} onClose={jest.fn()} />);

    expect(mocked.users.get).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });
});

describe('PlayerSheet — in English', () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => useLanguage.setState({ locale: 'tr' }));

  it('shows the card in English', async () => {
    useLanguage.setState({ locale: 'en' });
    mocked.users.get.mockResolvedValue(card({ friends: 1, relation: 'friend' }));

    await renderWithProviders(<PlayerSheet username="ekin" onClose={jest.fn()} />);

    expect(await screen.findByText('41,200')).toBeTruthy();
    expect(screen.getByText('Your friend')).toBeTruthy();
    expect(screen.getByText('1 friend')).toBeTruthy();
    expect(screen.getByLabelText('Gold league')).toBeTruthy();
    ['This week', 'All time', 'Runs', 'Posts', 'Likes', 'Perfect'].forEach((label) =>
      expect(screen.getByText(label)).toBeTruthy(),
    );
    expect(screen.getByText('Send VS')).toBeTruthy();
    expect(screen.getByText('Chat')).toBeTruthy();
  });
});
