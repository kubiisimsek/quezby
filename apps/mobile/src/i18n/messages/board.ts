import type { LeaderboardPeriod, LeaderboardScope, Locale } from '@quezby/types';

import { formatsFor, handle, iso, type Formats } from '@/i18n/format';
import { dativeOf } from '@/i18n/grammar/tr';
import { plural } from '@/i18n/plural';

/** Each language's numbers, for the lines that count something. */
const fmt: Record<Locale, Formats> = {
  tr: formatsFor('tr'),
  en: formatsFor('en'),
  de: formatsFor('de'),
  ar: formatsFor('ar'),
  fr: formatsFor('fr'),
  es: formatsFor('es'),
};

/** One row read aloud, on the climb or on the podium. */
type Row = {
  rank: number;
  name: string;
  isMe: boolean;
  score: number;
  /** One more fact, after the score — "3 gün" on a league row. */
  detail?: string;
  /** Points to pass the row above; none when there is nobody to pass. */
  gap?: number | null;
  /** What the numbers are: points, or — on the Elo board — Elo. */
  unit?: 'points' | 'elo';
};

/** A row's facts in order, as a screen reader says them; a fact left out is skipped. */
function listed(facts: Array<string | null | undefined>, comma = ', '): string {
  return facts.filter((fact): fact is string => Boolean(fact)).join(comma);
}

/** English places: 1st, 2nd, 3rd, 4th … 11th, 12th, 13th … 21st. */
function ordinal(rank: number): string {
  const tail = rank % 100;
  const last = rank % 10;
  let suffix = 'th';
  if (tail < 11 || tail > 13) {
    if (last === 1) suffix = 'st';
    else if (last === 2) suffix = 'nd';
    else if (last === 3) suffix = 'rd';
  }
  return `${fmt.en.score(rank)}${suffix}`;
}

/** French places: 1re, 2e, 3e … — "place" is feminine. */
function rang(rank: number): string {
  return rank === 1 ? '1re place' : `${fmt.fr.score(rank)}e place`;
}

/** Points, counted each language's way: "1 point", "1.240 Punkte", "نقطتان". */
const points = {
  en: (n: number) => plural('en', n, { one: '1 point', other: `${fmt.en.score(n)} points` }),
  de: (n: number) => plural('de', n, { one: '1 Punkt', other: `${fmt.de.score(n)} Punkte` }),
  fr: (n: number) =>
    plural('fr', n, {
      one: `${fmt.fr.score(n)} point`,
      many: `${fmt.fr.score(n)} de points`,
      other: `${fmt.fr.score(n)} points`,
    }),
  es: (n: number) =>
    plural('es', n, {
      one: '1 punto',
      many: `${fmt.es.score(n)} de puntos`,
      other: `${fmt.es.score(n)} puntos`,
    }),
  ar: (n: number) =>
    plural('ar', n, {
      one: 'نقطة واحدة',
      two: 'نقطتان',
      few: `${fmt.ar.score(n)} نقاط`,
      many: `${fmt.ar.score(n)} نقطة`,
      other: `${fmt.ar.score(n)} نقطة`,
    }),
};

/**
 * The boards: Zirve and what stands on it — the period and scope switches,
 * the podium, the climb under it — and your floor, pinned over the dock on
 * Zirve and on the league. A name bent by Turkish grammar ("@ekin'e") stays
 * whole in every other language, which builds its sentence round it.
 */
