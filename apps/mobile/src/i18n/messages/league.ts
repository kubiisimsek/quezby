import type { Locale } from '@quezby/types';

/**
 * The league screen: the league a player's rating puts them in (its words
 * are `rating`'s), and under it that league's players by qb — a ranking that
 * never resets. Before placement, and for a player who has not played rated
 * lately, what it takes to be on it. Tier names are `tiers`'s.
 */
const tr = {
  ribbon: 'LİG',
  /** Over the league's ranking. */
  board: 'LİG SIRALAMASI',
  failed: 'Lig sıralaması yüklenemedi',
  retry: 'Tekrar dene',
  /** Before placement: Dereceli still shut, or its first games still to play. */
  closed: {
    title: 'Lig sıralaması Dereceli oyuncularının',
    hint: 'Yerleşme oyunlarını bitirince ligindeki sıralamaya girersin.',
  },
  /** Placed, but no rated game lately. */
  idle: {
    title: 'Son 14 günde dereceli oynamadın',
    hint: 'Bir dereceli oyun seni ligindeki sıralamaya geri koyar.',
    action: 'Dereceli oyna',
  },
};

export type LeagueMessages = typeof tr;

const en: LeagueMessages = {
  ribbon: 'LEAGUE',
  board: 'LEAGUE RANKING',
  failed: "Couldn't load the league ranking",
  retry: 'Try again',
  closed: {
    title: 'The league ranking is for Ranked players',
    hint: 'Finish your placement games to join the ranking of your league.',
  },
  idle: {
    title: "You haven't played Ranked in 14 days",
    hint: 'One ranked game puts you back in your league ranking.',
    action: 'Play Ranked',
  },
};

const de: LeagueMessages = {
  ribbon: 'LIGA',
  board: 'LIGA-RANGLISTE',
  failed: 'Die Liga-Rangliste konnte nicht geladen werden',
  retry: 'Noch mal versuchen',
  closed: {
    title: 'Die Liga-Rangliste ist für gewertete Spieler',
    hint: 'Schließ deine Einstufung ab, dann kommst du in die Rangliste deiner Liga.',
  },
  idle: {
    title: 'Du hast seit 14 Tagen nicht gewertet gespielt',
    hint: 'Ein gewertetes Spiel bringt dich zurück in die Rangliste deiner Liga.',
    action: 'Gewertet spielen',
  },
};

const ar: LeagueMessages = {
  ribbon: 'الدوري',
  board: 'ترتيب الدوري',
  failed: 'تعذّر تحميل ترتيب الدوري',
  retry: 'حاول مجددًا',
  closed: {
    title: 'ترتيب الدوري للاعبي المصنَّف',
    hint: 'أنهِ مباريات التصنيف الأولي لتدخل ترتيب دوريك.',
  },
  idle: {
    title: 'لم تلعب مصنَّفًا منذ 14 يومًا',
    hint: 'مباراة مصنَّفة واحدة تعيدك إلى ترتيب دوريك.',
    action: 'العب مصنَّفًا',
  },
};

const fr: LeagueMessages = {
  ribbon: 'LIGUE',
  board: 'CLASSEMENT DE LA LIGUE',
  failed: 'Impossible de charger le classement de la ligue',
  retry: 'Réessayer',
  closed: {
    title: 'Le classement de la ligue est pour le mode classé',
    hint: 'Termine ton placement pour entrer dans le classement de ta ligue.',
  },
  idle: {
    title: "Tu n'as pas joué en classé depuis 14 jours",
    hint: 'Une partie classée te remet dans le classement de ta ligue.',
    action: 'Jouer en classé',
  },
};

const es: LeagueMessages = {
  ribbon: 'LIGA',
  board: 'TABLA DE LA LIGA',
  failed: 'No se pudo cargar la tabla de la liga',
  retry: 'Reintentar',
  closed: {
    title: 'La tabla de la liga es para Competitivo',
    hint: 'Termina tus partidas de clasificación para entrar en la tabla de tu liga.',
  },
  idle: {
    title: 'No has jugado Competitivo en 14 días',
    hint: 'Una partida competitiva te devuelve a la tabla de tu liga.',
    action: 'Jugar Competitivo',
  },
};

const ja: LeagueMessages = {
  ribbon: 'リーグ',
  board: 'リーグランキング',
  failed: 'リーグランキングを読み込めませんでした',
  retry: '再試行',
  closed: {
    title: 'リーグランキングはランク戦プレイヤー専用です',
    hint: '認定戦を終えると、リーグのランキングに入れます。',
  },
  idle: {
    title: '14日間ランク戦をプレイしていません',
    hint: 'ランク戦を1回プレイすれば、リーグのランキングに戻れます。',
    action: 'ランク戦をプレイ',
  },
};

const ko: LeagueMessages = {
  ribbon: '리그',
  board: '리그 순위',
  failed: '리그 순위를 불러올 수 없어요',
  retry: '다시 시도',
  closed: {
    title: '리그 순위는 랭크전 플레이어 전용이에요',
    hint: '배치고사를 마치면 리그 순위에 들어가요.',
  },
  idle: {
    title: '14일 동안 랭크전을 플레이하지 않았어요',
    hint: '랭크전 한 판이면 리그 순위로 돌아와요.',
    action: '랭크전 플레이',
  },
};

export const league: Record<Locale, LeagueMessages> = { tr, en, de, ar, fr, es, ja, ko };
