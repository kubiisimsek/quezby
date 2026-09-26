import type { RunSummary } from '@quezby/engine';
import type { LeaderboardPeriod, Locale } from '@quezby/types';

import { formatsFor, iso } from '@/i18n/format';
import { plural } from '@/i18n/plural';

import { board } from './board';

/** A rank as the Turkish tile writes it — and reads it aloud: "#12". */
const trRank = formatsFor('tr').rank;

/** The parts that were given, one after another: "Şimşek, 3 kez, 4.500 puan". */
function facts(comma: string, parts: ReadonlyArray<string | null>): string {
  return parts.filter((part): part is string => part !== null).join(comma);
}

/**
 * What a named combo's chip says aloud: its name and, when given, how often
 * it came and what it paid — `shown` is the points as `t.fmt.score` writes them.
 */
type ChipFacts = { name: string; count?: number; points?: { value: number; shown: string } };

/*
 * A line that counts takes the count and the count as `t.fmt.score` writes
 * it (`shown`): the one picks the form, the other is what is read.
 */

const tr = {
  /** How the run ended, over the score. */
  ending: {
    drained: 'Dopamin bitti. Sıkıldın, uygulamayı kapattın.',
    penalty: 'Çok hata yaptın, akış seni bıraktı.',
    quit: 'Oyundan çıktın.',
  } satisfies Record<RunSummary['endedBy'], string>,
  /** The top of the result: the score, its unit, the record. A run the API never saw wears a ribbon. */
  stage: {
    tutorial: 'DENEME TURU',
    practice: 'ANTRENMAN',
    unsent: 'Skor gönderilemedi',
    /** Under the score, by the kind of run; the score picks the form. */
    unit: {
      ranked: (_score: number) => 'puan',
      tutorial: (_score: number) => 'deneme puanı',
      practice: (_score: number) => 'antrenman puanı',
    },
    record: 'YENİ REKOR!',
    recordLabel: 'Yeni rekor',
    seasonBest: (score: string) => `Sezon rekorun: ${score}`,
  },
  /** What a result that is not a plain ranked run says about itself. */
  notes: {
    unsent: {
      title: 'Skorun doğrulanamadı',
      /** After the error's own line, when the finish can go again. */
      retry: (message: string) =>
        `${message} Hamlelerin telefonda saklı; bağlantı gelince tekrar gönderebilirsin.`,
    },
    tutorial: {
      title: 'Deneme turu',
      body: 'Bu tur hiçbir yere sayılmadı. Hareketleri gördün; sıra gerçek oyunda.',
    },
    practice: {
      title: 'Antrenman turu',
      outdated: 'Uygulamanın yeni sürümü var; güncelleyene kadar skorların sıralamaya girmez.',
      offline: 'Çevrimdışı oynadın; bu skor sıralamaya gönderilmedi.',
    },
    /** After why the phone failed its check (`t.device`). */
    device: (why: string) => `${why} Oynamaya devam edebilirsin.`,
    /** Under the glossary's title for a held score (`t.daily.attempt.review.title`). */
    review: 'Zirveye yakın skorlara bir göz atıyoruz. Onaylanınca sıralamada yerini alır.',
    flagged: {
      title: 'Sıralamaya girmedi',
      body: 'Bu tur doğrulanamadı. Skorun kaydedildi ama sıralamada görünmeyecek.',
    },
  },
  /** The run's numbers, one tile each. */
  stats: {
    posts: 'Post',
    accuracy: 'İsabet',
    maxCombo: 'En yüksek kombo',
    likes: 'Beğeni',
    perfects: 'Mükemmel',
    reaction: 'Tepki',
  },
  /** Where the score came from. */
  breakdown: {
    title: 'Puanın nereden geldi',
    posts: 'Postlardan',
    combos: 'Kombolardan',
  },
  /** A board's place, and how the run moved it. The tiles are small: "Tümü", not "Tüm zamanlar". */
  ranks: {
    periods: {
      daily: 'Bugün',
      weekly: 'Hafta',
      monthly: 'Ay',
      all: 'Tümü',
    } satisfies Record<LeaderboardPeriod, string>,
    /** A place read aloud: "#12" as the tile writes it; the other languages say it as `board.place` does. */
    place: (rank: number) => trRank(rank),
    /** Read aloud where the place would be. */
    unranked: 'sıralamada değilsin',
    /** How the place moved, read aloud. */
    moved: {
      new: 'yeni',
      up: (_places: number, shown: string) => `${shown} sıra yukarı`,
      down: (_places: number, shown: string) => `${shown} sıra aşağı`,
    },
    /** A rank tile read aloud: "Bugün: #12, 8 sıra yukarı". */
    label: (period: string, place: string, move: string | null) =>
      move ? `${period}: ${place}, ${move}` : `${period}: ${place}`,
  },
  /** Where the run placed today; the challenge's name is `t.daily.numbered`. */
  daily: {
    unplaced: 'Bugünün tablosuna girmedi',
    /** After the gold rank (`t.fmt.rank`), the count in `board`'s words: "#37 / 1.204 oyuncu". */
    ofPlayers: (players: number) => ` / ${board.tr.players(players)}`,
  },
  /** Under the league's countdown (`t.league.locked.title`), before a new player's first counted runs. */
  unlockBody: (required: number) => `Lig, ilk ${required} oyunundan sonra açılır.`,
  /** Over the kinds a practice run ended before. */
  unseen: 'Henüz görmediklerin',
  /** The players this run overtook today; `name` is `handle(username)`. */
  passed: {
    title: 'Bugün geçtiklerin',
    name: (name: string, friend: boolean) => (friend ? `${name} · arkadaşın` : name),
    label: (name: string, friend: boolean, _score: number, shown: string) =>
      `${name}${friend ? ', arkadaşın' : ''}, ${shown} puan, geçtin`,
  },
  /** The player's league this week; the zone's line is the lobby's (`t.home.league`). */
  league: {
    /** `league` is `t.tiers.league(tier)`, `rank` `t.fmt.rank(rank)`: "Altın lig · #4/30". */
    title: (league: string, rank: string, members: number) => `${league} · ${rank}/${members}`,
    weekly: (_points: number, shown: string) => `Haftalık ${shown} puan`,
  },
  /** The ways on, at the bottom. */
  dock: {
    continue: 'Devam et',
    resend: 'Tekrar gönder',
    replay: 'Tekrar oyna',
    practiceAgain: 'Bir daha dene',
    home: 'Ana sayfaya dön',
    share: 'Paylaş',
  },
  /** A named combo's chip read aloud (BonusChip). */
  bonusChip: ({ name, count, points }: ChipFacts) =>
    facts(', ', [
      name,
      count === undefined ? null : `${count} kez`,
      points ? `${points.shown} puan` : null,
    ]),
  /** The daily's grid of squares read aloud (ShareGrid). */
  shareGrid: (grid: string) => `Sonuç tablosu: ${grid}`,
};

