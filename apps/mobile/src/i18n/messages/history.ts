import type { Locale } from '@quezby/types';

import { formatsFor, type Formats } from '@/i18n/format';
import { plural } from '@/i18n/plural';

const fmt: Record<Locale, Formats> = {
  tr: formatsFor('tr'),
  en: formatsFor('en'),
  de: formatsFor('de'),
  ar: formatsFor('ar'),
  fr: formatsFor('fr'),
  es: formatsFor('es'),
};

/**
 * Geçmiş oyunlar: every run the player finished, as the server counted it —
 * the list, its day headings and tags, one run's sheet, and the profile's door
 * to it. A daily run's title is `t.daily.numbered`.
 */
const tr = {
  title: 'Geçmiş oyunlar',
  tagline: 'Oynadığın her tur, sunucunun saydığı haliyle',
  filters: { all: 'Hepsi', daily: 'Günün akışı', rated: 'Dereceli', vs: 'VS' },
  today: 'Bugün',
  yesterday: 'Dün',
  kinds: {
    free: 'Normal oyun',
    rated: 'Dereceli oyun',
    vs: (name: string) => `VS · ${name}`,
    vsGone: 'VS · silinmiş oyuncu',
  },
  /** Under a run's title: its posts, how long it was played, the time it ended. */
  meta: (posts: number, time: string, at: string) => `${fmt.tr.score(posts)} post · ${time} · ${at}`,
  tags: {
    best: 'REKOR',
    review: 'İncelemede',
    flagged: 'Sayılmadı',
    won: 'Kazandın',
    lost: 'Kaybettin',
    draw: 'Berabere',
    waiting: 'Sıra onda',
    yourTurn: 'Sıra sende',
    expired: 'Süresi doldu',
    declined: 'Reddedildi',
    cancelled: 'Kapandı',
    void: 'Geçersiz',
  },
  emptyTitle: 'Henüz bitirdiğin bir oyun yok',
  emptyHint: 'Oynadığın her tur burada, sunucunun saydığı haliyle durur.',
  play: 'Oyna',
  failed: 'Geçmiş yüklenemedi',
  retry: 'Tekrar dene',
  /** A run read aloud. */
  row: (title: string, score: string, when: string) => `${title}, ${score} puan, ${when}`,
  sheet: {
    failed: 'Tur yüklenemedi',
    review: 'Skorun inceleniyor; bir moderatör bakınca sıralamaya girer.',
    flagged: 'Bu tur sıralamaya sayılmadı.',
    played: 'VS turuydu; yalnızca VS’e sayıldı.',
    at: (date: string, time: string) => `${date} · ${time}`,
  },
  /** The profile's door to the list. */
  door: { eyebrow: 'GEÇMİŞ OYUNLAR', title: 'Oynadığın her tur' },
};

export type HistoryMessages = typeof tr;

const en: HistoryMessages = {
  title: 'Past games',
  tagline: 'Every run you played, as the server counted it',
  filters: { all: 'All', daily: 'Daily Feed', rated: 'Ranked', vs: 'VS' },
  today: 'Today',
  yesterday: 'Yesterday',
  kinds: {
    free: 'Normal game',
    rated: 'Ranked game',
    vs: (name) => `VS · ${name}`,
    vsGone: 'VS · deleted player',
  },
  meta: (posts, time, at) =>
    `${plural('en', posts, { one: '1 post', other: `${fmt.en.score(posts)} posts` })} · ${time} · ${at}`,
  tags: {
    best: 'RECORD',
    review: 'Under review',
    flagged: "Didn't count",
    won: 'You won',
    lost: 'You lost',
    draw: 'Draw',
    waiting: 'Their turn',
    yourTurn: 'Your turn',
    expired: 'Ran out',
    declined: 'Declined',
    cancelled: 'Closed',
    void: 'Invalid',
  },
  emptyTitle: "You haven't finished a game yet",
  emptyHint: 'Every run you play shows up here, as the server counted it.',
  play: 'Play',
  failed: "Couldn't load your games",
  retry: 'Try again',
  row: (title, score, when) => `${title}, ${score} points, ${when}`,
  sheet: {
    failed: "Couldn't load this run",
    review: 'Your score is under review; it ranks once a moderator has looked.',
    flagged: "This run didn't count on the boards.",
    played: 'A VS run: it only counted for the VS.',
    at: (date, time) => `${date} · ${time}`,
  },
  door: { eyebrow: 'PAST GAMES', title: 'Every run you played' },
};

