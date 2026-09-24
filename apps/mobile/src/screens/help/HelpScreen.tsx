import { RULES, type ReelKind } from '@quezby/engine';
import type { LeagueTier } from '@quezby/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BONUS_GUIDE, BONUS_ORDER, REEL_GUIDE, REEL_ORDER } from '@/game/howTo';
import { formatCombo } from '@/lib/format';
import type { RootStackParamList } from '@/navigation/types';
import { Icon, type IconName } from '@/ui/icons';
import {
  BonusChip,
  Divider,
  Eyebrow,
  IconChip,
  Meter,
  Panel,
  Row,
  Screen,
  TierBadge,
  TopBar,
  Txt,
  type TagTone,
} from '@/ui/kit';
import { DEPTH, RADIUS, SPACE, useTheme, withAlpha } from '@/ui/theme';
import { reel as REEL } from '@/ui/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Help'>;

const TIERS: readonly LeagueTier[] = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
];

const COMBO_START = formatCombo(RULES.comboStart);
const COMBO_MAX = formatCombo(RULES.comboMax);
const COMBO_STEP = `+${formatCombo(RULES.comboStep).slice(1)}`;

/** Each reel in the feed's own colours, so the guide teaches what the eye will see. */
const REEL_FACE: Record<ReelKind, { face: string; ink: string }> = {
  skip: { face: REEL.skip[0], ink: REEL.ink },
  like: { face: REEL.like, ink: REEL.ink },
  hold: { face: REEL.hold, ink: REEL.goldInk },
  freeze: { face: REEL.freeze, ink: REEL.ink },
};

/** The dopamine bar as it drains: full, going, nearly gone. */
const DOPAMINE: ReadonlyArray<{ value: number; tone: TagTone; label: string }> =
  [
    { value: 0.9, tone: 'ok', label: 'Dolu' },
    { value: 0.5, tone: 'warn', label: 'Azalıyor' },
    { value: 0.16, tone: 'bad', label: 'Bitmek üzere' },
  ];

/** What players ask, answered in a line or two. */
const FAQ: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: 'Skorum neden hemen görünmüyor?',
    answer:
      'Tur bitince sunucu hareketlerini baştan oynatır ve puanını kendisi hesaplar; o sırada “Doğrulanıyor…” yazar. Cevap gelince skorun görünür.',
  },
  {
    question: 'Günün akışını tekrar oynayabilir miyim?',
    answer:
      'Hayır, her gün tek hakkın var. Serbest oyunda ise istediğin kadar oynarsın; en iyi turun sıralamalara yazılır.',
  },
  {
    question: 'Ligde nasıl yükselirim?',
    answer:
      'Haftanın her günü oyna: her günün en iyi skoru lig puanına eklenir. Hafta bitince terfi bölgesindeysen bir üst lige çıkarsın.',
  },
  {
    question: 'Arkadaşlarımla nasıl yarışırım?',
    answer:
      'Arkadaşlar’dan onları bul ve takip et. Zirve’de Arkadaşlar’a geçince yalnızca takip ettiklerinle yarışırsın.',
  },
  {
    question: 'Telefonumu değiştirirsem ne olur?',
    answer:
      'Hesabını koruduysan yeni telefonda bağladığın yolla girersin; adın ve skorların seninle gelir. Misafir hesap yalnızca bu telefonda durur.',
  },
  {
    question: 'Titreşimi nasıl kapatırım?',
    answer:
      'Profil’de sağ üstteki ayarlar düğmesine dokun, oradan kapat. Oyun sessizce oynanır.',
  },
];

/**
 * Yardım: the rules, from the reels to the leagues, in the order a new
 * player meets them, then what players ask. The reel and combo copy is
 * `game/howTo`'s and every number is the engine's `RULES`, so nothing here
 * can promise a rule the game does not keep.
 */
