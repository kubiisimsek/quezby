import type { FinishRunResponse, RunRating } from '@quezby/types';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useSession } from '@/auth/session';
import { rankedTimeline } from '@/game/RankedStage';
import { ResultView } from '@/game/ResultView';
import { useLanguage } from '@/i18n/language';
import { feel } from '@/lib/haptics';
import { buildMe, buildRunRating } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/analytics/track', () => ({ track: jest.fn() }));
jest.mock('@/lib/haptics', () => ({ feel: jest.fn() }));

/** A rated run's finish: 104.560 against the rating's target, on no board. */
function rated(rating: RunRating): FinishRunResponse {
  const bonus = { count: 0, points: 0 };
  return {
    run: {
      runId: 'r1',
      mode: 'rated',
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
        reelPoints: 104_560,
        bonusPoints: 0,
        bonuses: { flawless: bonus, lightning: bonus, coolHead: bonus, comeback: bonus },
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
      flagReason: null,
    },
    best: null,
    isNewBest: false,
    ranks: { weekly: 12, monthly: 80, all: 311 },
    rankChanges: {
      weekly: { before: 12, after: 12 },
      monthly: { before: 80, after: 80 },
      all: { before: 311, after: 311 },
    },
    passed: [],
    daily: null,
    rating,
    leagueUnlock: null,
    shareText: null,
    duel: null,
  };
}

/** The league's frame: decoration, so hidden from a screen reader. */
const frame = (tier: string) => screen.getByTestId(`league-frame-${tier}`, { includeHiddenElements: true });
const noFrame = (tier: string) => screen.queryByTestId(`league-frame-${tier}`, { includeHiddenElements: true });

async function show(rating: RunRating) {
  const handlers = {
    onReplay: jest.fn(),
    onPlayFree: jest.fn(),
    onClose: jest.fn(),
    onRetrySubmit: jest.fn(),
    onOpenDaily: jest.fn(),
  };
  await renderWithProviders(
    <ResultView outcome={{ mode: 'verified', response: rated(rating) }} mode="rated" {...handlers} />,
  );
}

const PROMOTED = buildRunRating({ before: 1_990, after: 2_031, delta: 41, tierBefore: 'silver', tier: 'gold', target: 98_000 });
const DEMOTED = buildRunRating({ before: 2_010, after: 1_950, delta: -60, tierBefore: 'gold', tier: 'silver', target: 120_000 });
const PLACED = buildRunRating({
  kind: 'placement',
  before: null,
  after: 1_500,
  delta: 0,
  tierBefore: null,
  tier: 'silver',
  target: null,
  placement: { played: 3, required: 3 },
});

