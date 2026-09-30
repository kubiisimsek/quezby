import { render, screen } from '@testing-library/react-native';

import { LeagueChip, QbChip, WarnChip } from '@/ui/kit';
import { useLanguage } from '@/i18n/language';

describe('chips', () => {
  it('wears a league as its frame over a pill with its name', async () => {
    await render(<LeagueChip tier="gold" />);

    expect(screen.getByText('Altın lig')).toBeOnTheScreen();
    expect(screen.getByLabelText('Altın lig')).toBeOnTheScreen();
    expect(screen.getByTestId('league-frame-gold', { includeHiddenElements: true })).toBeTruthy();
  });

  it('writes a qb amount by its coin as a bare number, and says the unit', async () => {
    await render(<QbChip value={2_140} />);

    expect(screen.getByText('2.140')).toBeOnTheScreen();
    expect(screen.getByLabelText('2.140 qb')).toBeOnTheScreen();
    expect(screen.getByTestId('qb-coin', { includeHiddenElements: true })).toBeTruthy();
  });

  it('reads out in the player’s language', async () => {
    useLanguage.setState({ locale: 'en' });
    await render(
      <>
        <LeagueChip tier="diamond" />
        <QbChip value={4_300} />
      </>,
    );

    expect(screen.getByText('Diamond league')).toBeOnTheScreen();
    expect(screen.getByLabelText('4,300 qb')).toBeOnTheScreen();
  });

  it('wears a warning with its gem', async () => {
    await render(<WarnChip label="Misafir hesap" />);

    expect(screen.getByLabelText('Misafir hesap')).toBeOnTheScreen();
  });
});
