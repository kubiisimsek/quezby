import type { RunResult } from '@quezby/types';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/api/client';
import { getT } from '@/i18n';
import { byDay, HistoryScreen } from '@/screens/history/HistoryScreen';
import { buildBrief, buildRunSummary } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/api/client', () => ({ api: { me: { runs: jest.fn(), run: jest.fn() } } }));

const mocked = api as unknown as { me: { runs: jest.Mock; run: jest.Mock } };

type Props = Parameters<typeof HistoryScreen>[0];

const bonus = { count: 0, points: 0 };

/** Everything the replay counted of one run. */
function result(overrides: Partial<RunResult> = {}): RunResult {
  return {
    runId: '01jrun00000000000000000000',
    mode: 'free',
    status: 'ranked',
    score: 12_345,
    reels: 87,
    hits: 80,
    misses: 7,
    perfects: 9,
    maxStreak: 31,
    level: 5,
    accuracy: 919,
    avgReactionMs: 480,
    activeMs: 184_000,
    endedBy: 'drained',
    maxCombo: 1_450,
    breakdown: {
      reelPoints: 10_000,
      bonusPoints: 2_345,
      bonuses: { flawless: { count: 2, points: 2_345 }, lightning: bonus, coolHead: bonus, comeback: bonus },
    },
    stats: {
      swipes: 50,
      likes: 20,
      holds: 10,
      perfects: 9,
      freezes: 7,
      misses: { timeout: 3, wrong: 2, holdEarly: 1, holdLate: 1, caught: 0 },
      avgReactionMs: 480,
      bestReactionMs: 250,
      levelMisses: [0, 1, 2, 2, 2],
    },
    flagReason: null,
    ...overrides,
  };
}

async function renderHistory() {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  await renderWithProviders(
    <HistoryScreen
      navigation={navigation as unknown as Props['navigation']}
      route={{ key: 'History-test', name: 'History' } as Props['route']}
    />,
  );
  return navigation;
}

beforeEach(() => {
  jest.clearAllMocks();
  mocked.me.runs.mockResolvedValue({ runs: [], nextCursor: null });
});

describe('HistoryScreen', () => {
  it('lists every run, day by day, as the API found it', async () => {
    const today = new Date();
    mocked.me.runs.mockResolvedValue({
      runs: [
        buildRunSummary({ runId: 'r1', finishedAt: today.toISOString(), isBest: true }),
        buildRunSummary({ runId: 'r2', mode: 'daily', dailyNumber: 17, status: 'review', finishedAt: today.toISOString() }),
        buildRunSummary({
          runId: 'r3',
          mode: 'vs',
          status: 'played',
          finishedAt: '2026-09-01T10:00:00.000Z',
          duel: { ...buildBrief({ status: 'finished', turn: null, outcome: 'won', expiresAt: null }), opponent: 'ekin' },
        }),
      ],
      nextCursor: null,
    });
    await renderHistory();

    expect(await screen.findByText('Bugün')).toBeOnTheScreen();
    expect(screen.getByText('Normal oyun')).toBeOnTheScreen();
    expect(screen.getByText('REKOR')).toBeOnTheScreen();
    expect(screen.getByText('Günün akışı #17')).toBeOnTheScreen();
    expect(screen.getByText('İncelemede')).toBeOnTheScreen();
    expect(screen.getByText('VS · @ekin')).toBeOnTheScreen();
    expect(screen.getByText('Kazandın')).toBeOnTheScreen();
    expect(screen.getByText('1 Eylül')).toBeOnTheScreen();
  });

  it('narrows the list to the day’s challenges or to VS', async () => {
    await renderHistory();
    await screen.findByText('Henüz bitirdiğin bir oyun yok');

    await fireEvent.press(screen.getByRole('tab', { name: 'VS' }));

    await waitFor(() => expect(mocked.me.runs).toHaveBeenLastCalledWith({ cursor: undefined, mode: 'vs' }));
    expect(mocked.me.runs).toHaveBeenCalledWith({ cursor: undefined });
  });

  it('names a rated run, and narrows the list to Dereceli', async () => {
    mocked.me.runs.mockResolvedValue({
      runs: [buildRunSummary({ runId: 'r4', mode: 'rated', finishedAt: new Date().toISOString() })],
      nextCursor: null,
    });
    await renderHistory();

    expect(await screen.findByText('Dereceli oyun')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('tab', { name: 'Dereceli' }));

    await waitFor(() => expect(mocked.me.runs).toHaveBeenLastCalledWith({ cursor: undefined, mode: 'rated' }));
  });

  it('opens a run’s card with everything its replay counted', async () => {
    const summary = buildRunSummary({ runId: 'r1' });
    mocked.me.runs.mockResolvedValue({ runs: [summary], nextCursor: null });
    mocked.me.run.mockResolvedValue({ summary, run: result() });
    await renderHistory();

    await fireEvent.press(await screen.findByLabelText(/^Normal oyun, 12\.345 puan/));

    expect(await screen.findByText('Kusursuz seviye')).toBeOnTheScreen();
    expect(mocked.me.run).toHaveBeenCalledWith('r1');
    expect(screen.getAllByText('12.345').length).toBeGreaterThan(1);
  });

  it('offers the one gold play when there is nothing yet', async () => {
    const navigation = await renderHistory();

    expect(await screen.findByText('Henüz bitirdiğin bir oyun yok')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Oyna' }));

    expect(navigation.navigate).toHaveBeenCalledWith('Game', { mode: 'free' });
  });

  it('says so when the list does not come', async () => {
    mocked.me.runs.mockRejectedValue(new Error('offline'));
    await renderHistory();

    expect(await screen.findByText('Geçmiş yüklenemedi')).toBeOnTheScreen();
  });
});

describe('the days of the history', () => {
  it('names today and yesterday, and dates the rest', () => {
    const now = new Date(2026, 8, 28, 15, 0);
    const days = byDay(
      [
        buildRunSummary({ runId: 'a', finishedAt: new Date(2026, 8, 28, 9, 0).toISOString() }),
        buildRunSummary({ runId: 'b', finishedAt: new Date(2026, 8, 28, 8, 0).toISOString() }),
        buildRunSummary({ runId: 'c', finishedAt: new Date(2026, 8, 27, 23, 30).toISOString() }),
        buildRunSummary({ runId: 'd', finishedAt: new Date(2026, 8, 20, 12, 0).toISOString() }),
      ],
      getT(),
      now,
    );

    expect(days.map((day) => [day.title, day.data.map((run) => run.runId)])).toEqual([
      ['Bugün', ['a', 'b']],
      ['Dün', ['c']],
      ['20 Eylül', ['d']],
    ]);
  });
});
