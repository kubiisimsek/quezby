import type { Locale } from '@quezby/types';

import { iso } from '@/i18n/format';
import { plural } from '@/i18n/plural';

/**
 * Yardım: the rules, from the posts to the leagues, in the order a new
 * player meets them, then what players ask. A section opens with `lead`, set
 * plainly, and goes on in `more`, set quieter. The words of the posts and
 * the named combos are `t.reels` and `t.bonus`; every number is the
 * engine's `RULES`, handed in. No line names a side of the screen.
 */
const tr = {
  title: 'Yardım',
  subtitle: 'Kurallar, puanlar ve sık sorulanlar',
  posts: {
    title: 'Dört post',
    intro:
      'Her post tek bir hareket ister, süresi dolmadan. Hangisi olduğunu rengi ve rozeti söyler.',
  },
  dopamine: {
    title: 'Dopamin barı',
    lead: 'Ekranın üstündeki dopamin barı her saniye eriyor; postlar ilerledikçe daha da hızlı.',
    /** The bar as it drains: full, going, nearly gone. */
    levels: { full: 'Dolu', draining: 'Azalıyor', low: 'Bitmek üzere' },
    more: [
      'Doğru hareket barı doldurur, mükemmel bir altın post biraz daha fazla. Hata yaparsan ya da süreyi kaçırırsan boşalır.',
      'Bar azaldıkça yeşilden sarıya, sonra kırmızıya döner. Biterse tur da biter.',
    ],
  },
  scoring: {
    title: 'Puan ve kombolar',
    intro:
      'Her doğru hareket puan getirir. Kaydırma ve beğenide ne kadar hızlıysan, altın postta yeşilin ortasına ne kadar yakın bırakırsan o kadar çok.',
    level: 'Seviye',
    levelBody: (posts: number) =>
      `Her ${posts} postta bir seviye atlarsın. Her seviyede puan çarpanın büyür.`,
    combo: 'Kombo',
    /** `x1,00`, `+0,05`, `x1,50` — `t.fmt.combo` of the engine's numbers. */
    comboBody: (start: string, step: string, max: string) =>
      `${start} ile başlar, her doğru hareket ${step} ekler, en fazla ${max}. Hata yaparsan kombonun ${start} üstündeki kısmı yarıya iner.`,
    named: 'İsimli kombolar',
    namedBody:
      'Denk getirirsen postun puanına ek puan kazanırsın; seviye büyüdükçe bu ek de büyür.',
  },
  daily: {
    title: 'Günün akışı',
    lead: 'Her gün herkes aynı akışı oynar: aynı postlar, aynı sırayla.',
    more: [
      'Tek hakkın var; akışı başlattığın an hakkını kullanmış olursun. Yeni akış her gece yarısı gelir, Europe/Istanbul saatiyle.',
      'Sonucunu paylaşabilirsin. Tablodaki her kare bir seviye: 🟩 hatasız, 🟨 bir iki hata, 🟥 daha fazlası, ⬛ turun bittiği yer.',
      'Günün akışındaki skorun öteki sıralamalara ve ligine de yazılır. Serbest oyunda ise istediğin kadar oynarsın.',
    ],
  },
  leagues: {
    title: 'Ligler',
    lead: 'Beş lig var, Bronz’dan Elmas’a. Lig, ilk 3 sayılan oyunundan sonra açılır; deneme turu sayılmaz. Sonra haftanın ilk sıralı turunla ligindeki 30 kişilik bir gruba katılırsın.',
    more: [
      'Lig puanın, haftanın her gününde yaptığın en iyi skorların toplamı. Her gün oynamak kazandırır.',
      'Hafta bitince ilk beş bir üst lige çıkar, son beş bir alt lige iner, gerisi yerinde kalır. Grup küçükse bu sayılar da küçülür. Elmas’tan yukarı, Bronz’dan aşağı yol yok.',
      'Hafta pazartesi başlar, Europe/Istanbul saatiyle.',
    ],
  },
  boards: {
    title: 'Sıralamalar',
    lead: 'Dört sıralama var: Bugün, Bu hafta, Bu ay ve Tüm zamanlar. Her birinde o dönemdeki en iyi turun tek satır olarak durur.',
    more: [
      'Gün gece yarısı, hafta pazartesi, ay ayın biriyle başlar; hepsi Europe/Istanbul saatiyle.',
      'Skorlar eşitse o skora önce ulaşan önde.',
      'Oyunun kuralları değişince yeni bir sezon başlar; sıralamalar ve sezon rekorun sıfırdan başlar.',
    ],
  },
  fairPlay: {
    title: 'Adil oyun',
    lead: 'Skorunu telefon söylemez. Tur bitince sunucuya yalnızca hareketlerin gider; sunucu turu aynı kurallarla baştan oynatır ve skoru kendisi hesaplar.',
    more: [
      'Kontrollerden geçemeyen bir tur sıralamaya girmez. Zirveye çıkan bazı skorlara da sıralamaya girmeden önce bir göz atılır; o sırada “Skorun inceleniyor” yazar.',
      'Telefonun da kendini tanıtır: Google ya da Apple güvenlik kontrolü onaylamayan bir cihazda (root’lu telefon, emülatör, değiştirilmiş uygulama) oynayabilirsin ama skorlar sıralamaya girmez. Oyunu yavaşlatan araçlar da tur sırasında fark edilir.',
      'Oyunun eski bir sürümüyle oynanan tur sıralamaya giremez; uygulamanı güncel tut.',
    ],
  },
  account: {
    title: 'Hesap',
    lead: 'İlk açılışta bir deneme turuyla başlarsın; o tur hiçbir yere sayılmaz. Hesabın misafir olarak bu telefonda durur ve bir ad seçene kadar guest48128742 gibi bir adla oynarsın. Seçtiğin ad kalıcıdır; bir daha değişmez.',
    more: [
      'Profil’de “Hesabını koru” ile Apple, Google ya da e-posta bağla; telefonun değişse de adın ve skorların seninle gelir.',
      'Hesabını Profil’deki Ayarlar’dan kalıcı olarak silebilirsin: adın, skorların ve sıralamadaki yerin silinir. Bu geri alınamaz.',
    ],
  },
  faq: {
    title: 'Sık sorulanlar',
    /** What players ask, answered in a line or two. */
    items: [
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
        question: 'Kullanıcı adımı değiştirebilir miyim?',
        answer:
          'Hayır. Adını bir kez seçersin ve bir daha değişmez; Zirve’de ve ligde herkes seni o adla tanır. Acelen yoksa önce guest adıyla oyna, adını sonra Profil’deki Ayarlar’dan seç.',
      },
      {
        question: 'Telefonumu değiştirirsem ne olur?',
        answer:
          'Hesabını koruduysan yeni telefonda bağladığın yolla girersin; adın ve skorların seninle gelir. Misafir hesap yalnızca bu telefonda durur.',
      },
      {
        question: 'Titreşimi nasıl kapatırım?',
        answer: 'Profil’deki ayarlar düğmesine dokun, oradan kapat. Oyun sessizce oynanır.',
      },
      {
        question: 'Hangi verileri topluyorsunuz?',
        answer:
          'İzin verirsen hangi ekranlara girdiğini, ne kadar kaldığını ve paylaşım gibi birkaç hareketi sayarız; bunlar 30 gün sonra yalnızca günlük özete döner. İzin vermesen de oyunun çalışması ve güvenliği için telefonunun modeli, sistem ve uygulama sürümü kaydedilir. Adın, e-postan ya da konumun bu sayımlara girmez. Kararını Profil’deki Ayarlar’dan, Kullanım verisi ile değiştirirsin.',
      },
    ],
  },
};

