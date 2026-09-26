import type { Locale } from '@quezby/types';

import { iso } from '@/i18n/format';

/**
 * Günün akışı — one feed for everyone today, one attempt each. Its name,
 * ribbon and rule wherever it stands (the lobby's tile reads them too), then
 * the daily screen: the stage with today's number, what became of the
 * attempt, and today's summit under it.
 */
const tr = {
  name: 'Günün akışı',
  ribbon: 'GÜNÜN AKIŞI',
  /** The name with today's number: "Günün akışı #17". */
  numbered: (day: string) => `Günün akışı #${day}`,
  rule: 'Herkes aynı akışı oynar · tek hak',
  /** Before the time to the next feed — "Yeni akışa 11 sa 0 dk". */
  nextIn: 'Yeni akışa',
  share: 'Paylaş',
  loadFailed: 'Günün akışı yüklenemedi',
  stage: {
    label: 'AKIŞ',
    day: (day: string) => `#${day}`,
    waiting: 'Bugünün akışı seni bekliyor',
  },
  attempt: {
    unfinished: {
      title: 'Turun yarıda kaldı',
      body: 'Bugünkü hakkını başlattın ama tur bitmedi. Sonuç sunucuya ulaşırsa burada görünür.',
    },
    review: {
      title: 'Skorun inceleniyor',
      body: 'Bu skor sıralamaya girmeden önce bir göz atıyoruz. Onaylanınca burada görünür.',
    },
    flagged: {
      title: 'Skorun sıralamaya girmedi',
      body: 'Tur doğrulanamadı, bu yüzden bugünün sıralamasına yazılmadı. Yarın yeni akış seni bekliyor.',
    },
    void: {
      title: 'Tur sayılmadı',
      body: 'Tur yarıda kaldı ya da süresi doldu, bu yüzden sıralamaya girmedi. Yarın yeni akış seni bekliyor.',
    },
  },
  /** The ranked attempt's two labels, and what a screen reader says for them. */
  ranked: {
    score: 'SKORUN',
    scoreA11y: 'Skorun',
    rank: 'SIRAN',
    rankA11y: 'Sıran',
  },
  summit: {
    ribbon: 'GÜNÜN ZİRVESİ',
    loadFailed: 'Sıralama yüklenemedi',
    emptyTitle: 'Günün zirvesi boş',
    emptyHint: 'İlk skorlar geldikçe zirve burada şekillenir.',
  },
};

export type DailyMessages = typeof tr;

const en: DailyMessages = {
  name: 'Daily Feed',
  ribbon: 'DAILY FEED',
  numbered: (day) => `Daily Feed #${day}`,
  rule: 'Everyone plays the same feed · one shot',
  nextIn: 'Next feed in',
  share: 'Share',
  loadFailed: "Couldn't load the Daily Feed",
  stage: {
    label: 'FEED',
    day: (day) => `#${day}`,
    waiting: "Today's feed is waiting for you",
  },
  attempt: {
    unfinished: {
      title: 'Your run was cut short',
      body: "You started today's attempt, but the run didn't finish. If the result reaches the server, it'll show up here.",
    },
    review: {
      title: 'Your score is being reviewed',
      body: "We're taking a look at this score before it goes on the ranking. Once it's approved, it'll show up here.",
    },
    flagged: {
      title: "Your score didn't rank",
      body: "The run couldn't be verified, so it wasn't added to today's ranking. A new feed is waiting for you tomorrow.",
    },
    void: {
      title: "The run didn't count",
      body: "The run was cut short or ran out of time, so it didn't rank. A new feed is waiting for you tomorrow.",
    },
  },
  ranked: {
    score: 'YOUR SCORE',
    scoreA11y: 'Your score',
    rank: 'YOUR RANK',
    rankA11y: 'Your rank',
  },
  summit: {
    ribbon: "TODAY'S SUMMIT",
    loadFailed: "Couldn't load the ranking",
    emptyTitle: "Today's summit is empty",
    emptyHint: 'The summit takes shape here as the first scores come in.',
  },
};

