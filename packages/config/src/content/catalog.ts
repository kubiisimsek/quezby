import type { Locale } from '@quezby/types';

/**
 * What the feed shows: fake posts, one list per reel kind. A post's id is its
 * kind and its place in the list, so a catalog is **append-only** — a new
 * post goes at the end of a new version, never in the middle of an old one.
 * The API only needs each list's length (`app/Content/Catalog.php`), tested
 * against `fixtures/content.json`, to know which post every reel wore.
 *
 * A post speaks the game's six languages, Turkish first. Its words are
 * transcreated, not translated: a caption is a joke about the scrolling
 * habit, and each language gets one that lands in it, about as short as the
 * Turkish (`docs/design/ui-writing.md`). Words never reach the API, so
 * changing them is not a new version.
 */
export type ContentKind = 'skip' | 'like' | 'hold' | 'freeze';

/** One line in each of the six languages the game speaks. */
export type Localized = Readonly<Record<Locale, string>>;

export type Post = {
  /** `like-007`: stable forever within its version. */
  id: string;
  emoji: string;
  /**
   * The account that posted it, a local in every language — written like a
   * player's name (a–z, 0–9, `.` and `*`), so Arabic's are transliterated.
   */
  user: Localized;
  caption: Localized;
  /** Freeze reels shout a headline instead of a caption. */
  headline: Localized | null;
};

type Draft = Omit<Post, 'id' | 'headline'> & { headline?: Localized };

/**
 * Who posts. An account keeps its handle in every post it makes, so each
 * language's feed has its regulars; the Turkish handles are the originals.
 */
const ACCOUNTS = {
  vlog: {
    tr: '@gunluk.vlog',
    en: '@daily.vlog',
    de: '@alltags.vlog',
    ar: '@yawmiyat.vlog',
    fr: '@vlog.quotidien',
    es: '@vlog.diario',
  },
  food: {
    tr: '@yemek.defteri',
    en: '@food.diary',
    de: '@essens.tagebuch',
    ar: '@daftar.tabkh',
    fr: '@carnet.bouffe',
    es: '@diario.comida',
  },
  home: {
    tr: '@evden.notlar',
    en: '@notes.from.home',
    de: '@zuhause.notizen',
    ar: '@min.albait',
    fr: '@notes.de.chez.moi',
    es: '@notas.desde.casa',
  },
  plain: {
    tr: '@siradan.hesap',
    en: '@just.an.account',
    de: '@nur.ein.konto',
    ar: '@hisab.aadi',
    fr: '@compte.banal',
    es: '@cuenta.normal',
  },
  hacks: {
    tr: '@hayat.hilesi',
    en: '@life.hacks',
    de: '@lifehack.profi',
    ar: '@hiyal.hayat',
    fr: '@astuce.du.jour',
    es: '@trucos.de.vida',
  },
  trends: {
    tr: '@trend.avcisi',
    en: '@trend.hunter',
    de: '@trend.jaeger',
    ar: '@qannas.trend',
    fr: '@chasseur.de.trends',
    es: '@caza.tendencias',
  },
  facts: {
    tr: '@bilgi.kutusu',
    en: '@did.you.know',
    de: '@wusstest.du.schon',
    ar: '@hal.ta3lam',
    fr: '@le.saviez.vous',
    es: '@sabias.que',
  },
  motivation: {
    tr: '@motivasyon.34',
    en: '@motivation.247',
    de: '@motivation.030',
    ar: '@tahfeez.yawmi',
    fr: '@motivation.75',
    es: '@motivacion.365',
  },
  asmr: {
    tr: '@sessiz.asmr',
    en: '@quiet.asmr',
    de: '@leise.asmr',
    ar: '@asmr.hudoo',
    fr: '@asmr.chuchote',
    es: '@asmr.silencioso',
  },
  zeynep: {
    tr: '@zeynep.k',
    en: '@emma.k',
    de: '@lena.k',
    ar: '@noor.k',
    fr: '@chloe.k',
    es: '@lucia.k',
  },
  ali: {
    tr: '@kanka.ali',
    en: '@bro.jake',
    de: '@digga.max',
    ar: '@sahbi.ali',
    fr: '@frerot.theo',
    es: '@bro.pablo',
  },
  elif: {
    tr: '@elif.ay',
    en: '@olivia.moon',
    de: '@mia.mond',
    ar: '@layla.qamar',
    fr: '@lea.lune',
    es: '@sofia.luna',
  },
  ece: {
    tr: '@ece.su',
    en: '@ava.rose',
    de: '@sophie.lu',
    ar: '@salma.r',
    fr: '@jade.ln',
    es: '@carla.mar',
  },
  burak: {
    tr: '@burak.07',
    en: '@tyler.02',
    de: '@jonas.089',
    ar: '@yousef.07',
    fr: '@lucas.13',
    es: '@diego.07',
  },
  deniz: {
    tr: '@deniz*m',
    en: '@kayla*j',
    de: '@nele*k',
    ar: '@rana*m',
    fr: '@manon*b',
    es: '@paula*g',
  },
  can: {
    tr: '@can.can',
    en: '@alex.alex',
    de: '@finn.finn',
    ar: '@karim.karim',
    fr: '@hugo.hugo',
    es: '@dani.dani',
  },
  mert: {
    tr: '@mert*34',
    en: '@ryan*nyc',
    de: '@leon*030',
    ar: '@hamza*99',
    fr: '@enzo*75',
    es: '@javi*10',
  },
  rare: {
    tr: '@nadir.icerik',
    en: '@rare.content',
    de: '@seltener.content',
    ar: '@muhtawa.nadir',
    fr: '@contenu.rare',
    es: '@contenido.unico',
  },
  gold: {
    tr: '@altin.reel',
    en: '@gold.post',
    de: '@goldener.post',
    ar: '@manshour.dhahabi',
    fr: '@post.dore',
    es: '@post.dorado',
  },
  treasure: {
    tr: '@hazine*avcisi',
    en: '@treasure*hunter',
    de: '@schatz*jaeger',
    ar: '@sayyad*kunuz',
    fr: '@chasse*au*tresor',
    es: '@caza*tesoros',
  },
  live: {
    tr: '@canli.yayin',
    en: '@live.now',
    de: '@jetzt.live',
    ar: '@bath.mubasher',
    fr: '@en.direct',
    es: '@en.vivo',
  },
} satisfies Record<string, Localized>;