const de: HistoryMessages = {
  title: 'Vergangene Spiele',
  tagline: 'Jede Runde, wie der Server sie gezählt hat',
  filters: { all: 'Alle', daily: 'Tages-Feed', rated: 'Gewertet', vs: 'VS' },
  today: 'Heute',
  yesterday: 'Gestern',
  kinds: {
    free: 'Normales Spiel',
    rated: 'Gewertetes Spiel',
    vs: (name) => `VS · ${name}`,
    vsGone: 'VS · gelöschter Spieler',
  },
  meta: (posts, time, at) =>
    `${plural('de', posts, { one: '1 Post', other: `${fmt.de.score(posts)} Posts` })} · ${time} · ${at}`,
  tags: {
    best: 'REKORD',
    review: 'In Prüfung',
    flagged: 'Nicht gewertet',
    won: 'Gewonnen',
    lost: 'Verloren',
    draw: 'Unentschieden',
    waiting: 'Er ist dran',
    yourTurn: 'Du bist dran',
    expired: 'Abgelaufen',
    declined: 'Abgelehnt',
    cancelled: 'Geschlossen',
    void: 'Ungültig',
  },
  emptyTitle: 'Du hast noch kein Spiel beendet',
  emptyHint: 'Jede Runde, die du spielst, steht hier – so, wie der Server sie gezählt hat.',
  play: 'Spielen',
  failed: 'Deine Spiele konnten nicht geladen werden',
  retry: 'Nochmal versuchen',
  row: (title, score, when) => `${title}, ${score} Punkte, ${when}`,
  sheet: {
    failed: 'Runde konnte nicht geladen werden',
    review: 'Deine Punkte werden geprüft; sie kommen in die Rangliste, sobald ein Moderator sie angesehen hat.',
    flagged: 'Diese Runde wurde nicht gewertet.',
    played: 'Eine VS-Runde: Sie zählte nur für das VS.',
    at: (date, time) => `${date} · ${time}`,
  },
  door: { eyebrow: 'VERGANGENE SPIELE', title: 'Alle deine Runden' },
};

const ar: HistoryMessages = {
  title: 'الألعاب السابقة',
  tagline: 'كل جولة لعبتها، كما احتسبها الخادم',
  filters: { all: 'الكل', daily: 'خلاصة اليوم', rated: 'مصنَّف', vs: 'التحديات' },
  today: 'اليوم',
  yesterday: 'أمس',
  kinds: {
    free: 'مباراة عادية',
    rated: 'مباراة مصنَّفة',
    vs: (name) => `تحدٍّ · ${name}`,
    vsGone: 'تحدٍّ · لاعب محذوف',
  },
  meta: (posts, time, at) =>
    `${plural('ar', posts, {
      zero: 'لا منشورات',
      one: 'منشور واحد',
      two: 'منشوران',
      few: `${fmt.ar.score(posts)} منشورات`,
      many: `${fmt.ar.score(posts)} منشورًا`,
      other: `${fmt.ar.score(posts)} منشور`,
    })} · ${time} · ${at}`,
  tags: {
    best: 'رقم قياسي',
    review: 'قيد المراجعة',
    flagged: 'لم تُحتسب',
    won: 'فزت',
    lost: 'خسرت',
    draw: 'تعادل',
    waiting: 'دوره',
    yourTurn: 'دورك',
    expired: 'انتهت المهلة',
    declined: 'مرفوض',
    cancelled: 'مغلق',
    void: 'غير صالحة',
  },
  emptyTitle: 'لم تُنهِ أي لعبة بعد',
  emptyHint: 'كل جولة تلعبها تظهر هنا كما احتسبها الخادم.',
  play: 'العب',
  failed: 'تعذّر تحميل ألعابك',
  retry: 'أعد المحاولة',
  row: (title, score, when) => `${title}، ${score} نقطة، ${when}`,
  sheet: {
    failed: 'تعذّر تحميل الجولة',
    review: 'نتيجتك قيد المراجعة؛ تدخل الترتيب بعد أن ينظر فيها مشرف.',
    flagged: 'لم تُحتسب هذه الجولة في الترتيب.',
    played: 'جولة تحدٍّ: احتُسبت للتحدي فقط.',
    at: (date, time) => `${date} · ${time}`,
  },
  door: { eyebrow: 'الألعاب السابقة', title: 'كل جولة لعبتها' },
};

