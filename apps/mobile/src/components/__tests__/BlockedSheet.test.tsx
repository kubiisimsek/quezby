import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/api/client';
import { BlockedSheet } from '@/components/BlockedSheet';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: { me: { blocks: jest.fn() }, users: { unblock: jest.fn() } },
}));

const mocked = api as unknown as { me: { blocks: jest.Mock }; users: { unblock: jest.Mock } };

beforeEach(() => jest.clearAllMocks());

describe('BlockedSheet', () => {
  it('lists the players blocked, and lifts a block', async () => {
    mocked.me.blocks
      .mockResolvedValueOnce({ users: [{ username: 'kerem', avatarUrl: null, blockedAt: '2026-09-20T10:00:00.000Z' }] })
      .mockResolvedValue({ users: [] });
    mocked.users.unblock.mockResolvedValue({ relation: 'none' });
    await renderWithProviders(<BlockedSheet open onClose={jest.fn()} />);

    expect(await screen.findByText('@kerem')).toBeOnTheScreen();
    expect(screen.getByText('20 Eylül tarihinden beri')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Engeli kaldır' }));

    expect(mocked.users.unblock).toHaveBeenCalledWith('kerem');
    expect(await screen.findByText('Kimseyi engellemedin.')).toBeOnTheScreen();
  });

  it('asks nothing while closed', async () => {
    await renderWithProviders(<BlockedSheet open={false} onClose={jest.fn()} />);

    await waitFor(() => expect(mocked.me.blocks).not.toHaveBeenCalled());
  });

  it('says so when the list does not come', async () => {
    mocked.me.blocks.mockRejectedValue(new Error('offline'));
    await renderWithProviders(<BlockedSheet open onClose={jest.fn()} />);

    expect(await screen.findByText('Liste yüklenemedi')).toBeOnTheScreen();
  });
});
