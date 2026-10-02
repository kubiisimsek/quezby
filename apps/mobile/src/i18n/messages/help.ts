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
    /** A blind move (`RULES.blindMs`, in ms). */
    blind: (ms: string) =>
      `Bir postun ilk ${ms} ms’sinde bakmadan yanlış kaydırır ya da çift dokunursan kör hamle sayılır. Üst üste ikincisinin cezası iki katı, üçüncüsünün dört katı olur.`,
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
      'Günün akışındaki skorun öteki sıralamalara da yazılır ve Dereceli’yi açmaya sayılır. Normal oyunda ise istediğin kadar oynarsın.',
    ],
  },
  leagues: {
    title: 'Ligler',
    lead: 'Üç mod var: Günlük, Normal ve Dereceli. qb’ni yalnız Dereceli değiştirir. Dereceli, 20 Normal ya da Günlük oyundan sonra açılır; ilk 3 dereceli oyunun qb’ni belirler ve herkes Gümüş’te başlar.',
    more: [
      'Altı lig var: Bronz, Gümüş, Altın, Platin, Elmas ve MasterClass. Her lig 1.000 qb, MasterClass 5.000 ve üstü.',
      'Her dereceli oyunun bir hedef skoru var. Hedefi geçtiğin her %1 için 2 qb kazanırsın. Hedefin altında kaldığın her %1 için 2 qb kaybedersin, %20’den sonraki her %1 için 4 qb. Bir oyun en fazla 200 qb değiştirir.',
      'Dereceli oyundan çıkarsan oyun o anki skorunla sayılır. Yarım bırakılan dereceli oyun ise en düşük sonuç sayılır.',
      'Yeni bir lige çıkınca 3 oyun boyunca ondan düşmezsin. Bronz’da kayıplar yarıdır.',
      'Lig sıralaması hiç sıfırlanmaz: ligindeki, son 14 günde dereceli oynamış oyuncular qb’ye göre sıralanır.',
      'qb’n arttıkça Dereceli zorlaşır. Gelen postlar aynı kalır ama isabetler daha az dopamin verir, hatalar daha çok götürür. Mükemmellerin bonusu hiç azalmaz. Zorluk 1.000 qb’de başlar ve her 250 qb’de bir artar.',
      'Dereceli yalnızca qb için oynanır. Skorun Bu hafta, Bu ay ve Tüm zamanlar sıralamalarına yazılmaz.',
    ],
  },
  boards: {
    title: 'Sıralamalar',
    lead: 'Üç sıralama var: Bu hafta, Bu ay ve Tüm zamanlar. Her birinde o dönemdeki en iyi turun tek satır olarak durur.',
    more: [
      'Gün gece yarısı, hafta pazartesi, ay ayın biriyle başlar; hepsi Europe/Istanbul saatiyle.',
      'Sıralamalara Normal ve Günlük oyunların yazılır. Dereceli oyunlar yalnızca qb’ni değiştirir.',
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
      'Hesabını Ayarlar’daki Hesap bilgileri’nden kalıcı olarak silebilirsin: adın, skorların ve sıralamadaki yerin silinir. Bu geri alınamaz.',
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
          'Hayır, her gün tek hakkın var. Normal oyunda ise istediğin kadar oynarsın; en iyi turun sıralamalara yazılır.',
      },
      {
        question: 'Ligde nasıl yükselirim?',
        answer:
          'Dereceli oyna ve hedef skorunu geç: hedefin üstüne çıktıkça qb’n artar ve 1.000 qb’de bir üst lige geçersin.',
      },
      {
        question: 'Arkadaşlarımla nasıl yarışırım?',
        answer:
          'Profil’deki arkadaş sayına dokun, oyuncuları adıyla bul ve arkadaşlık isteği gönder. Kabul edince Zirve’de Arkadaşlar’a geçip yalnızca arkadaşlarınla yarışırsın; Mesajlar’dan hazır mesaj ve VS gönderirsin.',
      },
      {
        question: 'Kullanıcı adımı değiştirebilir miyim?',
        answer:
          'Hayır. Adını bir kez seçersin ve bir daha değişmez; Zirve’de ve ligde herkes seni o adla tanır. Acelen yoksa önce guest adıyla oyna, adını sonra Ayarlar’daki Hesap bilgileri’nden seç.',
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
    blind: (ms) =>
      `Swipe or double-tap the wrong post in its first ${ms} ms, before you could look, and it’s a blind move. A second in a row costs double, a third four times.`,
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
      'Your Daily Feed score also counts on the other rankings and toward opening Ranked. In Normal, you can play as much as you like.',
    ],
  },
  leagues: {
    title: 'Leagues',
    lead: 'There are three modes: Daily, Normal and Ranked. Only Ranked changes your qb. Ranked opens after 20 Normal or Daily games; your first 3 ranked games set your qb, and everyone starts in Silver.',
    more: [
      'There are six leagues: Bronze, Silver, Gold, Platinum, Diamond and MasterClass. Each league is 1,000 qb; MasterClass is 5,000 and up.',
      'Every ranked game has a target score. You win 2 qb for each 1% above it. You lose 2 qb for each 1% below it, and 4 qb for each 1% beyond 20% below. One game changes your qb by 200 at most.',
      'If you quit a ranked game, it counts with your score so far. A ranked game left unfinished counts as the lowest result.',
      "When you move up a league, you can't drop out of it for 3 games. Losses in Bronze are halved.",
      'The league ranking never resets: the players of your league who played Ranked in the last 14 days, by qb.',
      'The higher your qb, the harder Ranked gets. The posts stay the same, but hits give less dopamine and mistakes cost more. The perfect bonus never shrinks. Difficulty starts at 1,000 qb and goes up every 250 qb.',
      'Ranked is played for qb only. Its scores never go on the This week, This month or All time rankings.',
    ],
  },
  boards: {
    title: 'Rankings',
    lead: 'There are three rankings: This week, This month and All time. Each one holds your best run of that period as a single row.',
    more: [
      'The day starts at midnight, the week on Monday and the month on the 1st, all on Istanbul time.',
      'Your Normal and Daily games go on the rankings. Ranked games only change your qb.',
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
      "You can delete your account for good from Account info in Settings: your name, your scores and your place in the rankings are deleted. This can't be undone.",
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
          'No, you get one try a day. In Normal you can play as much as you like; your best run goes on the rankings.',
      },
      {
        question: 'How do I move up in the league?',
        answer:
          'Play Ranked and beat your target score: every game above it raises your qb, and every 1,000 qb is a league up.',
      },
      {
        question: 'How do I compete with my friends?',
        answer:
          'Tap your friend count on your profile, find players by name and send a friend request. Once they accept, switch to Friends on the Summit to race only your friends, and send them phrases and VS from Messages.',
      },
      {
        question: 'Can I change my username?',
        answer:
          "No. You pick your name once and it never changes; everyone on the Summit and in your league knows you by it. If you're in no hurry, play under your guest name first and pick your name later from Account info in Settings.",
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
    blind: (ms) =>
      `Wischst du den falschen Post in seinen ersten ${ms} ms blind weg oder tippst doppelt darauf, ist das ein Blindzug. Der zweite in Folge kostet doppelt, der dritte vierfach.`,
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
      'Dein Score im Tages-Feed zählt auch in den anderen Ranglisten und hilft, Gewertet freizuschalten. Im normalen Spiel spielst du, so oft du willst.',
    ],
  },
  leagues: {
    title: 'Ligen',
    lead: 'Es gibt drei Modi: Täglich, Normal und Gewertet. Nur Gewertet ändert dein qb. Gewertet öffnet sich nach 20 normalen oder täglichen Spielen; deine ersten 3 gewerteten Spiele bestimmen dein qb, und alle starten in Silber.',
    more: [
      'Es gibt sechs Ligen: Bronze, Silber, Gold, Platin, Diamant und MasterClass. Jede Liga umfasst 1.000 qb, MasterClass beginnt bei 5.000.',
      'Jedes gewertete Spiel hat einen Ziel-Score. Für jedes Prozent darüber bekommst du 2 qb. Für jedes Prozent darunter verlierst du 2 qb, ab 20 % darunter 4 qb pro Prozent. Ein Spiel ändert dein qb um höchstens 200.',
      'Brichst du ein gewertetes Spiel ab, zählt es mit deinem Score bis dahin. Ein liegen gelassenes gewertetes Spiel zählt als schlechtestes Ergebnis.',
      'Nach einem Aufstieg kannst du 3 Spiele lang nicht aus der neuen Liga fallen. In Bronze zählen Verluste nur zur Hälfte.',
      'Die Liga-Rangliste wird nie zurückgesetzt: die Spieler deiner Liga, die in den letzten 14 Tagen gewertet gespielt haben, nach qb.',
      'Je höher dein qb, desto schwerer wird Gewertet. Die Posts bleiben gleich, aber Treffer bringen weniger Dopamin und Fehler kosten mehr. Der Perfekt-Bonus wird nie kleiner. Die Schwierigkeit beginnt bei 1.000 qb und steigt alle 250 qb.',
      'Gewertet spielst du nur um qb. Die Scores kommen nicht in die Ranglisten Diese Woche, Dieser Monat und Allzeit.',
    ],
  },
  boards: {
    title: 'Ranglisten',
    lead: 'Es gibt drei Ranglisten: Diese Woche, Dieser Monat und Allzeit. In jeder steht deine beste Runde aus diesem Zeitraum als eine Zeile.',
    more: [
      'Der Tag beginnt um Mitternacht, die Woche am Montag, der Monat am Ersten – alles nach Istanbuler Zeit.',
      'In die Ranglisten kommen deine normalen und täglichen Spiele. Gewertete Spiele ändern nur dein qb.',
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
      'Du kannst dein Konto unter Kontoinfos in den Einstellungen endgültig löschen: Dein Name, deine Scores und deine Plätze in den Ranglisten werden gelöscht. Das lässt sich nicht rückgängig machen.',
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
          'Nein, du hast einen Versuch pro Tag. Im normalen Spiel spielst du, so oft du willst; deine beste Runde kommt in die Ranglisten.',
      },
      {
        question: 'Wie steige ich in der Liga auf?',
        answer:
          'Spiel Gewertet und schlag deinen Ziel-Score: Jedes Spiel darüber hebt dein qb, und alle 1.000 qb geht es eine Liga hoch.',
      },
      {
        question: 'Wie trete ich gegen meine Freunde an?',
        answer:
          'Tipp in deinem Profil auf deine Freundeszahl, such Spieler nach Namen und schick eine Freundschaftsanfrage. Sobald sie annehmen, trittst du auf dem Gipfel unter Freunde nur gegen deine Freunde an und schickst ihnen unter Chats Nachrichten und VS.',
      },
      {
        question: 'Kann ich meinen Namen ändern?',
        answer:
          'Nein. Du wählst deinen Namen einmal, und er ändert sich nie; auf dem Gipfel und in der Liga kennen dich alle unter diesem Namen. Wenn du es nicht eilig hast, spiel erst mit deinem Gastnamen und wähl deinen Namen später unter Kontoinfos in den Einstellungen.',
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
    blind: (ms) =>
      `إذا سحبت المنشور الخاطئ أو نقرت عليه مرتين في أول ${iso(`${ms} ms`)} دون أن تنظر، فهذه حركة عمياء. الثانية على التوالي عقوبتها مضاعفة، والثالثة أربعة أضعاف.`,
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
      'نتيجتك في خلاصة اليوم تُسجَّل أيضًا في الترتيبات الأخرى وتُحتسب لفتح اللعب المصنَّف. أما في اللعب العادي فالعب قدر ما تشاء.',
    ],
  },
  leagues: {
    title: 'الدوريات',
    lead: 'هناك ثلاثة أنماط: يومي وعادي ومصنَّف. وحده المصنَّف يغيّر تصنيفك (qb). يُفتح المصنَّف بعد 20 مباراة عادية أو يومية، وأول 3 مباريات مصنَّفة لك تحدد تصنيفك، والجميع يبدأ في الفضة.',
    more: [
      'هناك ستة دوريات: البرونز والفضة والذهب والبلاتين والماس وماستر كلاس. كل دوري ‎1000‎ qb، وماستر كلاس من ‎5000‎ فما فوق.',
      'لكل مباراة مصنَّفة نتيجة هدف. تكسب 2 qb عن كل 1% فوقها. وتخسر 2 qb عن كل 1% دونها، و4 qb عن كل 1% بعد أول 20%. لا تغيّر المباراة الواحدة أكثر من 200 qb.',
      'إن خرجت من مباراة مصنَّفة تُحسب بنتيجتك حتى تلك اللحظة. أما المباراة المصنَّفة المتروكة دون إنهاء فتُحسب أدنى نتيجة.',
      'عندما تصعد إلى دوري جديد لا تهبط منه طوال 3 مباريات. وفي البرونز تُحسب الخسارة بالنصف.',
      'ترتيب الدوري لا يُصفَّر أبدًا: لاعبو دوريك الذين لعبوا مصنَّفًا في آخر 14 يومًا، حسب qb.',
      'كلما ارتفع تصنيفك صار المصنَّف أصعب. تبقى المنشورات نفسها، لكن الإصابات تمنح دوبامين أقل والأخطاء تكلّف أكثر. مكافأة الإتقان لا تنقص أبدًا. تبدأ الصعوبة عند 1.000 qb وتزداد كل 250 qb.',
      'المصنَّف من أجل qb فقط. نتائجه لا تُكتب في ترتيبات هذا الأسبوع وهذا الشهر وكل الأوقات.',
    ],
  },
  boards: {
    title: 'الترتيبات',
    lead: 'هناك ثلاثة ترتيبات: هذا الأسبوع، وهذا الشهر، وكل الأوقات. في كل منها تظهر أفضل جولة لك في تلك الفترة في سطر واحد.',
    more: [
      'يبدأ اليوم عند منتصف الليل، والأسبوع يوم الاثنين، والشهر في يومه الأول؛ وكلها بتوقيت إسطنبول.',
      'تُكتب في الترتيبات مبارياتك العادية واليومية. المباريات المصنَّفة تغيّر تصنيفك فقط.',
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
      'يمكنك حذف حسابك نهائيًا من معلومات الحساب في الإعدادات: يُحذف اسمك ونتائجك ومكانك في الترتيب. لا يمكن التراجع عن ذلك.',
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
          'لا، لديك محاولة واحدة كل يوم. أما في اللعب العادي فالعب قدر ما تشاء، وتُسجَّل أفضل جولاتك في الترتيبات.',
      },
      {
        question: 'كيف أصعد في الدوري؟',
        answer:
          'العب مصنَّفًا وتجاوز نتيجة هدفك: كل مباراة فوقه ترفع تصنيفك، وكل ‎1000‎ qb تعني دوريًا أعلى.',
      },
      {
        question: 'كيف أنافس أصدقائي؟',
        answer:
          'المس عدد أصدقائك في ملفك، وابحث عن اللاعبين بالاسم وأرسل طلب صداقة. عندما يقبلون، انتقل إلى الأصدقاء في القمة لتنافس أصدقاءك فقط، وأرسل إليهم رسائل وتحديات من الرسائل.',
      },
      {
        question: 'هل يمكنني تغيير اسم المستخدم؟',
        answer:
          'لا. تختار اسمك مرة واحدة ولن يتغيّر أبدًا؛ فالجميع في القمة وفي الدوري يعرفونك به. إن لم تكن مستعجلًا فالعب أولًا باسم الضيف، واختر اسمك لاحقًا من معلومات الحساب في الإعدادات.',
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
    blind: (ms) =>
      `Balaie ou tape deux fois le mauvais post dans ses ${ms} premières ms, sans regarder, et c’est un coup à l’aveugle. Le deuxième d’affilée coûte double, le troisième quatre fois plus.`,
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
      'Ton score au Fil du jour compte aussi dans les autres classements et pour ouvrir le mode classé. En normal, tu joues autant que tu veux.',
    ],
  },
  leagues: {
    title: 'Ligues',
    lead: "Il y a trois modes : Quotidien, Normal et Classé. Seul le mode classé change ton qb. Il s'ouvre après 20 parties normales ou quotidiennes ; tes 3 premières parties classées fixent ton qb, et tout le monde commence en Argent.",
    more: [
      'Il y a six ligues : Bronze, Argent, Or, Platine, Diamant et MasterClass. Chaque ligue fait 1 000 qb, MasterClass commence à 5 000.',
      'Chaque partie classée a un score objectif. Tu gagnes 2 qb pour chaque 1 % au-dessus. Tu perds 2 qb pour chaque 1 % en dessous, et 4 qb par 1 % au-delà de 20 % en dessous. Une partie change ton qb de 200 au plus.',
      'Si tu quittes une partie classée, elle compte avec ton score du moment. Une partie classée laissée en plan compte comme le plus mauvais résultat.',
      'Quand tu montes de ligue, tu ne peux pas en redescendre pendant 3 parties. En Bronze, les pertes sont divisées par deux.',
      'Le classement de la ligue ne repart jamais de zéro : les joueurs de ta ligue qui ont joué en classé ces 14 derniers jours, par qb.',
      'Plus ton qb monte, plus le mode classé devient dur. Les posts restent les mêmes, mais les réussites donnent moins de dopamine et les erreurs en coûtent plus. Le bonus parfait ne baisse jamais. La difficulté commence à 1 000 qb et augmente tous les 250 qb.',
      'Le mode classé se joue pour le qb uniquement. Ses scores ne vont pas dans les classements Cette semaine, Ce mois-ci et Depuis toujours.',
    ],
  },
  boards: {
    title: 'Classements',
    lead: 'Il y a trois classements : Cette semaine, Ce mois-ci et Depuis toujours. Dans chacun, ta meilleure partie de la période tient sur une seule ligne.',
    more: [
      "Le jour commence à minuit, la semaine le lundi et le mois le 1er, tous à l'heure d'Istanbul.",
      'Tes parties normales et quotidiennes vont dans les classements. Les parties classées ne changent que ton qb.',
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
      "Tu peux supprimer définitivement ton compte depuis Infos du compte, dans les Réglages : ton nom, tes scores et ta place au classement sont supprimés. C'est irréversible.",
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
          'Non, tu as un seul essai par jour. En normal, tu joues autant que tu veux ; ta meilleure partie compte pour les classements.',
      },
      {
        question: 'Comment monter en ligue ?',
        answer:
          "Joue en classé et dépasse ton score objectif : chaque partie au-dessus fait monter ton qb, et tous les 1 000 qb tu montes d'une ligue.",
      },
      {
        question: 'Comment affronter mes amis ?',
        answer:
          "Touche ton nombre d'amis sur ton profil, cherche des joueurs par leur nom et envoie une demande d'ami. Une fois acceptée, passe à Amis sur le Sommet pour ne te mesurer qu'à tes amis, et envoie-leur des messages et des VS depuis Messages.",
      },
      {
        question: 'Puis-je changer de pseudo ?',
        answer:
          "Non. Tu choisis ton nom une seule fois et il ne change plus jamais ; au Sommet et dans ta ligue, tout le monde te connaît sous ce nom. Si tu n'es pas pressé, joue d'abord avec ton nom d'invité, puis choisis ton nom plus tard dans Infos du compte, dans les Réglages.",
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
    blind: (ms) =>
      `Si deslizas o tocas dos veces el post equivocado en sus primeros ${ms} ms, sin mirar, es una jugada a ciegas. La segunda seguida cuesta el doble y la tercera, cuatro veces más.`,
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
      'Tu puntuación del Feed del día también cuenta en las otras clasificaciones y para abrir Competitivo. En Normal, juegas todo lo que quieras.',
    ],
  },
  leagues: {
    title: 'Ligas',
    lead: 'Hay tres modos: Diario, Normal y Competitivo. Solo Competitivo cambia tu qb. Se abre después de 20 partidas normales o diarias; tus primeras 3 partidas competitivas fijan tu qb y todos empiezan en Plata.',
    more: [
      'Hay seis ligas: Bronce, Plata, Oro, Platino, Diamante y MasterClass. Cada liga son 1.000 qb y MasterClass empieza en 5.000.',
      'Cada partida competitiva tiene una puntuación objetivo. Ganas 2 qb por cada 1 % por encima. Pierdes 2 qb por cada 1 % por debajo, y 4 qb por cada 1 % más allá del 20 % por debajo. Una partida cambia tu qb 200 como mucho.',
      'Si sales de una partida competitiva, cuenta con la puntuación que llevabas. Una partida competitiva abandonada cuenta como el peor resultado.',
      'Al subir de liga, no puedes caer de ella durante 3 partidas. En Bronce, las pérdidas son la mitad.',
      'La tabla de la liga nunca se reinicia: los jugadores de tu liga que jugaron Competitivo en los últimos 14 días, por qb.',
      'Cuanto más qb tienes, más difícil es Competitivo. Las publicaciones son las mismas, pero los aciertos dan menos dopamina y los errores cuestan más. El bonus perfecto nunca baja. La dificultad empieza en 1.000 qb y sube cada 250 qb.',
      'Competitivo se juega solo por qb. Sus puntuaciones no entran en Esta semana, Este mes ni Histórico.',
    ],
  },
  boards: {
    title: 'Clasificaciones',
    lead: 'Hay tres clasificaciones: Esta semana, Este mes e Histórico. En cada una, tu mejor partida de ese periodo aparece en una sola fila.',
    more: [
      'El día empieza a medianoche, la semana el lunes y el mes el día 1; todo en hora de Estambul.',
      'En las clasificaciones entran tus partidas normales y diarias. Las competitivas solo cambian tu qb.',
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
      'Puedes eliminar tu cuenta para siempre desde Datos de la cuenta, en Ajustes: se borran tu nombre, tus puntuaciones y tu lugar en la clasificación. No se puede deshacer.',
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
          'No, tienes un solo intento al día. En Normal juegas todo lo que quieras; tu mejor partida va a las clasificaciones.',
      },
      {
        question: '¿Cómo subo en la liga?',
        answer:
          'Juega Competitivo y supera tu puntuación objetivo: cada partida por encima sube tu qb, y cada 1.000 qb es una liga más.',
      },
      {
        question: '¿Cómo compito con mis amigos?',
        answer:
          'Toca tu número de amigos en tu perfil, busca jugadores por su nombre y envíales una solicitud de amistad. Cuando acepten, cambia a Amigos en la Cumbre para competir solo con tus amigos, y mándales mensajes y VS desde Mensajes.',
      },
      {
        question: '¿Puedo cambiar mi nombre de usuario?',
        answer:
          'No. Eliges tu nombre una sola vez y no cambia nunca; en la Cumbre y en la liga todos te conocen por ese nombre. Si no tienes prisa, juega primero con tu nombre de invitado y elige tu nombre más tarde en Datos de la cuenta, en Ajustes.',
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

const ja: HelpMessages = {
  title: 'ヘルプ',
  subtitle: 'ルール、ポイント、よくある質問',
  posts: {
    title: '4つの投稿',
    intro: '投稿ごとに、時間切れまでにする動きはひとつ。どの動きかは色とバッジでわかります。',
  },
  dopamine: {
    title: 'ドーパミンバー',
    lead: '画面上部のドーパミンバーは毎秒減っていき、投稿が進むほど速く減ります。',
    levels: { full: '満タン', draining: '減少中', low: 'もうすぐ空' },
    more: [
      '正しい動きでバーが回復し、ゴールド投稿をパーフェクトで決めると少し多めに回復します。ミスや時間切れで減ります。',
      'バーは減るにつれて緑から黄色、そして赤に変わります。空になったらゲームオーバーです。',
    ],
    blind: (ms) =>
      `投稿が出てから${ms} ms以内に、よく見ずに間違った投稿をスワイプやダブルタップすると「見ずにプレイ」です。続けて2回目はペナルティ2倍、3回目は4倍に。`,
  },
  scoring: {
    title: 'ポイントとコンボ',
    intro:
      '正しい動きをするたびにポイントが入ります。スワイプやいいねが速いほど、ゴールド投稿では緑の真ん中近くで指を離すほど、たくさんもらえます。',
    level: 'レベル',
    levelBody: (posts) =>
      plural('ja', posts, {
        other: `${posts}投稿ごとにレベルアップ。レベルが上がるたびにポイント倍率が大きくなります。`,
      }),
    combo: 'コンボ',
    comboBody: (start, step, max) =>
      `${start}からスタートし、正しい動きごとに${step}ずつ、最大${max}まで上がります。ミスすると、コンボの${start}を超えた分が半分になります。`,
    named: '特別コンボ',
    namedBody:
      '決めると、投稿のポイントに加えてボーナスがもらえます。レベルが上がるほどボーナスも大きくなります。',
  },
  daily: {
    title: '今日のフィード',
    lead: '毎日、全員が同じフィードをプレイします。同じ投稿が、同じ順番で出てきます。',
    more: [
      'チャンスは1回だけ。フィードを始めた瞬間に使ったことになります。新しいフィードは毎日0時（イスタンブール時間）に届きます。',
      '結果はシェアできます。表のマスはそれぞれ1レベル：🟩 ノーミス、🟨 1〜2ミス、🟥 それ以上、⬛ ゲームが終わったところ。',
      '今日のフィードのスコアはほかのランキングにも載り、ランク戦の解放にもカウントされます。ノーマルなら好きなだけプレイできます。',
    ],
  },
  leagues: {
    title: 'リーグ',
    lead: 'モードはデイリー、ノーマル、ランク戦の3つ。qbが変わるのはランク戦だけです。ランク戦はノーマルかデイリーを20ゲーム遊ぶと解放されます。最初の3ゲームでqbが決まり、全員シルバーからスタートします。',
    more: [
      'リーグはブロンズ、シルバー、ゴールド、プラチナ、ダイヤモンド、マスタークラスの6つ。各リーグの幅は1,000 qbで、マスタークラスは5,000 qb以上です。',
      'ランク戦には毎回目標スコアがあります。目標を1%上回るごとに2 qb増えます。1%下回るごとに2 qb減り、20%を超えて下回った分は1%ごとに4 qb減ります。1ゲームで動くのは最大200 qbです。',
      'ランク戦を途中でやめると、その時点のスコアで記録されます。やりかけのまま放置したランク戦は最低の結果になります。',
      '新しいリーグに上がると、3ゲームの間はそこから落ちません。ブロンズでは減る分が半分になります。',
      'リーグのランキングはリセットされません。同じリーグで直近14日間にランク戦をプレイした人が、qb順に並びます。',
      'qbが高いほどランク戦は難しくなります。流れてくる投稿は同じですが、正しい動きで回復するドーパミンが減り、ミスで失うドーパミンが増えます。パーフェクトのボーナスは減りません。難しさは1,000 qbから始まり、250 qbごとに上がります。',
      'ランク戦はqbのためだけのモードです。スコアは今週・今月・全期間のランキングには載りません。',
    ],
  },
  boards: {
    title: 'ランキング',
    lead: 'ランキングは今週、今月、全期間の3つ。どれも、その期間のベストプレイが1行で載ります。',
    more: [
      '1日は0時、1週間は月曜日、1か月は1日に始まります。すべてイスタンブール時間です。',
      'ランキングに載るのはノーマルとデイリーのゲームです。ランク戦で変わるのはqbだけです。',
      '同点の場合は、先にそのスコアに到達した人が上になります。',
      'ゲームのルールが変わると新しいシーズンが始まり、ランキングとシーズンベストはゼロに戻ります。',
    ],
  },
  fairPlay: {
    title: 'フェアプレイ',
    lead: 'スコアを決めるのはスマホではありません。プレイが終わるとサーバーに送られるのは動きだけ。サーバーが同じルールでプレイを再現し、スコアを自分で計算します。',
    more: [
      'チェックを通らなかったプレイはランキングに載りません。上位に入った一部のスコアは、載る前に確認されます。その間は「スコアを確認しています」と表示されます。',
      'スマホ自体のチェックもあります。GoogleやAppleのセキュリティチェックで承認されない端末（root化したスマホ、エミュレーター、改造アプリ）でもプレイはできますが、スコアはランキングに載りません。ゲームを遅くするツールもプレイ中に検知されます。',
      '古いバージョンのゲームでのプレイはランキングに載りません。アプリを最新の状態にしておいてください。',
    ],
  },
  account: {
    title: 'アカウント',
    lead: '初回起動時はまず練習プレイから。このプレイはどこにもカウントされません。アカウントはこのスマホのゲストアカウントで、名前を決めるまではguest48128742のような名前でプレイします。決めた名前はずっと変わりません。',
    more: [
      'プロフィールの「アカウントを守る」でApple、Google、メールアドレスを連携しましょう。スマホを変えても、名前とスコアを引き継げます。',
      'アカウントは設定のアカウント情報から完全に削除できます。名前、スコア、ランキングの順位が削除され、元に戻せません。',
    ],
  },
  faq: {
    title: 'よくある質問',
    items: [
      {
        question: 'スコアがすぐに表示されないのはなぜ？',
        answer:
          'プレイが終わると、サーバーが動きを再現してポイントを自分で計算します。その間は「確認中…」と表示され、結果が届くとスコアが表示されます。',
      },
      {
        question: '今日のフィードはもう一度プレイできる？',
        answer:
          'いいえ、1日1回だけです。ノーマルなら好きなだけプレイでき、ベストプレイがランキングに載ります。',
      },
      {
        question: 'リーグで上に行くには？',
        answer:
          'ランク戦で目標スコアを超えましょう。超えるたびにqbが上がり、1,000 qbごとにひとつ上のリーグに進めます。',
      },
      {
        question: 'フレンドと競うには？',
        answer:
          'プロフィールのフレンド数をタップし、名前でプレイヤーを探してフレンド申請を送りましょう。承認されたら、トップでフレンドに切り替えるとフレンドだけで競えます。メッセージからは定型メッセージやVSを送れます。',
      },
      {
        question: 'ユーザー名は変えられる？',
        answer:
          'いいえ。名前は一度決めたら変わりません。トップでもリーグでも、みんなその名前であなたを知ります。急がないなら、まずゲスト名でプレイして、あとから設定のアカウント情報で名前を決めましょう。',
      },
      {
        question: 'スマホを変えたらどうなる？',
        answer:
          'アカウントを守っていれば、新しいスマホで連携した方法でログインするだけ。名前もスコアも引き継がれます。ゲストアカウントはこのスマホにしか残りません。',
      },
      {
        question: 'バイブレーションをオフにするには？',
        answer:
          'プロフィールの設定ボタンをタップして、そこでオフにできます。ゲームはバイブレーションなしで動きます。',
      },
      {
        question: 'どんなデータを集めていますか？',
        answer:
          '許可した場合は、開いた画面、滞在時間、シェアなどいくつかの操作をカウントします。30日後には日ごとの集計だけが残ります。許可しなくても、ゲームの動作と安全のために、スマホの機種、OSとアプリのバージョンは記録されます。名前、メールアドレス、位置情報がこのカウントに含まれることはありません。この選択は、プロフィールの設定にある「利用データ」から変更できます。',
      },
    ],
  },
};

const ko: HelpMessages = {
  title: '도움말',
  subtitle: '규칙, 점수, 자주 묻는 질문',
  posts: {
    title: '네 가지 게시물',
    intro:
      '게시물마다 시간이 끝나기 전에 해야 할 동작이 하나 있어요. 어떤 동작인지는 색과 배지로 알 수 있어요.',
  },
  dopamine: {
    title: '도파민 바',
    lead: '화면 위쪽의 도파민 바는 매초 줄어들고, 게시물이 지날수록 더 빨리 줄어들어요.',
    levels: { full: '가득', draining: '줄어드는 중', low: '거의 바닥' },
    more: [
      '올바른 동작을 하면 바가 차고, 골드 게시물을 퍼펙트로 해내면 조금 더 차요. 실수하거나 시간을 놓치면 줄어들어요.',
      '바는 줄어들수록 초록에서 노랑, 그다음 빨강으로 바뀌어요. 바닥나면 게임이 끝나요.',
    ],
    blind: (ms) =>
      `게시물이 나오고 ${ms} ms 안에 보지도 않고 잘못 스와이프하거나 두 번 탭하면 '안 보고 하기'예요. 연속 두 번째는 페널티가 두 배, 세 번째는 네 배예요.`,
  },
  scoring: {
    title: '점수와 콤보',
    intro:
      '올바른 동작마다 점수를 얻어요. 스와이프와 좋아요가 빠를수록, 골드 게시물에서는 초록색 한가운데에 가깝게 손을 뗄수록 더 많이 받아요.',
    level: '레벨',
    levelBody: (posts) =>
      plural('ko', posts, {
        other: `게시물 ${posts}개마다 레벨이 올라요. 레벨이 오를 때마다 점수 배율이 커져요.`,
      }),
    combo: '콤보',
    comboBody: (start, step, max) =>
      `${start}에서 시작해 올바른 동작마다 ${step}씩, 최대 ${max}까지 올라요. 실수하면 콤보 중 ${start}보다 높은 부분이 절반으로 줄어요.`,
    named: '특별 콤보',
    namedBody: '성공하면 게시물 점수에 보너스 점수가 더해져요. 레벨이 높을수록 보너스도 커져요.',
  },
  daily: {
    title: '오늘의 피드',
    lead: '매일 모두가 같은 피드를 플레이해요. 같은 게시물이 같은 순서로 나와요.',
    more: [
      '기회는 한 번뿐이에요. 피드를 시작하는 순간 기회를 쓴 거예요. 새 피드는 매일 자정(이스탄불 시간)에 열려요.',
      '결과를 공유할 수 있어요. 표의 칸 하나가 레벨 하나예요. 🟩 실수 없음, 🟨 한두 번 실수, 🟥 그 이상, ⬛ 게임이 끝난 곳.',
      '오늘의 피드 점수는 다른 랭킹에도 올라가고, 랭크전 해금에도 포함돼요. 일반 모드는 원하는 만큼 플레이할 수 있어요.',
    ],
  },
  leagues: {
    title: '리그',
    lead: '모드는 데일리, 일반, 랭크전 세 가지예요. qb는 랭크전에서만 바뀌어요. 랭크전은 일반이나 데일리를 20판 하면 열려요. 처음 3판으로 qb가 정해지고, 모두 실버에서 시작해요.',
    more: [
      '리그는 브론즈, 실버, 골드, 플래티넘, 다이아몬드, 마스터클래스 여섯 개예요. 리그마다 1,000 qb 구간이고, 마스터클래스는 5,000 qb 이상이에요.',
      '랭크전마다 목표 점수가 있어요. 목표보다 1% 높을 때마다 2 qb를 얻어요. 1% 낮을 때마다 2 qb를 잃고, 20%를 넘게 낮은 부분은 1%마다 4 qb를 잃어요. 한 판에 바뀌는 qb는 최대 200이에요.',
      '랭크전을 그만두면 그때까지의 점수로 계산돼요. 끝내지 않고 남겨 둔 랭크전은 가장 낮은 결과로 계산돼요.',
      '새 리그로 올라가면 3판 동안은 떨어지지 않아요. 브론즈에서는 잃는 qb가 절반이에요.',
      '리그 순위는 초기화되지 않아요. 내 리그에서 최근 14일 안에 랭크전을 한 플레이어들이 qb 순으로 정렬돼요.',
      'qb가 높을수록 랭크전이 어려워져요. 나오는 게시물은 같지만, 올바른 동작으로 얻는 도파민은 줄고 실수하면 잃는 도파민은 늘어요. 퍼펙트 보너스는 줄지 않아요. 난이도는 1,000 qb부터 시작해 250 qb마다 올라가요.',
      '랭크전은 qb만을 위한 모드예요. 점수는 이번 주, 이번 달, 전체 기간 랭킹에 올라가지 않아요.',
    ],
  },
  boards: {
    title: '랭킹',
    lead: '랭킹은 이번 주, 이번 달, 전체 기간 세 가지예요. 각 랭킹에는 그 기간의 최고 기록이 한 줄로 올라가요.',
    more: [
      '하루는 자정에, 한 주는 월요일에, 한 달은 1일에 시작해요. 모두 이스탄불 시간 기준이에요.',
      '랭킹에는 일반과 데일리 게임이 올라가요. 랭크전은 qb만 바꿔요.',
      '점수가 같으면 그 점수에 먼저 도달한 사람이 앞서요.',
      '게임 규칙이 바뀌면 새 시즌이 시작되고, 랭킹과 시즌 최고 기록이 처음부터 다시 시작돼요.',
    ],
  },
  fairPlay: {
    title: '페어플레이',
    lead: '점수는 휴대폰이 정하지 않아요. 게임이 끝나면 서버에는 동작만 전송돼요. 서버가 같은 규칙으로 게임을 다시 돌려 보고 점수를 직접 계산해요.',
    more: [
      '검사를 통과하지 못한 게임은 랭킹에 올라가지 않아요. 상위권에 오른 일부 점수는 랭킹에 올라가기 전에 한 번 더 확인해요. 그동안에는 “점수를 검토하고 있어요”라고 표시돼요.',
      '휴대폰도 스스로를 증명해야 해요. Google이나 Apple의 보안 검사에서 승인되지 않은 기기(루팅된 휴대폰, 에뮬레이터, 변조된 앱)에서도 플레이는 할 수 있지만 점수는 랭킹에 올라가지 않아요. 게임 속도를 늦추는 도구도 게임 중에 감지돼요.',
      '오래된 버전의 게임으로 한 판은 랭킹에 올라갈 수 없어요. 앱을 최신 버전으로 유지해 주세요.',
    ],
  },
  account: {
    title: '계정',
    lead: '처음 실행하면 연습 게임부터 시작해요. 이 게임은 어디에도 기록되지 않아요. 계정은 이 휴대폰의 게스트 계정이고, 이름을 정하기 전까지는 guest48128742 같은 이름으로 플레이해요. 정한 이름은 영구적이라 다시 바꿀 수 없어요.',
    more: [
      '프로필의 “계정 보호하기”에서 Apple, Google 또는 이메일을 연결하세요. 휴대폰이 바뀌어도 이름과 점수를 그대로 가져갈 수 있어요.',
      '설정의 계정 정보에서 계정을 영구 삭제할 수 있어요. 이름, 점수, 랭킹 순위가 삭제되며 되돌릴 수 없어요.',
    ],
  },
  faq: {
    title: '자주 묻는 질문',
    items: [
      {
        question: '점수가 왜 바로 안 보이나요?',
        answer:
          '게임이 끝나면 서버가 동작을 다시 돌려 보고 점수를 직접 계산해요. 그동안에는 “확인 중…”이라고 표시되고, 결과가 오면 점수가 보여요.',
      },
      {
        question: '오늘의 피드를 다시 할 수 있나요?',
        answer:
          '아니요, 하루에 한 번만 할 수 있어요. 일반 모드는 원하는 만큼 할 수 있고, 최고 기록이 랭킹에 올라가요.',
      },
      {
        question: '리그에서 어떻게 올라가나요?',
        answer:
          '랭크전에서 목표 점수를 넘기세요. 넘길 때마다 qb가 오르고, 1,000 qb마다 한 단계 위 리그로 올라가요.',
      },
      {
        question: '친구와 어떻게 겨루나요?',
        answer:
          '프로필에서 친구 수를 탭하고, 이름으로 플레이어를 찾아 친구 요청을 보내세요. 수락하면 정상에서 친구로 바꿔 친구들끼리만 겨룰 수 있어요. 메시지에서는 빠른 메시지와 VS를 보낼 수 있어요.',
      },
      {
        question: '사용자 이름을 바꿀 수 있나요?',
        answer:
          '아니요. 이름은 한 번 정하면 다시 바꿀 수 없어요. 정상과 리그에서 모두가 그 이름으로 나를 알아봐요. 급하지 않다면 먼저 게스트 이름으로 플레이하고, 나중에 설정의 계정 정보에서 이름을 정하세요.',
      },
      {
        question: '휴대폰을 바꾸면 어떻게 되나요?',
        answer:
          '계정을 보호해 두었다면 새 휴대폰에서 연결한 방법으로 로그인하면 돼요. 이름과 점수가 그대로 따라와요. 게스트 계정은 이 휴대폰에만 남아요.',
      },
      {
        question: '진동은 어떻게 끄나요?',
        answer: '프로필의 설정 버튼을 탭해서 끌 수 있어요. 그러면 진동 없이 플레이돼요.',
      },
      {
        question: '어떤 데이터를 수집하나요?',
        answer:
          '허용하면 어떤 화면을 열었는지, 얼마나 머물렀는지, 공유 같은 몇 가지 동작을 집계해요. 30일이 지나면 일별 요약만 남아요. 허용하지 않아도 게임 작동과 보안을 위해 휴대폰 모델, 시스템 및 앱 버전은 기록돼요. 이름, 이메일, 위치는 이 집계에 절대 포함되지 않아요. 선택은 프로필의 설정에 있는 사용 데이터에서 바꿀 수 있어요.',
      },
    ],
  },
};

export const help: Record<Locale, HelpMessages> = { tr, en, de, ar, fr, es, ja, ko };