export type ResultMessages = typeof tr;

const enPoints = (points: number, shown: string) =>
  plural('en', points, { one: `${shown} point`, other: `${shown} points` });

const en: ResultMessages = {
  ending: {
    drained: 'Out of dopamine. You got bored and closed the app.',
    penalty: 'Too many mistakes. The feed dropped you.',
    quit: 'You left the game.',
  },
  stage: {
    tutorial: 'PRACTICE RUN',
    practice: 'TRAINING',
    unsent: "Couldn't send the score",
    unit: {
      ranked: (score) => plural('en', score, { one: 'point', other: 'points' }),
      tutorial: (score) => plural('en', score, { one: 'practice point', other: 'practice points' }),
      practice: (score) => plural('en', score, { one: 'training point', other: 'training points' }),
    },
    record: 'NEW RECORD!',
    recordLabel: 'New record',
    seasonBest: (score) => `Your season record: ${score}`,
  },
  notes: {
    unsent: {
      title: "Your score couldn't be verified",
      retry: (message) =>
        `${message} Your moves are saved on the phone; you can send them again once you're back online.`,
    },
    tutorial: {
      title: 'Practice run',
      body: "This run didn't count anywhere. You've seen the moves; now for the real game.",
    },
    practice: {
      title: 'Training run',
      outdated: "There's a new version of the app; your scores won't rank until you update.",
      offline: "You played offline; this score wasn't sent to the rankings.",
    },
    device: (why) => `${why} You can keep playing.`,
    review:
      "We take a closer look at scores near the top. Once it's approved, your score takes its place in the rankings.",
    flagged: {
      title: "Didn't rank",
      body: "This run couldn't be verified. Your score was saved but won't show in the rankings.",
    },
  },
  stats: {
    posts: 'Posts',
    accuracy: 'Accuracy',
    maxCombo: 'Best combo',
    likes: 'Likes',
    perfects: 'Perfect',
    reaction: 'Reaction',
  },
  breakdown: {
    title: 'Where your points came from',
    posts: 'From posts',
    combos: 'From combos',
  },
  ranks: {
    periods: { daily: 'Today', weekly: 'Week', monthly: 'Month', all: 'Overall' },
    place: board.en.place,
    unranked: 'not on the board',
    moved: {
      new: 'new',
      up: (places, shown) => plural('en', places, { one: 'up 1 place', other: `up ${shown} places` }),
      down: (places, shown) =>
        plural('en', places, { one: 'down 1 place', other: `down ${shown} places` }),
    },
    label: (period, place, move) => (move ? `${period}: ${place}, ${move}` : `${period}: ${place}`),
  },
  daily: {
    unplaced: "Didn't make today's board",
    ofPlayers: (players) => ` / ${board.en.players(players)}`,
  },
  unlockBody: (required) =>
    plural('en', required, {
      one: 'The league opens after your first game.',
      other: `The league opens after your first ${required} games.`,
    }),
  unseen: "You haven't seen these yet",
  passed: {
    title: 'Passed today',
    name: (name, friend) => (friend ? `${name} · your friend` : name),
    label: (name, friend, score, shown) =>
      `${name}${friend ? ', your friend' : ''}, ${enPoints(score, shown)}, you passed them`,
  },
  league: {
    title: (league, rank, members) => `${league} · ${rank}/${members}`,
    weekly: (points, shown) => `${enPoints(points, shown)} this week`,
  },
  dock: {
    continue: 'Continue',
    resend: 'Send again',
    replay: 'Play again',
    practiceAgain: 'Try again',
    home: 'Back to home',
    share: 'Share',
  },
  bonusChip: ({ name, count, points }) =>
    facts(', ', [
      name,
      count === undefined ? null : plural('en', count, { one: 'once', other: `${count} times` }),
      points ? enPoints(points.value, points.shown) : null,
    ]),
  shareGrid: (grid) => `Result grid: ${grid}`,
};

