import type { DailyAttempt, Locale } from '@quezby/types';

import { handle, iso } from '@/i18n/format';
import { dativeOf } from '@/i18n/grammar/tr';
import { plural } from '@/i18n/plural';

/** What today's attempt came to when the lobby's tile has no place to show. */
type AttemptTag = Exclude<DailyAttempt['status'], 'ranked'> | 'unplaced';

/**
 * The lobby: the status strip, today's tile (the daily's own name and rule
 * are `t.daily`), the league and rival doors, the records strip, the device
 * warning and the one reminder to keep the account. `countdown` and
 * `rankChips` are the kit's CountdownChip and RankChips, wherever they stand.
 *
 * A line with a count takes the number twice: as a number for the plural,
 * and written by `t.fmt` for the eye.
 */
const tr = {
  help: 'Yardım',
  /** The status strip's mailbox: the Arkadaşlar tab, with what waits there. */
  inbox: 'Mesaj kutusu',
  /** The eyebrow of the doors that count this week: the league, the rival. */
  thisWeek: 'BU HAFTA',
  device: {
    eyebrow: 'SIRALAMA',
    title: 'Bu cihazda kapalı',
    body: (why: string) => `${why} Oynayabilirsin ama skorların sıralamaya girmez.`,
  },
  today: {
    play: 'Günün akışını oyna',
    free: 'Serbest oyna',
    score: 'Bugünkü skorun',
    placed: (rank: string, _players: number, players: string) => `${rank} / ${players} oyuncu`,
    board: 'Sıralamayı gör',
    tags: {
      review: 'Skorun inceleniyor',
      flagged: 'Doğrulanamadı, tabloya girmedi',
      unfinished: 'Sonucun henüz gelmedi',
      void: 'Bugünkü tur sayılmadı',
      unplaced: 'Tabloya girmedi',
    } satisfies Record<AttemptTag, string>,
  },
  league: {
    title: 'Lig',
    locked: 'KİLİTLİ',
    remaining: (games: number) => `Lige ${games} oyun kaldı`,
    opensAfter: (games: number) =>
      `Lig, ilk ${games} oyunundan sonra açılır. Deneme turu sayılmaz.`,
    standing: (rank: string, size: string, _points: number, points: string) =>
      `${rank}/${size} · ${points} puan`,
    join: 'Bu hafta ilk turunu oyna, ligine katıl.',
    promote: 'Terfi bölgesindesin',
    demote: 'Düşme bölgesindesin',
    safe: 'Güvendesin',
    toPromotion: (_points: number, points: string) => `Terfiye ${points} puan`,
  },
  rival: {
    title: 'Hedefin',
    gap: (name: string, _points: number, points: string) =>
      `${handle(dativeOf(name))} ${points} puan`,
    ahead: (name: string) => `${handle(name)} haftalık sıralamada hemen önünde.`,
    pass: 'Geç onu',
  },
  records: {
    title: 'Sezon rekoru',
    boards: { weekly: 'Hafta', monthly: 'Ay', all: 'Tüm zamanlar' },
  },
  protect:
    'Ligdesin! Telefonun değişirse ligin ve skorların kaybolmasın: bir giriş yolu bağla.',
  countdown: {
    /** Before the time left on a board — "Bitmesine 3 g 11 sa". */
    endsIn: 'Bitmesine',
    over: 'Sona erdi',
  },
  rankChips: {
    ranked: (board: string, rank: string) => `${board}: ${rank}`,
    unranked: (board: string) => `${board}: sıralamada değilsin`,
  },
};

export type HomeMessages = typeof tr;

