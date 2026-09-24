import { act, render, screen } from '@testing-library/react-native';

import * as format from '@/lib/format';
import { CountdownChip } from '@/ui/kit';

const NOW = '2026-09-24T10:00:00.000Z';

/** An ISO time `ms` after `NOW`. */
function after(ms: number): string {
  return new Date(Date.parse(NOW) + ms).toISOString();
}

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Lets `ms` pass a second at a time, rendering after each, as a phone would. */
async function advance(ms: number) {
  for (let passed = 0; passed < ms; passed += SECOND) {
    await act(() => {
      jest.advanceTimersByTime(Math.min(SECOND, ms - passed));
    });
  }
}

describe('CountdownChip', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: Date.parse(NOW) });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('says how long is left, after its prefix', async () => {
    await render(
      <CountdownChip
        endsAt={after(6 * DAY + 14 * HOUR + 20 * MINUTE)}
        serverTime={NOW}
        prefix="Bitmesine"
      />,
    );

    expect(
      screen.getByRole('timer', { name: 'Bitmesine 6 g 14 sa' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('Bitmesine 6 g 14 sa')).toBeOnTheScreen();
  });

  it("counts on the server's clock, not the phone's", async () => {
    // The phone is five minutes behind the server.
    await render(
      <CountdownChip
        endsAt={after(5 * MINUTE + 12 * MINUTE + 5 * SECOND)}
        serverTime={after(5 * MINUTE)}
      />,
    );

    expect(screen.getByText('12 dk 05 sn')).toBeOnTheScreen();
  });

  it('ticks every second in the last hour', async () => {
    await render(
      <CountdownChip
        endsAt={after(12 * MINUTE + 5 * SECOND)}
        serverTime={NOW}
      />,
    );
    expect(screen.getByText('12 dk 05 sn')).toBeOnTheScreen();

    await advance(SECOND);
    expect(screen.getByText('12 dk 04 sn')).toBeOnTheScreen();

    await advance(5 * SECOND);
    expect(screen.getByText('11 dk 59 sn')).toBeOnTheScreen();
  });

  it('ticks by the minute above an hour', async () => {
    const formatted = jest.spyOn(format, 'formatCountdown');
    await render(
      <CountdownChip
        endsAt={after(5 * HOUR + 12 * MINUTE + 30 * SECOND)}
        serverTime={NOW}
      />,
    );
    expect(screen.getByText('5 sa 12 dk')).toBeOnTheScreen();
    formatted.mockClear();

    await advance(30 * SECOND);
    expect(formatted).not.toHaveBeenCalled();
    expect(screen.getByText('5 sa 12 dk')).toBeOnTheScreen();

    await advance(SECOND);
    expect(screen.getByText('5 sa 11 dk')).toBeOnTheScreen();
  });

  it('recounts at once when a refetch brings a new server time', async () => {
    const endsAt = after(2 * HOUR + 45 * SECOND);
    await render(<CountdownChip endsAt={endsAt} serverTime={NOW} />);
    expect(screen.getByText('2 sa 0 dk')).toBeOnTheScreen();

    await advance(30 * SECOND);
    // The server now reads 20 s ahead of the phone: 1:59:55 are left.
    await screen.rerender(
      <CountdownChip endsAt={endsAt} serverTime={after(50 * SECOND)} />,
    );

    expect(screen.getByText('1 sa 59 dk')).toBeOnTheScreen();
  });

  it('switches to seconds when the last hour starts', async () => {
    await render(
      <CountdownChip endsAt={after(HOUR + 2 * SECOND)} serverTime={NOW} />,
    );
    expect(screen.getByText('1 sa 0 dk')).toBeOnTheScreen();

    await advance(3 * SECOND);
    expect(screen.getByText('59 dk 59 sn')).toBeOnTheScreen();
  });

  it('calls onElapsed once when the time runs out', async () => {
    const onElapsed = jest.fn();
    await render(
      <CountdownChip
        endsAt={after(3 * SECOND)}
        serverTime={NOW}
        prefix="Bitmesine"
        onElapsed={onElapsed}
      />,
    );
    expect(screen.getByText('Bitmesine 3 sn')).toBeOnTheScreen();

    await advance(3 * SECOND);
    expect(onElapsed).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Sona erdi')).toBeOnTheScreen();

    await advance(10 * SECOND);
    expect(onElapsed).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Sona erdi')).toBeOnTheScreen();
  });

  it('starts over when a new period arrives', async () => {
    const onElapsed = jest.fn();
    await render(
      <CountdownChip
        endsAt={after(-SECOND)}
        serverTime={NOW}
        onElapsed={onElapsed}
      />,
    );
    expect(onElapsed).toHaveBeenCalledTimes(1);

    await screen.rerender(
      <CountdownChip
        endsAt={after(DAY + HOUR)}
        serverTime={NOW}
        onElapsed={onElapsed}
      />,
    );
    expect(screen.getByText('1 g 1 sa')).toBeOnTheScreen();
    expect(onElapsed).toHaveBeenCalledTimes(1);
  });
});