const dePoints = (points: number, shown: string) =>
  plural('de', points, { one: `${shown} Punkt`, other: `${shown} Punkte` });

const de: ResultMessages = {
  ending: {
    drained: 'Dopamin leer. Dir wurde langweilig, du hast die App geschlossen.',
    penalty: 'Zu viele Fehler – der Feed hat dich fallen lassen.',
    quit: 'Du hast das Spiel verlassen.',
  },
  stage: {
    tutorial: 'PROBERUNDE',
    practice: 'TRAINING',
    unsent: 'Score nicht gesendet',
    unit: {
      ranked: (score) => plural('de', score, { one: 'Punkt', other: 'Punkte' }),
      tutorial: (score) => plural('de', score, { one: 'Probepunkt', other: 'Probepunkte' }),
      practice: (score) => plural('de', score, { one: 'Trainingspunkt', other: 'Trainingspunkte' }),
    },
    record: 'NEUER REKORD!',
    recordLabel: 'Neuer Rekord',
    seasonBest: (score) => `Dein Saisonrekord: ${score}`,
  },
  notes: {
    unsent: {
      title: 'Dein Score konnte nicht geprüft werden',
      retry: (message) =>
        `${message} Deine Züge sind auf dem Handy gespeichert; sobald du wieder online bist, kannst du sie erneut senden.`,
    },
    tutorial: {
      title: 'Proberunde',
      body: 'Diese Runde zählt nirgends. Du kennst jetzt die Gesten; jetzt kommt das echte Spiel.',
    },
    practice: {
      title: 'Trainingsrunde',
      outdated:
        'Es gibt eine neue Version der App; bis zum Update kommen deine Scores nicht in die Rangliste.',
      offline: 'Du hast offline gespielt; dieser Score wurde nicht an die Rangliste gesendet.',
    },
    device: (why) => `${why} Du kannst weiterspielen.`,
    review:
      'Scores nahe der Spitze sehen wir uns genauer an. Nach der Freigabe erscheint dein Score in der Rangliste.',
    flagged: {
      title: 'Nicht in der Rangliste',
      body: 'Diese Runde konnte nicht geprüft werden. Dein Score ist gespeichert, erscheint aber nicht in der Rangliste.',
    },
  },
  stats: {
    posts: 'Posts',
    accuracy: 'Trefferquote',
    maxCombo: 'Beste Kombo',
    likes: 'Likes',
    perfects: 'Perfekt',
    reaction: 'Reaktion',
  },
  breakdown: {
    title: 'Woher deine Punkte kommen',
    posts: 'Aus Posts',
    combos: 'Aus Kombos',
  },
  ranks: {
    periods: { daily: 'Heute', weekly: 'Woche', monthly: 'Monat', all: 'Gesamt' },
    place: board.de.place,
    unranked: 'nicht in der Rangliste',
    moved: {
      new: 'neu',
      up: (places, shown) =>
        plural('de', places, { one: '1 Platz nach oben', other: `${shown} Plätze nach oben` }),
      down: (places, shown) =>
        plural('de', places, { one: '1 Platz nach unten', other: `${shown} Plätze nach unten` }),
    },
    label: (period, place, move) => (move ? `${period}: ${place}, ${move}` : `${period}: ${place}`),
  },
  daily: {
    unplaced: 'Nicht in der heutigen Rangliste',
    ofPlayers: (players) => ` / ${board.de.players(players)}`,
  },
  unlockBody: (required) =>
    plural('de', required, {
      one: 'Die Liga öffnet nach deinem ersten Spiel.',
      other: `Die Liga öffnet nach deinen ersten ${required} Spielen.`,
    }),
  unseen: 'Noch nicht gesehen',
  passed: {
    title: 'Heute überholt',
    name: (name, friend) => (friend ? `${name} · dein Freund` : name),
    label: (name, friend, score, shown) =>
      `${name}${friend ? ', dein Freund' : ''}, ${dePoints(score, shown)}, von dir überholt`,
  },
  league: {
    title: (league, rank, members) => `${league} · ${rank}/${members}`,
    weekly: (points, shown) => `${dePoints(points, shown)} diese Woche`,
  },
  dock: {
    continue: 'Weiter',
    resend: 'Erneut senden',
    replay: 'Noch mal spielen',
    practiceAgain: 'Noch mal versuchen',
    home: 'Zur Startseite',
    share: 'Teilen',
  },
  bonusChip: ({ name, count, points }) =>
    facts(', ', [
      name,
      count === undefined ? null : plural('de', count, { one: 'einmal', other: `${count}-mal` }),
      points ? dePoints(points.value, points.shown) : null,
    ]),
  shareGrid: (grid) => `Ergebnisraster: ${grid}`,
};