export type HelpMessages = typeof tr;

const en: HelpMessages = {
  title: 'Help',
  subtitle: 'Rules, points and common questions',
  posts: {
    title: 'The four posts',
    intro: 'Each post asks for one move before its time runs out. Its color and badge tell you which.',
  },
  dopamine: {
    title: 'Dopamine bar',
    lead: 'The dopamine bar at the top of the screen drains every second, and faster as the posts go by.',
    levels: { full: 'Full', draining: 'Draining', low: 'Almost gone' },
    more: [
      'The right move fills the bar, a perfect gold post a little more. Make a mistake or run out of time and it drains.',
      "As it drains, the bar turns from green to yellow, then red. When it's empty, the run is over.",
    ],
  },
  scoring: {
    title: 'Points and combos',
    intro:
      'Every right move scores points. The faster you swipe and like, and the closer to the middle of the green you let go on a gold post, the more you get.',
    level: 'Level',
    levelBody: (posts) =>
      plural('en', posts, {
        one: 'You level up with every post. Each level makes your point multiplier bigger.',
        other: `You level up every ${posts} posts. Each level makes your point multiplier bigger.`,
      }),
    combo: 'Combo',
    comboBody: (start, step, max) =>
      `Starts at ${start}; every right move adds ${step}, up to ${max}. Make a mistake and the part of your combo above ${start} is cut in half.`,
    named: 'Named combos',
    namedBody:
      "Pull one off and you get bonus points on top of the post's; the bonus grows as your level does.",
  },
  daily: {
    title: 'Daily Feed',
    lead: 'Every day, everyone plays the same feed: the same posts, in the same order.',
    more: [
      "You get one try, and it's used the moment you start the feed. A new feed arrives every midnight, Istanbul time.",
      'You can share your result. Each square in the grid is a level: 🟩 no mistakes, 🟨 a mistake or two, 🟥 more than that, ⬛ where the run ended.',
      'Your Daily Feed score also counts on the other rankings and in your league. In free play, you can play as much as you like.',
    ],
  },
  leagues: {
    title: 'Leagues',
    lead: "There are five leagues, from Bronze to Diamond. The league opens after your first 3 counted games; the practice run doesn't count. Then your first ranked run of the week puts you in a group of 30 in your league.",
    more: [
      'Your league points are the sum of your best score on each day of the week. Playing every day pays off.',
      "When the week ends, the top five move up a league, the bottom five move down and the rest stay put. In a smaller group, these numbers shrink too. There's no way up from Diamond and no way down from Bronze.",
      'The week starts on Monday, Istanbul time.',
    ],
  },
  boards: {
    title: 'Rankings',
    lead: 'There are four rankings: Today, This week, This month and All time. Each one holds your best run of that period as a single row.',
    more: [
      'The day starts at midnight, the week on Monday and the month on the 1st, all on Istanbul time.',
      'When scores tie, whoever reached that score first is ahead.',
      "When the game's rules change, a new season begins; the rankings and your season record start from zero.",
    ],
  },
  fairPlay: {
    title: 'Fair play',
    lead: "Your phone doesn't decide your score. When the run ends, only your moves go to the server; the server replays the run with the same rules and works out the score itself.",
    more: [
      "A run that fails the checks doesn't rank. Some scores that reach the top also get a look before they rank; meanwhile it says “Your score is being reviewed.”",
      "Your phone has to vouch for itself too: on a device that Google's or Apple's security check doesn't approve (a rooted phone, an emulator, a modified app) you can play, but your scores don't rank. Tools that slow the game down are spotted during the run too.",
      "A run played on an old version of the game can't rank; keep your app up to date.",
    ],
  },
  account: {
    title: 'Account',
    lead: 'On your first launch you start with a practice run; it counts nowhere. Your account is a guest account on this phone, and until you pick a name you play under one like guest48128742. The name you pick is permanent; it never changes.',
    more: [
      'On your profile, link Apple, Google or email with “Protect your account”; even on a new phone, your name and scores come with you.',
      "You can delete your account for good from Settings on your profile: your name, your scores and your place in the rankings are deleted. This can't be undone.",
    ],
  },
  faq: {
    title: 'Common questions',
    items: [
      {
        question: "Why doesn't my score show up right away?",
        answer:
          'When the run ends, the server replays your moves and works out your points itself; meanwhile it says “Verifying…”. Your score shows up once the answer comes back.',
      },
      {
        question: 'Can I play the Daily Feed again?',
        answer:
          'No, you get one try a day. In free play you can play as much as you like; your best run goes on the rankings.',
      },
      {
        question: 'How do I move up in the league?',
        answer:
          "Play every day of the week: each day's best score is added to your league points. If you're in the promotion zone when the week ends, you move up a league.",
      },
      {
        question: 'How do I compete with my friends?',
        answer:
          'Find them in Friends and follow them. On the Summit, switch to Friends to compete only with the players you follow.',
      },
      {
        question: 'Can I change my username?',
        answer:
          "No. You pick your name once and it never changes; everyone on the Summit and in your league knows you by it. If you're in no hurry, play under your guest name first and pick your name later from Settings on your profile.",
      },
      {
        question: 'What happens if I switch phones?',
        answer:
          'If you protected your account, sign in on the new phone the way you linked it; your name and scores come with you. A guest account lives only on this phone.',
      },
      {
        question: 'How do I turn off vibration?',
        answer:
          'Tap the settings button on your profile and turn it off there. The game then plays without vibration.',
      },
      {
        question: 'What data do you collect?',
        answer:
          "If you allow it, we count which screens you open, how long you stay and a few actions like sharing; after 30 days, only a daily summary of them is kept. Even if you don't, your phone's model and its system and app versions are recorded so the game can run and stay secure. Your name, email and location never go into these counts. You can change your answer in Settings on your profile, under Usage data.",
      },
    ],
  },
};