const tr = {
  /** The Zirve screen. */
  summit: {
    title: 'Zirve',
    periods: {
      weekly: 'Hafta',
      monthly: 'Ay',
      all: 'Tüm zamanlar',
    } satisfies Record<LeaderboardPeriod, string>,
    failed: 'Sıralama yüklenemedi',
    retry: 'Tekrar dene',
    emptyTitle: 'Zirve boş',
    emptyHint: 'Bu dönemde henüz kimse oynamadı. İlk sen ol, adın en üstte dursun.',
    play: 'Oyna',
  },
  /** How many are on a board — the stage's subtitle, the daily's pill. */
  players: (count: number) => `${fmt.tr.score(count)} oyuncu`,
  /** Who a board is among. */
  scopes: {
    everyone: 'Herkes',
    friends: 'Arkadaşlar',
  } satisfies Record<LeaderboardScope, string>,
  /** A place read aloud — a medal, a podium block. */
  place: (rank: number) => `${rank}. sıra`,
  /** A podium place nobody holds yet, read aloud. */
  vacant: (rank: number) => `${rank}. sıra boş`,
  /** Beside your own name on the podium and the climb: "@ekin · sen". */
  you: 'sen',
  /** A row read aloud: "4. sıra, @deniz, 9.870 puan, geçmek için 1.240 puan". */
  row: ({ rank, name, isMe, score, detail, gap, unit = 'points' }: Row) =>
    listed([
      `${rank}. sıra`,
      `${handle(name)}${isMe ? ', sen' : ''}`,
      `${fmt.tr.score(score)} ${unit === 'elo' ? 'Elo' : 'puan'}`,
      detail,
      gap == null ? null : `geçmek için ${fmt.tr.gap(gap)} ${unit === 'elo' ? 'Elo' : 'puan'}`,
    ]),
  /** How many posts a run lasted — under a name on the climb, under a season best. */
  posts: (count: number) => `${fmt.tr.score(count)} post`,
  /** The break before your own rows, read aloud. */
  between: 'Arada başka oyuncular var',
  /** "Senin katın": your own floor, pinned over the dock. */
  floor: {
    name: 'Senin katın',
    ribbon: 'SENİN KATIN',
    you: 'Sen',
    youScored: (score: number) => `Sen · ${fmt.tr.score(score)}`,
    unranked: 'Bu dönemde henüz sıran yok.',
    top: 'Zirvedesin! Yerini koru.',
    /** The player right above you and what it takes to pass them: "@ekin'e 1.240 puan". */
    toPass: (name: string, gap: number) => `${handle(dativeOf(name))} ${fmt.tr.gap(gap)} puan`,
    /** The same, when their name is not known. */
    toNext: (gap: number) => `Bir üst sıraya ${fmt.tr.gap(gap)} puan`,
    /** On an Elo board: your rating, and the Elo to pass the player above. */
    youRated: (rating: number) => `Sen · ${fmt.tr.score(rating)} Elo`,
    toPassElo: (name: string, gap: number) => `${handle(dativeOf(name))} ${fmt.tr.gap(gap)} Elo`,
    progress: 'Bir üst sıraya ilerleme',
    pass: 'Geç onu',
    play: 'Oyna',
  },
};

export type BoardMessages = typeof tr;