const fr: HistoryMessages = {
  title: 'Parties passées',
  tagline: 'Chaque partie jouée, comptée par le serveur',
  filters: { all: 'Toutes', daily: 'Fil du jour', rated: 'Classé', vs: 'VS' },
  today: 'Aujourd’hui',
  yesterday: 'Hier',
  kinds: {
    free: 'Partie normale',
    rated: 'Partie classée',
    vs: (name) => `VS · ${name}`,
    vsGone: 'VS · joueur supprimé',
  },
  meta: (posts, time, at) =>
    `${plural('fr', posts, { one: `${fmt.fr.score(posts)} post`, other: `${fmt.fr.score(posts)} posts` })} · ${time} · ${at}`,
  tags: {
    best: 'RECORD',
    review: 'En examen',
    flagged: 'Non comptée',
    won: 'Gagné',
    lost: 'Perdu',
    draw: 'Nul',
    waiting: 'À lui',
    yourTurn: 'À toi',
    expired: 'Expiré',
    declined: 'Refusé',
    cancelled: 'Fermé',
    void: 'Invalide',
  },
  emptyTitle: 'Tu n’as encore fini aucune partie',
  emptyHint: 'Chaque partie que tu joues apparaît ici, telle que le serveur l’a comptée.',
  play: 'Jouer',
  failed: 'Impossible de charger tes parties',
  retry: 'Réessayer',
  row: (title, score, when) => `${title}, ${score} points, ${when}`,
  sheet: {
    failed: 'Impossible de charger cette partie',
    review: 'Ton score est en cours d’examen ; il entre au classement dès qu’un modérateur l’a vu.',
    flagged: 'Cette partie n’a pas compté au classement.',
    played: 'Une partie de VS : elle n’a compté que pour le VS.',
    at: (date, time) => `${date} · ${time}`,
  },
  door: { eyebrow: 'PARTIES PASSÉES', title: 'Toutes tes parties' },
};

const es: HistoryMessages = {
  title: 'Partidas anteriores',
  tagline: 'Cada partida, tal como la contó el servidor',
  filters: { all: 'Todas', daily: 'Feed del día', rated: 'Competitivo', vs: 'VS' },
  today: 'Hoy',
  yesterday: 'Ayer',
  kinds: {
    free: 'Partida normal',
    rated: 'Partida competitiva',
    vs: (name) => `VS · ${name}`,
    vsGone: 'VS · jugador eliminado',
  },
  meta: (posts, time, at) =>
    `${plural('es', posts, { one: '1 post', other: `${fmt.es.score(posts)} posts` })} · ${time} · ${at}`,
  tags: {
    best: 'RÉCORD',
    review: 'En revisión',
    flagged: 'No contó',
    won: 'Ganaste',
    lost: 'Perdiste',
    draw: 'Empate',
    waiting: 'Su turno',
    yourTurn: 'Tu turno',
    expired: 'Caducó',
    declined: 'Rechazado',
    cancelled: 'Cerrado',
    void: 'No válida',
  },
  emptyTitle: 'Aún no has terminado ninguna partida',
  emptyHint: 'Cada partida que juegas aparece aquí, tal como la contó el servidor.',
  play: 'Jugar',
  failed: 'No se pudieron cargar tus partidas',
  retry: 'Reintentar',
  row: (title, score, when) => `${title}, ${score} puntos, ${when}`,
  sheet: {
    failed: 'No se pudo cargar la partida',
    review: 'Tu puntuación está en revisión; entrará en la clasificación cuando la vea un moderador.',
    flagged: 'Esta partida no contó en la clasificación.',
    played: 'Una partida de VS: solo contó para el VS.',
    at: (date, time) => `${date} · ${time}`,
  },
  door: { eyebrow: 'PARTIDAS ANTERIORES', title: 'Todas tus partidas' },
};

export const history: Record<Locale, HistoryMessages> = { tr, en, de, ar, fr, es };
