import { fireEvent, render, screen } from '@testing-library/react-native';

import { FloorDock } from '@/components/FloorDock';
import { Txt } from '@/ui/kit';

describe('FloorDock', () => {
  it('holds its card and tells the list how much room to leave', async () => {
    const onHeight = jest.fn();
    await render(
      <FloorDock onHeight={onHeight}>
        <Txt>Senin katın</Txt>
      </FloorDock>,
    );

    await fireEvent(screen.getByText('Senin katın'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 700, width: 390, height: 132 } },
    });

    expect(onHeight).toHaveBeenCalledWith(132);
  });
});
