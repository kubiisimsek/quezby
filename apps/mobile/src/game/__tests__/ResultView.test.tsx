import type { FinishRunResponse, RunMode } from '@quezby/types';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { Share } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { track } from '@/analytics/track';
import { ResultView } from '@/game/ResultView';
import type { Outcome } from '@/game/useGame';
import { useLanguage } from '@/i18n/language';
import { buildDuel } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/analytics/track', () => ({ track: jest.fn() }));

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
      flagReason: null,
    },
    best: {
      score: 104_560,
      reels: 245,
      achievedAt: '2026-09-26T10:00:00.000Z',
    },
    isNewBest: true,
    ranks: { weekly: 12, monthly: 80, all: 311 },
    rankChanges: {
      weekly: { before: 20, after: 12 },
      monthly: { before: 80, after: 80 },
      all: { before: 300, after: 311 },
    },
    passed: [{ username: 'ayse', avatarUrl: null, score: 101_000, isFriend: true }],
    daily: null,
    league: {
      tier: 'gold',
      rank: 4,
      members: 30,
      zone: 'promote',
      points: 250_000,
    },
    leagueUnlock: null,
    shareText:
      "Quezby'de 104.560 puan yaptım! 245 post · bu hafta #12. Sen kaç yaparsın?",
    duel: null,
    ...overrides,
  };
}

/** A VS run's answer: counted nowhere, shared with nobody, its VS as it stands. */
function vsResponse(duel: FinishRunResponse['duel']): FinishRunResponse {
  const base = response();
  return response({
    run: { ...base.run, mode: 'vs', status: 'played' },
    isNewBest: false,
    passed: [],
    league: null,
    shareText: null,
    duel,
  });
}