/** Points in Arabic: the count picks one of six forms. */
const arPoints = (points: number, shown: string) =>
  plural('ar', points, {
    zero: `${shown} نقطة`,
    one: 'نقطة واحدة',
    two: 'نقطتان',
    few: `${shown} نقاط`,
    many: `${shown} نقطة`,
    other: `${shown} نقطة`,
  });

const ar: ResultMessages = {
  ending: {
    drained: 'نفد الدوبامين. شعرت بالملل فأغلقت التطبيق.',
    penalty: 'أخطاء كثيرة، فتخلّت عنك الخلاصة.',
    quit: 'خرجت من اللعبة.',
  },
  stage: {
    tutorial: 'جولة تجريبية',
    practice: 'تدريب',
    unsent: 'تعذّر إرسال النتيجة',
    unit: {
      ranked: (score) =>
        plural('ar', score, { two: 'نقطتان', few: 'نقاط', other: 'نقطة' }),
      tutorial: (score) =>
        plural('ar', score, { two: 'نقطتان تجريبيتان', few: 'نقاط تجريبية', other: 'نقطة تجريبية' }),
      practice: (score) =>
        plural('ar', score, { two: 'نقطتا تدريب', few: 'نقاط تدريب', other: 'نقطة تدريب' }),
    },
    record: 'رقم قياسي جديد!',
    recordLabel: 'رقم قياسي جديد',
    seasonBest: (score) => `رقمك القياسي للموسم: ${score}`,
  },
  notes: {
    unsent: {
      title: 'تعذّر التحقق من نتيجتك',
      retry: (message) =>
        `${message} حركاتك محفوظة على الهاتف؛ يمكنك إرسالها مجددًا عند عودة الاتصال.`,
    },
    tutorial: {
      title: 'جولة تجريبية',
      body: 'هذه الجولة لم تُحتسب في أي مكان. رأيت الحركات؛ والآن إلى اللعب الحقيقي.',
    },
    practice: {
      title: 'جولة تدريبية',
      outdated: 'يتوفر إصدار جديد من التطبيق؛ لن تدخل نتائجك الترتيب حتى تحدّثه.',
      offline: 'لعبت دون اتصال؛ لم تُرسل هذه النتيجة إلى الترتيب.',
    },
    device: (why) => `${why} يمكنك مواصلة اللعب.`,
    review: 'نراجع النتائج القريبة من القمة عن كثب. بعد الموافقة تأخذ نتيجتك مكانها في الترتيب.',
    flagged: {
      title: 'لم تدخل الترتيب',
      body: 'تعذّر التحقق من هذه الجولة. حُفظت نتيجتك لكنها لن تظهر في الترتيب.',
    },
  },
  stats: {
    posts: 'المنشورات',
    accuracy: 'الدقة',
    maxCombo: 'أعلى كومبو',
    likes: 'الإعجابات',
    perfects: 'مثالي',
    reaction: 'ردّ الفعل',
  },
  breakdown: {
    title: 'من أين جاءت نقاطك',
    posts: 'من المنشورات',
    combos: 'من الكومبو',
  },
  ranks: {
    periods: { daily: 'اليوم', weekly: 'الأسبوع', monthly: 'الشهر', all: 'الكل' },
    place: board.ar.place,
    unranked: 'خارج الترتيب',
    moved: {
      new: 'جديد',
      up: (places, shown) =>
        plural('ar', places, {
          one: 'تقدّم مركزًا واحدًا',
          two: 'تقدّم مركزين',
          few: `تقدّم ${shown} مراكز`,
          many: `تقدّم ${shown} مركزًا`,
          other: `تقدّم ${shown} مركز`,
        }),
      down: (places, shown) =>
        plural('ar', places, {
          one: 'تراجع مركزًا واحدًا',
          two: 'تراجع مركزين',
          few: `تراجع ${shown} مراكز`,
          many: `تراجع ${shown} مركزًا`,
          other: `تراجع ${shown} مركز`,
        }),
    },
    label: (period, place, move) => (move ? `${period}: ${place}، ${move}` : `${period}: ${place}`),
  },
  daily: {
    unplaced: 'لم تدخل ترتيب اليوم',
    ofPlayers: (players) => ` / ${board.ar.players(players)}`,
  },
  unlockBody: (required) =>
    plural('ar', required, {
      one: 'يُفتح الدوري بعد مباراتك الأولى.',
      two: 'يُفتح الدوري بعد أول مباراتين لك.',
      few: `يُفتح الدوري بعد أول ${required} مباريات لك.`,
      other: `يُفتح الدوري بعد أول ${required} مباراة لك.`,
    }),
  unseen: 'لم ترها بعد',
  passed: {
    title: 'تجاوزتهم اليوم',
    name: (name, friend) => (friend ? `${iso(name)} · صديقك` : name),
    label: (name, friend, score, shown) =>
      `${iso(name)}${friend ? '، صديقك' : ''}، ${arPoints(score, shown)}، تجاوزته`,
  },
  league: {
    title: (league, rank, members) => `${league} · ${iso(`${rank}/${members}`)}`,
    weekly: (points, shown) => `${arPoints(points, shown)} هذا الأسبوع`,
  },
  dock: {
    continue: 'متابعة',
    resend: 'إعادة الإرسال',
    replay: 'العب مجددًا',
    practiceAgain: 'حاول مجددًا',
    home: 'العودة إلى الرئيسية',
    share: 'شارِك',
  },
  bonusChip: ({ name, count, points }) =>
    facts('، ', [
      name,
      count === undefined
        ? null
        : plural('ar', count, {
            one: 'مرة واحدة',
            two: 'مرتان',
            few: `${count} مرات`,
            other: `${count} مرة`,
          }),
      points ? arPoints(points.value, points.shown) : null,
    ]),
  shareGrid: (grid) => `جدول النتيجة: ${grid}`,
};

