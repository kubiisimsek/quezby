import { fireEvent, render, screen } from '@testing-library/react-native';

import { SwitchRow } from '@/ui/kit';

describe('SwitchRow', () => {
  it('is a switch named by its title that flips on a tap', async () => {
    const onChange = jest.fn();
    await render(
      <SwitchRow title="Titreşim" subtitle="Her kaydırmada titrer." value={false} onChange={onChange} />,
    );

    const toggle = screen.getByRole('switch', { name: 'Titreşim' });
    expect(toggle).not.toBeChecked();
    await fireEvent.press(toggle);
    expect(onChange).toHaveBeenCalledWith(true);

    await screen.rerender(
      <SwitchRow title="Titreşim" subtitle="Her kaydırmada titrer." value onChange={onChange} />,
    );
    expect(screen.getByRole('switch', { name: 'Titreşim' })).toBeChecked();
    await fireEvent.press(screen.getByRole('switch', { name: 'Titreşim' }));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it('takes no taps while disabled', async () => {
    const onChange = jest.fn();
    await render(<SwitchRow title="Titreşim" value onChange={onChange} disabled />);

    await fireEvent.press(screen.getByRole('switch', { name: 'Titreşim' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
