import type { RatingBoardResponse, RatingEntry } from '@quezby/types';
import { fireEvent, screen } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { track } from '@/analytics/track';
import { api } from '@/api/client';
import { iso } from '@/i18n';
import { useLanguage } from '@/i18n/language';
import { LeagueScreen } from '@/screens/league/LeagueScreen';
import { buildLocked, buildPlacing, buildRating } from '@/test/factories';
import { renderWithProviders } from '@/test/renderWithProviders';

jest.mock('@/analytics/track', () => ({ track: jest.fn() }));

jest.mock('@/api/client', () => ({
  api: {
    rating: { current: jest.fn(), board: jest.fn() },
    users: { get: jest.fn(), follow: jest.fn(), unfollow: jest.fn() },
  },
}));

const mocked = api as unknown as {
  rating: { current: jest.Mock; board: jest.Mock };
  users: { get: jest.Mock };
};

type Props = ComponentProps<typeof LeagueScreen>;

function entry(overrides: Partial<RatingEntry> = {}): RatingEntry {
  return {
    rank: 1,
    username: 'ust',
    avatarUrl: null,
    rating: 2_900,
    tier: 'gold',
    leagueBest: null,
    isMe: false,
    isFriend: false,
    gap: null,
    ...overrides,
  };
}

/** Four players of Altın by qb, you third — the last fresh from Gümüş, with no Altın score yet. */
const ROWS: RatingEntry[] = [
  entry({ rank: 1, username: 'ust', rating: 2_900, leagueBest: 142_300 }),
  entry({ rank: 2, username: 'es', rating: 2_500, leagueBest: 118_000, gap: 401 }),
  entry({ rank: 3, username: 'kubi', rating: 2_340, leagueBest: 96_400, gap: 161, isMe: true }),
  entry({ rank: 4, username: 'alt', rating: 2_100, gap: 241 }),
];

function board(overrides: Partial<RatingBoardResponse> = {}): RatingBoardResponse {
  return { scope: 'league', entries: ROWS, me: ROWS[2] ?? null, players: 4, ...overrides };
}

/** A Gold player, 2.340 qb: 660 from Platin, 150.800 to beat at difficulty 6 — neither shown. */
const GOLD = buildRating({
  rating: 2_340,
  tier: 'gold',
  floor: 2_000,
  ceil: 3_000,
  progress: 340,
  target: 150_800,
  difficulty: 6,
  peak: 2_400,
});

async function renderLeague() {
  const navigation = { navigate: jest.fn(), setOptions: jest.fn() };
  await renderWithProviders(
    <LeagueScreen
      navigation={navigation as unknown as Props['navigation']}
      route={{ key: 'League-test', name: 'League' } as Props['route']}
    />,
  );
  return navigation;
}