const SKIP: Draft[] = [
  {
    emoji: '☕️',
    user: ACCOUNTS.vlog,
    caption: {
      tr: 'POV: pazartesi sabahı',
      en: 'POV: Monday morning',
      de: 'POV: Montagmorgen',
      ar: 'مزاجي صباح أول يوم دوام',
      fr: 'POV : lundi matin',
      es: 'POV: lunes por la mañana',
    },
  },
  {
    emoji: '🍝',
    user: ACCOUNTS.food,
    caption: {
      tr: 'Bugün ne yedim? Makarna. Yine.',
      en: 'What I eat in a day: pasta. Again.',
      de: "Was gab's heute? Nudeln. Mal wieder.",
      ar: 'ماذا أكلت اليوم؟ معكرونة. مجددًا.',
      fr: 'Mon repas du jour ? Des pâtes. Encore.',
      es: '¿Qué comí hoy? Pasta. Otra vez.',
    },
  },
  {
    emoji: '🧊',
    user: ACCOUNTS.home,
    caption: {
      tr: 'Kimse sormadı ama kahvem soğudu',
      en: 'Nobody asked, but my coffee went cold',
      de: 'Hat keiner gefragt, aber mein Kaffee ist kalt',
      ar: 'لم يسأل أحد، لكن قهوتي بردت',
      fr: "Personne n'a demandé, mais mon café a refroidi",
      es: 'Nadie preguntó, pero se me enfrió el café',
    },
  },
  {
    emoji: '🔁',
    user: ACCOUNTS.plain,
    caption: {
      tr: 'Rutinim: uyan, kaydır, uyu',
      en: 'My routine: wake up, scroll, sleep',
      de: 'Meine Routine: aufwachen, scrollen, schlafen',
      ar: 'روتيني: أستيقظ، أتصفح، أنام',
      fr: 'Ma routine : réveil, scroll, dodo',
      es: 'Mi rutina: despertar, deslizar, dormir',
    },
  },
  {
    emoji: '⏱️',
    user: ACCOUNTS.hacks,
    caption: {
      tr: '5 dakikalık hayat hilesi (4 dk reklam)',
      en: '5-minute life hack (4 min of ads)',
      de: '5-Minuten-Lifehack (4 Min. Werbung)',
      ar: 'حيلة في 5 دقائق (4 منها إعلانات)',
      fr: 'Astuce en 5 minutes (dont 4 de pub)',
      es: 'Truco de 5 minutos (4 son anuncios)',
    },
  },
  {
    emoji: '📉',
    user: ACCOUNTS.trends,
    caption: {
      tr: 'Bunu izleyenlerin %97’si kaydırdı',
      en: '97% of viewers scrolled past this',
      de: '97 % haben hier weitergescrollt',
      ar: '97% ممن شاهدوا هذا تجاوزوه',
      fr: '97 % des gens ont zappé ce post',
      es: 'El 97 % de la gente siguió deslizando',
    },
  },
  {
    emoji: '🧦',
    user: ACCOUNTS.home,
    caption: {
      tr: 'Çorap eşleştirme challenge #3',
      en: 'Sock matching challenge #3',
      de: 'Socken-Sortier-Challenge #3',
      ar: 'تحدي مطابقة الجوارب، الجزء 3',
      fr: 'Challenge chaussettes orphelines #3',
      es: 'Reto: emparejar calcetines #3',
    },
  },
  {
    emoji: '🚌',
    user: ACCOUNTS.vlog,
    caption: {
      tr: 'Otobüs yine gelmedi, vlog',
      en: "Bus didn't show up again, vlog",
      de: 'Bus kam wieder nicht, Vlog',
      ar: 'يوميات: الحافلة لم تأتِ مجددًا',
      fr: "Le bus n'est toujours pas là, vlog",
      es: 'El bus no vino otra vez, vlog',
    },
  },
  {
    emoji: '🥬',
    user: ACCOUNTS.plain,
    caption: {
      tr: 'Buzdolabını açıp kapattım',
      en: 'Opened the fridge. Closed it.',
      de: 'Kühlschrank auf, Kühlschrank zu',
      ar: 'فتحت الثلاجة ثم أغلقتها',
      fr: 'Frigo ouvert. Frigo fermé.',
      es: 'Abrí la nevera. La cerré.',
    },
  },
  {
    emoji: '📺',
    user: ACCOUNTS.facts,
    caption: {
      tr: 'Dizi önerisi: yok',
      en: 'Show recommendation: none',
      de: 'Serientipp: keiner',
      ar: 'ترشيح مسلسل: لا يوجد',
      fr: 'Série à voir : aucune',
      es: 'Serie recomendada: ninguna',
    },
  },
  {
    emoji: '🎵',
    user: ACCOUNTS.trends,
    caption: {
      tr: 'Bu ses trend olacak (olmayacak)',
      en: "This sound's gonna trend (it's not)",
      de: 'Dieser Sound geht viral (tut er nicht)',
      ar: 'هذا الصوت سيصبح ترندًا (لن يصبح)',
      fr: 'Ce son va buzzer (ou pas)',
      es: 'Este audio será tendencia (no lo será)',
    },
  },
  {
    emoji: '🛋️',
    user: ACCOUNTS.motivation,
    caption: {
      tr: 'Motivasyon: yarın başlarım',
      en: "Motivation: I'll start tomorrow",
      de: 'Motivation: ab morgen dann',
      ar: 'التحفيز: سأبدأ غدًا',
      fr: 'Motivation : je commence demain',
      es: 'Motivación: mañana empiezo',
    },
  },
  {
    emoji: '🧾',
    user: ACCOUNTS.asmr,
    caption: {
      tr: 'Market fişi ASMR',
      en: 'Grocery receipt ASMR',
      de: 'Kassenbon-ASMR',
      ar: 'أصوات مريحة: فاتورة البقالة',
      fr: 'ASMR ticket de caisse',
      es: 'ASMR con el ticket del súper',
    },
  },
  {
    emoji: '🌧️',
    user: ACCOUNTS.asmr,
    caption: {
      tr: 'Yağmur sesi, 10 saat',
      en: 'Rain sounds, 10 hours',
      de: 'Regengeräusche, 10 Stunden',
      ar: 'صوت المطر، 10 ساعات',
      fr: 'Bruit de pluie, 10 heures',
      es: 'Sonido de lluvia, 10 horas',
    },
  },
  {
    emoji: '🥪',
    user: ACCOUNTS.food,
    caption: {
      tr: 'Tost makinesi incelemesi',
      en: 'In-depth panini press review',
      de: 'Sandwichmaker im Test',
      ar: 'مراجعة شاملة لصانعة الساندويتش',
      fr: "Test complet de l'appareil à croque",
      es: 'Reseña a fondo de la sandwichera',
    },
  },
  {
    emoji: '🗂️',
    user: ACCOUNTS.home,
    caption: {
      tr: 'Masa düzenleme ama sessiz',
      en: 'Desk organizing, but make it silent',
      de: 'Schreibtisch aufräumen, aber leise',
      ar: 'ترتيب المكتب، لكن بصمت',
      fr: 'Rangement de bureau, mais en silence',
      es: 'Ordenando el escritorio, pero en silencio',
    },
  },
  {
    emoji: '🥱',
    user: ACCOUNTS.vlog,
    caption: {
      tr: 'Günaydın ama öğleden sonra',
      en: "Good morning (it's 2 p.m.)",
      de: 'Guten Morgen (es ist 14 Uhr)',
      ar: 'صباح الخير (الساعة 3 عصرًا)',
      fr: 'Réveil en douceur (il est 15 h)',
      es: 'Buenos días (son las 3 de la tarde)',
    },
  },
  {
    emoji: '🪴',
    user: ACCOUNTS.facts,
    caption: {
      tr: 'Kedimin kediliği (kedim yok)',
      en: "Cat content (I don't have a cat)",
      de: 'Katzencontent (hab keine Katze)',
      ar: 'لحظات قطتي اللطيفة (ليس لديّ قطة)',
      fr: "Mon chat trop mignon (j'ai pas de chat)",
      es: 'Mi gato siendo muy gato (no tengo gato)',
    },
  },
];