const en: HomeMessages = {
  help: 'Help',
  inbox: 'Inbox',
  thisWeek: 'THIS WEEK',
  device: {
    eyebrow: 'RANKING',
    title: 'Off on this device',
    body: (why) => `${why} You can still play, but your scores won't rank.`,
  },
  today: {
    play: 'Play the Daily Feed',
    free: 'Free play',
    score: 'Your score today',
    placed: (rank, count, players) =>
      plural('en', count, {
        one: `${rank} / ${players} player`,
        other: `${rank} / ${players} players`,
      }),
    board: 'See ranking',
    tags: {
      review: 'Your score is being reviewed',
      flagged: "Couldn't be verified, not on the board",
      unfinished: "Your result hasn't arrived yet",
      void: "Today's run didn't count",
      unplaced: 'Not on the board',
    },
  },
  league: {
    title: 'League',
    locked: 'LOCKED',
    remaining: (games) =>
      plural('en', games, {
        one: `${games} game to the league`,
        other: `${games} games to the league`,
      }),
    opensAfter: (games) =>
      plural('en', games, {
        one: "The league opens after your first game. The practice run doesn't count.",
        other: `The league opens after your first ${games} games. The practice run doesn't count.`,
      }),
    standing: (rank, size, count, points) =>
      plural('en', count, {
        one: `${rank}/${size} · ${points} point`,
        other: `${rank}/${size} · ${points} points`,
      }),
    join: 'Play your first run this week to join your league.',
    promote: 'In the promotion zone',
    demote: 'In the relegation zone',
    safe: "You're safe",
    toPromotion: (count, points) =>
      plural('en', count, {
        one: `${points} point to promotion`,
        other: `${points} points to promotion`,
      }),
  },
  rival: {
    title: 'Your target',
    gap: (name, count, points) =>
      plural('en', count, {
        one: `${points} point to pass ${handle(name)}`,
        other: `${points} points to pass ${handle(name)}`,
      }),
    ahead: (name) => `${handle(name)} is right ahead of you in the weekly ranking.`,
    pass: 'Pass them',
  },
  records: {
    title: 'Season record',
    boards: { weekly: 'Week', monthly: 'Month', all: 'All time' },
  },
  protect:
    "You're in the league! Don't lose your league and scores if you change phones: link a sign-in method.",
  countdown: {
    endsIn: 'Ends in',
    over: 'Ended',
  },
  rankChips: {
    ranked: (board, rank) => `${board}: ${rank}`,
    unranked: (board) => `${board}: you're not ranked`,
  },
};

const de: HomeMessages = {
  help: 'Hilfe',
  inbox: 'Postfach',
  thisWeek: 'DIESE WOCHE',
  device: {
    eyebrow: 'RANGLISTE',
    title: 'Auf diesem Gerät aus',
    body: (why) =>
      `${why} Du kannst spielen, aber deine Scores kommen nicht in die Rangliste.`,
  },
  today: {
    play: 'Tages-Feed spielen',
    free: 'Frei spielen',
    score: 'Dein Score heute',
    placed: (rank, _count, players) => `${rank} / ${players} Spieler`,
    board: 'Zur Rangliste',
    tags: {
      review: 'Dein Score wird geprüft',
      flagged: 'Nicht bestätigt, nicht in der Rangliste',
      unfinished: 'Dein Ergebnis ist noch nicht da',
      void: 'Die heutige Runde zählt nicht',
      unplaced: 'Nicht in der Rangliste',
    },
  },
  league: {
    title: 'Liga',
    locked: 'GESPERRT',
    remaining: (games) =>
      plural('de', games, {
        one: `Noch ${games} Spiel bis zur Liga`,
        other: `Noch ${games} Spiele bis zur Liga`,
      }),
    opensAfter: (games) =>
      plural('de', games, {
        one: 'Die Liga öffnet nach deinem ersten Spiel. Die Proberunde zählt nicht.',
        other: `Die Liga öffnet nach deinen ersten ${games} Spielen. Die Proberunde zählt nicht.`,
      }),
    standing: (rank, size, count, points) =>
      plural('de', count, {
        one: `${rank}/${size} · ${points} Punkt`,
        other: `${rank}/${size} · ${points} Punkte`,
      }),
    join: 'Spiel diese Woche deine erste Runde und steig in deine Liga ein.',
    promote: 'In der Aufstiegszone',
    demote: 'In der Abstiegszone',
    safe: 'Du bist sicher',
    toPromotion: (count, points) =>
      plural('de', count, {
        one: `${points} Punkt bis zum Aufstieg`,
        other: `${points} Punkte bis zum Aufstieg`,
      }),
  },
  rival: {
    title: 'Dein Ziel',
    gap: (name, count, points) =>
      plural('de', count, {
        one: `Noch ${points} Punkt bis ${handle(name)}`,
        other: `Noch ${points} Punkte bis ${handle(name)}`,
      }),
    ahead: (name) => `${handle(name)} liegt in der Wochenrangliste direkt vor dir.`,
    pass: 'Überholen',
  },
  records: {
    title: 'Saisonrekord',
    boards: { weekly: 'Woche', monthly: 'Monat', all: 'Allzeit' },
  },
  protect:
    'Du bist in der Liga! Damit deine Liga und deine Scores bei einem neuen Handy nicht verloren gehen: Verknüpf einen Anmeldeweg.',
  countdown: {
    endsIn: 'Endet in',
    over: 'Beendet',
  },
  rankChips: {
    ranked: (board, rank) => `${board}: ${rank}`,
    unranked: (board) => `${board}: du bist nicht platziert`,
  },
};