const de: HelpMessages = {
  title: 'Hilfe',
  subtitle: 'Regeln, Punkte und häufige Fragen',
  posts: {
    title: 'Vier Posts',
    intro:
      'Jeder Post will genau eine Bewegung, bevor seine Zeit abläuft. Welche, verraten dir seine Farbe und sein Abzeichen.',
  },
  dopamine: {
    title: 'Dopaminbalken',
    lead: 'Der Dopaminbalken oben am Bildschirm schmilzt jede Sekunde – und je weiter die Posts laufen, desto schneller.',
    levels: { full: 'Voll', draining: 'Sinkt', low: 'Fast leer' },
    more: [
      'Die richtige Bewegung füllt den Balken, ein perfekter Gold-Post noch etwas mehr. Machst du einen Fehler oder verpasst die Zeit, leert er sich.',
      'Wird er leerer, wechselt der Balken von Grün zu Gelb, dann zu Rot. Ist er leer, ist die Runde vorbei.',
    ],
  },
  scoring: {
    title: 'Punkte und Kombos',
    intro:
      'Jede richtige Bewegung bringt Punkte. Je schneller du wischst und likest und je näher an der Mitte des Grüns du beim Gold-Post loslässt, desto mehr.',
    level: 'Level',
    levelBody: (posts) =>
      plural('de', posts, {
        one: 'Mit jedem Post steigst du ein Level auf. Mit jedem Level wächst dein Punkte-Multiplikator.',
        other: `Alle ${posts} Posts steigst du ein Level auf. Mit jedem Level wächst dein Punkte-Multiplikator.`,
      }),
    combo: 'Kombo',
    comboBody: (start, step, max) =>
      `Startet bei ${start}, jede richtige Bewegung legt ${step} drauf, bis höchstens ${max}. Machst du einen Fehler, halbiert sich der Teil deiner Kombo über ${start}.`,
    named: 'Spezialkombos',
    namedBody:
      'Schaffst du eine, gibt es Bonuspunkte auf die Punkte des Posts; je höher dein Level, desto größer der Bonus.',
  },
  daily: {
    title: 'Tages-Feed',
    lead: 'Jeden Tag spielen alle denselben Feed: dieselben Posts in derselben Reihenfolge.',
    more: [
      'Du hast einen Versuch; er ist verbraucht, sobald du den Feed startest. Jeden Tag um Mitternacht kommt ein neuer Feed, nach Istanbuler Zeit.',
      'Du kannst dein Ergebnis teilen. Jedes Feld im Raster ist ein Level: 🟩 fehlerfrei, 🟨 ein, zwei Fehler, 🟥 mehr, ⬛ wo die Runde endete.',
      'Dein Score im Tages-Feed zählt auch in den anderen Ranglisten und in deiner Liga. Im freien Spiel spielst du, so oft du willst.',
    ],
  },
  leagues: {
    title: 'Ligen',
    lead: 'Es gibt fünf Ligen, von Bronze bis Diamant. Die Liga öffnet sich nach deinen ersten 3 gewerteten Spielen; die Proberunde zählt nicht. Mit deiner ersten gewerteten Runde der Woche kommst du dann in eine 30er-Gruppe deiner Liga.',
    more: [
      'Deine Ligapunkte sind die Summe deiner besten Scores an jedem Tag der Woche. Jeden Tag zu spielen lohnt sich.',
      'Am Ende der Woche steigen die ersten fünf eine Liga auf, die letzten fünf eine ab, der Rest bleibt. In einer kleineren Gruppe werden diese Zahlen auch kleiner. Über Diamant geht es nicht hinaus, unter Bronze nicht hinab.',
      'Die Woche beginnt am Montag, nach Istanbuler Zeit.',
    ],
  },
  boards: {
    title: 'Ranglisten',
    lead: 'Es gibt vier Ranglisten: Heute, Diese Woche, Dieser Monat und Allzeit. In jeder steht deine beste Runde aus diesem Zeitraum als eine Zeile.',
    more: [
      'Der Tag beginnt um Mitternacht, die Woche am Montag, der Monat am Ersten – alles nach Istanbuler Zeit.',
      'Bei gleichem Score liegt vorn, wer ihn zuerst erreicht hat.',
      'Ändern sich die Spielregeln, beginnt eine neue Saison; die Ranglisten und dein Saisonrekord fangen bei null an.',
    ],
  },
  fairPlay: {
    title: 'Fair Play',
    lead: 'Deinen Score bestimmt nicht dein Handy. Nach der Runde gehen nur deine Bewegungen an den Server; er spielt die Runde mit denselben Regeln nach und berechnet den Score selbst.',
    more: [
      'Eine Runde, die die Prüfungen nicht besteht, kommt nicht in die Rangliste. Manche Scores ganz oben werden außerdem angeschaut, bevor sie in die Rangliste kommen; so lange steht dort „Dein Score wird geprüft“.',
      'Auch dein Handy muss sich ausweisen: Auf einem Gerät, das die Sicherheitsprüfung von Google oder Apple nicht bestätigt (gerootetes Handy, Emulator, veränderte App), kannst du spielen, aber deine Scores kommen nicht in die Rangliste. Tools, die das Spiel verlangsamen, fallen während der Runde ebenfalls auf.',
      'Eine Runde mit einer alten Version des Spiels kommt nicht in die Rangliste; halte deine App aktuell.',
    ],
  },
  account: {
    title: 'Konto',
    lead: 'Beim ersten Start beginnst du mit einer Proberunde; sie zählt nirgends. Dein Konto ist ein Gastkonto auf diesem Handy, und bis du einen Namen wählst, spielst du unter einem Namen wie guest48128742. Dein gewählter Name bleibt für immer; er ändert sich nie.',
    more: [
      'Verknüpf in deinem Profil über „Konto sichern“ Apple, Google oder eine E-Mail – dann kommen dein Name und deine Scores auch auf ein neues Handy mit.',
      'Du kannst dein Konto in den Einstellungen deines Profils endgültig löschen: Dein Name, deine Scores und deine Plätze in den Ranglisten werden gelöscht. Das lässt sich nicht rückgängig machen.',
    ],
  },
  faq: {
    title: 'Häufige Fragen',
    items: [
      {
        question: 'Warum sehe ich meinen Score nicht sofort?',
        answer:
          'Nach der Runde spielt der Server deine Bewegungen nach und berechnet deine Punkte selbst; so lange steht dort „Wird geprüft…“. Sobald die Antwort da ist, siehst du deinen Score.',
      },
      {
        question: 'Kann ich den Tages-Feed noch mal spielen?',
        answer:
          'Nein, du hast einen Versuch pro Tag. Im freien Spiel spielst du, so oft du willst; deine beste Runde kommt in die Ranglisten.',
      },
      {
        question: 'Wie steige ich in der Liga auf?',
        answer:
          'Spiel an jedem Tag der Woche: Der beste Score jedes Tages kommt zu deinen Ligapunkten dazu. Bist du am Ende der Woche in der Aufstiegszone, steigst du eine Liga auf.',
      },
      {
        question: 'Wie trete ich gegen meine Freunde an?',
        answer:
          'Such sie unter Freunde und folge ihnen. Wechselst du auf dem Gipfel zu Freunde, trittst du nur gegen die an, denen du folgst.',
      },
      {
        question: 'Kann ich meinen Namen ändern?',
        answer:
          'Nein. Du wählst deinen Namen einmal, und er ändert sich nie; auf dem Gipfel und in der Liga kennen dich alle unter diesem Namen. Wenn du es nicht eilig hast, spiel erst mit deinem Gastnamen und wähl deinen Namen später in den Einstellungen deines Profils.',
      },
      {
        question: 'Was passiert, wenn ich mein Handy wechsle?',
        answer:
          'Hast du dein Konto gesichert, meldest du dich auf dem neuen Handy so an, wie du es verknüpft hast; dein Name und deine Scores kommen mit. Ein Gastkonto gibt es nur auf diesem Handy.',
      },
      {
        question: 'Wie schalte ich die Vibration aus?',
        answer:
          'Tipp in deinem Profil auf den Einstellungsknopf und schalte sie dort aus. Das Spiel läuft dann ohne Vibration.',
      },
      {
        question: 'Welche Daten sammelt ihr?',
        answer:
          'Wenn du es erlaubst, zählen wir, welche Bildschirme du öffnest, wie lange du bleibst und ein paar Aktionen wie das Teilen; nach 30 Tagen bleibt davon nur eine Tageszusammenfassung. Auch ohne deine Erlaubnis werden Modell, System- und App-Version deines Handys gespeichert, damit das Spiel läuft und sicher bleibt. Dein Name, deine E-Mail und dein Standort fließen nie in diese Zählungen ein. Deine Entscheidung änderst du in den Einstellungen deines Profils unter Nutzungsdaten.',
      },
    ],
  },
};

