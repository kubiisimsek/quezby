import { fireEvent, screen } from '@testing-library/react-native';
import { useReducedMotion, type SharedValue } from 'react-native-reanimated';

import { useSession } from '@/auth/session';
import { useGame, type GameController } from '@/game/useGame';
import { GameScreen } from '@/screens/game/GameScreen';
import { useOnboarding } from '@/stores/onboarding';
import { buildMe } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/game/useGame', () => ({ useGame: jest.fn() }));

type Props = Parameters<typeof GameScreen>[0];

function shared(value: number): SharedValue<number> {
  return { value } as unknown as SharedValue<number>;
}

/** The game as the screen sees it, in whatever phase a test needs. */
function controller(overrides: Partial<GameController> = {}): GameController {
  return {
    phase: 'starting',
    countdown: 3,
    reel: null,
    seed: 1,
    score: 0,
    combo: 1000,
    feedback: null,
    outcome: null,
    startError: null,
    practice: null,
    coach: null,
    values: {
      dragY: shared(0),
      enter: shared(1),
      timer: shared(1),
      holdFill: shared(0),
      holding: shared(0),
      meter: shared(1000),
    },
    start: jest.fn(async () => undefined),
    quit: jest.fn(),
    dismissCoach: jest.fn(),
    retrySubmit: jest.fn(),
    touches: {
      onTouchStart: jest.fn(),
      onTouchMove: jest.fn(),
      onTouchEnd: jest.fn(),
    },
    ...overrides,
  };
}

function setup(game: GameController, mode: 'free' | 'daily' = 'free') {
  jest.mocked(useGame).mockReturnValue(game);
  const navigation = { goBack: jest.fn(), replace: jest.fn() };
  const props = {
    navigation,
    route: { key: 'Game', name: 'Game', params: { mode } },
  } as unknown as Props;
  return {
    navigation,
    render: () => renderWithProviders(<GameScreen {...props} />),
  };
}

/** The screen as a new player's practice run: the `Tutorial` route, with nothing behind it. */
function setupTutorial(game: GameController) {
  jest.mocked(useGame).mockReturnValue(game);
  const navigation = { goBack: jest.fn(), replace: jest.fn() };
  const props = {
    navigation,
    route: { key: 'Tutorial', name: 'Tutorial' },
  } as unknown as Props;
  return {
    navigation,
    render: () => renderWithProviders(<GameScreen {...props} />),
  };
}

const PRACTICE_SUMMARY = {
  engineVersion: 2,
  seed: 1,
  score: 640,
  reels: 6,
  hits: 5,
  misses: 1,
  perfects: 0,
  maxStreak: 4,
  level: 1,
  accuracy: 833,
  avgReactionMs: 520,
  activeMs: 6000,
  endedBy: 'drained' as const,
  maxCombo: 1200,
  bonusPoints: 0,
  bonuses: { flawless: 0, lightning: 0, coolHead: 0, comeback: 0 },
};