const de: DailyMessages = {
  name: 'Tages-Feed',
  ribbon: 'TAGES-FEED',
  numbered: (day) => `Tages-Feed #${day}`,
  rule: 'Alle spielen denselben Feed · ein Versuch',
  nextIn: 'Nächster Feed in',
  share: 'Teilen',
  loadFailed: 'Tages-Feed konnte nicht geladen werden',
  stage: {
    label: 'FEED',
    day: (day) => `#${day}`,
    waiting: 'Der heutige Feed wartet auf dich',
  },
  attempt: {
    unfinished: {
      title: 'Deine Runde wurde abgebrochen',
      body: 'Du hast deinen heutigen Versuch gestartet, aber die Runde wurde nicht beendet. Erreicht das Ergebnis den Server, erscheint es hier.',
    },
    review: {
      title: 'Dein Score wird geprüft',
      body: 'Wir sehen uns diesen Score an, bevor er in die Rangliste kommt. Sobald er bestätigt ist, erscheint er hier.',
    },
    flagged: {
      title: 'Dein Score kam nicht in die Rangliste',
      body: 'Die Runde konnte nicht geprüft werden und steht deshalb nicht in der heutigen Rangliste. Morgen wartet ein neuer Feed auf dich.',
    },
    void: {
      title: 'Runde nicht gewertet',
      body: 'Die Runde wurde abgebrochen oder ist abgelaufen und kam deshalb nicht in die Rangliste. Morgen wartet ein neuer Feed auf dich.',
    },
  },
  ranked: {
    score: 'DEIN SCORE',
    scoreA11y: 'Dein Score',
    rank: 'DEIN PLATZ',
    rankA11y: 'Dein Platz',
  },
  summit: {
    ribbon: 'GIPFEL DES TAGES',
    loadFailed: 'Rangliste konnte nicht geladen werden',
    emptyTitle: 'Der Gipfel des Tages ist leer',
    emptyHint: 'Sobald die ersten Scores eintreffen, nimmt der Gipfel hier Gestalt an.',
  },
};

const ar: DailyMessages = {
  name: 'خلاصة اليوم',
  ribbon: 'خلاصة اليوم',
  numbered: (day) => `خلاصة اليوم ${iso(`#${day}`)}`,
  rule: 'الجميع يلعبون الخلاصة نفسها · محاولة واحدة',
  nextIn: 'الخلاصة التالية بعد',
  share: 'شارِك',
  loadFailed: 'تعذّر تحميل خلاصة اليوم',
  stage: {
    label: 'الخلاصة',
    day: (day) => iso(`#${day}`),
    waiting: 'خلاصة اليوم بانتظارك',
  },
  attempt: {
    unfinished: {
      title: 'توقفت جولتك في منتصفها',
      body: 'بدأت محاولتك لهذا اليوم لكن الجولة لم تكتمل. إذا وصلت النتيجة إلى الخادم فستظهر هنا.',
    },
    review: {
      title: 'نتيجتك قيد المراجعة',
      body: 'نلقي نظرة على هذه النتيجة قبل أن تدخل الترتيب، وستظهر هنا بعد اعتمادها.',
    },
    flagged: {
      title: 'لم تدخل نتيجتك الترتيب',
      body: 'تعذّر التحقق من الجولة، لذلك لم تُسجَّل في ترتيب اليوم. خلاصة جديدة بانتظارك غدًا.',
    },
    void: {
      title: 'لم تُحتسب الجولة',
      body: 'توقفت الجولة في منتصفها أو انتهت مهلتها، لذلك لم تدخل الترتيب. خلاصة جديدة بانتظارك غدًا.',
    },
  },
  ranked: {
    score: 'نتيجتك',
    scoreA11y: 'نتيجتك',
    rank: 'ترتيبك',
    rankA11y: 'ترتيبك',
  },
  summit: {
    ribbon: 'قمة اليوم',
    loadFailed: 'تعذّر تحميل الترتيب',
    emptyTitle: 'قمة اليوم فارغة',
    emptyHint: 'ستتشكّل القمة هنا مع وصول النتائج الأولى.',
  },
};