const en: BoardMessages = {
  summit: {
    title: 'Summit',
    periods: { weekly: 'Week', monthly: 'Month', all: 'All time' },
    failed: "Couldn't load the rankings",
    retry: 'Try again',
    emptyTitle: 'The summit is empty',
    emptyHint: "No one has played in this period yet. Go first and keep your name at the top.",
    play: 'Play',
  },
  players: (count) =>
    plural('en', count, { one: '1 player', other: `${fmt.en.score(count)} players` }),
  scopes: { everyone: 'Everyone', friends: 'Friends' },
  place: (rank) => `${ordinal(rank)} place`,
  vacant: (rank) => `${ordinal(rank)} place, empty`,
  you: 'you',
  row: ({ rank, name, isMe, score, detail, gap, unit = 'points' }) =>
    listed([
      `${ordinal(rank)} place`,
      `${handle(name)}${isMe ? ', you' : ''}`,
      unit === 'elo' ? `${fmt.en.score(score)} Elo` : points.en(score),
      detail,
      gap == null ? null : `${unit === 'elo' ? `${fmt.en.gap(gap)} Elo` : points.en(gap)} to pass`,
    ]),
  posts: (count) => plural('en', count, { one: '1 post', other: `${fmt.en.score(count)} posts` }),
  between: 'More players in between',
  floor: {
    name: 'Your floor',
    ribbon: 'YOUR FLOOR',
    you: 'You',
    youScored: (score) => `You · ${fmt.en.score(score)}`,
    unranked: "You don't have a rank in this period yet.",
    top: "You're on the summit! Hold your spot.",
    toPass: (name, gap) =>
      plural('en', gap, {
        one: `1 pt to ${handle(name)}`,
        other: `${fmt.en.gap(gap)} pts to ${handle(name)}`,
      }),
    toNext: (gap) =>
      plural('en', gap, {
        one: '1 pt to the next rank',
        other: `${fmt.en.gap(gap)} pts to the next rank`,
      }),
    youRated: (rating) => `You · ${fmt.en.score(rating)} Elo`,
    toPassElo: (name, gap) => `${fmt.en.gap(gap)} Elo to ${handle(name)}`,
    progress: 'Progress to the next rank',
    pass: 'Pass them',
    play: 'Play',
  },
};

const de: BoardMessages = {
  summit: {
    title: 'Gipfel',
    periods: { weekly: 'Woche', monthly: 'Monat', all: 'Allzeit' },
    failed: 'Rangliste konnte nicht geladen werden',
    retry: 'Noch mal versuchen',
    emptyTitle: 'Der Gipfel ist leer',
    emptyHint:
      'In diesem Zeitraum hat noch niemand gespielt. Spiel zuerst und setz deinen Namen an die Spitze.',
    play: 'Spielen',
  },
  players: (count) => `${fmt.de.score(count)} Spieler`,
  scopes: { everyone: 'Alle', friends: 'Freunde' },
  place: (rank) => `Platz ${fmt.de.score(rank)}`,
  vacant: (rank) => `Platz ${fmt.de.score(rank)}, frei`,
  you: 'du',
  row: ({ rank, name, isMe, score, detail, gap, unit = 'points' }) =>
    listed([
      `Platz ${fmt.de.score(rank)}`,
      `${handle(name)}${isMe ? ', du' : ''}`,
      unit === 'elo' ? `${fmt.de.score(score)} Elo` : points.de(score),
      detail,
      gap == null ? null : `${unit === 'elo' ? `${fmt.de.gap(gap)} Elo` : points.de(gap)} zum Überholen`,
    ]),
  posts: (count) => plural('de', count, { one: '1 Post', other: `${fmt.de.score(count)} Posts` }),
  between: 'Dazwischen sind weitere Spieler',
  floor: {
    name: 'Deine Etage',
    ribbon: 'DEINE ETAGE',
    you: 'Du',
    youScored: (score) => `Du · ${fmt.de.score(score)}`,
    unranked: 'Du hast in diesem Zeitraum noch keinen Platz.',
    top: 'Du stehst auf dem Gipfel! Verteidige deinen Platz.',
    toPass: (name, gap) => `Noch ${points.de(gap)} bis ${handle(name)}`,
    toNext: (gap) => `Noch ${points.de(gap)} bis zum nächsten Platz`,
    youRated: (rating) => `Du · ${fmt.de.score(rating)} Elo`,
    toPassElo: (name, gap) => `Noch ${fmt.de.gap(gap)} Elo bis ${handle(name)}`,
    progress: 'Fortschritt bis zum nächsten Platz',
    pass: 'Überholen',
    play: 'Spielen',
  },
};