const ar: HomeMessages = {
  help: 'المساعدة',
  inbox: 'صندوق الرسائل',
  thisWeek: 'هذا الأسبوع',
  device: {
    eyebrow: 'الترتيب',
    title: 'معطّل على هذا الجهاز',
    body: (why) => `${why} يمكنك اللعب، لكن نتائجك لن تدخل الترتيب.`,
  },
  today: {
    play: 'العب خلاصة اليوم',
    free: 'العب بحرية',
    score: 'نتيجتك اليوم',
    placed: (rank, count, players) =>
      plural('ar', count, {
        one: `${iso(rank)} / لاعب واحد`,
        two: `${iso(rank)} / لاعبان`,
        few: `${iso(rank)} / ${players} لاعبين`,
        many: `${iso(rank)} / ${players} لاعبًا`,
        other: `${iso(rank)} / ${players} لاعب`,
      }),
    board: 'عرض الترتيب',
    tags: {
      review: 'نتيجتك قيد المراجعة',
      flagged: 'تعذّر التحقق، فلم تدخل الترتيب',
      unfinished: 'لم تصل نتيجتك بعد',
      void: 'لم تُحتسب جولة اليوم',
      unplaced: 'لم تدخل الترتيب',
    },
  },
  league: {
    title: 'الدوري',
    locked: 'مقفل',
    remaining: (games) =>
      plural('ar', games, {
        one: 'مباراة واحدة للوصول إلى الدوري',
        two: 'مباراتان للوصول إلى الدوري',
        few: `${games} مباريات للوصول إلى الدوري`,
        other: `${games} مباراة للوصول إلى الدوري`,
      }),
    opensAfter: (games) =>
      plural('ar', games, {
        one: 'يُفتح الدوري بعد مباراتك الأولى. الجولة التجريبية لا تُحتسب.',
        two: 'يُفتح الدوري بعد أول مباراتين لك. الجولة التجريبية لا تُحتسب.',
        few: `يُفتح الدوري بعد أول ${games} مباريات لك. الجولة التجريبية لا تُحتسب.`,
        other: `يُفتح الدوري بعد أول ${games} مباراة لك. الجولة التجريبية لا تُحتسب.`,
      }),
    standing: (rank, size, count, points) =>
      plural('ar', count, {
        one: `${iso(rank)}/${size} · نقطة واحدة`,
        two: `${iso(rank)}/${size} · نقطتان`,
        few: `${iso(rank)}/${size} · ${points} نقاط`,
        other: `${iso(rank)}/${size} · ${points} نقطة`,
      }),
    join: 'العب أول جولة لك هذا الأسبوع لتنضم إلى دوريك.',
    promote: 'في منطقة الصعود',
    demote: 'في منطقة الهبوط',
    safe: 'أنت في أمان',
    toPromotion: (count, points) =>
      plural('ar', count, {
        one: 'نقطة واحدة للصعود',
        two: 'نقطتان للصعود',
        few: `${points} نقاط للصعود`,
        other: `${points} نقطة للصعود`,
      }),
  },
  rival: {
    title: 'هدفك',
    gap: (name, count, points) =>
      plural('ar', count, {
        one: `نقطة واحدة لتجاوز ${iso(handle(name))}`,
        two: `نقطتان لتجاوز ${iso(handle(name))}`,
        few: `${points} نقاط لتجاوز ${iso(handle(name))}`,
        other: `${points} نقطة لتجاوز ${iso(handle(name))}`,
      }),
    ahead: (name) => `يسبقك ${iso(handle(name))} مباشرةً في ترتيب الأسبوع.`,
    pass: 'تجاوزه',
  },
  records: {
    title: 'الرقم القياسي للموسم',
    boards: { weekly: 'الأسبوع', monthly: 'الشهر', all: 'كل الأوقات' },
  },
  protect: 'أنت في الدوري! كي لا تفقد دوريك ونتائجك إذا غيّرت هاتفك: اربط طريقة لتسجيل الدخول.',
  countdown: {
    endsIn: 'ينتهي بعد',
    over: 'انتهى',
  },
  rankChips: {
    ranked: (board, rank) => `${board}: ${iso(rank)}`,
    unranked: (board) => `${board}: لست في الترتيب`,
  },
};