const ar: HelpMessages = {
  title: 'المساعدة',
  subtitle: 'القواعد والنقاط والأسئلة الشائعة',
  posts: {
    title: 'أربعة منشورات',
    intro: 'كل منشور يطلب حركة واحدة قبل أن ينتهي وقته. لونه وشارته يخبرانك بها.',
  },
  dopamine: {
    title: 'شريط الدوبامين',
    lead: 'شريط الدوبامين في أعلى الشاشة يذوب كل ثانية، ويزداد سرعةً كلما تقدّمت المنشورات.',
    levels: { full: 'ممتلئ', draining: 'يتناقص', low: 'على وشك النفاد' },
    more: [
      'الحركة الصحيحة تملأ الشريط، والمنشور الذهبي المثالي يملؤه أكثر قليلًا. وإن أخطأت أو فاتك الوقت نقص.',
      'كلما نقص الشريط تحوّل من الأخضر إلى الأصفر ثم إلى الأحمر. وإن نفد انتهت الجولة.',
    ],
  },
  scoring: {
    title: 'النقاط والكومبو',
    intro:
      'كل حركة صحيحة تمنحك نقاطًا. كلما كنت أسرع في السحب والإعجاب، وكلما رفعت إصبعك أقرب إلى منتصف المنطقة الخضراء في المنشور الذهبي، زادت نقاطك.',
    level: 'المستوى',
    levelBody: (posts) => {
      const every = plural('ar', posts, {
        one: 'مع كل منشور',
        two: 'كل منشورين',
        few: `كل ${posts} منشورات`,
        many: `كل ${posts} منشورًا`,
        other: `كل ${posts} منشور`,
      });
      return `تنتقل إلى المستوى التالي ${every}. ومع كل مستوى يكبر مضاعِف نقاطك.`;
    },
    combo: 'الكومبو',
    comboBody: (start, step, max) =>
      `يبدأ الكومبو من ${iso(start)}، وكل حركة صحيحة تضيف ${iso(step)}، حتى ${iso(max)} كحد أقصى. وإن أخطأت انخفض ما يزيد به الكومبو على ${iso(start)} إلى النصف.`,
    named: 'الكومبو الخاصة',
    namedBody:
      'إن حققت أحدها نلت نقاطًا إضافية فوق نقاط المنشور، وتكبر هذه الإضافة كلما ارتفع مستواك.',
  },
  daily: {
    title: 'خلاصة اليوم',
    lead: 'كل يوم يلعب الجميع الخلاصة نفسها: المنشورات نفسها وبالترتيب نفسه.',
    more: [
      'لديك محاولة واحدة، وتُحتسب لحظة بدء الخلاصة. تصل خلاصة جديدة كل منتصف ليل بتوقيت إسطنبول.',
      'يمكنك مشاركة نتيجتك. كل مربع في الشبكة مستوى: 🟩 بلا أخطاء، 🟨 خطأ أو خطآن، 🟥 أكثر من ذلك، ⬛ حيث انتهت الجولة.',
      'نتيجتك في خلاصة اليوم تُسجَّل أيضًا في الترتيبات الأخرى وفي دوريك. أما في اللعب الحر فالعب قدر ما تشاء.',
    ],
  },
  leagues: {
    title: 'الدوريات',
    lead: 'هناك خمسة دوريات، من البرونز إلى الماس. يُفتح الدوري بعد أول 3 مباريات تُحتسب لك، ولا تُحتسب الجولة التجريبية. بعدها تنضم بأول جولة مصنّفة في الأسبوع إلى مجموعة من 30 لاعبًا في دوريك.',
    more: [
      'نقاط دوريك هي مجموع أفضل نتائجك في كل يوم من أيام الأسبوع. اللعب كل يوم يؤتي ثماره.',
      'عند نهاية الأسبوع يصعد أول خمسة إلى الدوري الأعلى، وينزل آخر خمسة إلى الأدنى، ويبقى الباقون في أماكنهم. وإن كانت المجموعة أصغر صغرت هذه الأعداد أيضًا. لا صعود بعد الماس ولا هبوط بعد البرونز.',
      'يبدأ الأسبوع يوم الاثنين بتوقيت إسطنبول.',
    ],
  },
  boards: {
    title: 'الترتيبات',
    lead: 'هناك أربعة ترتيبات: اليوم، وهذا الأسبوع، وهذا الشهر، وكل الأوقات. في كل منها تظهر أفضل جولة لك في تلك الفترة في سطر واحد.',
    more: [
      'يبدأ اليوم عند منتصف الليل، والأسبوع يوم الاثنين، والشهر في يومه الأول؛ وكلها بتوقيت إسطنبول.',
      'عند تعادل النتائج يتقدّم من وصل إلى النتيجة أولًا.',
      'حين تتغيّر قواعد اللعبة يبدأ موسم جديد، وتبدأ الترتيبات ورقمك القياسي للموسم من الصفر.',
    ],
  },
  fairPlay: {
    title: 'اللعب النظيف',
    lead: 'هاتفك لا يحدد نتيجتك. عند انتهاء الجولة لا يُرسَل إلى الخادم سوى حركاتك، فيعيد الخادم لعب الجولة بالقواعد نفسها ويحسب النتيجة بنفسه.',
    more: [
      'الجولة التي لا تجتاز الفحوص لا تدخل الترتيب. وبعض النتائج التي تصل إلى القمة تُراجَع أيضًا قبل أن تدخل الترتيب، وفي أثناء ذلك تظهر عبارة «نتيجتك قيد المراجعة».',
      'وهاتفك أيضًا يعرّف بنفسه: على جهاز لا يعتمده فحص الأمان من Google أو Apple (هاتف بصلاحيات الروت، أو محاكٍ، أو تطبيق معدّل) يمكنك اللعب، لكن نتائجك لا تدخل الترتيب. والأدوات التي تُبطئ اللعبة تُكتشف أيضًا أثناء الجولة.',
      'الجولة التي تُلعب بإصدار قديم من اللعبة لا تدخل الترتيب؛ حافظ على تحديث تطبيقك.',
    ],
  },
  account: {
    title: 'الحساب',
    lead: `عند أول تشغيل تبدأ بجولة تجريبية لا تُحتسب في أي مكان. يبقى حسابك حساب ضيف على هذا الهاتف، وإلى أن تختار اسمًا تلعب باسم مثل ${iso('guest48128742')}. الاسم الذي تختاره دائم ولن يتغيّر أبدًا.`,
    more: [
      'من ملفك، اربط Apple أو Google أو بريدًا إلكترونيًا عبر «احمِ حسابك»؛ فحتى لو تغيّر هاتفك يبقى اسمك ونتائجك معك.',
      'يمكنك حذف حسابك نهائيًا من الإعدادات في ملفك: يُحذف اسمك ونتائجك ومكانك في الترتيب. لا يمكن التراجع عن ذلك.',
    ],
  },
  faq: {
    title: 'الأسئلة الشائعة',
    items: [
      {
        question: 'لماذا لا تظهر نتيجتي فورًا؟',
        answer:
          'عند انتهاء الجولة يعيد الخادم لعب حركاتك ويحسب نقاطك بنفسه، وفي أثناء ذلك تظهر عبارة «جارٍ التحقق…». تظهر نتيجتك حين يصل الرد.',
      },
      {
        question: 'هل يمكنني لعب خلاصة اليوم مرة أخرى؟',
        answer:
          'لا، لديك محاولة واحدة كل يوم. أما في اللعب الحر فالعب قدر ما تشاء، وتُسجَّل أفضل جولاتك في الترتيبات.',
      },
      {
        question: 'كيف أصعد في الدوري؟',
        answer:
          'العب كل يوم من أيام الأسبوع: تُضاف أفضل نتيجة لكل يوم إلى نقاط دوريك. وإن كنت في منطقة الصعود عند نهاية الأسبوع صعدت إلى الدوري الأعلى.',
      },
      {
        question: 'كيف أنافس أصدقائي؟',
        answer:
          'ابحث عنهم في الأصدقاء وتابِعهم. وفي القمة انتقل إلى الأصدقاء لتنافس من تتابعهم فقط.',
      },
      {
        question: 'هل يمكنني تغيير اسم المستخدم؟',
        answer:
          'لا. تختار اسمك مرة واحدة ولن يتغيّر أبدًا؛ فالجميع في القمة وفي الدوري يعرفونك به. إن لم تكن مستعجلًا فالعب أولًا باسم الضيف، واختر اسمك لاحقًا من الإعدادات في ملفك.',
      },
      {
        question: 'ماذا يحدث إن غيّرت هاتفي؟',
        answer:
          'إن كنت قد حميت حسابك فادخل على الهاتف الجديد بالطريقة التي ربطتها، وسيأتي معك اسمك ونتائجك. أما حساب الضيف فيبقى على هذا الهاتف فقط.',
      },
      {
        question: 'كيف أوقف الاهتزاز؟',
        answer: 'اضغط زر الإعدادات في ملفك وأوقفه من هناك. عندها تعمل اللعبة بلا اهتزاز.',
      },
      {
        question: 'ما البيانات التي تجمعونها؟',
        answer:
          'إن سمحت بذلك نحسب الشاشات التي تفتحها والمدة التي تبقى فيها وبعض الإجراءات مثل المشاركة، وبعد 30 يومًا لا يبقى منها إلا ملخص يومي. وحتى إن لم تسمح، يُسجَّل طراز هاتفك وإصدار النظام والتطبيق كي تعمل اللعبة وتبقى آمنة. اسمك وبريدك الإلكتروني وموقعك لا تدخل في هذا العدّ أبدًا. ويمكنك تغيير قرارك من الإعدادات في ملفك، عبر بيانات الاستخدام.',
      },
    ],
  },
};