export function HelpScreen({ navigation }: Props) {
  return (
    <Screen>
      <TopBar
        title="Yardım"
        subtitle="Kurallar, puanlar ve sık sorulanlar"
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Section icon="grid" title="Dört reel">
          <Txt tone="muted">
            Her reel tek bir hareket ister, süresi dolmadan. Hangisi olduğunu
            rengi ve rozeti söyler.
          </Txt>
          {REEL_ORDER.map((kind) => {
            const reel = REEL_GUIDE[kind];
            return (
              <View key={kind} style={styles.guide}>
                <ReelGem kind={kind} icon={reel.icon} />
                <View style={styles.flex}>
                  <Txt variant="heading">{reel.title}</Txt>
                  <Txt variant="meta" tone="muted">
                    {reel.body}
                  </Txt>
                </View>
              </View>
            );
          })}
        </Section>

        <Section icon="flame" title="Dopamin barı">
          <Txt>
            Ekranın üstündeki dopamin barı her saniye eriyor; reeller
            ilerledikçe daha da hızlı.
          </Txt>
          <View
            style={styles.meters}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {DOPAMINE.map((step, index) => (
              <View key={step.label} style={styles.meterRow}>
                <View style={styles.flex}>
                  <Meter value={step.value} tone={step.tone} index={index} />
                </View>
                <Txt variant="micro" tone="muted" style={styles.meterLabel}>
                  {step.label}
                </Txt>
              </View>
            ))}
          </View>
          <Txt tone="muted">
            Doğru hareket barı doldurur, mükemmel bir altın reel biraz daha
            fazla. Hata yaparsan ya da süreyi kaçırırsan boşalır.
          </Txt>
          <Txt tone="muted">
            Bar azaldıkça yeşilden sarıya, sonra kırmızıya döner. Biterse tur da
            biter.
          </Txt>
        </Section>

        <Section icon="sparkle" title="Puan ve kombolar">
          <Txt tone="muted">
            Her doğru hareket puan getirir. Kaydırma ve beğenide ne kadar
            hızlıysan, altın reelde yeşilin ortasına ne kadar yakın bırakırsan o
            kadar çok.
          </Txt>
          <Row
            leading={<IconChip icon="mountain" tone="secondary" />}
            title="Seviye"
            subtitle={`Her ${RULES.levelEvery} reelde bir seviye atlarsın. Her seviyede puan çarpanın büyür.`}
          />
          <Divider />
          <Row
            leading={<IconChip icon="flame" tone="primary" />}
            title="Kombo"
            subtitle={`${COMBO_START} ile başlar, her doğru hareket ${COMBO_STEP} ekler, en fazla ${COMBO_MAX}. Hata yaparsan kombonun ${COMBO_START} üstündeki kısmı yarıya iner.`}
          />
          <Divider />
          <View style={styles.lead}>
            <Txt variant="heading">İsimli kombolar</Txt>
            <Txt variant="meta" tone="muted">
              Denk getirirsen reelin puanına ek puan kazanırsın; seviye
              büyüdükçe bu ek de büyür.
            </Txt>
          </View>
          {BONUS_ORDER.map((kind) => (
            <Well key={kind}>
              <BonusChip kind={kind} />
              <Txt variant="meta" tone="muted">
                {BONUS_GUIDE[kind].body}
              </Txt>
            </Well>
          ))}
        </Section>

        <Section icon="calendar" title="Günün akışı">
          <Txt>
            Her gün herkes aynı akışı oynar: aynı reeller, aynı sırayla.
          </Txt>
          <Txt tone="muted">
            Tek hakkın var; akışı başlattığın an hakkını kullanmış olursun. Yeni
            akış her gece yarısı gelir, Europe/Istanbul saatiyle.
          </Txt>
          <Txt tone="muted">
            Sonucunu paylaşabilirsin. Tablodaki her kare bir seviye: 🟩 hatasız,
            🟨 bir iki hata, 🟥 daha fazlası, ⬛ turun bittiği yer.
          </Txt>
          <Txt tone="muted">
            Günün akışındaki skorun öteki sıralamalara ve ligine de yazılır.
            Serbest oyunda ise istediğin kadar oynarsın.
          </Txt>
        </Section>

        <Section icon="shield" title="Ligler">
          <Well>
            <View style={styles.tiers}>
              {TIERS.map((tier) => (
                <TierBadge key={tier} tier={tier} size="md" showLabel />
              ))}
            </View>
          </Well>
          <Txt>
            Beş lig var, Bronz’dan Elmas’a. Haftanın ilk sıralı turunla
            ligindeki 30 kişilik bir gruba katılırsın.
          </Txt>
          <Txt tone="muted">
            Lig puanın, haftanın her gününde yaptığın en iyi skorların toplamı.
            Her gün oynamak kazandırır.
          </Txt>
          <Txt tone="muted">
            Hafta bitince ilk beş bir üst lige çıkar, son beş bir alt lige iner,
            gerisi yerinde kalır. Grup küçükse bu sayılar da küçülür. Elmas’tan
            yukarı, Bronz’dan aşağı yol yok.
          </Txt>
          <Txt tone="muted">
            Hafta pazartesi başlar, Europe/Istanbul saatiyle.
          </Txt>
        </Section>

        <Section icon="podium" title="Sıralamalar">
          <Txt>
            Dört sıralama var: Bugün, Bu hafta, Bu ay ve Tüm zamanlar. Her
            birinde o dönemdeki en iyi turun tek satır olarak durur.
          </Txt>
          <Txt tone="muted">
            Gün gece yarısı, hafta pazartesi, ay ayın biriyle başlar; hepsi
            Europe/Istanbul saatiyle.
          </Txt>
          <Txt tone="muted">Skorlar eşitse o skora önce ulaşan önde.</Txt>
          <Txt tone="muted">
            Oyunun kuralları değişince yeni bir sezon başlar; sıralamalar ve
            sezon rekorun sıfırdan başlar.
          </Txt>
        </Section>

        <Section icon="check" title="Adil oyun">
          <Txt>
            Skorunu telefon söylemez. Tur bitince sunucuya yalnızca hareketlerin
            gider; sunucu turu aynı kurallarla baştan oynatır ve skoru kendisi
            hesaplar.
          </Txt>
          <Txt tone="muted">
            Kontrollerden geçemeyen bir tur sıralamaya girmez. Zirveye çıkan
            bazı skorlara da sıralamaya girmeden önce bir göz atılır; o sırada
            “Skorun inceleniyor” yazar.
          </Txt>
          <Txt tone="muted">
            Telefonun da kendini tanıtır: Google ya da Apple güvenlik kontrolü
            onaylamayan bir cihazda (root’lu telefon, emülatör, değiştirilmiş
            uygulama) oynayabilirsin ama skorlar sıralamaya girmez. Oyunu
            yavaşlatan araçlar da tur sırasında fark edilir.
          </Txt>
          <Txt tone="muted">
            Oyunun eski bir sürümüyle oynanan tur sıralamaya giremez; uygulamanı
            güncel tut.
          </Txt>
        </Section>

        <Section icon="account" title="Hesap">
          <Txt>
            İlk açılışta misafir olarak başlarsın; hesabın bu telefonda durur.
          </Txt>
          <Txt tone="muted">
            Profil’de “Hesabını koru” ile Apple, Google ya da e-posta bağla;
            telefonun değişse de adın ve skorların seninle gelir.
          </Txt>
          <Txt tone="muted">
            Hesabını Profil’deki Ayarlar’dan kalıcı olarak silebilirsin: adın,
            skorların ve sıralamadaki yerin silinir. Bu geri alınamaz.
          </Txt>
        </Section>

        <Section icon="help" title="Sık sorulanlar">
          {FAQ.map((item, index) => (
            <View key={item.question} style={styles.faqItem}>
              {index > 0 ? <Divider /> : null}
              <Question question={item.question} answer={item.answer} />
            </View>
          ))}
        </Section>
      </ScrollView>
    </Screen>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: IconName;
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Eyebrow icon={icon}>{title}</Eyebrow>
      <Panel style={styles.panel}>{children}</Panel>
    </View>
  );
}