const fr: HomeMessages = {
  help: 'Aide',
  inbox: 'Boîte de réception',
  thisWeek: 'CETTE SEMAINE',
  device: {
    eyebrow: 'CLASSEMENT',
    title: 'Désactivé ici',
    body: (why) => `${why} Tu peux jouer, mais tes scores ne seront pas classés.`,
  },
  today: {
    play: 'Jouer le Fil du jour',
    free: 'Jouer librement',
    score: 'Ton score du jour',
    placed: (rank, count, players) =>
      plural('fr', count, {
        one: `${rank} / ${players} joueur`,
        other: `${rank} / ${players} joueurs`,
      }),
    board: 'Classement',
    tags: {
      review: 'Ton score est en cours de vérification',
      flagged: 'Vérification impossible, hors classement',
      unfinished: "Ton résultat n'est pas encore arrivé",
      void: "La partie du jour n'a pas compté",
      unplaced: 'Hors classement',
    },
  },
  league: {
    title: 'Ligue',
    locked: 'VERROUILLÉ',
    remaining: (games) =>
      plural('fr', games, {
        one: `Encore ${games} partie avant la ligue`,
        other: `Encore ${games} parties avant la ligue`,
      }),
    opensAfter: (games) =>
      plural('fr', games, {
        one: "La ligue s'ouvre après ta première partie. La partie d'essai ne compte pas.",
        other: `La ligue s'ouvre après tes ${games} premières parties. La partie d'essai ne compte pas.`,
      }),
    standing: (rank, size, count, points) =>
      plural('fr', count, {
        one: `${rank}/${size} · ${points} point`,
        other: `${rank}/${size} · ${points} points`,
      }),
    join: 'Joue ta première partie cette semaine pour rejoindre ta ligue.',
    promote: 'En zone de promotion',
    demote: 'En zone de relégation',
    safe: "Tu es à l'abri",
    toPromotion: (count, points) =>
      plural('fr', count, {
        one: `${points} point avant la promotion`,
        other: `${points} points avant la promotion`,
      }),
  },
  rival: {
    title: 'Ta cible',
    gap: (name, count, points) =>
      plural('fr', count, {
        one: `${points} point pour dépasser ${handle(name)}`,
        other: `${points} points pour dépasser ${handle(name)}`,
      }),
    ahead: (name) => `${handle(name)} est juste devant toi au classement de la semaine.`,
    pass: 'Dépasser',
  },
  records: {
    title: 'Record de la saison',
    boards: { weekly: 'Semaine', monthly: 'Mois', all: 'Depuis toujours' },
  },
  protect:
    'Tu es dans la ligue ! Pour ne pas perdre ta ligue et tes scores si tu changes de téléphone : lie un moyen de connexion.',
  countdown: {
    endsIn: 'Fin dans',
    over: 'Terminé',
  },
  rankChips: {
    ranked: (board, rank) => `${board} : ${rank}`,
    unranked: (board) => `${board} : hors classement`,
  },
};