describe('Dereceli result', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.mocked(useReducedMotion).mockReturnValue(true);
    useSession.setState({ user: buildMe({ username: 'kubi' }) });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('puts the player in their league’s frame with the Elo, the move big, and the score against the target', async () => {
    await show(buildRunRating());

    expect(frame('silver')).toBeTruthy();
    expect(screen.getByLabelText('Gümüş lig')).toBeTruthy();
    expect(screen.getByText('1.640 Elo')).toBeTruthy();
    expect(screen.getByTestId('rating-delta')).toHaveTextContent('+42');
    expect(screen.getByLabelText('+42 Elo')).toBeTruthy();
    expect(screen.getByText('Skor 104.560 · Hedef 66.100')).toBeTruthy();
    expect(screen.getByText('Hedefi geçtin')).toBeTruthy();
    expect(screen.getByText("Altın'a 360 Elo")).toBeTruthy();
    expect(screen.getByTestId('league-bar')).toBeTruthy();
    // The score's own stage is not here: no count to 104.560 in big type, no record.
    expect(screen.queryByText('puan')).toBeNull();
    expect(screen.queryByText('YENİ REKOR!')).toBeNull();
  });

  it('says a run short of its target, and the loss in red', async () => {
    await show(buildRunRating({ before: 1_640, after: 1_602, delta: -38, target: 140_000 }));

    expect(screen.getByTestId('rating-delta')).toHaveTextContent('−38');
    expect(screen.getByText('Hedefin altında')).toBeTruthy();
  });

  it('says a forfeit instead of the verdict', async () => {
    await show(buildRunRating({ kind: 'forfeit', before: 1_640, after: 1_540, delta: -100 }));

    expect(screen.getByText('Hükmen yenilgi')).toBeTruthy();
    expect(screen.queryByText('Hedefin altında')).toBeNull();
  });

  it('crowns a new league: its frame, "YÜKSELDİN!" and the league named', async () => {
    await show(PROMOTED);

    expect(frame('gold')).toBeTruthy();
    expect(noFrame('silver')).toBeNull();
    expect(screen.getByText('YÜKSELDİN!')).toBeTruthy();
    expect(screen.getByLabelText("Altın'a yükseldin!")).toBeTruthy();
    expect(screen.getByLabelText('Altın lig')).toBeTruthy();
  });

  it('drops a fall in under "DÜŞTÜN"', async () => {
    await show(DEMOTED);

    expect(frame('silver')).toBeTruthy();
    expect(screen.getByText('DÜŞTÜN')).toBeTruthy();
    expect(screen.getByLabelText("Gümüş'e düştün.")).toBeTruthy();
    expect(screen.getByTestId('rating-delta')).toHaveTextContent('−60');
  });

  it('reveals the first league on the run that places the player', async () => {
    await show(PLACED);

    expect(frame('silver')).toBeTruthy();
    expect(screen.getByText('YERLEŞTİN!')).toBeTruthy();
    expect(screen.getByText('1.500 Elo')).toBeTruthy();
    expect(screen.queryByTestId('rating-delta')).toBeNull();
    expect(screen.getByText('Skor 104.560')).toBeTruthy();
  });

  it('counts the placement runs while the player is still placing, in a bare frame', async () => {
    await show(buildRunRating({
      kind: 'placement',
      before: null,
      after: null,
      delta: 0,
      tierBefore: null,
      tier: null,
      target: null,
      nextTarget: null,
      nextDifficulty: null,
      difficulty: 0,
      placement: { played: 2, required: 3 },
    }));

    expect(screen.getByText('Yerleşme 2/3')).toBeTruthy();
    expect(screen.queryByTestId(/^league-frame-/, { includeHiddenElements: true })).toBeNull();
    expect(screen.getAllByTestId('meter-notch')).toHaveLength(2);
  });

  it('keeps the Elo tile for a run held for review', async () => {
    await show(buildRunRating({ kind: 'pending', after: 1_598, delta: 0, target: null }));

    expect(screen.getByText('Skorun incelenince Elo’ya yazılır')).toBeTruthy();
    expect(screen.queryByTestId('league-bar')).toBeNull();
  });

  it('speaks English', async () => {
    await act(async () => {
      useLanguage.setState({ locale: 'en' });
    });
    await show(PROMOTED);

    expect(screen.getByText('PROMOTED!')).toBeTruthy();
    expect(screen.getByLabelText('Gold league')).toBeTruthy();
    expect(screen.getByText('2,031 Elo')).toBeTruthy();
    expect(screen.getByText('Target beaten')).toBeTruthy();
    await act(async () => {
      useLanguage.setState({ locale: 'tr' });
    });
  });

  describe('with motion', () => {
    beforeEach(() => {
      jest.mocked(useReducedMotion).mockReturnValue(false);
    });

    it('fills the bar, swaps the frame, buzzes and bursts as the new league lands', async () => {
      await show(PROMOTED);

      expect(frame('silver')).toBeTruthy();
      expect(screen.queryByText('YÜKSELDİN!')).toBeNull();
      expect(screen.getByText('1.990 Elo')).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(1_600);
      });
      expect(frame('gold')).toBeTruthy();
      expect(feel).toHaveBeenCalledWith('rankUp');
      expect(screen.queryByTestId('confetti')).toBeNull();

      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      expect(screen.getByText('YÜKSELDİN!')).toBeTruthy();
      expect(screen.getByTestId('confetti')).toBeTruthy();
      expect(screen.getByText('2.031 Elo')).toBeTruthy();
    });

    it('warns on a fall, with no burst', async () => {
      await show(DEMOTED);

      await act(async () => {
        jest.advanceTimersByTime(3_000);
      });
      expect(frame('silver')).toBeTruthy();
      expect(feel).toHaveBeenCalledWith('rankDown');
      expect(screen.queryByTestId('confetti')).toBeNull();
    });

    it('keeps the league hidden until the placement reveals it', async () => {
      await show(PLACED);

      expect(screen.getByText('YERLEŞME')).toBeTruthy();
      expect(noFrame('silver')).toBeNull();
      await act(async () => {
        jest.advanceTimersByTime(1_300);
      });
      expect(frame('silver')).toBeTruthy();
      expect(screen.getByText('YERLEŞTİN!')).toBeTruthy();
      expect(screen.getByTestId('confetti')).toBeTruthy();
    });

    it('jumps to the new league on a touch', async () => {
      await show(PROMOTED);

      await fireEvent(screen.getByTestId('result'), 'startShouldSetResponderCapture');
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
      expect(frame('gold')).toBeTruthy();
      expect(screen.getByText('YÜKSELDİN!')).toBeTruthy();
    });

    it('stays still with no league to change', async () => {
      await show(buildRunRating());

      await act(async () => {
        jest.advanceTimersByTime(3_000);
      });
      expect(feel).not.toHaveBeenCalled();
      expect(screen.queryByTestId('confetti')).toBeNull();
    });
  });

  it('times the ceremony: longer with a new league, a burst only for a promotion or a first league', () => {
    expect(rankedTimeline(buildRunRating()).burst).toBeNull();
    expect(rankedTimeline(PROMOTED).burst).not.toBeNull();
    expect(rankedTimeline(DEMOTED).burst).toBeNull();
    expect(rankedTimeline(PLACED).burst).not.toBeNull();
    expect(rankedTimeline(PROMOTED).end).toBeGreaterThan(rankedTimeline(buildRunRating()).end);
  });
});
