import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';

import { Callout, Txt } from '@/ui/kit';

describe('Callout', () => {
  it('sets plain copy in its own text', async () => {
    await render(<Callout title="Bağlandı">Artık Apple ile girersin.</Callout>);

    expect(screen.getByText('Bağlandı')).toBeOnTheScreen();
    expect(screen.getByText('Artık Apple ile girersin.')).toBeOnTheScreen();
  });

  it('sets copy built from pieces in one text, too', async () => {
    const name = 'Google';
    await render(
      <Callout>
        Artık bu hesaba {name} ile de girersin.
      </Callout>,
    );

    expect(screen.getByText('Artık bu hesaba Google ile de girersin.')).toBeOnTheScreen();
  });

  it('leaves laid-out children alone', async () => {
    await render(
      <Callout tone="warn">
        <View testID="custom">
          <Txt>Özel</Txt>
        </View>
      </Callout>,
    );

    expect(screen.getByTestId('custom')).toBeOnTheScreen();
    expect(screen.getByText('Özel')).toBeOnTheScreen();
  });
});
