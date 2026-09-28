import type {
  DailyAttempt,
  DailyResponse,
  LeaderboardBoard,
  LeaderboardResponse,
  LeaderboardScope,
} from '@quezby/types';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { Share } from 'react-native';

import { track } from '@/analytics/track';
import { api } from '@/api/client';
import { iso } from '@/i18n';
import { useLanguage } from '@/i18n/language';
import { DailyScreen } from '@/screens/daily/DailyScreen';
import { buildEntries } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/analytics/track', () => ({ track: jest.fn() }));

jest.mock('@/api/client', () => ({
  api: {
    daily: { get: jest.fn() },
    leaderboards: { get: jest.fn() },
    me: { friends: jest.fn() },
    users: { get: jest.fn(), follow: jest.fn(), unfollow: jest.fn() },
  },
}));

const mocked = api as unknown as {
  daily: { get: jest.Mock };
  leaderboards: { get: jest.Mock };
  me: { friends: jest.Mock };
};

type Props = ComponentProps<typeof DailyScreen>;

const NOW = '2026-09-24T10:00:00.000Z';
const GRID = '🟩🟩🟨\n🟩🟥⬛';
const SHARE_TEXT = `Quezby · Günün akışı #17\n12.345 puan · #12\n${GRID}`;

function today(overrides: Partial<DailyResponse> = {}): DailyResponse {
  return {
    dayKey: '2026-09-24',
    number: 17,
    endsAt: '2026-09-24T21:00:00.000Z',
    serverTime: NOW,
    attempt: null,
    top: [],
    me: null,
    players: 5_120,
    ...overrides,
  };
}

function attempt(overrides: Partial<DailyAttempt> = {}): DailyAttempt {
  return {
    status: 'ranked',
    score: 12_345,
    rank: 12,
    grid: GRID,
    shareText: SHARE_TEXT,
    ...overrides,
  };
}

/** Today's challenge board, echoing the scope it was asked for. */
function answerChallenge() {
  mocked.leaderboards.get.mockImplementation(
    async (
      board: LeaderboardBoard,
      { scope }: { scope: LeaderboardScope },
    ): Promise<LeaderboardResponse> => {
      const entries = buildEntries(5, { top: 30_000 });
      return {
        board,
        periodKey: '2026-09-24',
        season: 1,
        scope,
        startsAt: '2026-09-23T21:00:00.000Z',
        endsAt: '2026-09-24T21:00:00.000Z',
        serverTime: NOW,
        entries,
        me: null,
        neighbors: [],
        rival: null,
        nextRankProgress: null,
        players: 5_120,
      };
    },
  );
}

async function renderDaily() {
  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  };
  await renderWithProviders(
    <DailyScreen
      navigation={navigation as unknown as Props['navigation']}
      route={{ key: 'Daily-test', name: 'Daily' } as Props['route']}
    />,
  );
  return navigation;
}

