import type { FinishRunResponse } from '@quezby/types';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { Share } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { ResultView } from '@/game/ResultView';
import type { Outcome } from '@/game/useGame';
import { renderWithProviders } from '@/test/renderWithProviders';

function response(
  overrides: Partial<FinishRunResponse> = {},
): FinishRunResponse {
  const bonus = { count: 0, points: 0 };
  return {
    run: {
      runId: 'r1',
      mode: 'free',
      status: 'ranked',
      score: 104_560,
      reels: 245,
      hits: 230,
      misses: 15,
      perfects: 12,
      maxStreak: 61,
      level: 13,
      accuracy: 938,
      avgReactionMs: 512,
      activeMs: 160_000,
      endedBy: 'drained',
      maxCombo: 1500,
      breakdown: {
        reelPoints: 92_000,
        bonusPoints: 12_560,
        bonuses: {
          flawless: { count: 2, points: 3_480 },
          lightning: { count: 4, points: 5_080 },
          coolHead: bonus,
          comeback: { count: 1, points: 4_000 },
        },
      },
      stats: {
        swipes: 150,
        likes: 40,
        holds: 20,
        perfects: 12,
        freezes: 20,
        misses: { timeout: 5, wrong: 4, holdEarly: 2, holdLate: 2, caught: 2 },
        avgReactionMs: 512,
        bestReactionMs: 301,
        levelMisses: [0, 1, 3, 2, 4],
      },
    },
    best: {
      score: 104_560,
      reels: 245,
      achievedAt: '2026-09-26T10:00:00.000Z',
    },
    isNewBest: true,
    ranks: { daily: 12, weekly: 44, monthly: 80, all: 311 },
    rankChanges: {
      daily: { before: 20, after: 12 },
      weekly: { before: null, after: 44 },
      monthly: { before: 80, after: 80 },
      all: { before: 300, after: 311 },
    },
    passed: [{ username: 'ayse', score: 101_000, isFollowing: true }],
    daily: null,
    league: {
      tier: 'gold',
      rank: 4,
      members: 30,
      zone: 'promote',
      points: 250_000,
    },
    shareText:
      "Quezby'de 104.560 puan yaptım! 245 reel · bugün #12. Sen kaç yaparsın?",
    ...overrides,
  };
}

function view(outcome: Outcome, mode: 'free' | 'daily' = 'free') {
  const handlers = {
    onReplay: jest.fn(),
    onPlayFree: jest.fn(),
    onClose: jest.fn(),
    onRetrySubmit: jest.fn(),
    onOpenDaily: jest.fn(),
  };
  return {
    handlers,
    render: () =>
      renderWithProviders(
        <ResultView outcome={outcome} mode={mode} {...handlers} />,
      ),
  };
}

