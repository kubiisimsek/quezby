import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { BoardStage, PlayersPill, useArrival } from '@/components/BoardStage';

function Arriving() {
  const style = useArrival(2);
  return (
    <Animated.View testID="arriving" style={style}>
      <Text>Geldi</Text>
    </Animated.View>
  );
}

describe('BoardStage', () => {
  afterEach(() => jest.mocked(useReducedMotion).mockReturnValue(false));

  it('holds what stands on it, with a floor only when asked', async () => {
    await render(
      <BoardStage>
        <Text>Zirve</Text>
      </BoardStage>,
    );

    expect(screen.getByText('Zirve')).toBeOnTheScreen();
    expect(screen.queryByTestId('stage-floor')).not.toBeOnTheScreen();

    await screen.rerender(
      <BoardStage floor inset>
        <Text>Zirve</Text>
      </BoardStage>,
    );

    expect(screen.getByTestId('stage-floor')).toBeOnTheScreen();
  });

  it('counts the players on a board the Turkish way', async () => {
    await render(<PlayersPill count={5_120} />);

    expect(screen.getByText('5.120 oyuncu')).toBeOnTheScreen();
  });

  it('puts an arriving block in place at once when motion is reduced', async () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);

    await render(<Arriving />);

    expect(screen.getByTestId('arriving')).toHaveStyle({ opacity: 1 });
  });
});