describe('DailyScreen — Günün akışı', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    answerChallenge();
  });

  afterEach(() => jest.restoreAllMocks());

  it('offers the one attempt, with the day number and the time to the next', async () => {
    mocked.daily.get.mockResolvedValue(today());
    const navigation = await renderDaily();

    expect(await screen.findByText('#17')).toBeOnTheScreen();
    expect(screen.getByText('Yeni akışa 11 sa 0 dk')).toBeOnTheScreen();
    expect(
      screen.getByText('Herkes aynı akışı oynar · tek hak'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Oyna' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Game', {
      mode: 'daily',
    });
  });

  it('heads the stage with its name and a way back', async () => {
    mocked.daily.get.mockResolvedValue(today());
    const navigation = await renderDaily();

    expect(await screen.findByText('#17')).toBeOnTheScreen();
    expect(screen.getByText('Günün akışı')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Geri' }));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('says so when the attempt was cut short', async () => {
    mocked.daily.get.mockResolvedValue(
      today({
        attempt: attempt({
          status: 'unfinished',
          score: null,
          rank: null,
          grid: null,
          shareText: null,
        }),
      }),
    );

    await renderDaily();

    expect(await screen.findByText('Turun yarıda kaldı')).toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Oyna' }),
    ).not.toBeOnTheScreen();
  });

  it('shows a ranked attempt and shares the text the server wrote', async () => {
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction' });
    mocked.daily.get.mockResolvedValue(today({ attempt: attempt() }));

    await renderDaily();

    expect(await screen.findByText('12.345')).toBeOnTheScreen();
    expect(screen.getByText('#12 / 5.120')).toBeOnTheScreen();
    expect(
      screen.getByRole('image', { name: `Sonuç tablosu: ${GRID}` }),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Paylaş' }));
    expect(share).toHaveBeenCalledWith({ message: SHARE_TEXT });
    expect(track).toHaveBeenCalledWith('share_daily');
  });

  it.each([
    ['review', 'Skorun inceleniyor'],
    ['flagged', 'Skorun sıralamaya girmedi'],
    ['void', 'Tur sayılmadı'],
  ] as const)(
    'explains a %s attempt that did not rank',
    async (status, title) => {
      mocked.daily.get.mockResolvedValue(
        today({ attempt: attempt({ status, rank: null, shareText: null }) }),
      );

      await renderDaily();

      expect(await screen.findByText(title)).toBeOnTheScreen();
      expect(
        screen.queryByRole('button', { name: 'Paylaş' }),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByRole('button', { name: 'Oyna' }),
      ).not.toBeOnTheScreen();
    },
  );

  it("stands today's summit under the band and switches it to friends", async () => {
    mocked.daily.get.mockResolvedValue(today());

    await renderDaily();

    expect(
      await screen.findByRole('button', { name: /^1\. sıra, @ekin, 30\.000/ }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: /^4\. sıra, @deniz/ }),
    ).toBeOnTheScreen();
    expect(mocked.leaderboards.get).toHaveBeenCalledWith('challenge', {
      scope: 'everyone',
      limit: 100,
    });

    await fireEvent.press(screen.getByRole('tab', { name: 'Arkadaşlar' }));

    await waitFor(() =>
      expect(mocked.leaderboards.get).toHaveBeenLastCalledWith('challenge', {
        scope: 'friends',
        limit: 100,
      }),
    );
  });

  it('sends a player who follows nobody to the players tab', async () => {
    mocked.daily.get.mockResolvedValue(today());
    mocked.me.friends.mockResolvedValue({ friends: [], nextCursor: null });
    mocked.leaderboards.get.mockImplementation(
      async (
        board: LeaderboardBoard,
        { scope }: { scope: LeaderboardScope },
      ): Promise<LeaderboardResponse> => ({
        board,
        periodKey: '2026-09-24',
        season: 1,
        scope,
        startsAt: '2026-09-23T21:00:00.000Z',
        endsAt: '2026-09-24T21:00:00.000Z',
        serverTime: NOW,
        entries: scope === 'friends' ? [] : buildEntries(5),
        me: null,
        neighbors: [],
        rival: null,
        nextRankProgress: null,
        players: scope === 'friends' ? 0 : 5_120,
      }),
    );
    const navigation = await renderDaily();
    await screen.findByRole('button', { name: /^1\. sıra, @ekin/ });

    await fireEvent.press(screen.getByRole('tab', { name: 'Arkadaşlar' }));

    expect(
      await screen.findByText('Henüz arkadaşın yok'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Arkadaş bul' }));
    expect(navigation.navigate).toHaveBeenCalledWith('FindFriends');
  });

  it('explains a failed load and tries again', async () => {
    mocked.daily.get
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(today());
    await renderDaily();

    expect(
      await screen.findByText('Günün akışı yüklenemedi'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));

    expect(await screen.findByText('#17')).toBeOnTheScreen();
  });

  describe("in the player's language", () => {
    it('speaks English, from the stage to the summit', async () => {
      useLanguage.setState({ locale: 'en' });
      mocked.daily.get.mockResolvedValue(today());
      const navigation = await renderDaily();

      expect(await screen.findByText('#17')).toBeOnTheScreen();
      expect(screen.getByText('Daily Feed')).toBeOnTheScreen();
      expect(screen.getByText('FEED')).toBeOnTheScreen();
      expect(screen.getByText('Next feed in 11h 0m')).toBeOnTheScreen();
      expect(
        screen.getByText("Today's feed is waiting for you"),
      ).toBeOnTheScreen();
      expect(
        screen.getByText('Everyone plays the same feed · one shot'),
      ).toBeOnTheScreen();
      expect(screen.getByText("TODAY'S SUMMIT")).toBeOnTheScreen();

      await fireEvent.press(screen.getByRole('button', { name: 'Play' }));
      expect(navigation.navigate).toHaveBeenCalledWith('Game', {
        mode: 'daily',
      });
    });

    it('shows a ranked attempt in English', async () => {
      mocked.daily.get.mockResolvedValue(today({ attempt: attempt() }));
      useLanguage.setState({ locale: 'en' });

      await renderDaily();

      expect(await screen.findByText('12,345')).toBeOnTheScreen();
      expect(screen.getByLabelText('Your score')).toHaveTextContent('YOUR SCORE');
      expect(screen.getByLabelText('Your rank')).toHaveTextContent('YOUR RANK');
      expect(screen.getByText('#12 / 5,120')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Share' })).toBeOnTheScreen();
    });

    it.each([
      ['unfinished', 'Your run was cut short'],
      ['review', 'Your score is being reviewed'],
      ['flagged', "Your score didn't rank"],
      ['void', "The run didn't count"],
    ] as const)('explains the %s attempt in English', async (status, title) => {
      useLanguage.setState({ locale: 'en' });
      mocked.daily.get.mockResolvedValue(
        today({
          attempt: attempt({ status, rank: null, grid: null, shareText: null }),
        }),
      );

      await renderDaily();

      expect(await screen.findByText(title)).toBeOnTheScreen();
    });

    it('explains a failed load in English', async () => {
      useLanguage.setState({ locale: 'en' });
      mocked.daily.get.mockRejectedValue(new Error('offline'));
      mocked.leaderboards.get.mockRejectedValue(new Error('offline'));

      await renderDaily();

      expect(
        await screen.findByText("Couldn't load the Daily Feed"),
      ).toBeOnTheScreen();
      expect(
        await screen.findByText("Couldn't load the ranking"),
      ).toBeOnTheScreen();
      expect(
        screen.getAllByText('Something went wrong. Try again.'),
      ).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: 'Try again' })).toHaveLength(2);
    });

    it('speaks Arabic, the day number kept whole', async () => {
      useLanguage.setState({ locale: 'ar' });
      mocked.daily.get.mockResolvedValue(
        today({
          attempt: attempt({ status: 'flagged', rank: null, shareText: null }),
        }),
      );

      await renderDaily();

      expect(await screen.findByText(iso('#17'))).toBeOnTheScreen();
      expect(screen.getByText('خلاصة اليوم')).toBeOnTheScreen();
      expect(screen.getByText('الخلاصة')).toBeOnTheScreen();
      expect(screen.getByText('الخلاصة التالية بعد 11 س 0 د')).toBeOnTheScreen();
      expect(screen.getByText('لم تدخل نتيجتك الترتيب')).toBeOnTheScreen();
      expect(
        screen.getByText(
          'تعذّر التحقق من الجولة، لذلك لم تُسجَّل في ترتيب اليوم. خلاصة جديدة بانتظارك غدًا.',
        ),
      ).toBeOnTheScreen();
      expect(screen.getByText('قمة اليوم')).toBeOnTheScreen();
    });

    it('shows an empty summit in Arabic', async () => {
      useLanguage.setState({ locale: 'ar' });
      mocked.daily.get.mockResolvedValue(today());
      mocked.leaderboards.get.mockImplementation(
        async (
          board: LeaderboardBoard,
          { scope }: { scope: LeaderboardScope },
        ): Promise<LeaderboardResponse> => ({
          board,
          periodKey: '2026-09-24',
          season: 1,
          scope,
          startsAt: '2026-09-23T21:00:00.000Z',
          endsAt: '2026-09-24T21:00:00.000Z',
          serverTime: NOW,
          entries: [],
          me: null,
          neighbors: [],
          rival: null,
          nextRankProgress: null,
          players: 0,
        }),
      );

      await renderDaily();

      expect(await screen.findByText('قمة اليوم فارغة')).toBeOnTheScreen();
      expect(
        screen.getByText('ستتشكّل القمة هنا مع وصول النتائج الأولى.'),
      ).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'العب' })).toBeOnTheScreen();
    });
  });
});