/** A practice run's own count — the API never saw it. */
const SUMMARY = {
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

function view(outcome: Outcome, mode: RunMode = 'free') {
  const handlers = {
    onReplay: jest.fn(),
    onPlayFree: jest.fn(),
    onRematch: jest.fn(),
    onThread: jest.fn(),
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
    expect(screen.getByText('▼11')).toBeTruthy();
    expect(screen.getByText('x1,50')).toBeTruthy();
    expect(screen.getByText('@ayse · arkadaşın')).toBeTruthy();
    expect(screen.getByText('Altın lig · #4/30')).toBeTruthy();
    expect(screen.getByText('Terfi bölgesindesin')).toBeTruthy();
  });

  it('reads each board’s place and its move aloud in words', async () => {
    await view({ mode: 'verified', response: response() }).render();

    expect(screen.getByLabelText('Hafta: #12, 8 sıra yukarı')).toBeTruthy();
    expect(screen.getByLabelText('Ay: #80')).toBeTruthy();
    expect(screen.getByLabelText('Tümü: #311, 11 sıra aşağı')).toBeTruthy();
  });

  it('reads a board the run first placed on as new', async () => {
    await view({
      mode: 'verified',
      response: response({
        rankChanges: {
          weekly: { before: null, after: 12 },
          monthly: { before: 80, after: 80 },
          all: { before: 300, after: 311 },
        },
      }),
    }).render();

    expect(screen.getByLabelText('Hafta: #12, yeni')).toBeTruthy();
    expect(screen.getByText('yeni')).toBeTruthy();
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
        "Quezby'de 104.560 puan yaptım! 245 post · bu hafta #12. Sen kaç yaparsın?",
    });
    expect(track).toHaveBeenCalledWith('share_result');
  });

  it('counts a shared daily result as the daily\'s', async () => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    const daily = response();
    daily.run.mode = 'daily';
    await view({ mode: 'verified', response: daily }).render();

    await fireEvent.press(screen.getByText('Paylaş'));

    expect(track).toHaveBeenCalledWith('share_daily');
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
    expect(screen.queryByText('Bu cihazda skorlar sıralamaya girmiyor')).toBeNull();
  });

  it('tells a phone that failed the integrity check that its runs never rank, and why', async () => {
    const onDevice = response({
      isNewBest: true,
      run: { ...response().run, status: 'flagged', flagReason: 'device' },
    });
    await view({ mode: 'verified', response: onDevice }).render();

    expect(screen.getByText('Bu cihazda skorlar sıralamaya girmiyor')).toBeTruthy();
    expect(
      screen.getByText(/güvenlik kontrolü bu cihazı onaylamadı: .*değiştirilmiş bir uygulama olabilir\. Oynamaya devam edebilirsin\./),
    ).toBeTruthy();
    expect(screen.queryByText('Sıralamaya girmedi')).toBeNull();
    expect(screen.queryByText('YENİ REKOR!')).toBeNull();
    expect(screen.queryByText('▲8')).toBeNull();
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

  it('labels a new player’s practice run, and leads on from it — or plays it again', async () => {
    const { handlers } = view({ mode: 'practice', summary: SUMMARY, reason: 'tutorial', unseen: [] });
    const onContinue = jest.fn();
    await renderWithProviders(
      <ResultView
        outcome={{ mode: 'practice', summary: SUMMARY, reason: 'tutorial', unseen: [] }}
        mode="free"
        {...handlers}
        onContinue={onContinue}
      />,
    );

    expect(screen.getByText('DENEME TURU')).toBeTruthy();
    expect(screen.getByText('Deneme turu')).toBeTruthy();
    expect(screen.getByText('deneme puanı')).toBeTruthy();
    expect(screen.getByText('Bu tur hiçbir yere sayılmadı. Hareketleri gördün; sıra gerçek oyunda.')).toBeTruthy();
    expect(screen.queryByText('Paylaş')).toBeNull();
    expect(screen.queryByText('Ana sayfaya dön')).toBeNull();
    expect(screen.queryByText('Henüz görmediklerin')).toBeNull();

    await fireEvent.press(screen.getByText('Devam et'));
    expect(onContinue).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByText('Bir daha dene'));
    expect(handlers.onReplay).toHaveBeenCalledTimes(1);
  });

  it('lists the kinds a practice run ended before', async () => {
    await view({ mode: 'practice', summary: SUMMARY, reason: 'tutorial', unseen: ['hold', 'freeze'] }).render();

    expect(screen.getByText('Henüz görmediklerin')).toBeTruthy();
    expect(screen.getByText('Altın post')).toBeTruthy();
    expect(screen.getByText('Dokunma!')).toBeTruthy();
    expect(screen.queryByText('Sıradan post')).toBeNull();
  });

  it('says how many counted runs the league still waits for', async () => {
    await view({
      mode: 'verified',
      response: response({ league: null, leagueUnlock: { required: 3, remaining: 2 } }),
    }).render();

    expect(screen.getByText('Lige 2 oyun kaldı')).toBeTruthy();
    expect(screen.getByText('Lig, ilk 3 oyunundan sonra açılır.')).toBeTruthy();
  });

  it('sends a VS: the friend is told, the score kept from them, and the way back is the conversation', async () => {
    const { handlers, render } = view(
      { mode: 'verified', response: vsResponse(buildDuel({ opponent: { ...buildDuel().opponent, username: 'ekin' } })) },
      'vs',
    );
    await render();

    expect(screen.getByText('VS GÖNDERİLDİ')).toBeTruthy();
    expect(screen.getByText('@ekin oynayınca sonuç mesaj kutuna düşer. Skorun o zamana kadar gizli.')).toBeTruthy();
    expect(screen.getByRole('timer')).toBeTruthy();
    expect(screen.queryByText('YENİ REKOR!')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Paylaş' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Mesajlara dön' }));
    expect(handlers.onThread).toHaveBeenCalledTimes(1);
    expect(handlers.onRematch).not.toHaveBeenCalled();
  });

  it('shows how a VS went, both scores, and offers the rematch in gold', async () => {
    const duel = buildDuel({
      status: 'finished',
      turn: null,
      sent: false,
      you: { score: 104_560, valid: true },
      them: { score: 98_000, valid: true },
      outcome: 'won',
      expiresAt: null,
      h2h: { wins: 3, losses: 2, draws: 0 },
      opponent: { ...buildDuel().opponent, username: 'ekin' },
    });
    const { handlers, render } = view({ mode: 'verified', response: vsResponse(duel) }, 'vs');
    await render();

    expect(screen.getByText('KAZANDIN!')).toBeTruthy();
    expect(screen.getByText('98.000')).toBeTruthy();
    expect(screen.getByText('Aranızda 3 – 2')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Rövanş' }));
    expect(handlers.onRematch).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Mesajlara dön' }));
    expect(handlers.onThread).toHaveBeenCalledTimes(1);
  });

  it('says a run that was not clean sent no VS', async () => {
    await view({ mode: 'verified', response: vsResponse(buildDuel({ status: 'void', turn: null, expiresAt: null })) }, 'vs').render();
    expect(screen.getByText('VS gönderilmedi')).toBeTruthy();
  });

  it('marks the side of a friend who never finished', async () => {
    const duel = buildDuel({
      status: 'finished',
      turn: null,
      sent: true,
      you: { score: 104_560, valid: true },
      them: { score: null, valid: false },
      outcome: 'won',
      expiresAt: null,
    });
    await view({ mode: 'verified', response: vsResponse(duel) }, 'vs').render();

    expect(screen.getByText('bitmedi')).toBeTruthy();
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

  describe('in the player’s language', () => {
    it('speaks English: the words, the numbers, and each board read aloud', async () => {
      useLanguage.setState({ locale: 'en' });
      await view({ mode: 'verified', response: response() }).render();

      expect(screen.getByText('104,560')).toBeTruthy();
      expect(screen.getByText('points')).toBeTruthy();
      expect(screen.getByText('NEW RECORD!')).toBeTruthy();
      expect(screen.getByLabelText('New record')).toBeTruthy();
      expect(
        screen.getByText('Out of dopamine. You got bored and closed the app.'),
      ).toBeTruthy();
      expect(screen.getByText('Where your points came from')).toBeTruthy();
      expect(screen.getByText('+12,560')).toBeTruthy();
      expect(screen.getByText('Flawless level')).toBeTruthy();
      expect(screen.getByLabelText('Lightning, 4 times, 5,080 points')).toBeTruthy();
      expect(screen.getByLabelText('Comeback, once, 4,000 points')).toBeTruthy();
      expect(screen.getByText('Best combo')).toBeTruthy();
      expect(screen.getByText('x1.50')).toBeTruthy();
      expect(screen.getByText('93.8%')).toBeTruthy();
      expect(screen.getByLabelText('Week: 12th place, up 8 places')).toBeTruthy();
      expect(screen.getByLabelText('Month: 80th place')).toBeTruthy();
      expect(screen.getByLabelText('Overall: 311th place, down 11 places')).toBeTruthy();
      expect(screen.getByText('Passed this week')).toBeTruthy();
      expect(screen.getByText('@ayse · your friend')).toBeTruthy();
      expect(
        screen.getByLabelText('@ayse, your friend, 101,000 points, you passed them'),
      ).toBeTruthy();
      expect(screen.getByText('Gold league · #4/30')).toBeTruthy();
      expect(screen.getByText('In the promotion zone')).toBeTruthy();
      expect(screen.getByText('250,000 points this week')).toBeTruthy();
      expect(screen.getByText('Play again')).toBeTruthy();
      expect(screen.getByText('Share')).toBeTruthy();
      expect(screen.getByText('Back to home')).toBeTruthy();
    });

    it('speaks Arabic, keeping names and ranks whole inside its lines', async () => {
      useLanguage.setState({ locale: 'ar' });
      await view({ mode: 'verified', response: response() }).render();

      expect(screen.getByText('104,560')).toBeTruthy();
      expect(screen.getByText('نقطة')).toBeTruthy();
      expect(screen.getByText('رقم قياسي جديد!')).toBeTruthy();
      expect(screen.getByText('نفد الدوبامين. شعرت بالملل فأغلقت التطبيق.')).toBeTruthy();
      expect(screen.getByText('من أين جاءت نقاطك')).toBeTruthy();
      expect(screen.getByLabelText('برق، 4 مرات، 5,080 نقطة')).toBeTruthy();
      expect(screen.getByLabelText('الأسبوع: المركز 12، تقدّم 8 مراكز')).toBeTruthy();
      expect(screen.getByLabelText('الشهر: المركز 80')).toBeTruthy();
      expect(screen.getByLabelText('الكل: المركز 311، تراجع 11 مركزًا')).toBeTruthy();
      expect(screen.getByText('\u200E@ayse\u200E · صديقك')).toBeTruthy();
      expect(screen.getByText('دوري الذهب · \u200E#4/30\u200E')).toBeTruthy();
      expect(screen.getByText('في منطقة الصعود')).toBeTruthy();
      expect(screen.getByText('250,000 نقطة هذا الأسبوع')).toBeTruthy();
      expect(screen.getByText('العب مجددًا')).toBeTruthy();
      expect(screen.getByText('العودة إلى الرئيسية')).toBeTruthy();
    });

    it('explains a new player’s practice run in English, and what it never showed', async () => {
      useLanguage.setState({ locale: 'en' });
      await renderWithProviders(
        <ResultView
          outcome={{ mode: 'practice', summary: SUMMARY, reason: 'tutorial', unseen: ['hold'] }}
          mode="free"
          onReplay={jest.fn()}
          onPlayFree={jest.fn()}
          onClose={jest.fn()}
          onRetrySubmit={jest.fn()}
          onOpenDaily={jest.fn()}
          onContinue={jest.fn()}
        />,
      );

      expect(screen.getByText('PRACTICE RUN')).toBeTruthy();
      expect(screen.getByText('practice points')).toBeTruthy();
      expect(screen.getByText('You left the game.')).toBeTruthy();
      expect(
        screen.getByText(
          "This run didn't count anywhere. You've seen the moves; now for the real game.",
        ),
      ).toBeTruthy();
      expect(screen.getByText("You haven't seen these yet")).toBeTruthy();
      expect(screen.getByText('Gold post')).toBeTruthy();
      expect(screen.getByText('Continue')).toBeTruthy();
      expect(screen.getByText('Try again')).toBeTruthy();
    });

    it('holds a daily result in English: its card, its board and free play', async () => {
      useLanguage.setState({ locale: 'en' });
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
      await view({ mode: 'verified', response: daily }, 'daily').render();

      expect(screen.getByText('Daily Feed #3')).toBeTruthy();
      expect(screen.getByText('#37 / 1,204 players')).toBeTruthy();
      expect(screen.getByText("Today's board")).toBeTruthy();
      expect(screen.getByText('Free play')).toBeTruthy();
      expect(screen.getByRole('image', { name: 'Result grid: 🟩🟨🟥⬛' })).toBeTruthy();
    });

    it('tells a phone that failed the integrity check why, in English', async () => {
      useLanguage.setState({ locale: 'en' });
      const onDevice = response({
        run: { ...response().run, status: 'flagged', flagReason: 'device' },
      });
      await view({ mode: 'verified', response: onDevice }).render();

      expect(screen.getByText("Scores on this device don't rank")).toBeTruthy();
      expect(screen.getByText(/security check didn't approve this device: .*You can keep playing\.$/)).toBeTruthy();
    });

    it('counts the games left before the league in Arabic', async () => {
      useLanguage.setState({ locale: 'ar' });
      await view({
        mode: 'verified',
        response: response({ league: null, leagueUnlock: { required: 3, remaining: 2 } }),
      }).render();

      expect(screen.getByText('مباراتان للوصول إلى الدوري')).toBeTruthy();
      expect(screen.getByText('يُفتح الدوري بعد أول 3 مباريات لك.')).toBeTruthy();
    });

    it('marks an offline run as training in Arabic, with the unit its score takes', async () => {
      useLanguage.setState({ locale: 'ar' });
      await view({ mode: 'practice', summary: SUMMARY, reason: 'offline' }).render();

      expect(screen.getByText('تدريب')).toBeTruthy();
      expect(screen.getByText('جولة تدريبية')).toBeTruthy();
      expect(screen.getByText('نقطة تدريب')).toBeTruthy();
      expect(screen.getByText('لعبت دون اتصال؛ لم تُرسل هذه النتيجة إلى الترتيب.')).toBeTruthy();
    });

    it('changes language on the spot, with nothing kept in the old one', async () => {
      await view({ mode: 'verified', response: response() }).render();
      expect(screen.getByText('Tekrar oyna')).toBeTruthy();

      await act(async () => {
        useLanguage.setState({ locale: 'en' });
      });

      expect(screen.getByText('Play again')).toBeTruthy();
      expect(screen.getByText('104,560')).toBeTruthy();
      expect(screen.getByLabelText('Week: 12th place, up 8 places')).toBeTruthy();
      expect(screen.queryByText('Tekrar oyna')).toBeNull();
    });
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
