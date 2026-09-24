import type { BonusKind } from '@quezby/types';
import { render, screen } from '@testing-library/react-native';

import { BONUS_LABELS, BonusChip } from '@/ui/kit';

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
});