const fr: HelpMessages = {
  title: 'Aide',
  subtitle: 'Règles, points et questions fréquentes',
  posts: {
    title: 'Quatre posts',
    intro:
      'Chaque post demande un seul geste, avant la fin de son temps. Sa couleur et son badge te disent lequel.',
  },
  dopamine: {
    title: 'Barre de dopamine',
    lead: "La barre de dopamine en haut de l'écran fond chaque seconde, et de plus en plus vite au fil des posts.",
    levels: { full: 'Pleine', draining: 'Baisse', low: 'Presque vide' },
    more: [
      'Le bon geste remplit la barre, un post doré parfait un peu plus. Si tu te trompes ou laisses filer le temps, elle se vide.',
      'En baissant, la barre passe du vert au jaune, puis au rouge. Si elle se vide, la partie est finie.',
    ],
  },
  scoring: {
    title: 'Points et combos',
    intro:
      'Chaque bon geste rapporte des points. Plus tu swipes et likes vite, et plus tu relâches près du milieu du vert sur un post doré, plus tu en gagnes.',
    level: 'Niveau',
    levelBody: (posts) =>
      plural('fr', posts, {
        one: 'Tu passes un niveau à chaque post. À chaque niveau, ton multiplicateur de points grandit.',
        other: `Tu passes un niveau tous les ${posts} posts. À chaque niveau, ton multiplicateur de points grandit.`,
      }),
    combo: 'Combo',
    comboBody: (start, step, max) =>
      `Il démarre à ${start}, chaque bon geste ajoute ${step}, jusqu'à ${max} maximum. Si tu te trompes, la part de ton combo au-dessus de ${start} est divisée par deux.`,
    named: 'Combos spéciaux',
    namedBody:
      'Réussis-en un et tu gagnes des points en plus de ceux du post ; plus ton niveau monte, plus ce bonus grandit.',
  },
  daily: {
    title: 'Fil du jour',
    lead: 'Chaque jour, tout le monde joue le même fil : les mêmes posts, dans le même ordre.',
    more: [
      "Tu n'as qu'un essai ; il est utilisé dès que tu lances le fil. Un nouveau fil arrive chaque jour à minuit, heure d'Istanbul.",
      "Tu peux partager ton résultat. Chaque case de la grille est un niveau : 🟩 sans faute, 🟨 une ou deux fautes, 🟥 davantage, ⬛ là où la partie s'est arrêtée.",
      'Ton score au Fil du jour compte aussi dans les autres classements et dans ta ligue. En partie libre, tu joues autant que tu veux.',
    ],
  },
  leagues: {
    title: 'Ligues',
    lead: "Il y a cinq ligues, de Bronze à Diamant. La ligue s'ouvre après tes 3 premières parties comptées ; la partie d'essai ne compte pas. Ensuite, ta première partie classée de la semaine te place dans un groupe de 30 joueurs de ta ligue.",
    more: [
      'Tes points de ligue sont la somme de tes meilleurs scores de chaque jour de la semaine. Jouer tous les jours paie.',
      "À la fin de la semaine, les cinq premiers montent d'une ligue, les cinq derniers descendent, les autres restent. Dans un groupe plus petit, ces nombres baissent aussi. Rien au-dessus de Diamant, rien en dessous de Bronze.",
      "La semaine commence le lundi, heure d'Istanbul.",
    ],
  },
  boards: {
    title: 'Classements',
    lead: "Il y a quatre classements : Aujourd'hui, Cette semaine, Ce mois-ci et Depuis toujours. Dans chacun, ta meilleure partie de la période tient sur une seule ligne.",
    more: [
      "Le jour commence à minuit, la semaine le lundi et le mois le 1er, tous à l'heure d'Istanbul.",
      "À score égal, celui qui l'a atteint en premier passe devant.",
      'Quand les règles du jeu changent, une nouvelle saison commence ; les classements et ton record de la saison repartent de zéro.',
    ],
  },
  fairPlay: {
    title: 'Fair-play',
    lead: "Ce n'est pas ton téléphone qui donne ton score. À la fin de la partie, seuls tes gestes partent au serveur ; il rejoue la partie avec les mêmes règles et calcule le score lui-même.",
    more: [
      "Une partie qui ne passe pas les contrôles n'est pas classée. Certains scores qui arrivent au sommet sont aussi examinés avant d'être classés ; pendant ce temps, tu vois « Ton score est en cours de vérification ».",
      "Ton téléphone aussi doit se présenter : sur un appareil que le contrôle de sécurité de Google ou d'Apple ne valide pas (téléphone rooté, émulateur, application modifiée), tu peux jouer, mais tes scores ne sont pas classés. Les outils qui ralentissent le jeu sont aussi repérés pendant la partie.",
      'Une partie jouée avec une ancienne version du jeu ne peut pas être classée ; garde ton appli à jour.',
    ],
  },
  account: {
    title: 'Compte',
    lead: "Au premier lancement, tu commences par une partie d'essai ; elle ne compte nulle part. Ton compte est un compte invité sur ce téléphone, et tant que tu n'as pas choisi de nom, tu joues sous un nom comme guest48128742. Le nom choisi est définitif ; il ne change plus jamais.",
    more: [
      'Sur ton profil, lie Apple, Google ou une adresse e-mail avec « Protège ton compte » ; même sur un nouveau téléphone, ton nom et tes scores te suivent.',
      "Tu peux supprimer définitivement ton compte depuis les Réglages de ton profil : ton nom, tes scores et ta place au classement sont supprimés. C'est irréversible.",
    ],
  },
  faq: {
    title: 'Questions fréquentes',
    items: [
      {
        question: "Pourquoi mon score n'apparaît-il pas tout de suite ?",
        answer:
          "À la fin de la partie, le serveur rejoue tes gestes et calcule tes points lui-même ; pendant ce temps, tu vois « Vérification… ». Ton score apparaît dès qu'il a répondu.",
      },
      {
        question: 'Puis-je rejouer le Fil du jour ?',
        answer:
          'Non, tu as un seul essai par jour. En partie libre, tu joues autant que tu veux ; ta meilleure partie compte pour les classements.',
      },
      {
        question: 'Comment monter en ligue ?',
        answer:
          "Joue chaque jour de la semaine : le meilleur score de chaque jour s'ajoute à tes points de ligue. Si tu es dans la zone de promotion à la fin de la semaine, tu montes d'une ligue.",
      },
      {
        question: 'Comment affronter mes amis ?',
        answer:
          "Trouve-les dans Amis et suis-les. Sur le Sommet, passe à Amis pour ne te mesurer qu'aux joueurs que tu suis.",
      },
      {
        question: 'Puis-je changer de pseudo ?',
        answer:
          "Non. Tu choisis ton nom une seule fois et il ne change plus jamais ; au Sommet et dans ta ligue, tout le monde te connaît sous ce nom. Si tu n'es pas pressé, joue d'abord avec ton nom d'invité, puis choisis ton nom plus tard dans les Réglages de ton profil.",
      },
      {
        question: 'Que se passe-t-il si je change de téléphone ?',
        answer:
          "Si tu as protégé ton compte, connecte-toi sur le nouveau téléphone avec le moyen que tu as lié ; ton nom et tes scores te suivent. Un compte invité n'existe que sur ce téléphone.",
      },
      {
        question: 'Comment couper les vibrations ?',
        answer:
          'Touche le bouton des réglages sur ton profil et coupe-les là. Le jeu se joue alors sans vibrations.',
      },
      {
        question: 'Quelles données collectez-vous ?',
        answer:
          "Si tu l'autorises, on compte les écrans que tu ouvres, le temps que tu y passes et quelques actions comme le partage ; après 30 jours, il n'en reste qu'un résumé quotidien. Même sans ton accord, le modèle de ton téléphone et les versions du système et de l'appli sont enregistrés pour que le jeu fonctionne et reste sûr. Ton nom, ton e-mail et ta position n'entrent jamais dans ces comptages. Tu changes d'avis dans les Réglages de ton profil, avec Données d'utilisation.",
      },
    ],
  },
};

