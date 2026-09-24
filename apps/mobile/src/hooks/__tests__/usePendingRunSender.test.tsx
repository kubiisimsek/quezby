import { ApiError } from '@quezby/sdk';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { api } from '@/api/client';
import { useSession } from '@/auth/session';
import { usePendingRunSender } from '@/hooks/usePendingRunSender';
import { usePendingRun } from '@/stores/pendingRun';
import { buildMe } from '@/test/factories';
import { createTestQueryClient } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({
  api: { runs: { finish: jest.fn() } },
}));

const finish = (api as unknown as { runs: { finish: jest.Mock } }).runs.finish;

const pending = {
  runId: 'run-1',
  actions: [[1, 400, 0]] as [number, number, number][],
  clientScore: 120,
  clientReels: 1,
  checkpoints: ['receipt-67'],
  savedAt: Date.now(),
};

async function sender() {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  await renderHook(() => usePendingRunSender(), { wrapper });
  await act(async () => {
    for (let tick = 0; tick < 10; tick += 1) await Promise.resolve();
  });
}

describe('usePendingRunSender', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSession.setState({ token: 'token', user: buildMe(), ranks: null, hydrated: true });
    usePendingRun.setState({ run: pending, hydrated: true });
  });

  it('sends an unsent finish again with its checkpoint receipts, then forgets it', async () => {
    finish.mockResolvedValueOnce({});

    await sender();

    expect(finish).toHaveBeenCalledWith('run-1', {
      actions: [[1, 400, 0]],
      clientScore: 120,
      clientReels: 1,
      checkpoints: ['receipt-67'],
    });
    expect(usePendingRun.getState().run).toBeNull();
  });

  it('keeps it while the API cannot be reached', async () => {
    finish.mockRejectedValueOnce(new ApiError(0, 'network', 'offline'));

    await sender();

    expect(usePendingRun.getState().run).toMatchObject({ checkpoints: ['receipt-67'] });
  });
});
