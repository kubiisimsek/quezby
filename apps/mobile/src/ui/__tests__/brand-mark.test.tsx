import { render, screen } from '@testing-library/react-native';

import { BrandMark } from '@/ui/brand-mark';

describe('BrandMark', () => {
  it('draws the logo tile at the size it is given, 64 pt unless told', async () => {
    await render(<BrandMark size={96} />);
    expect(screen.getByTestId('brand-mark')).toHaveStyle({ width: 96, height: 96 });

    await screen.rerender(<BrandMark />);
    expect(screen.getByTestId('brand-mark')).toHaveStyle({ width: 64, height: 64 });
  });
});