const es: HelpMessages = {
  title: 'Ayuda',
  subtitle: 'Reglas, puntos y preguntas frecuentes',
  posts: {
    title: 'Cuatro posts',
    intro:
      'Cada post pide un solo gesto antes de que se acabe su tiempo. Su color y su insignia te dicen cuál.',
  },
  dopamine: {
    title: 'Barra de dopamina',
    lead: 'La barra de dopamina de la parte superior de la pantalla se vacía cada segundo, y cada vez más rápido a medida que avanzan los posts.',
    levels: { full: 'Llena', draining: 'Bajando', low: 'Casi vacía' },
    more: [
      'El gesto correcto llena la barra; un post dorado perfecto, un poco más. Si te equivocas o se te acaba el tiempo, se vacía.',
      'A medida que baja, la barra pasa de verde a amarillo y luego a rojo. Si se vacía, la partida termina.',
    ],
  },
  scoring: {
    title: 'Puntos y combos',
    intro:
      'Cada gesto correcto da puntos. Cuanto más rápido deslices y des me gusta, y cuanto más cerca del centro del verde sueltes en un post dorado, más ganas.',
    level: 'Nivel',
    levelBody: (posts) =>
      plural('es', posts, {
        one: 'Subes de nivel con cada post. En cada nivel, tu multiplicador de puntos crece.',
        other: `Subes de nivel cada ${posts} posts. En cada nivel, tu multiplicador de puntos crece.`,
      }),
    combo: 'Combo',
    comboBody: (start, step, max) =>
      `Empieza en ${start}, cada gesto correcto suma ${step}, hasta un máximo de ${max}. Si te equivocas, la parte de tu combo por encima de ${start} se reduce a la mitad.`,
    named: 'Combos especiales',
    namedBody:
      'Si logras uno, ganas puntos extra además de los del post; cuanto más alto es tu nivel, mayor es el extra.',
  },
  daily: {
    title: 'Feed del día',
    lead: 'Cada día, todos juegan el mismo feed: los mismos posts, en el mismo orden.',
    more: [
      'Tienes un solo intento; lo gastas en cuanto empiezas el feed. Cada medianoche llega un feed nuevo, hora de Estambul.',
      'Puedes compartir tu resultado. Cada casilla de la cuadrícula es un nivel: 🟩 sin errores, 🟨 uno o dos errores, 🟥 más, ⬛ donde terminó la partida.',
      'Tu puntuación del Feed del día también cuenta en las otras clasificaciones y en tu liga. En el juego libre, juegas todo lo que quieras.',
    ],
  },
  leagues: {
    title: 'Ligas',
    lead: 'Hay cinco ligas, de Bronce a Diamante. La liga se abre después de tus primeras 3 partidas contadas; la ronda de práctica no cuenta. Luego, tu primera partida clasificada de la semana te une a un grupo de 30 jugadores de tu liga.',
    more: [
      'Tus puntos de liga son la suma de tus mejores puntuaciones de cada día de la semana. Jugar todos los días tiene premio.',
      'Al terminar la semana, los cinco primeros suben de liga, los cinco últimos bajan y el resto se queda. Si el grupo es más pequeño, estos números también bajan. No hay nada por encima de Diamante ni por debajo de Bronce.',
      'La semana empieza el lunes, hora de Estambul.',
    ],
  },
  boards: {
    title: 'Clasificaciones',
    lead: 'Hay cuatro clasificaciones: Hoy, Esta semana, Este mes e Histórico. En cada una, tu mejor partida de ese periodo aparece en una sola fila.',
    more: [
      'El día empieza a medianoche, la semana el lunes y el mes el día 1; todo en hora de Estambul.',
      'Si hay empate, va delante quien llegó antes a esa puntuación.',
      'Cuando cambian las reglas del juego, empieza una nueva temporada; las clasificaciones y tu récord de la temporada empiezan de cero.',
    ],
  },
  fairPlay: {
    title: 'Juego limpio',
    lead: 'Tu teléfono no decide tu puntuación. Al terminar la partida, al servidor solo le llegan tus gestos; el servidor repite la partida con las mismas reglas y calcula la puntuación él mismo.',
    more: [
      'Una partida que no pasa los controles no entra en la clasificación. Algunas puntuaciones que llegan a lo más alto también se revisan antes de entrar; mientras tanto verás «Tu puntuación está en revisión».',
      'Tu teléfono también tiene que identificarse: en un dispositivo que la comprobación de seguridad de Google o Apple no aprueba (un teléfono rooteado, un emulador, una app modificada) puedes jugar, pero tus puntuaciones no entran en la clasificación. Las herramientas que ralentizan el juego también se detectan durante la partida.',
      'Una partida jugada con una versión antigua del juego no puede entrar en la clasificación; mantén tu app actualizada.',
    ],
  },
  account: {
    title: 'Cuenta',
    lead: 'La primera vez que abres el juego empiezas con una ronda de práctica; esa ronda no cuenta en ningún sitio. Tu cuenta es una cuenta de invitado en este teléfono y, hasta que elijas un nombre, juegas con uno como guest48128742. El nombre que elijas es permanente: no cambia nunca.',
    more: [
      'En tu perfil, vincula Apple, Google o un correo con «Protege tu cuenta»; aunque cambies de teléfono, tu nombre y tus puntuaciones van contigo.',
      'Puedes eliminar tu cuenta para siempre desde Ajustes, en tu perfil: se borran tu nombre, tus puntuaciones y tu lugar en la clasificación. No se puede deshacer.',
    ],
  },
  faq: {
    title: 'Preguntas frecuentes',
    items: [
      {
        question: '¿Por qué no veo mi puntuación enseguida?',
        answer:
          'Al terminar la partida, el servidor repite tus gestos y calcula tus puntos él mismo; mientras tanto verás «Verificando…». Tu puntuación aparece en cuanto responde.',
      },
      {
        question: '¿Puedo volver a jugar el Feed del día?',
        answer:
          'No, tienes un solo intento al día. En el juego libre juegas todo lo que quieras; tu mejor partida va a las clasificaciones.',
      },
      {
        question: '¿Cómo subo en la liga?',
        answer:
          'Juega todos los días de la semana: la mejor puntuación de cada día se suma a tus puntos de liga. Si al terminar la semana estás en la zona de ascenso, subes de liga.',
      },
      {
        question: '¿Cómo compito con mis amigos?',
        answer:
          'Búscalos en Amigos y síguelos. En la Cumbre, cambia a Amigos para competir solo con los jugadores que sigues.',
      },
      {
        question: '¿Puedo cambiar mi nombre de usuario?',
        answer:
          'No. Eliges tu nombre una sola vez y no cambia nunca; en la Cumbre y en la liga todos te conocen por ese nombre. Si no tienes prisa, juega primero con tu nombre de invitado y elige tu nombre más tarde en Ajustes, en tu perfil.',
      },
      {
        question: '¿Qué pasa si cambio de teléfono?',
        answer:
          'Si protegiste tu cuenta, entra en el teléfono nuevo con el método que vinculaste; tu nombre y tus puntuaciones van contigo. Una cuenta de invitado solo existe en este teléfono.',
      },
      {
        question: '¿Cómo desactivo la vibración?',
        answer:
          'Toca el botón de ajustes en tu perfil y desactívala ahí. El juego funciona entonces sin vibración.',
      },
      {
        question: '¿Qué datos recopilan?',
        answer:
          'Si lo permites, contamos qué pantallas abres, cuánto tiempo te quedas y algunas acciones como compartir; a los 30 días solo queda un resumen diario. Aunque no lo permitas, se registran el modelo de tu teléfono y las versiones del sistema y de la app para que el juego funcione y sea seguro. Tu nombre, tu correo y tu ubicación nunca entran en estos recuentos. Puedes cambiar tu decisión en Ajustes, en tu perfil, con Datos de uso.',
      },
    ],
  },
};

export const help: Record<Locale, HelpMessages> = { tr, en, de, ar, fr, es };