describe('LeagueScreen — Lig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.rating.current.mockResolvedValue(GOLD);
    mocked.rating.board.mockResolvedValue(board());
  });

  it('puts your league, your qb on its coin, how far into it and your best on the stage', async () => {
    await renderLeague();

    expect(await screen.findByText('Altın lig')).toBeOnTheScreen();
    expect(screen.getByRole('image', { name: 'Altın lig' })).toBeOnTheScreen();
    expect(screen.getByLabelText('2.340 qb')).toBeOnTheScreen();
    expect(screen.getAllByTestId('qb-coin', { includeHiddenElements: true }).length).toBeGreaterThan(0);
    // The coin carries the word: the stage writes the number alone.
    expect(screen.queryByText('2.340 qb')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('En yüksek 2.400 qb')).toBeOnTheScreen();
    // The bar says how far into the league; no line counts the qb to the next.
    expect(screen.queryByText(/Platin'e/)).not.toBeOnTheScreen();
    expect(screen.getAllByTestId('meter-notch')).toHaveLength(3);
    expect(screen.getByText('En yüksek 2.400')).toBeOnTheScreen();
  });

  it('never shows the target or the difficulty, nor explains them', async () => {
    await renderLeague();

    expect(await screen.findByLabelText('2.340 qb')).toBeOnTheScreen();
    expect(screen.queryByText(/Hedef|Zorluk/)).not.toBeOnTheScreen();
    expect(screen.queryByText(/geçersen|engeller/)).not.toBeOnTheScreen();
  });

  it('reads out only your own league; the ladder round it is its picture', async () => {
    mocked.rating.current.mockResolvedValue(buildRating());

    await renderLeague();

    expect(await screen.findByText('Gümüş lig')).toBeOnTheScreen();
    expect(screen.getAllByRole('image').map((node) => node.props.accessibilityLabel)).toEqual(['Gümüş lig']);
  });

  it('gives MasterClass no bar, and shows a fresh shield', async () => {
    mocked.rating.current.mockResolvedValue(
      buildRating({
        rating: 5_060,
        tier: 'master',
        floor: 5_000,
        ceil: null,
        progress: null,
        target: 826_100,
        shield: { tier: 'master', runs: 2 },
      }),
    );

    await renderLeague();

    expect(await screen.findByText('MasterClass lig')).toBeOnTheScreen();
    expect(screen.queryByText('Tavanı yok')).not.toBeOnTheScreen();
    expect(screen.getByText('Kalkan · 2 tur')).toBeOnTheScreen();
    expect(screen.queryByTestId('meter-notch')).not.toBeOnTheScreen();
  });

  it('counts the placement games before there is a rating, and plays the next one rated', async () => {
    mocked.rating.current.mockResolvedValue(buildPlacing(2));

    const navigation = await renderLeague();

    expect(await screen.findByText('Yerleşme 2/3')).toBeOnTheScreen();
    expect(screen.getByText('İlk 3 dereceli oyunun hangi ligde başlayacağını belirler.')).toBeOnTheScreen();
    expect(screen.getAllByTestId('meter-notch')).toHaveLength(2);
    expect(screen.queryByText(/^Hedef/)).not.toBeOnTheScreen();
    expect(screen.getByText('Lig sıralaması Dereceli oyuncularının')).toBeOnTheScreen();
    expect(mocked.rating.board).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Dereceli oyna' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Game', { mode: 'rated' });
  });

  it('keeps Dereceli shut until enough Normal and Günlük games are played, and sends the player to Normal', async () => {
    mocked.rating.current.mockResolvedValue(buildLocked(12));

    const navigation = await renderLeague();

    expect(await screen.findByText('Dereceli’ye 12 oyun kaldı')).toBeOnTheScreen();
    expect(screen.getByText('Dereceli, 20 Normal ya da Günlük oyundan sonra açılır.')).toBeOnTheScreen();
    expect(screen.queryByText(/^Yerleşme \d/)).not.toBeOnTheScreen();
    expect(screen.getByText('Lig sıralaması Dereceli oyuncularının')).toBeOnTheScreen();
    expect(screen.getByText('Yerleşme oyunlarını bitirince ligindeki sıralamaya girersin.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Dereceli oyna' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'qb hareketlerini aç' })).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Normal oyna' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Game', { mode: 'free' });
  });

  it('keeps the qb moves off the page, and opens them from the stage’s coin, newest first', async () => {
    mocked.rating.current.mockResolvedValue(
      buildRating({
        history: [
          { kind: 'adjust', delta: 360, before: 1_640, after: 2_000, score: null, target: null, tier: 'gold', runId: null, at: '2026-09-30T09:00:00.000Z' },
          { kind: 'reversal', delta: -30, before: 1_670, after: 1_640, score: null, target: null, tier: 'silver', runId: 'r3', at: '2026-09-29T09:00:00.000Z' },
          { kind: 'run', delta: -18, before: 1_628, after: 1_610, score: 41_000, target: 66_100, tier: 'silver', runId: 'r2', at: '2026-09-28T09:00:00.000Z' },
        ],
      }),
    );

    await renderLeague();
    await screen.findByLabelText('1.640 qb');
    expect(screen.queryByText('Geri alındı')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'qb hareketlerini aç' }));

    expect(await screen.findByText('qb hareketleri')).toBeOnTheScreen();
    expect(screen.getAllByTestId('qb-move')).toHaveLength(3);
    expect(screen.getByText('Düzeltme')).toBeOnTheScreen();
    expect(screen.getByText('+360')).toBeOnTheScreen();
    expect(screen.getByText('2.000 qb')).toBeOnTheScreen();
    expect(screen.getByText('Geri alındı')).toBeOnTheScreen();
    expect(screen.getByText('−30')).toBeOnTheScreen();
    expect(screen.getByText('Tur')).toBeOnTheScreen();
    expect(screen.getByText('−18')).toBeOnTheScreen();
    // The run's score against its target, then when.
    expect(screen.getByText(/^41\.000 · hedef 66\.100 · /)).toBeOnTheScreen();
  });

  it('shows the rating a placement set, not a move', async () => {
    mocked.rating.current.mockResolvedValue(
      buildRating({
        rating: 1_500,
        history: [
          { kind: 'placement', delta: 0, before: null, after: 1_500, score: 58_310, target: null, tier: 'silver', runId: 'r5', at: '2026-09-29T09:00:00.000Z' },
        ],
      }),
    );

    await renderLeague();
    await fireEvent.press(await screen.findByRole('button', { name: 'qb hareketlerini aç' }));

    expect(await screen.findByText('Yerleşme')).toBeOnTheScreen();
    expect(screen.getAllByText('1.500').length).toBeGreaterThan(0);
    expect(screen.queryByText('±0')).not.toBeOnTheScreen();
  });

  it('keeps its head while the rating is on its way', async () => {
    mocked.rating.current.mockReturnValue(new Promise(() => {}));

    await renderLeague();

    expect(screen.getByText('LİG')).toBeOnTheScreen();
    expect(screen.queryByText(/ lig$/)).not.toBeOnTheScreen();
  });

  it('ranks your league by qb, never by the week, with the qb to pass the player above', async () => {
    await renderLeague();

    expect(await screen.findByRole('button', { name: /^1\. sıra, @ust/ })).toBeOnTheScreen();
    expect(screen.getByText('LİG SIRALAMASI')).toBeOnTheScreen();
    // The ranking goes without a line of rules under its name.
    expect(screen.queryByText(/Son 14 günde dereceli oynayanlar/)).not.toBeOnTheScreen();
    expect(mocked.rating.board).toHaveBeenCalledWith('league');
    expect(
      screen.getAllByRole('button', { name: /\. sıra, @/ }).map((row) => row.props.accessibilityLabel),
    ).toEqual([
      '1. sıra, @ust, 2.900 qb, En iyi skor 142.300',
      '2. sıra, @es, 2.500 qb, En iyi skor 118.000, geçmek için 401 qb',
      '3. sıra, @kubi, sen, 2.340 qb, En iyi skor 96.400, geçmek için 161 qb',
      '4. sıra, @alt, 2.100 qb, geçmek için 241 qb',
    ]);
    expect(screen.queryByText(/HAFTALIK|Bitmesine|bonus/i)).not.toBeOnTheScreen();
  });

  it('writes each player’s best score in the league small under the name, and nothing before they have one', async () => {
    await renderLeague();

    expect(await screen.findByText('En iyi skor 142.300')).toBeOnTheScreen();
    expect(screen.getByText('En iyi skor 118.000')).toBeOnTheScreen();
    expect(screen.getByText('En iyi skor 96.400')).toBeOnTheScreen();
    expect(screen.getAllByText(/^En iyi skor /)).toHaveLength(3);
  });

  it('pins your floor with the qb to the player above, and plays rated to pass them', async () => {
    const navigation = await renderLeague();

    expect(await screen.findByText("@es'e 161 qb")).toBeOnTheScreen();
    expect(screen.getByText('SENİN KATIN')).toBeOnTheScreen();
    expect(screen.getByText('#3')).toBeOnTheScreen();
    expect(screen.getByText('Sen · 2.340 qb')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Geç onu' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Game', { mode: 'rated' });
    expect(track).toHaveBeenCalledWith('rival');
  });

  it('asks a placed player who has not played rated lately back in', async () => {
    mocked.rating.board.mockResolvedValue(board({ entries: ROWS.filter((row) => !row.isMe), me: null, players: 3 }));
    const navigation = await renderLeague();

    expect(await screen.findByText('Son 14 günde dereceli oynamadın')).toBeOnTheScreen();
    expect(screen.getByText('Bir dereceli oyun seni ligindeki sıralamaya geri koyar.')).toBeOnTheScreen();
    expect(screen.queryByText('SENİN KATIN')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^1\. sıra, @ust/ })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Dereceli oyna' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Game', { mode: 'rated' });
  });

  it('opens a player card from a row', async () => {
    mocked.users.get.mockReturnValue(new Promise(() => {}));
    await renderLeague();

    await fireEvent.press(await screen.findByRole('button', { name: /^4\. sıra, @alt/ }));

    expect(mocked.users.get).toHaveBeenCalledWith('alt');
  });

  it('explains a failed load and tries again', async () => {
    mocked.rating.board.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(board());
    await renderLeague();

    expect(await screen.findByText('Lig sıralaması yüklenemedi')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));

    expect(await screen.findByRole('button', { name: /^1\. sıra, @ust/ })).toBeOnTheScreen();
  });
});