const ar: BoardMessages = {
  summit: {
    title: 'القمة',
    periods: { weekly: 'الأسبوع', monthly: 'الشهر', all: 'كل الأوقات' },
    failed: 'تعذّر تحميل الترتيب',
    retry: 'حاول مجددًا',
    emptyTitle: 'القمة خالية',
    emptyHint: 'لم يلعب أحد في هذه الفترة بعد. كن الأول ليبقى اسمك في القمة.',
    play: 'العب',
  },
  players: (count) =>
    plural('ar', count, {
      one: 'لاعب واحد',
      two: 'لاعبان',
      few: `${fmt.ar.score(count)} لاعبين`,
      many: `${fmt.ar.score(count)} لاعبًا`,
      other: `${fmt.ar.score(count)} لاعب`,
    }),
  scopes: { everyone: 'الجميع', friends: 'الأصدقاء' },
  place: (rank) => `المركز ${fmt.ar.score(rank)}`,
  vacant: (rank) => `المركز ${fmt.ar.score(rank)} شاغر`,
  you: 'أنت',
  row: ({ rank, name, isMe, score, detail, gap, unit = 'points' }) =>
    listed(
      [
        `المركز ${fmt.ar.score(rank)}`,
        `${iso(handle(name))}${isMe ? '، أنت' : ''}`,
        unit === 'elo' ? `${fmt.ar.score(score)} إيلو` : points.ar(score),
        detail,
        gap == null ? null : `${unit === 'elo' ? `${fmt.ar.gap(gap)} إيلو` : points.ar(gap)} للتجاوز`,
      ],
      '، ',
    ),
  posts: (count) =>
    plural('ar', count, {
      one: 'منشور واحد',
      two: 'منشوران',
      few: `${fmt.ar.score(count)} منشورات`,
      many: `${fmt.ar.score(count)} منشورًا`,
      other: `${fmt.ar.score(count)} منشور`,
    }),
  between: 'يوجد لاعبون آخرون في الوسط',
  floor: {
    name: 'طابقك',
    ribbon: 'طابقك',
    you: 'أنت',
    youScored: (score) => `أنت · ${fmt.ar.score(score)}`,
    unranked: 'ليس لك ترتيب في هذه الفترة بعد.',
    top: 'أنت في القمة! حافظ على مكانك.',
    toPass: (name, gap) => `تفصلك ${points.ar(gap)} عن ${iso(handle(name))}`,
    toNext: (gap) => `تفصلك ${points.ar(gap)} عن المركز التالي`,
    youRated: (rating) => `أنت · ${fmt.ar.score(rating)} إيلو`,
    toPassElo: (name, gap) => `تفصلك ${fmt.ar.gap(gap)} إيلو عن ${iso(handle(name))}`,
    progress: 'التقدّم نحو المركز التالي',
    pass: 'تجاوزه',
    play: 'العب',
  },
};