const frPoints = (points: number, shown: string) =>
  plural('fr', points, {
    one: `${shown} point`,
    many: `${shown} de points`,
    other: `${shown} points`,
  });

const fr: ResultMessages = {
  ending: {
    drained: "Plus de dopamine. L'ennui a gagné, tu as fermé l'appli.",
    penalty: "Trop d'erreurs, le fil t'a lâché.",
    quit: 'Tu as quitté la partie.',
  },
  stage: {
    tutorial: "PARTIE D'ESSAI",
    practice: 'ENTRAÎNEMENT',
    unsent: 'Score non envoyé',
    unit: {
      ranked: (score) => plural('fr', score, { one: 'point', other: 'points' }),
      tutorial: (score) => plural('fr', score, { one: "point d'essai", other: "points d'essai" }),
      practice: (score) =>
        plural('fr', score, { one: "point d'entraînement", other: "points d'entraînement" }),
    },
    record: 'NOUVEAU RECORD !',
    recordLabel: 'Nouveau record',
    seasonBest: (score) => `Ton record de la saison : ${score}`,
  },
  notes: {
    unsent: {
      title: "Ton score n'a pas pu être vérifié",
      retry: (message) =>
        `${message} Tes coups sont gardés sur le téléphone ; tu pourras les renvoyer une fois la connexion revenue.`,
    },
    tutorial: {
      title: "Partie d'essai",
      body: "Cette partie n'a compté nulle part. Tu as vu les gestes ; place au vrai jeu.",
    },
    practice: {
      title: "Partie d'entraînement",
      outdated:
        "Une nouvelle version de l'appli est disponible ; tant que tu ne l'as pas installée, tes scores ne sont pas classés.",
      offline: "Tu as joué hors ligne ; ce score n'a pas été envoyé au classement.",
    },
    device: (why) => `${why} Tu peux continuer à jouer.`,
    review:
      'On regarde de plus près les scores proches du sommet. Une fois validé, ton score prendra sa place au classement.',
    flagged: {
      title: 'Non classé',
      body: "Cette partie n'a pas pu être vérifiée. Ton score est enregistré mais n'apparaîtra pas au classement.",
    },
  },
  stats: {
    posts: 'Posts',
    accuracy: 'Précision',
    maxCombo: 'Meilleur combo',
    likes: 'Likes',
    perfects: 'Parfait',
    reaction: 'Réaction',
  },
  breakdown: {
    title: "D'où viennent tes points",
    posts: 'Des posts',
    combos: 'Des combos',
  },
  ranks: {
    periods: {
      daily: "Aujourd'hui",
      weekly: 'Semaine',
      monthly: 'Mois',
      all: 'Total',
    },
    place: board.fr.place,
    unranked: 'hors classement',
    moved: {
      new: 'nouveau',
      up: (places, shown) =>
        plural('fr', places, { one: "en hausse d'une place", other: `en hausse de ${shown} places` }),
      down: (places, shown) =>
        plural('fr', places, { one: "en baisse d'une place", other: `en baisse de ${shown} places` }),
    },
    label: (period, place, move) =>
      move ? `${period} : ${place}, ${move}` : `${period} : ${place}`,
  },
  daily: {
    unplaced: 'Pas dans le classement du jour',
    ofPlayers: (players) => ` / ${board.fr.players(players)}`,
  },
  unlockBody: (required) =>
    plural('fr', required, {
      one: "La ligue s'ouvre après ta première partie.",
      other: `La ligue s'ouvre après tes ${required} premières parties.`,
    }),
  unseen: 'Pas encore vus',
  passed: {
    title: "Dépassés aujourd'hui",
    name: (name, friend) => (friend ? `${name} · ton ami` : name),
    label: (name, friend, score, shown) =>
      `${name}${friend ? ', ton ami' : ''}, ${frPoints(score, shown)}, désormais derrière toi`,
  },
  league: {
    title: (league, rank, members) => `${league} · ${rank}/${members}`,
    weekly: (points, shown) => `${frPoints(points, shown)} cette semaine`,
  },
  dock: {
    continue: 'Continuer',
    resend: 'Renvoyer',
    replay: 'Rejouer',
    practiceAgain: 'Réessayer',
    home: "Retour à l'accueil",
    share: 'Partager',
  },
  bonusChip: ({ name, count, points }) =>
    facts(', ', [
      name,
      count === undefined ? null : `${count} fois`,
      points ? frPoints(points.value, points.shown) : null,
    ]),
  shareGrid: (grid) => `Grille de résultat : ${grid}`,
};

