import { render, screen } from '@testing-library/react-native';

import { Toggle } from '@/ui/kit';

// This file plays the game right to left, as an Arabic launch does.
jest.mock('@/i18n/native', () => ({ ...jest.requireActual('@/i18n/native'), IS_RTL: true }));

/** Where the knob's transform puts it along the track. */
function knobTravel(): number {
  const track = screen.getByRole('switch').children[0];
  const knob = typeof track === 'object' && track ? track.children[0] : undefined;
  const flat = JSON.stringify(typeof knob === 'object' && knob ? knob.props.style : {});
  const match = /"translateX":(-?[\d.]+)/.exec(flat);
  return match ? Number(match[1]) : 0;
}

describe('Toggle, reading right to left', () => {
  it('slides its knob toward the end of the line — the left — when it turns on', async () => {
    await render(<Toggle label="Titreşim" value onChange={() => undefined} />);
    expect(knobTravel()).toBeLessThan(0);
  });

  it('leaves the knob at the start when off', async () => {
    await render(<Toggle label="Titreşim" value={false} onChange={() => undefined} />);
    expect(knobTravel()).toBe(0);
  });
});
