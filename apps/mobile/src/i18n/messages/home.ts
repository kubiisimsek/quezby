import type { DailyAttempt, Locale } from '@quezby/types';

import { handle, iso } from '@/i18n/format';
import { dativeOf } from '@/i18n/grammar/tr';
import { plural } from '@/i18n/plural';

/** What today's attempt came to when the lobby's tile has no place to show. */
type AttemptTag = Exclude<DailyAttempt['status'], 'ranked'> | 'unplaced';

/**
 * The lobby, drawn as a lock screen: the status strip, the clock (the season
 * best; its places are `rankChips`), the notifications — today's feed (its
 * name and rule are `t.daily`), the league, the rival, the device warning —
 * the line under the gold slab, and the one reminder to keep the account.
 * `countdown` and `rankChips` are the kit's CountdownChip and RankChips,
 * wherever they stand.
 *
 * A line with a count takes the number twice: as a number for the plural,
 * and written by `t.fmt` for the eye.
 */
const tr = {
  help: 'Yardım',
  /** The eyebrow of the doors that count this week: the league, the rival. */
  thisWeek: 'BU HAFTA',
  device: {
    eyebrow: 'SIRALAMA',
    title: 'Bu cihazda kapalı',
    body: (why: string) => `${why} Oynayabilirsin ama skorların sıralamaya girmez.`,
  },
  today: {
    free: 'Normal oyna',
    placed: (rank: string, _players: number, players: string) => `${rank} / ${players} oyuncu`,
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
    /** Your league and rating: "Altın lig · 2.340 qb". */
    rated: (league: string, elo: string) => `${league} · ${elo}`,
  },
  rival: {
    title: 'Hedefin',
    gap: (name: string, _points: number, points: string) =>
      `${handle(dativeOf(name))} ${points} puan`,
    ahead: (name: string) => `${handle(name)} haftalık sıralamada hemen önünde.`,
    pass: 'Geç onu',
  },
  /** The lobby's clock: the season best, where a lock screen keeps the time. */
  clock: { label: 'SEZON REKORU' },
  /** Under the gold slab, as a lock screen says it. */
  swipe: 'Yukarı kaydır, oyna',
  /** The lobby's notifications: what each says it is, and their small actions. */
  notice: {
    daily: (day: string) => `GÜNÜN AKIŞI #${day}`,
    play: 'Oyna',
    /** The daily's small Oyna, as a screen reader says it. */
    playLabel: 'Günün akışını oyna',
    league: 'LİG',
    rival: 'HEDEFİN · BU HAFTA',
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
  thisWeek: 'THIS WEEK',
  device: {
    eyebrow: 'RANKING',
    title: 'Off on this device',
    body: (why) => `${why} You can still play, but your scores won't rank.`,
  },
  today: {
    free: 'Play Normal',
    placed: (rank, count, players) =>
      plural('en', count, {
        one: `${rank} / ${players} player`,
        other: `${rank} / ${players} players`,
      }),
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
    rated: (league, elo) => `${league} · ${elo}`,
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
  clock: { label: 'SEASON RECORD' },
  swipe: 'Swipe up to play',
  notice: {
    daily: (day) => `DAILY FEED #${day}`,
    play: 'Play',
    playLabel: 'Play the Daily Feed',
    league: 'LEAGUE',
    rival: 'YOUR TARGET · THIS WEEK',
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
  thisWeek: 'DIESE WOCHE',
  device: {
    eyebrow: 'RANGLISTE',
    title: 'Auf diesem Gerät aus',
    body: (why) =>
      `${why} Du kannst spielen, aber deine Scores kommen nicht in die Rangliste.`,
  },
  today: {
    free: 'Normal spielen',
    placed: (rank, _count, players) => `${rank} / ${players} Spieler`,
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
    rated: (league, elo) => `${league} · ${elo}`,
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
  clock: { label: 'SAISONREKORD' },
  swipe: 'Nach oben wischen und spielen',
  notice: {
    daily: (day) => `TAGES-FEED #${day}`,
    play: 'Spielen',
    playLabel: 'Tages-Feed spielen',
    league: 'LIGA',
    rival: 'DEIN ZIEL · DIESE WOCHE',
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
  thisWeek: 'هذا الأسبوع',
  device: {
    eyebrow: 'الترتيب',
    title: 'معطّل على هذا الجهاز',
    body: (why) => `${why} يمكنك اللعب، لكن نتائجك لن تدخل الترتيب.`,
  },
  today: {
    free: 'العب عاديًا',
    placed: (rank, count, players) =>
      plural('ar', count, {
        one: `${iso(rank)} / لاعب واحد`,
        two: `${iso(rank)} / لاعبان`,
        few: `${iso(rank)} / ${players} لاعبين`,
        many: `${iso(rank)} / ${players} لاعبًا`,
        other: `${iso(rank)} / ${players} لاعب`,
      }),
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
    rated: (league, elo) => `${league} · ${elo}`,
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
  clock: { label: 'الرقم القياسي للموسم' },
  swipe: 'اسحب للأعلى والعب',
  notice: {
    daily: (day) => `خلاصة اليوم ${iso(`#${day}`)}`,
    play: 'العب',
    playLabel: 'العب خلاصة اليوم',
    league: 'الدوري',
    rival: 'هدفك · هذا الأسبوع',
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
  thisWeek: 'CETTE SEMAINE',
  device: {
    eyebrow: 'CLASSEMENT',
    title: 'Désactivé ici',
    body: (why) => `${why} Tu peux jouer, mais tes scores ne seront pas classés.`,
  },
  today: {
    free: 'Jouer en normal',
    placed: (rank, count, players) =>
      plural('fr', count, {
        one: `${rank} / ${players} joueur`,
        other: `${rank} / ${players} joueurs`,
      }),
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
    rated: (league, elo) => `${league} · ${elo}`,
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
  clock: { label: 'RECORD DE LA SAISON' },
  swipe: 'Glisse vers le haut pour jouer',
  notice: {
    daily: (day) => `FIL DU JOUR #${day}`,
    play: 'Jouer',
    playLabel: 'Jouer le Fil du jour',
    league: 'LIGUE',
    rival: 'TA CIBLE · CETTE SEMAINE',
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
  thisWeek: 'ESTA SEMANA',
  device: {
    eyebrow: 'CLASIFICACIÓN',
    title: 'Desactivada aquí',
    body: (why) =>
      `${why} Puedes jugar, pero tus puntuaciones no entrarán en la clasificación.`,
  },
  today: {
    free: 'Jugar Normal',
    placed: (rank, count, players) =>
      plural('es', count, {
        one: `${rank} / ${players} jugador`,
        other: `${rank} / ${players} jugadores`,
      }),
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
    rated: (league, elo) => `${league} · ${elo}`,
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
  clock: { label: 'RÉCORD DE LA TEMPORADA' },
  swipe: 'Desliza hacia arriba para jugar',
  notice: {
    daily: (day) => `FEED DEL DÍA #${day}`,
    play: 'Jugar',
    playLabel: 'Jugar el Feed del día',
    league: 'LIGA',
    rival: 'TU OBJETIVO · ESTA SEMANA',
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
