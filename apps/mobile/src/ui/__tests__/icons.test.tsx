import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

/** The drawing's style, as the SVG root gets it. */
async function svgStyle(ui: ReactElement) {
  const view = await render(ui);
  const root = view.toJSON();
  const node = Array.isArray(root) ? root[0] : root;
  return node?.props.style;
}

describe('Icon', () => {
  it('draws every glyph as it is when the game reads left to right', async () => {
    const { Icon } = jest.requireActual('@/ui/icons') as typeof import('@/ui/icons');
    expect(JSON.stringify(await svgStyle(<Icon name="chevron" color="#000000" />))).not.toContain('scaleX');
  });

  it('turns the glyphs that point along the line around in Arabic, and only those', async () => {
    let Icon: typeof import('@/ui/icons').Icon = jest.requireActual('@/ui/icons').Icon;
    jest.isolateModules(() => {
      jest.doMock('@/i18n/native', () => ({ ...jest.requireActual('@/i18n/native'), IS_RTL: true }));
      Icon = (require('@/ui/icons') as typeof import('@/ui/icons')).Icon;
    });

    for (const name of ['chevron', 'back', 'logout', 'trendUp'] as const) {
      expect(JSON.stringify(await svgStyle(<Icon name={name} color="#000000" />))).toContain('"scaleX":-1');
    }
    for (const name of ['play', 'arrowUp', 'heart'] as const) {
      expect(JSON.stringify(await svgStyle(<Icon name={name} color="#000000" />))).not.toContain('scaleX');
    }
  });
});