const esPoints = (points: number, shown: string) =>
  plural('es', points, {
    one: `${shown} punto`,
    many: `${shown} de puntos`,
    other: `${shown} puntos`,
  });

const es: ResultMessages = {
  ending: {
    drained: 'Sin dopamina. Te aburriste y cerraste la app.',
    penalty: 'Demasiados errores: el feed te soltó.',
    quit: 'Saliste de la partida.',
  },
  stage: {
    tutorial: 'RONDA DE PRÁCTICA',
    practice: 'ENTRENAMIENTO',
    unsent: 'Puntuación no enviada',
    unit: {
      ranked: (score) => plural('es', score, { one: 'punto', other: 'puntos' }),
      tutorial: (score) =>
        plural('es', score, { one: 'punto de práctica', other: 'puntos de práctica' }),
      practice: (score) =>
        plural('es', score, { one: 'punto de entrenamiento', other: 'puntos de entrenamiento' }),
    },
    record: '¡NUEVO RÉCORD!',
    recordLabel: 'Nuevo récord',
    seasonBest: (score) => `Tu récord de la temporada: ${score}`,
  },
  notes: {
    unsent: {
      title: 'No se pudo verificar tu puntuación',
      retry: (message) =>
        `${message} Tus jugadas están guardadas en el teléfono; podrás enviarlas de nuevo cuando vuelva la conexión.`,
    },
    tutorial: {
      title: 'Ronda de práctica',
      body: 'Esta ronda no contó en ningún lado. Ya viste los gestos; ahora, a jugar de verdad.',
    },
    practice: {
      title: 'Ronda de entrenamiento',
      outdated:
        'Hay una nueva versión de la app; hasta que la actualices, tus puntuaciones no entran en la clasificación.',
      offline: 'Jugaste sin conexión; esta puntuación no se envió a la clasificación.',
    },
    device: (why) => `${why} Puedes seguir jugando.`,
    review:
      'Revisamos con más detalle las puntuaciones cercanas a la cima. Cuando se apruebe, tu puntuación ocupará su lugar en la clasificación.',
    flagged: {
      title: 'No entró en la clasificación',
      body: 'No se pudo verificar esta ronda. Tu puntuación se guardó, pero no aparecerá en la clasificación.',
    },
  },
  stats: {
    posts: 'Posts',
    accuracy: 'Precisión',
    maxCombo: 'Mejor combo',
    likes: 'Me gusta',
    perfects: 'Perfecto',
    reaction: 'Reacción',
  },
  breakdown: {
    title: 'De dónde salieron tus puntos',
    posts: 'Por posts',
    combos: 'Por combos',
  },
  ranks: {
    periods: { daily: 'Hoy', weekly: 'Semana', monthly: 'Mes', all: 'Total' },
    place: board.es.place,
    unranked: 'fuera de la clasificación',
    moved: {
      new: 'nuevo',
      up: (places, shown) =>
        plural('es', places, { one: '1 puesto arriba', other: `${shown} puestos arriba` }),
      down: (places, shown) =>
        plural('es', places, { one: '1 puesto abajo', other: `${shown} puestos abajo` }),
    },
    label: (period, place, move) => (move ? `${period}: ${place}, ${move}` : `${period}: ${place}`),
  },
  daily: {
    unplaced: 'No entró en la clasificación de hoy',
    ofPlayers: (players) => ` / ${board.es.players(players)}`,
  },
  unlockBody: (required) =>
    plural('es', required, {
      one: 'La liga se abre después de tu primera partida.',
      other: `La liga se abre después de tus primeras ${required} partidas.`,
    }),
  unseen: 'Aún no los viste',
  passed: {
    title: 'Superados hoy',
    name: (name, friend) => (friend ? `${name} · tu amigo` : name),
    label: (name, friend, score, shown) =>
      `${name}${friend ? ', tu amigo' : ''}, ${esPoints(score, shown)}, ahora detrás de ti`,
  },
  league: {
    title: (league, rank, members) => `${league} · ${rank}/${members}`,
    weekly: (points, shown) => `${esPoints(points, shown)} esta semana`,
  },
  dock: {
    continue: 'Continuar',
    resend: 'Reenviar',
    replay: 'Jugar de nuevo',
    practiceAgain: 'Intentar de nuevo',
    home: 'Volver al inicio',
    share: 'Compartir',
  },
  bonusChip: ({ name, count, points }) =>
    facts(', ', [
      name,
      count === undefined ? null : plural('es', count, { one: '1 vez', other: `${count} veces` }),
      points ? esPoints(points.value, points.shown) : null,
    ]),
  shareGrid: (grid) => `Cuadrícula de resultado: ${grid}`,
};

export const result: Record<Locale, ResultMessages> = { tr, en, de, ar, fr, es };
