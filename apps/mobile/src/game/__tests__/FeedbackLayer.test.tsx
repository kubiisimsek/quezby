import type { BonusHit, Verdict } from '@quezby/engine';
import { render, screen } from '@testing-library/react-native';

import { FeedbackLayer } from '@/game/FeedbackLayer';
import type { Feedback } from '@/game/useGame';
import { useLanguage } from '@/i18n/language';

/** What the thumb just did: a hit on a plain post, unless a test says otherwise. */
function feedback(overrides: Partial<Feedback> = {}): Feedback {
  return {
    id: 1,
    verdict: 'hit',
    kind: 'skip',
    points: 1_250,
    combo: 1_250,
    bonuses: [],
    blind: 0,
    ...overrides,
  };
}

const FLAWLESS: BonusHit[] = [{ kind: 'flawless', points: 480 }];

describe('FeedbackLayer', () => {
  it('draws nothing before the first verdict', async () => {
    await render(<FeedbackLayer feedback={null} />);

    expect(screen.toJSON()).toBeNull();
  });

  it('stamps a hit’s points, the combo it built and a named combo', async () => {
    await render(<FeedbackLayer feedback={feedback({ bonuses: FLAWLESS })} />);

    expect(screen.getByText('+1.250')).toBeOnTheScreen();
    expect(screen.getByText('x1,25 kombo')).toBeOnTheScreen();
    expect(screen.getByText('Kusursuz seviye! +480')).toBeOnTheScreen();
  });

  it.each<[Verdict, string]>([
    ['perfect', 'Mükemmel!'],
    ['timeout', 'Takıldın!'],
    ['wrong', 'Yanlış hareket'],
    ['holdEarly', 'Erken bıraktın'],
    ['holdLate', 'Geç kaldın'],
    ['caught', 'Yakalandın!'],
    ['drained', 'Dopamin bitti'],
  ])('says what %s was in a word or two', async (verdict, words) => {
    await render(<FeedbackLayer feedback={feedback({ verdict })} />);

    expect(screen.getByText(words)).toBeOnTheScreen();
  });

  it.each([
    [1, 'Ceza x2'],
    [2, 'Ceza x4'],
    [3, 'Ceza x8'],
  ])('calls a blind move %i in a row what it is, and says what it cost', async (blind, penalty) => {
    await render(<FeedbackLayer feedback={feedback({ verdict: 'wrong', kind: 'like', blind })} />);

    expect(screen.getByText('Bakmadan!')).toBeOnTheScreen();
    expect(screen.getByText(penalty)).toBeOnTheScreen();
    expect(screen.queryByText('Yanlış hareket')).toBeNull();
  });

  it('says nothing of a penalty on a wrong move made after a look', async () => {
    await render(<FeedbackLayer feedback={feedback({ verdict: 'wrong', kind: 'like' })} />);

    expect(screen.getByText('Yanlış hareket')).toBeOnTheScreen();
    expect(screen.queryByText(/Ceza/)).toBeNull();
  });

  it('speaks English', async () => {
    useLanguage.setState({ locale: 'en' });
    await render(
      <FeedbackLayer feedback={feedback({ verdict: 'perfect', bonuses: FLAWLESS })} />,
    );

    expect(screen.getByText('Perfect!')).toBeOnTheScreen();
    expect(screen.getByText('+1,250')).toBeOnTheScreen();
    expect(screen.getByText('x1.25 combo')).toBeOnTheScreen();
    expect(screen.getByText('Flawless level! +480')).toBeOnTheScreen();

    await screen.rerender(<FeedbackLayer feedback={feedback({ id: 2, verdict: 'timeout' })} />);
    expect(screen.getByText('Too slow!')).toBeOnTheScreen();

    await screen.rerender(
      <FeedbackLayer feedback={feedback({ id: 3, verdict: 'wrong', kind: 'hold', blind: 1 })} />,
    );
    expect(screen.getByText('Didn’t look!')).toBeOnTheScreen();
    expect(screen.getByText('Penalty x2')).toBeOnTheScreen();
  });

  it('speaks Arabic, keeping the Latin pieces whole', async () => {
    useLanguage.setState({ locale: 'ar' });
    await render(<FeedbackLayer feedback={feedback({ bonuses: FLAWLESS })} />);

    expect(screen.getByText('كومبو \u200Ex1.25\u200E')).toBeOnTheScreen();
    expect(screen.getByText('مستوى مثالي! \u200E+480\u200E')).toBeOnTheScreen();

    await screen.rerender(
      <FeedbackLayer feedback={feedback({ id: 2, verdict: 'drained', kind: 'freeze' })} />,
    );
    expect(screen.getByText('نفد الدوبامين')).toBeOnTheScreen();

    await screen.rerender(
      <FeedbackLayer feedback={feedback({ id: 3, verdict: 'wrong', kind: 'like', blind: 2 })} />,
    );
    expect(screen.getByText('العقوبة \u200Ex4\u200E')).toBeOnTheScreen();
  });
});