describe('LeagueScreen — in other languages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.rating.current.mockResolvedValue(GOLD);
    mocked.rating.board.mockResolvedValue(board());
  });

  it('speaks English: the stage, the league ranking and your floor', async () => {
    useLanguage.setState({ locale: 'en' });

    await renderLeague();

    expect(await screen.findByText('Gold league')).toBeOnTheScreen();
    expect(await screen.findByText('You · 2,340 qb')).toBeOnTheScreen();
    expect(screen.getByText('LEAGUE RANKING')).toBeOnTheScreen();
    expect(screen.getByText('LEAGUE')).toBeOnTheScreen();
    expect(screen.getByLabelText('2,340 qb')).toBeOnTheScreen();
    expect(screen.getByText('Best 2,400')).toBeOnTheScreen();
    expect(screen.getByText('Best score 142,300')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Open your qb history' })).toBeOnTheScreen();
    expect(screen.getByText('161 qb to @es')).toBeOnTheScreen();
  });

  it('tells a new player in English how many games stand before Ranked', async () => {
    useLanguage.setState({ locale: 'en' });
    mocked.rating.current.mockResolvedValue(buildLocked(1));

    await renderLeague();

    expect(await screen.findByText('1 game to Ranked')).toBeOnTheScreen();
    expect(screen.getByText('Ranked opens after 20 Normal or Daily games.')).toBeOnTheScreen();
    expect(screen.getByText('The league ranking is for Ranked players')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Play Normal' })).toBeOnTheScreen();
  });

  it('speaks Arabic: the league, the qb and the ranking', async () => {
    useLanguage.setState({ locale: 'ar' });

    await renderLeague();

    expect(await screen.findByText('دوري الذهب')).toBeOnTheScreen();
    expect(await screen.findByText(`تفصلك 161 qb عن ${iso('@es')}`)).toBeOnTheScreen();
    expect(screen.getByText('ترتيب الدوري')).toBeOnTheScreen();
    expect(screen.getByText('الدوري')).toBeOnTheScreen();
    expect(screen.getByLabelText(`${iso('2,340')} qb`)).toBeOnTheScreen();
    expect(screen.getByText(`أفضل نتيجة ${iso('142,300')}`)).toBeOnTheScreen();
  });
});