describe('GameScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  it('asks for a run as it opens, and says so over the arena', async () => {
    const game = controller();
    await setup(game).render();

    expect(game.start).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Akış hazırlanıyor…')).toBeTruthy();
  });

  it('rolls the drums while the API verifies the run, with no number yet', async () => {
    await setup(controller({ phase: 'finishing', score: 4_210 })).render();

    expect(screen.getByText('Skorun doğrulanıyor…')).toBeTruthy();
    expect(screen.queryByText('4.210')).toBeNull();
  });

  it('counts down before the first reel', async () => {
    await setup(controller({ phase: 'countdown', countdown: 2 })).render();

    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('Başparmağını hazırla')).toBeTruthy();
  });

  it('ends a run in play from the close slab, and stays for its result', async () => {
    const game = controller({ phase: 'playing' });
    const { navigation, render } = setup(game);
    await render();

    await fireEvent.press(screen.getByRole('button', { name: 'Oyundan çık' }));

    expect(game.quit).toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('leaves from the close slab before the first reel', async () => {
    const game = controller({ phase: 'countdown' });
    const { navigation, render } = setup(game);
    await render();

    await fireEvent.press(screen.getByRole('button', { name: 'Oyundan çık' }));

    expect(game.quit).toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('offers free play when today’s run is already played', async () => {
    const game = controller({
      phase: 'error',
      startError: {
        code: 'daily_already_played',
        message: 'Bugünkü hakkını kullandın.',
      },
    });
    const { navigation, render } = setup(game, 'daily');
    await render();

    expect(screen.getByText('Bugünün akışını oynadın')).toBeTruthy();
    expect(screen.getByText('Bugünkü hakkını kullandın.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Serbest oyna'));
    expect(navigation.replace).toHaveBeenCalledWith('Game', { mode: 'free' });
    await fireEvent.press(screen.getByText('Günün tablosu'));
    expect(navigation.replace).toHaveBeenCalledWith('Daily');
    await fireEvent.press(screen.getByText('Vazgeç'));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('tries again, or trains offline, when a free run cannot start', async () => {
    const game = controller({
      phase: 'error',
      startError: {
        code: 'network',
        message: 'İnternet bağlantını kontrol et.',
      },
    });
    await setup(game).render();

    expect(screen.getByText('Tur başlatılamadı')).toBeTruthy();
    expect(screen.getByText('İnternet bağlantını kontrol et.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Tekrar dene'));
    expect(game.start).toHaveBeenCalledTimes(2);
    await fireEvent.press(screen.getByText('Çevrimdışı antrenman'));
    expect(game.start).toHaveBeenLastCalledWith('offline');
  });

  it('never offers offline practice for the daily challenge', async () => {
    await setup(controller({ phase: 'error' }), 'daily').render();

    expect(screen.getByText('Sunucuya ulaşılamadı.')).toBeTruthy();
    expect(screen.queryByText('Çevrimdışı antrenman')).toBeNull();
  });

  it('shows the result once the API has answered', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const game = controller({
      phase: 'result',
      outcome: {
        mode: 'unsent',
        message: 'Sunucuya ulaşılamadı.',
        canRetry: true,
      },
    });
    const { navigation, render } = setup(game);
    await render();

    expect(screen.getByText('Skor gönderilemedi')).toBeTruthy();
    await fireEvent.press(screen.getByText('Tekrar gönder'));
    expect(game.retrySubmit).toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Ana sayfaya dön'));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  describe('as a new player\'s practice run', () => {
    it('starts coached, on the phone alone', async () => {
      const game = controller();
      await setupTutorial(game).render();

      expect(game.start).toHaveBeenCalledWith('tutorial');
    });

    it('explains a new kind of post, and Anladım starts it', async () => {
      const game = controller({ phase: 'coach', coach: 'like' });
      await setupTutorial(game).render();

      expect(screen.getByText('YENİ POST · 2/4')).toBeTruthy();
      expect(screen.getByText('Arkadaşın')).toBeTruthy();
      expect(screen.getByText('Pembe postu çift dokunarak beğen. Geçersen ceza.')).toBeTruthy();

      await fireEvent.press(screen.getByText('Anladım'));
      expect(game.dismissCoach).toHaveBeenCalledTimes(1);
    });

    it('ends in its result from the close slab — never back to nothing', async () => {
      const game = controller({ phase: 'countdown' });
      const { navigation, render } = setupTutorial(game);
      await render();

      await fireEvent.press(screen.getByRole('button', { name: 'Oyundan çık' }));

      expect(game.quit).toHaveBeenCalled();
      expect(navigation.goBack).not.toHaveBeenCalled();
    });

    it('leads on to the player\'s name from its result', async () => {
      jest.mocked(useReducedMotion).mockReturnValue(true);
      useSession.setState({ token: 'token', user: buildMe({ id: 'u1' }), hydrated: true });
      useOnboarding.setState({ userId: 'u1', step: 'tutorial', remindedFor: null, hydrated: true });
      const game = controller({
        phase: 'result',
        outcome: { mode: 'practice', summary: PRACTICE_SUMMARY, reason: 'tutorial', unseen: [] },
      });
      await setupTutorial(game).render();

      await fireEvent.press(screen.getByText('Devam et'));
      expect(useOnboarding.getState().step).toBe('nickname');

      await fireEvent.press(screen.getByText('Bir daha dene'));
      expect(game.start).toHaveBeenLastCalledWith('tutorial');
    });
  });
});
