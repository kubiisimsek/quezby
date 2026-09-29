import { render, screen } from '@testing-library/react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { BrandBand, LitEdge, Shine, innerRadius } from '@/ui/kit';
import { DEPTH, RADIUS } from '@/ui/theme';
import { arena } from '@/ui/tokens';

/**
 * What lies flush against the inside of a tile — its lit edge, a shine, a
 * wash — follows the outline's inner curve instead of crossing it.
 */
type Host = { props: { style?: unknown }; children: Array<Host | string> };

/** The `index`th host view inside the view with this test id. */
function child(parent: Host, index = 0): Host {
  const found = parent.children[index];
  if (!found || typeof found === 'string') throw new Error(`no view at ${index}`);
  return found;
}

function styleOf(view: Host): ViewStyle {
  return StyleSheet.flatten(view.props.style as StyleProp<ViewStyle>) ?? {};
}

function host(testID: string): Host {
  return screen.getByTestId(testID) as unknown as Host;
}

describe('innerRadius', () => {
  it('is a corner’s radius less its outline, never below nothing', () => {
    expect(innerRadius(RADIUS.panel)).toBe(RADIUS.panel - DEPTH.outline);
    expect(innerRadius(18, 3)).toBe(15);
    expect(innerRadius(2)).toBe(0);
  });
});

describe('LitEdge', () => {
  it('is the top border of a box rounded like the tile’s inside, tall enough to keep its curve', async () => {
    await render(
      <View testID="tile">
        <LitEdge color="gold" />
      </View>,
    );

    const edge = styleOf(child(host('tile')));
    const inner = RADIUS.panel - DEPTH.outline;
    expect(edge).toMatchObject({
      borderTopColor: 'gold',
      borderTopWidth: 3,
      borderTopLeftRadius: inner,
      borderTopRightRadius: inner,
      height: inner,
      position: 'absolute',
    });
    expect(edge.backgroundColor).toBeUndefined();
  });

  it('rounds by the tile it sits in', async () => {
    await render(
      <View testID="tile">
        <LitEdge color="gold" radius={RADIUS.control} />
      </View>,
    );

    const edge = styleOf(child(host('tile')));
    expect(edge.borderTopLeftRadius).toBe(RADIUS.control - DEPTH.outline);
  });
});

describe('Shine', () => {
  it('cuts its band out of a slab-tall box rounded like the slab’s inside', async () => {
    await render(
      <View testID="slab">
        <Shine color="white" radius={20} height="45%" />
      </View>,
    );

    const frame = child(host('slab'));
    expect(styleOf(frame)).toMatchObject({
      borderTopLeftRadius: 20 - DEPTH.outline,
      borderTopRightRadius: 20 - DEPTH.outline,
      bottom: 0,
      overflow: 'hidden',
      top: 0,
    });
    expect(styleOf(child(frame))).toEqual({
      backgroundColor: 'white',
      height: '45%',
    });
  });
});

describe('BrandBand', () => {
  it('keeps its wash inside a lipped outline, and fills the rest in the outline’s colour', async () => {
    await render(
      <View testID="host">
        <BrandBand
          style={{
            borderBottomWidth: 7,
            borderColor: arena.outline,
            borderRadius: 30,
            borderTopWidth: 0,
            borderWidth: 2.5,
          }}
        />
      </View>,
    );

    const band = child(host('host'));
    expect(styleOf(band)).toMatchObject({ backgroundColor: arena.outline });
    expect(styleOf(child(band))).toMatchObject({
      backgroundColor: arena.brandFrom,
      borderBottomLeftRadius: 27.5,
      borderBottomRightRadius: 27.5,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      overflow: 'hidden',
    });
  });

  it('paints its own colour under a band with no outline', async () => {
    await render(
      <View testID="host">
        <BrandBand radius={12} />
      </View>,
    );

    const band = child(host('host'));
    expect(styleOf(band)).toMatchObject({ backgroundColor: arena.brandFrom });
    expect(styleOf(child(band))).toMatchObject({ borderTopLeftRadius: 12 });
  });
});
