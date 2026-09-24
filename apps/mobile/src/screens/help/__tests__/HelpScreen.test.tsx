import { RULES } from '@quezby/engine';
import { fireEvent, screen } from '@testing-library/react-native';

import { BONUS_GUIDE, BONUS_ORDER, REEL_GUIDE, REEL_ORDER } from '@/game/howTo';
import { HelpScreen } from '@/screens/help/HelpScreen';
import { renderWithProviders } from '@/test/renderWithProviders';

type Props = Parameters<typeof HelpScreen>[0];

const goBack = jest.fn();
const props = {
  navigation: { navigate: jest.fn(), goBack },
  route: { key: 'Help', name: 'Help' },
} as unknown as Props;

describe('HelpScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('has its name on top and a way back', async () => {
    await renderWithProviders(<HelpScreen {...props} />);

    expect(screen.getByText('Yardım')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Geri' }));

    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('opens an answer when its question is tapped, and closes it again', async () => {
    await renderWithProviders(<HelpScreen {...props} />);
    const answer =
      'Hayır, her gün tek hakkın var. Serbest oyunda ise istediğin kadar oynarsın; en iyi turun sıralamalara yazılır.';

    const question = screen.getByRole('button', {
      name: 'Günün akışını tekrar oynayabilir miyim?',
    });
    expect(question).toBeCollapsed();
    expect(screen.queryByText(answer)).not.toBeOnTheScreen();

    await fireEvent.press(question);
    expect(screen.getByText(answer)).toBeOnTheScreen();
    expect(
      screen.getByRole('button', {
        name: 'Günün akışını tekrar oynayabilir miyim?',
      }),
    ).toBeExpanded();

    await fireEvent.press(question);
    expect(screen.queryByText(answer)).not.toBeOnTheScreen();
  });

  it('points to where things are now: Ayarlar on the profile', async () => {
    await renderWithProviders(<HelpScreen {...props} />);

    expect(screen.getByText(/Profil’deki Ayarlar’dan/)).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Titreşimi nasıl kapatırım?' }),
    );
    expect(screen.getByText(/sağ üstteki ayarlar düğmesine/)).toBeOnTheScreen();
  });

  it('never calls a held score suspicious, not even in an answer', async () => {
    await renderWithProviders(<HelpScreen {...props} />);

    for (const question of screen.getAllByRole('button', { name: /\?$/ })) {
      await fireEvent.press(question);
    }

    expect(screen.getByText(/“Doğrulanıyor…” yazar/)).toBeOnTheScreen();
    expect(screen.queryByText(/şüpheli|hile/i)).not.toBeOnTheScreen();
  });

  it('teaches the four reels from the one guide, in order', async () => {
    await renderWithProviders(<HelpScreen {...props} />);

    const titles = REEL_ORDER.map((kind) => REEL_GUIDE[kind].title);
    for (const kind of REEL_ORDER) {
      expect(screen.getByText(REEL_GUIDE[kind].title)).toBeOnTheScreen();
      expect(screen.getByText(REEL_GUIDE[kind].body)).toBeOnTheScreen();
    }
    const shown = screen
      .getAllByText(new RegExp(`^(${titles.join('|')})$`))
      .map((node) => node.props.children);
    expect(shown).toEqual(titles);
  });

  it('has a section for every part of the game', async () => {
    await renderWithProviders(<HelpScreen {...props} />);

    for (const title of [
      'Dört reel',
      'Dopamin barı',
      'Puan ve kombolar',
      'Günün akışı',
      'Ligler',
      'Sıralamalar',
      'Adil oyun',
      'Hesap',
    ]) {
      expect(screen.getByText(title)).toBeOnTheScreen();
    }
  });

  it('says a phone that fails Google’s or Apple’s check can play but not rank', async () => {
    await renderWithProviders(<HelpScreen {...props} />);

    expect(
      screen.getByText(/onaylamayan bir cihazda .* oynayabilirsin ama skorlar sıralamaya girmez/),
    ).toBeOnTheScreen();
  });

  it('explains levels and the combo with the engine’s own numbers', async () => {
    await renderWithProviders(<HelpScreen {...props} />);

    expect(
      screen.getByText(
        `Her ${RULES.levelEvery} reelde bir seviye atlarsın. Her seviyede puan çarpanın büyür.`,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        'x1,00 ile başlar, her doğru hareket +0,05 ekler, en fazla x1,50. Hata yaparsan kombonun x1,00 üstündeki kısmı yarıya iner.',
      ),
    ).toBeOnTheScreen();
  });

  it('names the four named combos and how to get each', async () => {
    await renderWithProviders(<HelpScreen {...props} />);

    for (const kind of BONUS_ORDER) {
      expect(screen.getByText(BONUS_GUIDE[kind].name)).toBeOnTheScreen();
      expect(screen.getByText(BONUS_GUIDE[kind].body)).toBeOnTheScreen();
    }
  });

  it('lays out the league rules', async () => {
    await renderWithProviders(<HelpScreen {...props} />);

    for (const tier of ['Bronz', 'Gümüş', 'Altın', 'Platin', 'Elmas']) {
      expect(screen.getByText(tier)).toBeOnTheScreen();
    }
    expect(screen.getByText(/30 kişilik bir gruba/)).toBeOnTheScreen();
    expect(
      screen.getByText(/her gününde yaptığın en iyi skorların\s+toplamı/),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        /ilk beş bir üst lige çıkar, son beş bir alt lige\s+iner/,
      ),
    ).toBeOnTheScreen();
  });

  it('says how the boards and fair play work', async () => {
    await renderWithProviders(<HelpScreen {...props} />);

    expect(
      screen.getByText('Skorlar eşitse o skora önce ulaşan önde.'),
    ).toBeOnTheScreen();
    expect(screen.getByText(/sunucu turu aynı kurallarla/)).toBeOnTheScreen();
    expect(screen.getByText(/“Skorun inceleniyor” yazar/)).toBeOnTheScreen();
    expect(screen.queryByText(/şüpheli|hile/i)).not.toBeOnTheScreen();
    expect(screen.getByText(/Apple, Google ya da e-posta/)).toBeOnTheScreen();
  });
});