const fr: BoardMessages = {
  summit: {
    title: 'Sommet',
    periods: { weekly: 'Semaine', monthly: 'Mois', all: 'Depuis toujours' },
    failed: 'Impossible de charger le classement',
    retry: 'Réessayer',
    emptyTitle: 'Le sommet est vide',
    emptyHint:
      "Personne n'a encore joué sur cette période. Lance-toi en premier et mets ton nom tout en haut.",
    play: 'Jouer',
  },
  players: (count) =>
    plural('fr', count, {
      one: `${fmt.fr.score(count)} joueur`,
      many: `${fmt.fr.score(count)} de joueurs`,
      other: `${fmt.fr.score(count)} joueurs`,
    }),
  scopes: { everyone: 'Tous', friends: 'Amis' },
  place: rang,
  vacant: (rank) => `${rang(rank)}, libre`,
  you: 'toi',
  row: ({ rank, name, isMe, score, detail, gap, unit = 'points' }) =>
    listed([
      rang(rank),
      `${handle(name)}${isMe ? ', toi' : ''}`,
      unit === 'elo' ? `${fmt.fr.score(score)}\u00A0Elo` : points.fr(score),
      detail,
      gap == null ? null : `${unit === 'elo' ? `${fmt.fr.gap(gap)}\u00A0Elo` : points.fr(gap)} pour dépasser`,
    ]),
  posts: (count) =>
    plural('fr', count, {
      one: `${fmt.fr.score(count)} post`,
      other: `${fmt.fr.score(count)} posts`,
    }),
  between: "D'autres joueurs entre les deux",
  floor: {
    name: 'Ton étage',
    ribbon: 'TON ÉTAGE',
    you: 'Toi',
    youScored: (score) => `Toi · ${fmt.fr.score(score)}`,
    unranked: "Tu n'as pas encore de rang sur cette période.",
    top: 'Tu es au sommet ! Garde ta place.',
    toPass: (name, gap) =>
      plural('fr', gap, {
        one: `À ${fmt.fr.gap(gap)} pt de ${handle(name)}`,
        other: `À ${fmt.fr.gap(gap)} pts de ${handle(name)}`,
      }),
    toNext: (gap) =>
      plural('fr', gap, {
        one: `À ${fmt.fr.gap(gap)} pt du rang suivant`,
        other: `À ${fmt.fr.gap(gap)} pts du rang suivant`,
      }),
    youRated: (rating) => `Toi · ${fmt.fr.score(rating)} Elo`,
    toPassElo: (name, gap) => `À ${fmt.fr.gap(gap)} Elo de ${handle(name)}`,
    progress: 'Progression vers le rang suivant',
    pass: 'Dépasser',
    play: 'Jouer',
  },
};

const es: BoardMessages = {
  summit: {
    title: 'Cumbre',
    periods: { weekly: 'Semana', monthly: 'Mes', all: 'Histórico' },
    failed: 'No se pudo cargar la clasificación',
    retry: 'Reintentar',
    emptyTitle: 'La cumbre está vacía',
    emptyHint: 'Nadie ha jugado aún en este periodo. Adelántate y pon tu nombre en lo más alto.',
    play: 'Jugar',
  },
  players: (count) =>
    plural('es', count, {
      one: '1 jugador',
      many: `${fmt.es.score(count)} de jugadores`,
      other: `${fmt.es.score(count)} jugadores`,
    }),
  scopes: { everyone: 'Todos', friends: 'Amigos' },
  place: (rank) => `Puesto ${fmt.es.score(rank)}`,
  vacant: (rank) => `Puesto ${fmt.es.score(rank)}, libre`,
  you: 'tú',
  row: ({ rank, name, isMe, score, detail, gap, unit = 'points' }) =>
    listed([
      `Puesto ${fmt.es.score(rank)}`,
      `${handle(name)}${isMe ? ', tú' : ''}`,
      unit === 'elo' ? `${fmt.es.score(score)} Elo` : points.es(score),
      detail,
      gap == null ? null : `${unit === 'elo' ? `${fmt.es.gap(gap)} Elo` : points.es(gap)} para superar`,
    ]),
  posts: (count) => plural('es', count, { one: '1 post', other: `${fmt.es.score(count)} posts` }),
  between: 'Hay más jugadores en medio',
  floor: {
    name: 'Tu piso',
    ribbon: 'TU PISO',
    you: 'Tú',
    youScored: (score) => `Tú · ${fmt.es.score(score)}`,
    unranked: 'Aún no tienes puesto en este periodo.',
    top: '¡Estás en la cumbre! Defiende tu puesto.',
    toPass: (name, gap) => `A ${points.es(gap)} de ${handle(name)}`,
    toNext: (gap) => `A ${points.es(gap)} del siguiente puesto`,
    youRated: (rating) => `Tú · ${fmt.es.score(rating)} Elo`,
    toPassElo: (name, gap) => `A ${fmt.es.gap(gap)} Elo de ${handle(name)}`,
    progress: 'Progreso hacia el siguiente puesto',
    pass: 'Superar',
    play: 'Jugar',
  },
};

export const board: Record<Locale, BoardMessages> = { tr, en, de, ar, fr, es };
