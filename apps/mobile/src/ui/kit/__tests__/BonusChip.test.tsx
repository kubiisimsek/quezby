import type { BonusKind } from '@quezby/types';
import { render, screen } from '@testing-library/react-native';

import { useLanguage } from '@/i18n/language';
import { messagesOf } from '@/i18n';
import { BonusChip } from '@/ui/kit';

const BONUS_LABELS = Object.fromEntries(
  Object.entries(messagesOf('tr').bonus).map(([kind, words]) => [kind, words.name]),
);

describe('BonusChip', () => {
  it.each<[BonusKind, string]>([
    ['flawless', 'Kusursuz seviye'],
    ['lightning', 'Şimşek'],
    ['coolHead', 'Soğukkanlı'],
    ['comeback', 'Geri dönüş'],
  ])('names the %s bonus', async (kind, name) => {
    await render(<BonusChip kind={kind} count={2} points={900} />);

    expect(screen.getByText(name)).toBeOnTheScreen();
    expect(BONUS_LABELS[kind]).toBe(name);
  });

  it('says how often it came and what it paid', async () => {
    await render(<BonusChip kind="lightning" count={3} points={4_500} />);

    expect(screen.getByText('×3')).toBeOnTheScreen();
    expect(screen.getByText('+4.500')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('Şimşek, 3 kez, 4.500 puan'),
    ).toBeOnTheScreen();
  });

  it('leaves out the count for a single one', async () => {
    await render(<BonusChip kind="comeback" count={1} points={250} />);

    expect(screen.queryByText(/×/)).not.toBeOnTheScreen();
    expect(screen.getByText('+250')).toBeOnTheScreen();
  });

  it('counts a lifetime tally without points', async () => {
    await render(<BonusChip kind="lightning" count={12} />);

    expect(screen.getByText('×12')).toBeOnTheScreen();
    expect(screen.queryByText(/\+/)).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Şimşek, 12 kez')).toBeOnTheScreen();
  });

  it('is only its name when neither is given', async () => {
    await render(<BonusChip kind="coolHead" />);

    expect(screen.getByLabelText('Soğukkanlı')).toBeOnTheScreen();
    expect(screen.queryByText(/×|\+/)).not.toBeOnTheScreen();
  });

  it('speaks English: once, or how many times', async () => {
    useLanguage.setState({ locale: 'en' });
    await render(<BonusChip kind="lightning" count={3} points={4_500} />);

    expect(screen.getByText('Lightning')).toBeOnTheScreen();
    expect(screen.getByText('+4,500')).toBeOnTheScreen();
    expect(screen.getByLabelText('Lightning, 3 times, 4,500 points')).toBeOnTheScreen();

    await screen.rerender(<BonusChip kind="comeback" count={1} points={1} />);
    expect(screen.getByLabelText('Comeback, once, 1 point')).toBeOnTheScreen();
  });

  it('speaks Arabic, each count in its own form', async () => {
    useLanguage.setState({ locale: 'ar' });
    await render(<BonusChip kind="lightning" count={3} points={4_500} />);

    expect(screen.getByText('برق')).toBeOnTheScreen();
    expect(screen.getByLabelText('برق، 3 مرات، 4,500 نقطة')).toBeOnTheScreen();

    await screen.rerender(<BonusChip kind="coolHead" count={2} />);
    expect(screen.getByLabelText('أعصاب باردة، مرتان')).toBeOnTheScreen();
  });
});