/** Friends post in lower case, the way people type to their friends. */
const LIKE: Draft[] = [
  {
    emoji: '🐱',
    user: ACCOUNTS.zeynep,
    caption: {
      tr: 'kedim yine beni yargılıyor',
      en: 'my cat is judging me again',
      de: 'meine katze verurteilt mich schon wieder',
      ar: 'قطتي تنظر إليّ بازدراء مجددًا',
      fr: 'mon chat me juge encore',
      es: 'mi gato me está juzgando otra vez',
    },
  },
  {
    emoji: '🎂',
    user: ACCOUNTS.ali,
    caption: {
      tr: 'doğum günümdü, beğenmeyen küs',
      en: "it was my birthday, like it or we're done",
      de: 'hatte geburtstag. wer nicht liked, ist raus',
      ar: 'كان عيد ميلادي… لا إعجاب؟ لا صداقة',
      fr: "c'était mon anniv, pas de like = je boude",
      es: 'fue mi cumple, sin like no hay amistad',
    },
  },
  {
    emoji: '🍳',
    user: ACCOUNTS.elif,
    caption: {
      tr: 'ilk yemeğim, yorum yapmayın',
      en: 'first time cooking, no comments pls',
      de: 'zum ersten mal gekocht, keine kommentare',
      ar: 'أول طبخة لي، بلا تعليقات',
      fr: 'mon premier plat, pas de commentaires',
      es: 'mi primera receta, sin comentarios',
    },
  },
  {
    emoji: '🏖️',
    user: ACCOUNTS.ece,
    caption: {
      tr: 'tatil fotoğrafı (sonunda)',
      en: 'vacation pic (finally)',
      de: 'urlaubsfoto (endlich)',
      ar: 'صورة من الإجازة (أخيرًا)',
      fr: 'photo de vacances (enfin)',
      es: 'foto de vacaciones (por fin)',
    },
  },
  {
    emoji: '🐶',
    user: ACCOUNTS.burak,
    caption: {
      tr: 'köpeğim diploma aldı',
      en: 'my dog graduated',
      de: 'mein hund hat jetzt ein diplom',
      ar: 'كلبي تخرّج',
      fr: 'mon chien a eu son diplôme',
      es: 'mi perro se graduó',
    },
  },
  {
    emoji: '💇',
    user: ACCOUNTS.deniz,
    caption: {
      tr: 'yeni saç, dürüst olun',
      en: 'new hair, be honest',
      de: 'neue haare, seid ehrlich',
      ar: 'قصة شعر جديدة، كونوا صريحين',
      fr: 'nouvelle coupe, soyez honnêtes',
      es: 'corte nuevo, sean sinceros',
    },
  },
  {
    emoji: '🎤',
    user: ACCOUNTS.can,
    caption: {
      tr: 'konserdeydim!!!',
      en: 'went to the concert!!!',
      de: 'war auf dem konzert!!!',
      ar: 'حضرت الحفلة!!!',
      fr: "j'étais au concert !!!",
      es: '¡¡¡fui al concierto!!!',
    },
  },
  {
    emoji: '🥟',
    user: ACCOUNTS.mert,
    caption: {
      tr: 'annemin böreği >>>',
      en: "mom's dumplings >>>",
      de: 'mamas maultaschen >>>',
      ar: 'سمبوسة أمي لا يُعلى عليها',
      fr: 'les raviolis de maman >>>',
      es: 'las empanadas de mi mamá >>>',
    },
  },
  {
    emoji: '🐰',
    user: ACCOUNTS.ece,
    caption: {
      tr: 'tavşanımın adı Havuç',
      en: "my bunny's name is Carrot",
      de: 'mein hase heißt Möhre',
      ar: 'أرنبي اسمه جزرة',
      fr: "mon lapin s'appelle Carotte",
      es: 'mi conejo se llama Zanahoria',
    },
  },
  {
    emoji: '🦦',
    user: ACCOUNTS.zeynep,
    caption: {
      tr: 'en sevdiğim hayvan, tartışmaya kapalı',
      en: 'my favorite animal, not up for debate',
      de: 'mein lieblingstier, keine diskussion',
      ar: 'حيواني المفضل، ولا نقاش',
      fr: 'mon animal préféré, point final',
      es: 'mi animal favorito, no se discute',
    },
  },
];