const es: HomeMessages = {
  help: 'Ayuda',
  inbox: 'Buzón',
  thisWeek: 'ESTA SEMANA',
  device: {
    eyebrow: 'CLASIFICACIÓN',
    title: 'Desactivada aquí',
    body: (why) =>
      `${why} Puedes jugar, pero tus puntuaciones no entrarán en la clasificación.`,
  },
  today: {
    play: 'Jugar el Feed del día',
    free: 'Jugar libre',
    score: 'Tu puntuación de hoy',
    placed: (rank, count, players) =>
      plural('es', count, {
        one: `${rank} / ${players} jugador`,
        other: `${rank} / ${players} jugadores`,
      }),
    board: 'Clasificación',
    tags: {
      review: 'Tu puntuación está en revisión',
      flagged: 'Sin verificar, fuera de la clasificación',
      unfinished: 'Tu resultado aún no ha llegado',
      void: 'La partida de hoy no contó',
      unplaced: 'Fuera de la clasificación',
    },
  },
  league: {
    title: 'Liga',
    locked: 'BLOQUEADA',
    remaining: (games) =>
      plural('es', games, {
        one: `Falta ${games} partida para la liga`,
        other: `Faltan ${games} partidas para la liga`,
      }),
    opensAfter: (games) =>
      plural('es', games, {
        one: 'La liga se abre después de tu primera partida. La ronda de práctica no cuenta.',
        other: `La liga se abre después de tus primeras ${games} partidas. La ronda de práctica no cuenta.`,
      }),
    standing: (rank, size, count, points) =>
      plural('es', count, {
        one: `${rank}/${size} · ${points} punto`,
        other: `${rank}/${size} · ${points} puntos`,
      }),
    join: 'Juega tu primera partida esta semana para unirte a tu liga.',
    promote: 'En zona de ascenso',
    demote: 'En zona de descenso',
    safe: 'Estás a salvo',
    toPromotion: (count, points) =>
      plural('es', count, {
        one: `${points} punto para el ascenso`,
        other: `${points} puntos para el ascenso`,
      }),
  },
  rival: {
    title: 'Tu objetivo',
    gap: (name, count, points) =>
      plural('es', count, {
        one: `${points} punto para superar a ${handle(name)}`,
        other: `${points} puntos para superar a ${handle(name)}`,
      }),
    ahead: (name) => `${handle(name)} va justo delante de ti en la clasificación semanal.`,
    pass: 'Superar',
  },
  records: {
    title: 'Récord de la temporada',
    boards: { weekly: 'Semana', monthly: 'Mes', all: 'Histórico' },
  },
  protect:
    '¡Estás en la liga! Para no perder tu liga ni tus puntuaciones si cambias de teléfono, vincula un método de acceso.',
  countdown: {
    endsIn: 'Termina en',
    over: 'Terminado',
  },
  rankChips: {
    ranked: (board, rank) => `${board}: ${rank}`,
    unranked: (board) => `${board}: no estás en la clasificación`,
  },
};

export const home: Record<Locale, HomeMessages> = { tr, en, de, ar, fr, es };
