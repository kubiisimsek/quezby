import { fireEvent, render, screen, within } from '@testing-library/react-native';

import * as kit from '@/ui/kit';
import { arena } from '@/ui/tokens';

const { BrandBand, Button, Card, Field, Meter, Segmented, Stat, Txt } = kit;

/** Every name `@/ui/kit` exported before it was split into `ui/kit/`. */
const BEFORE_SPLIT = [
  'Txt',
  'Eyebrow',
  'Screen',
  'Gradient',
  'BrandBand',
  'Panel',
  'Card',
  'Divider',
  'Avatar',
  'IconChip',
  'Button',
  'Row',
  'SwitchRow',
  'Tag',
  'Callout',
  'Stat',
  'StatRow',
  'Field',
  'PasswordField',
  'Loading',
  'Skeleton',
  'SkeletonList',
  'EmptyState',
  'Segmented',
  'Meter',
  'stagger',
] as const;

const ADDED = [
  'IconButton',
  'SocialButton',
  'MedalBadge',
  'TierBadge',
  'CountdownChip',
  'Podium',
  'ClimbRow',
  'FloorCard',
  'BonusChip',
  'ShareGrid',
  'LobbyCard',
  'StatGrid',
  'PlayButton',
  'RankChips',
  'PlayerRow',
  'FaceOff',
  'ThreadRow',
  'Count',
  'Bubble',
  'EventLine',
  'PhraseChip',
  'RunTile',
  'Toast',
] as const;

describe('@/ui/kit', () => {
  it.each([...BEFORE_SPLIT, ...ADDED])('still exports %s', (name) => {
    expect(typeof kit[name]).toBe('function');
  });

  it('still exports the pop spring', () => {
    expect(kit.SPRING_POP).toEqual(expect.objectContaining({ damping: 18 }));
  });

  it('renders the existing pieces as before', async () => {
    const onPress = jest.fn();
    const onChange = jest.fn();
    await render(
      <BrandBand>
        <Txt>Selam</Txt>
        <Button label="Oyna" icon="play" onPress={onPress} />
        <Card onPress={onPress}>
          <Txt>Kart</Txt>
        </Card>
        <Field label="Kullanıcı adı" placeholder="ekin" />
        <Meter value={0.5} />
        <Stat label="Post" value={12} />
        <Segmented
          value="daily"
          onChange={onChange}
          options={[
            { value: 'daily', label: 'Bugün' },
            { value: 'weekly', label: 'Bu hafta' },
          ]}
        />
      </BrandBand>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Oyna' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('tab', { name: 'Bu hafta' }));
    expect(onChange).toHaveBeenCalledWith('weekly');
    expect(screen.getByRole('tab', { name: 'Bugün' })).toBeSelected();
    expect(screen.getByText('Selam')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('ekin')).toBeOnTheScreen();
  });

  it('reads a segment out by what it says when it has more to say than its label', async () => {
    await render(
      <Segmented
        value="free"
        onChange={jest.fn()}
        options={[
          { value: 'free', label: 'Normal' },
          { value: 'rated', label: 'Dereceli', said: 'Dereceli, kilitli: 12 oyun kaldı' },
        ]}
      />,
    );

    expect(screen.getByRole('tab', { name: 'Dereceli, kilitli: 12 oyun kaldı' })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Normal' })).toBeSelected();
  });

  it('draws each tone as its slab: gold plays, magenta acts, violet is the quiet one', async () => {
    const face = async (tone: 'play' | 'primary' | 'onBrandSoft' | 'danger') => {
      await screen.rerender(<Button label="Düğme" tone={tone} onPress={jest.fn()} />);
      return within(screen.getByRole('button', { name: 'Düğme' })).getByTestId('slab-face');
    };
    await render(<Button label="Düğme" onPress={jest.fn()} />);

    expect(await face('play')).toHaveStyle({ backgroundColor: arena.gold });
    expect(await face('primary')).toHaveStyle({ backgroundColor: arena.primary });
    expect(await face('onBrandSoft')).toHaveStyle({ backgroundColor: arena.secondary });
    expect(await face('danger')).toHaveStyle({ backgroundColor: arena.bad });
  });
});