const HOLD: Draft[] = [
  {
    emoji: '💎',
    user: ACCOUNTS.rare,
    caption: {
      tr: 'Sonuna kadar izleyen kazanır',
      en: 'Watch till the end to win',
      de: 'Wer bis zum Ende schaut, gewinnt',
      ar: 'من يشاهد حتى النهاية يفوز',
      fr: "Regarde jusqu'au bout pour gagner",
      es: 'Míralo hasta el final y gana',
    },
  },
  {
    emoji: '👑',
    user: ACCOUNTS.gold,
    caption: {
      tr: 'Nadir içerik, kaçırma',
      en: "Rare content, don't miss it",
      de: 'Seltener Content, nicht verpassen',
      ar: 'محتوى نادر، لا تفوّته',
      fr: 'Contenu rare, ne le rate pas',
      es: 'Contenido exclusivo, no te lo pierdas',
    },
  },
  {
    emoji: '🍀',
    user: ACCOUNTS.treasure,
    caption: {
      tr: 'Bu reel %1 şanslı kişiye çıkar',
      en: 'Only the luckiest 1% see this post',
      de: 'Glückspilz! Nur 1 % sehen diesen Post',
      ar: 'محظوظ! لا يرى هذا المنشور إلا 1% من الناس',
      fr: 'Post réservé aux 1 % les plus chanceux',
      es: 'Solo el 1 % más afortunado ve este post',
    },
  },
  {
    emoji: '🏆',
    user: ACCOUNTS.treasure,
    caption: {
      tr: 'Hazine sandığı açılıyor',
      en: 'The treasure chest is opening',
      de: 'Die Schatztruhe öffnet sich',
      ar: 'صندوق الكنز يُفتح الآن',
      fr: "Le coffre au trésor s'ouvre",
      es: 'Se abre el cofre del tesoro',
    },
  },
  {
    emoji: '⏳',
    user: ACCOUNTS.gold,
    caption: {
      tr: 'Tam zamanında bırakan kazanır',
      en: 'Let go right on time to win',
      de: 'Wer im richtigen Moment loslässt, gewinnt',
      ar: 'من يرفع إصبعه في اللحظة المناسبة يفوز',
      fr: 'Relâche au bon moment pour gagner',
      es: 'Gana quien suelta en el momento justo',
    },
  },
  {
    emoji: '🪙',
    user: ACCOUNTS.rare,
    caption: {
      tr: 'Altın an, doğru saniye',
      en: 'Golden moment, perfect timing',
      de: 'Goldener Moment, perfektes Timing',
      ar: 'لحظة ذهبية، في الثانية المناسبة',
      fr: 'Moment en or, seconde parfaite',
      es: 'Momento dorado, segundo exacto',
    },
  },
];

