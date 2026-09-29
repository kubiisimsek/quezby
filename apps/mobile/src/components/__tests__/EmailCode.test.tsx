import { renderHook } from '@testing-library/react-native';
import { act } from 'react';

import { codeSent, useResendWait } from '@/components/EmailCode';

describe('useResendWait', () => {
  beforeEach(() => jest.useFakeTimers({ now: new Date('2026-09-29T10:00:00.000Z') }));
  afterEach(() => jest.useRealTimers());

  it('counts the API wait down to zero from the moment it answered', async () => {
    const sent = codeSent({ email: 'ekin@example.com', resendIn: 3, expiresAt: '2026-09-29T10:15:00.000Z' });
    const { result } = await renderHook(() => useResendWait(sent));

    expect(result.current).toBe(3);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(2);
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(0);
  });

  it('is over at once for no wait, and starts again with a new code', async () => {
    const { result, rerender } = await renderHook(
      ({ sent }: { sent: { resendIn: number; at: number } }) => useResendWait(sent),
      { initialProps: { sent: { resendIn: 0, at: Date.now() } } },
    );
    expect(result.current).toBe(0);

    await rerender({ sent: { resendIn: 60, at: Date.now() } });
    expect(result.current).toBe(60);
  });
});
