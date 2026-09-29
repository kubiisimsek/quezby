import { RULES } from '@quezby/engine';
import { fireEvent, screen } from '@testing-library/react-native';

import { BONUS_ORDER, REEL_ORDER, bonusGuide, reelGuide } from '@/game/howTo';
import { messagesOf } from '@/i18n';

const REEL_GUIDE = reelGuide(messagesOf('tr'));
const BONUS_GUIDE = bonusGuide(messagesOf('tr'));
import { getT, iso } from '@/i18n';
import { useLanguage } from '@/i18n/language';
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

  it('points to where things are now: Hesap bilgileri in Ayarlar, the friend list on the profile', async () => {
    await renderWithProviders(<HelpScreen {...props} />);

    expect(screen.getByText(/^Hesabını Ayarlar’daki Hesap bilgileri’nden kalıcı olarak silebilirsin/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Arkadaşlarımla nasıl yarışırım?' }));
    expect(screen.getByText(/^Profil’deki arkadaş sayına dokun/)).toBeOnTheScreen();
    expect(screen.getByText(/Mesajlar’dan hazır mesaj ve VS gönderirsin\.$/)).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Titreşimi nasıl kapatırım?' }),
    );
    // No line names a side: an Arabic screen mirrors it.
    expect(screen.getByText(/^Profil’deki ayarlar düğmesine dokun/)).toBeOnTheScreen();
    expect(screen.queryByText(/sağ üst|sol üst|sağda|solda/)).not.toBeOnTheScreen();
  });

  it('never calls a held score suspicious, not even in an answer', async () => {
    await renderWithProviders(<HelpScreen {...props} />);

    for (const question of screen.getAllByRole('button', { name: /\?$/ })) {
      await fireEvent.press(question);
    }

    expect(screen.getByText(/“Doğrulanıyor…” yazar/)).toBeOnTheScreen();
    expect(screen.queryByText(/şüpheli|hile/i)).not.toBeOnTheScreen();
  });

  it('calls what comes down the feed a post, never a reel, answers included', async () => {
    await renderWithProviders(<HelpScreen {...props} />);

    for (const question of screen.getAllByRole('button', { name: /\?$/ })) {
      await fireEvent.press(question);
    }

    expect(screen.getByText('Dört post')).toBeOnTheScreen();
    expect(screen.queryByText(/\breel/i)).not.toBeOnTheScreen();
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
      'Dört post',
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
        `Her ${RULES.levelEvery} postta bir seviye atlarsın. Her seviyede puan çarpanın büyür.`,
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
    expect(screen.getByText(/Lig, ilk 20 sayılan oyunundan sonra\s+açılır; deneme turu ve VS sayılmaz/)).toBeOnTheScreen();
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

  it('says the first practice run counts nowhere, and what a new account is called', async () => {
    await renderWithProviders(<HelpScreen {...props} />);

    expect(screen.getByText(/deneme turuyla başlarsın; o tur hiçbir yere\s+sayılmaz/)).toBeOnTheScreen();
    expect(screen.getByText(/guest48128742 gibi bir adla oynarsın/)).toBeOnTheScreen();
  });

  it('says a picked name is for good', async () => {
    await renderWithProviders(<HelpScreen {...props} />);

    expect(screen.getByText(/Seçtiğin ad\s+kalıcıdır; bir daha değişmez\./)).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Kullanıcı adımı değiştirebilir miyim?' }),
    );
    expect(screen.getByText(/^Hayır\. Adını bir kez seçersin ve bir daha değişmez/)).toBeOnTheScreen();
  });
});

describe('HelpScreen in other languages', () => {
  beforeEach(() => jest.clearAllMocks());

  it('speaks English: its name, the way back, every section and the engine’s numbers', async () => {
    useLanguage.setState({ locale: 'en' });
    await renderWithProviders(<HelpScreen {...props} />);

    expect(screen.getByText('Help')).toBeOnTheScreen();
    expect(screen.getByText('Rules, points and common questions')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(goBack).toHaveBeenCalledTimes(1);

    for (const title of [
      'The four posts',
      'Dopamine bar',
      'Points and combos',
      'Daily Feed',
      'Leagues',
      'Rankings',
      'Fair play',
      'Account',
      'Common questions',
    ]) {
      expect(screen.getByText(title)).toBeOnTheScreen();
    }
    const reels = reelGuide(getT());
    for (const kind of REEL_ORDER) {
      expect(screen.getByText(reels[kind].title)).toBeOnTheScreen();
      expect(screen.getByText(reels[kind].body)).toBeOnTheScreen();
    }
    const bonuses = bonusGuide(getT());
    for (const kind of BONUS_ORDER) {
      expect(screen.getByText(bonuses[kind].body)).toBeOnTheScreen();
    }
    expect(
      screen.getByText(
        `You level up every ${RULES.levelEvery} posts. Each level makes your point multiplier bigger.`,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Starts at x1.00; every right move adds +0.05, up to x1.50. Make a mistake and the part of your combo above x1.00 is cut in half.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText(/every midnight, Istanbul time\.$/)).toBeOnTheScreen();
    expect(screen.getByText(/one like guest48128742\./)).toBeOnTheScreen();
  });

  it('answers in English without naming a side, a reel or a cheat', async () => {
    useLanguage.setState({ locale: 'en' });
    await renderWithProviders(<HelpScreen {...props} />);

    const questions = screen.getAllByRole('button', { name: /\?$/ });
    expect(questions).toHaveLength(8);
    for (const question of questions) {
      await fireEvent.press(question);
    }

    expect(
      screen.getByText(/^Tap the settings button on your profile and turn it off there\./),
    ).toBeOnTheScreen();
    expect(screen.getByText(/meanwhile it says “Verifying…”/)).toBeOnTheScreen();
    expect(
      screen.queryByText(/(top|bottom|upper|lower)[ -](left|right)|(on|to) the (left|right)/i),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText(/\breel/i)).not.toBeOnTheScreen();
    expect(screen.queryByText(/suspicious|cheat/i)).not.toBeOnTheScreen();
  });

  it('speaks Arabic: questions asked the Arabic way, Latin numbers kept whole', async () => {
    useLanguage.setState({ locale: 'ar' });
    await renderWithProviders(<HelpScreen {...props} />);

    expect(screen.getByText('المساعدة')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'رجوع' })).toBeOnTheScreen();
    expect(screen.getByText('خلاصة اليوم')).toBeOnTheScreen();
    expect(
      screen.getByText(
        `تنتقل إلى المستوى التالي كل ${RULES.levelEvery} منشورًا. ومع كل مستوى يكبر مضاعِف نقاطك.`,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        `يبدأ الكومبو من ${iso('x1.00')}، وكل حركة صحيحة تضيف ${iso('+0.05')}، حتى ${iso('x1.50')} كحد أقصى. وإن أخطأت انخفض ما يزيد به الكومبو على ${iso('x1.00')} إلى النصف.`,
      ),
    ).toBeOnTheScreen();

    expect(screen.getAllByRole('button', { name: /؟$/ })).toHaveLength(8);
    await fireEvent.press(screen.getByRole('button', { name: 'كيف أوقف الاهتزاز؟' }));
    expect(screen.getByText(/^اضغط زر الإعدادات في ملفك/)).toBeOnTheScreen();
  });
});