describe('ResultView', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // The sequence as a phone set to reduce motion shows it: at its end, at once.
    jest.mocked(useReducedMotion).mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the server score, its breakdown, the ranks and how they moved', async () => {
    await view({ mode: 'verified', response: response() }).render();

    expect(screen.getByText('104.560')).toBeTruthy();
    expect(screen.getByText('YENİ REKOR!')).toBeTruthy();
    expect(screen.getByText('92.000')).toBeTruthy();
    expect(screen.getByText('+12.560')).toBeTruthy();
    expect(screen.getByText('Kusursuz seviye')).toBeTruthy();
    expect(screen.queryByText('Soğukkanlı')).toBeNull();
    expect(screen.getByText('#12')).toBeTruthy();
    expect(screen.getByText('▲8')).toBeTruthy();
    expect(screen.getByText('yeni')).toBeTruthy();
    expect(screen.getByText('▼11')).toBeTruthy();
    expect(screen.getByText('x1,50')).toBeTruthy();
    expect(screen.getByText('@ayse · arkadaşın')).toBeTruthy();
    expect(screen.getByText('Altın lig · #4/30')).toBeTruthy();
    expect(screen.getByText('Terfi bölgesindesin')).toBeTruthy();
  });

  it('reads each board’s place and its move aloud in words', async () => {
    await view({ mode: 'verified', response: response() }).render();

    expect(screen.getByLabelText('Bugün: #12, 8 sıra yukarı')).toBeTruthy();
    expect(screen.getByLabelText('Hafta: #44, yeni')).toBeTruthy();
    expect(screen.getByLabelText('Ay: #80')).toBeTruthy();
    expect(screen.getByLabelText('Tümü: #311, 11 sıra aşağı')).toBeTruthy();
  });

  it('names the season best instead when the run did not beat it', async () => {
    const best = {
      score: 120_000,
      reels: 300,
      achievedAt: '2026-09-20T10:00:00.000Z',
    };
    await view({
      mode: 'verified',
      response: response({ isNewBest: false, best }),
    }).render();

    expect(screen.queryByText('YENİ REKOR!')).toBeNull();
    expect(screen.getByText('Sezon rekorun: 120.000')).toBeTruthy();
  });

  it('shares the text the server wrote', async () => {
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction' });
    await view({ mode: 'verified', response: response() }).render();

    await fireEvent.press(screen.getByText('Paylaş'));

    expect(share).toHaveBeenCalledWith({
      message:
        "Quezby'de 104.560 puan yaptım! 245 reel · bugün #12. Sen kaç yaparsın?",
    });
  });

  it('plays again from the gold button, or goes home', async () => {
    const { handlers, render } = view({
      mode: 'verified',
      response: response(),
    });
    await render();

    await fireEvent.press(screen.getByText('Tekrar oyna'));
    expect(handlers.onReplay).toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Ana sayfaya dön'));
    expect(handlers.onClose).toHaveBeenCalled();
  });

  it('shows no score at all when the server never answered', async () => {
    const { handlers, render } = view({
      mode: 'unsent',
      message: 'Sunucuya ulaşılamadı.',
      canRetry: true,
    });
    await render();

    expect(screen.getByText('Skor gönderilemedi')).toBeTruthy();
    expect(screen.queryByText('puan')).toBeNull();
    await fireEvent.press(screen.getByText('Tekrar gönder'));
    expect(handlers.onRetrySubmit).toHaveBeenCalled();
  });

  it('holds a top score under review and never calls it a record', async () => {
    const held = response({
      isNewBest: true,
      run: { ...response().run, status: 'review' },
    });
    await view({ mode: 'verified', response: held }).render();

    expect(screen.getByText('Skorun inceleniyor')).toBeTruthy();
    expect(screen.queryByText('YENİ REKOR!')).toBeNull();
    expect(screen.queryByText('▲8')).toBeNull();
  });

  it('says why a flagged run did not rank', async () => {
    await view({
      mode: 'verified',
      response: response({ run: { ...response().run, status: 'flagged' } }),
    }).render();

    expect(screen.getByText('Sıralamaya girmedi')).toBeTruthy();
  });

  it('offers free play after the daily run, with its card and board', async () => {
    const daily = response({
      daily: {
        dayKey: '2026-09-26',
        number: 3,
        rank: 37,
        players: 1_204,
        grid: '🟩🟨🟥⬛',
        shareText: 'x',
      },
    });
    const { handlers, render } = view(
      { mode: 'verified', response: daily },
      'daily',
    );
    await render();

    expect(screen.getByText('Günün akışı #3')).toBeTruthy();
    expect(screen.getByText('#37 / 1.204 oyuncu')).toBeTruthy();
    await fireEvent.press(screen.getByText('Serbest oyna'));
    expect(handlers.onPlayFree).toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Günün tablosu'));
    expect(handlers.onOpenDaily).toHaveBeenCalled();
    expect(screen.queryByText('Tekrar oyna')).toBeNull();
  });

  it('labels a practice run as practice', async () => {
    const summary = {
      engineVersion: 2,
      seed: 1,
      score: 900,
      reels: 12,
      hits: 11,
      misses: 1,
      perfects: 0,
      maxStreak: 9,
      level: 1,
      accuracy: 916,
      avgReactionMs: 500,
      activeMs: 9000,
      endedBy: 'quit' as const,
      maxCombo: 1450,
      bonusPoints: 0,
      bonuses: { flawless: 0, lightning: 0, coolHead: 0, comeback: 0 },
    };
    await view({ mode: 'practice', summary, reason: 'offline' }).render();

    expect(screen.getByText('ANTRENMAN')).toBeTruthy();
    expect(screen.getByText('Antrenman turu')).toBeTruthy();
    expect(screen.getByText('antrenman puanı')).toBeTruthy();
    expect(screen.queryByText('Paylaş')).toBeNull();
  });

  it('gives a player who reduces motion no confetti, and nothing to skip', async () => {
    await view({ mode: 'verified', response: response() }).render();

    await act(async () => {
      jest.advanceTimersByTime(3_000);
    });

    expect(screen.queryByTestId('confetti')).toBeNull();
    expect(
      screen.getByTestId('result').props.onStartShouldSetResponderCapture,
    ).toBeUndefined();
  });

  describe('with motion', () => {
    beforeEach(() => {
      jest.mocked(useReducedMotion).mockReturnValue(false);
    });

    it('counts the score up to the server’s number, which a screen reader hears at once', async () => {
      await view({ mode: 'verified', response: response() }).render();

      expect(screen.queryByText('104.560')).toBeNull();
      expect(screen.getByLabelText('104.560')).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(1_200);
      });

      expect(screen.getByText('104.560')).toBeTruthy();
    });

    it('fires confetti when a new record lands', async () => {
      await view({ mode: 'verified', response: response() }).render();

      expect(screen.queryByTestId('confetti')).toBeNull();
      await act(async () => {
        jest.advanceTimersByTime(1_400);
      });
      expect(screen.getByTestId('confetti')).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(2_500);
      });
      expect(screen.queryByTestId('confetti')).toBeNull();
    });

    it('never fires confetti for a run that is not a record', async () => {
      await view({
        mode: 'verified',
        response: response({ isNewBest: false }),
      }).render();

      await act(async () => {
        jest.advanceTimersByTime(4_000);
      });

      expect(screen.queryByTestId('confetti')).toBeNull();
    });

    it('jumps to the end on a touch anywhere, and sweeps the confetti away', async () => {
      await view({ mode: 'verified', response: response() }).render();
      await act(async () => {
        jest.advanceTimersByTime(1_400);
      });
      expect(screen.getByTestId('confetti')).toBeTruthy();

      await fireEvent(
        screen.getByTestId('result'),
        'startShouldSetResponderCapture',
      );

      expect(screen.getByText('104.560')).toBeTruthy();
      expect(screen.queryByTestId('confetti')).toBeNull();
      expect(
        screen.getByTestId('result').props.onStartShouldSetResponderCapture,
      ).toBeUndefined();
    });

    it('lets the touch that skips go through to what it landed on', async () => {
      const { handlers, render } = view({
        mode: 'verified',
        response: response(),
      });
      await render();

      const through = await fireEvent(
        screen.getByTestId('result'),
        'startShouldSetResponderCapture',
      );
      expect(through).toBe(false);
      expect(screen.getByText('104.560')).toBeTruthy();

      await fireEvent.press(screen.getByText('Tekrar oyna'));
      expect(handlers.onReplay).toHaveBeenCalled();
    });

    it('stops listening for a skip once the sequence has played out', async () => {
      await view({
        mode: 'verified',
        response: response({ isNewBest: false }),
      }).render();

      expect(
        screen.getByTestId('result').props.onStartShouldSetResponderCapture,
      ).toBeDefined();
      await act(async () => {
        jest.advanceTimersByTime(3_000);
      });

      expect(
        screen.getByTestId('result').props.onStartShouldSetResponderCapture,
      ).toBeUndefined();
      expect(screen.getByText('104.560')).toBeTruthy();
    });
  });
});
