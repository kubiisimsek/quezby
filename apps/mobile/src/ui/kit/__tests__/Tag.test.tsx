import { render, screen } from '@testing-library/react-native';

import { Tag } from '@/ui/kit';

describe('Tag', () => {
  it('reads out its own words', async () => {
    await render(<Tag label="Kalkan · 3 tur" tone="secondary" icon="shield" />);

    expect(screen.getByText('Kalkan · 3 tur')).toBeOnTheScreen();
  });

  it('says the word its glyph carries: the qb glyph by a bare number', async () => {
    await render(<Tag label="2.450" said="2.450 qb" tone="warn" icon="qb" />);

    expect(screen.getByText('2.450')).toBeOnTheScreen();
    expect(screen.getByLabelText('2.450 qb')).toBeOnTheScreen();
  });
});