const fr: DailyMessages = {
  name: 'Fil du jour',
  ribbon: 'FIL DU JOUR',
  numbered: (day) => `Fil du jour #${day}`,
  rule: 'Tout le monde joue le même fil · un seul essai',
  nextIn: 'Prochain fil dans',
  share: 'Partager',
  loadFailed: 'Impossible de charger le Fil du jour',
  stage: {
    label: 'FIL',
    day: (day) => `#${day}`,
    waiting: "Le Fil du jour t'attend",
  },
  attempt: {
    unfinished: {
      title: "Ta partie s'est arrêtée en route",
      body: "Tu as lancé ton essai du jour, mais la partie ne s'est pas terminée. Si le résultat parvient au serveur, il s'affichera ici.",
    },
    review: {
      title: 'Ton score est en cours de vérification',
      body: "On jette un œil à ce score avant qu'il entre au classement. Une fois validé, il s'affichera ici.",
    },
    flagged: {
      title: "Ton score n'est pas classé",
      body: "La partie n'a pas pu être vérifiée, elle n'a donc pas été ajoutée au classement du jour. Un nouveau fil t'attend demain.",
    },
    void: {
      title: 'Partie non comptée',
      body: "La partie s'est interrompue ou a expiré, elle n'est donc pas classée. Un nouveau fil t'attend demain.",
    },
  },
  ranked: {
    score: 'TON SCORE',
    scoreA11y: 'Ton score',
    rank: 'TA PLACE',
    rankA11y: 'Ta place',
  },
  summit: {
    ribbon: 'SOMMET DU JOUR',
    loadFailed: 'Impossible de charger le classement',
    emptyTitle: 'Le sommet du jour est vide',
    emptyHint: 'Le sommet prendra forme ici dès les premiers scores.',
  },
};

const es: DailyMessages = {
  name: 'Feed del día',
  ribbon: 'FEED DEL DÍA',
  numbered: (day) => `Feed del día #${day}`,
  rule: 'Todos juegan el mismo feed · un solo intento',
  nextIn: 'Próximo feed en',
  share: 'Compartir',
  loadFailed: 'No se pudo cargar el Feed del día',
  stage: {
    label: 'FEED',
    day: (day) => `#${day}`,
    waiting: 'El Feed del día te espera',
  },
  attempt: {
    unfinished: {
      title: 'Tu partida quedó a medias',
      body: 'Empezaste tu intento de hoy, pero la partida no terminó. Si el resultado llega al servidor, aparecerá aquí.',
    },
    review: {
      title: 'Tu puntuación está en revisión',
      body: 'Estamos revisando esta puntuación antes de que entre en la clasificación. Cuando se apruebe, aparecerá aquí.',
    },
    flagged: {
      title: 'Tu puntuación no entró en la clasificación',
      body: 'No se pudo verificar la partida, así que no entró en la clasificación de hoy. Mañana te espera un feed nuevo.',
    },
    void: {
      title: 'La partida no contó',
      body: 'La partida quedó a medias o caducó, así que no entró en la clasificación. Mañana te espera un feed nuevo.',
    },
  },
  ranked: {
    score: 'TU PUNTUACIÓN',
    scoreA11y: 'Tu puntuación',
    rank: 'TU PUESTO',
    rankA11y: 'Tu puesto',
  },
  summit: {
    ribbon: 'CUMBRE DEL DÍA',
    loadFailed: 'No se pudo cargar la clasificación',
    emptyTitle: 'La cumbre del día está vacía',
    emptyHint: 'La cumbre tomará forma aquí con las primeras puntuaciones.',
  },
};

export const daily: Record<Locale, DailyMessages> = { tr, en, de, ar, fr, es };
