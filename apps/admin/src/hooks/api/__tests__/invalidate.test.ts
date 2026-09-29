import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { afterModeration } from '@/hooks/api/invalidate';
import { keys } from '@/lib/query-keys';

describe('afterModeration', () => {
  it('refreshes the ratings with every other list a decision moves', async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    await afterModeration(queryClient);

    const refreshed = invalidate.mock.calls.map(([filters]) => filters?.queryKey?.[0]);
    expect(refreshed).toEqual(expect.arrayContaining(['players', 'runs', 'boards', 'ratings']));
    expect(refreshed).not.toContain('leagues');
    expect(keys.ratings()[0]).toBe('ratings');
    expect(keys.calibration({ days: 7 })[0]).toBe('ratings');
  });
});