/** A well cut into a section's tile, holding one thing to look at. */
function Well({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.well,
        { backgroundColor: theme.well, borderColor: theme.wellLine },
      ]}
    >
      {children}
    </View>
  );
}

/**
 * A reel as a gem in its own feed colours — slate, pink, gold, red — with
 * the glyph of the move it asks for: the colour is what a player reads first
 * in a run.
 */
function ReelGem({ kind, icon }: { kind: ReelKind; icon: IconName }) {
  const theme = useTheme();
  const look = REEL_FACE[kind];
  return (
    <View
      style={[
        styles.reelGem,
        { backgroundColor: look.face, borderColor: theme.outline },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.reelShine,
          { backgroundColor: withAlpha(theme.onBrand, 0.2) },
        ]}
      />
      <Icon name={icon} size={24} color={look.ink} strokeWidth={2.6} />
    </View>
  );
}

/** One question: tap it and its answer opens under it; tap again to close. */
function Question({ question, answer }: { question: string; answer: string }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.question}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => [
          styles.questionHead,
          pressed ? styles.sunk : null,
        ]}
      >
        <View style={styles.flex}>
          <Txt variant="heading">{question}</Txt>
        </View>
        <View
          style={[
            styles.nub,
            {
              backgroundColor: open ? theme.primary : theme.fill,
              borderColor: theme.outline,
            },
          ]}
        >
          <View style={open ? styles.flip : null}>
            <Icon
              name="chevronDown"
              size={14}
              color={theme.ink}
              strokeWidth={3}
            />
          </View>
        </View>
      </Pressable>
      {open ? (
        <Txt variant="meta" tone="muted">
          {answer}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    gap: SPACE.xl,
    paddingBottom: SPACE.xxl * 2,
    paddingHorizontal: SPACE.xl,
    paddingTop: SPACE.xs,
  },
  section: { gap: SPACE.sm },
  panel: { gap: SPACE.ms },
  guide: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: SPACE.md,
    paddingVertical: SPACE.xxs,
  },
  reelGem: {
    alignItems: 'center',
    borderBottomWidth: DEPTH.outline + 3,
    borderRadius: 13,
    borderWidth: DEPTH.outline,
    height: 58,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 44,
  },
  reelShine: { height: '38%', left: 0, position: 'absolute', right: 0, top: 0 },
  meters: { gap: SPACE.sm, paddingVertical: SPACE.xs },
  meterRow: { alignItems: 'center', flexDirection: 'row', gap: SPACE.md },
  meterLabel: { width: 84 },
  lead: { gap: SPACE.xxs, paddingTop: SPACE.xs },
  well: {
    alignItems: 'flex-start',
    borderRadius: RADIUS.control,
    borderWidth: 1.5,
    gap: SPACE.sm,
    padding: SPACE.md,
  },
  tiers: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACE.md,
    justifyContent: 'center',
  },
  faqItem: { gap: SPACE.ms },
  question: { gap: SPACE.sm },
  questionHead: { alignItems: 'center', flexDirection: 'row', gap: SPACE.md },
  sunk: { transform: [{ translateY: 2 }] },
  nub: {
    alignItems: 'center',
    borderBottomWidth: DEPTH.outline + 2,
    borderRadius: 9,
    borderWidth: DEPTH.outline - 0.5,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  flip: { transform: [{ rotate: '180deg' }] },
});