/** What every freeze reel says under its headline. */
const HANDS_OFF: Localized = {
  tr: 'Kıpırdama. Dokunma.',
  en: "Don't move. Don't touch.",
  de: 'Nicht bewegen. Nicht berühren.',
  ar: 'لا تتحرك. لا تلمس.',
  fr: 'Bouge pas. Touche pas.',
  es: 'No te muevas. No toques.',
};

const FREEZE: Draft[] = [
  {
    emoji: '👀',
    user: ACCOUNTS.live,
    caption: HANDS_OFF,
    headline: {
      tr: 'Annen odaya girdi',
      en: 'Mom just walked in',
      de: 'Mama kommt rein',
      ar: 'أمك دخلت الغرفة',
      fr: 'Maman entre dans la pièce',
      es: 'Tu madre acaba de entrar',
    },
  },
  {
    emoji: '🫣',
    user: ACCOUNTS.live,
    caption: HANDS_OFF,
    headline: {
      tr: 'Patron arkanda',
      en: 'Boss is right behind you',
      de: 'Chef steht hinter dir',
      ar: 'المدير خلفك مباشرة',
      fr: 'Le patron est derrière toi',
      es: 'Tu jefe está detrás de ti',
    },
  },
  {
    emoji: '👩‍🏫',
    user: ACCOUNTS.live,
    caption: HANDS_OFF,
    headline: {
      tr: 'Hoca bakıyor',
      en: "Teacher's watching",
      de: 'Die Lehrerin schaut her',
      ar: 'المعلمة تنظر إليك',
      fr: 'La prof te regarde',
      es: 'La profe te está mirando',
    },
  },
  {
    emoji: '🧍',
    user: ACCOUNTS.live,
    caption: HANDS_OFF,
    headline: {
      tr: 'Babanın ayak sesleri',
      en: "Dad's footsteps",
      de: 'Papas Schritte im Flur',
      ar: 'وقع خطوات أبيك',
      fr: "Papa monte l'escalier",
      es: 'Los pasos de tu padre',
    },
  },
  {
    emoji: '🚨',
    user: ACCOUNTS.live,
    caption: HANDS_OFF,
    headline: {
      tr: 'Ekran süresi uyarısı',
      en: 'Screen time alert',
      de: 'Bildschirmzeit-Warnung',
      ar: 'تنبيه وقت الشاشة',
      fr: "Alerte temps d'écran",
      es: 'Alerta de tiempo de pantalla',
    },
  },
];

function listOf(kind: ContentKind, drafts: Draft[]): readonly Post[] {
  return drafts.map((draft, i) => ({
    id: `${kind}-${String(i + 1).padStart(3, '0')}`,
    emoji: draft.emoji,
    user: draft.user,
    caption: draft.caption,
    headline: draft.headline ?? null,
  }));
}

export type Catalog = Readonly<Record<ContentKind, readonly Post[]>>;

/** The version a run was started with; the server credits posts from the same catalog. */
export const CONTENT_VERSION = 1;

export const CATALOGS: Readonly<Record<number, Catalog>> = {
  1: {
    skip: listOf('skip', SKIP),
    like: listOf('like', LIKE),
    hold: listOf('hold', HOLD),
    freeze: listOf('freeze', FREEZE),
  },
};
