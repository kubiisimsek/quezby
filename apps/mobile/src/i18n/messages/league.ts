import type { LeagueTier, LeagueZone, Locale } from '@quezby/types';

import { formatsFor, iso, type Formats } from '@/i18n/format';
import { dativeOf } from '@/i18n/grammar/tr';
import { plural } from '@/i18n/plural';

import { tiers } from './tiers';

/** Each language's numbers, for the lines that count something. */
const fmt: Record<Locale, Formats> = {
  tr: formatsFor('tr'),
  en: formatsFor('en'),
  de: formatsFor('de'),
  ar: formatsFor('ar'),
  fr: formatsFor('fr'),
  es: formatsFor('es'),
};

/** A zone of a group: its name read aloud, and the ribbon over it. */
type ZoneWords = { name: string; ribbon: string };

/**
 * The week's league: its stage, the way in for a new player, the group
 * banded into its zones, and last week's outcome. Tier names are `tiers`'s;
 * Turkish bends them ("Altın'a yükseldin!"), every other language builds its
 * sentence round the league's name.
 */
const tr = {
  ribbon: 'HAFTALIK LİG',
  rule: 'Puanın: her günün en iyi skorunun toplamı',
  failed: 'Lig yüklenemedi',
  retry: 'Tekrar dene',
  play: 'Oyna',
  /** A new player's league, before their first counted runs. */
  locked: {
    title: (remaining: number) => `Lige ${remaining} oyun kaldı`,
    hint: (required: number) =>
      `Lig, ilk ${required} oyunundan sonra açılır; deneme turu sayılmaz. Sonra her haftanın ilk turu seni bir gruba yerleştirir.`,
  },
  /** A player who has not played this week yet. */
  join: {
    title: 'Bu hafta henüz oynamadın',
    hint: 'Haftanın ilk turu seni bir gruba yerleştirir; her günün en iyi skoru puanına eklenir.',
    action: 'Oyna, ligine katıl',
  },
  /** How last week ended, once. */
  lastWeek: {
    promoted: (tier: LeagueTier) => `${dativeOf(tiers.tr.names[tier])} yükseldin!`,
    demoted: (tier: LeagueTier) => `${dativeOf(tiers.tr.names[tier])} düştün.`,
    stayed: (tier: LeagueTier) => `${tiers.tr.names[tier]} ligde kaldın.`,
    finished: (tier: LeagueTier, rank: number) =>
      `Geçen hafta ${tiers.tr.names[tier]} ligde ${fmt.tr.rank(rank)} oldun.`,
    close: 'Kapat',
  },
  /** Days played this week, under a name in the group. */
  days: (count: number) => `${count} gün`,
  zones: {
    promote: { name: 'Terfi bölgesi', ribbon: 'TERFİ BÖLGESİ' },
    demote: { name: 'Düşme bölgesi', ribbon: 'DÜŞME BÖLGESİ' },
  } satisfies Record<Exclude<LeagueZone, 'stay'>, ZoneWords>,
};

export type LeagueMessages = typeof tr;

const en: LeagueMessages = {
  ribbon: 'WEEKLY LEAGUE',
  rule: "Your points: the sum of each day's best score",
  failed: "Couldn't load the league",
  retry: 'Try again',
  play: 'Play',
  locked: {
    title: (remaining) =>
      plural('en', remaining, {
        one: '1 game to the league',
        other: `${remaining} games to the league`,
      }),
    hint: (required) =>
      `The league opens after ${plural('en', required, {
        one: 'your first game',
        other: `your first ${required} games`,
      })}; the practice run doesn't count. Then your first run of each week puts you in a group.`,
  },
  join: {
    title: "You haven't played this week yet",
    hint: "Your first run of the week puts you in a group; each day's best score adds to your points.",
    action: 'Play and join your league',
  },
  lastWeek: {
    promoted: (tier) => `You moved up to ${tiers.en.league(tier)}!`,
    demoted: (tier) => `You dropped to ${tiers.en.league(tier)}.`,
    stayed: (tier) => `You stayed in ${tiers.en.league(tier)}.`,
    finished: (tier, rank) =>
      `Last week you finished ${fmt.en.rank(rank)} in ${tiers.en.league(tier)}.`,
    close: 'Close',
  },
  days: (count) => plural('en', count, { one: '1 day', other: `${count} days` }),
  zones: {
    promote: { name: 'Promotion zone', ribbon: 'PROMOTION ZONE' },
    demote: { name: 'Relegation zone', ribbon: 'RELEGATION ZONE' },
  },
};

const de: LeagueMessages = {
  ribbon: 'WOCHENLIGA',
  rule: 'Deine Punkte: die Summe der besten Scores jedes Tages',
  failed: 'Liga konnte nicht geladen werden',
  retry: 'Noch mal versuchen',
  play: 'Spielen',
  locked: {
    title: (remaining) =>
      plural('de', remaining, {
        one: 'Noch 1 Spiel bis zur Liga',
        other: `Noch ${remaining} Spiele bis zur Liga`,
      }),
    hint: (required) =>
      `Die Liga öffnet sich nach ${plural('de', required, {
        one: 'deinem ersten Spiel',
        other: `deinen ersten ${required} Spielen`,
      })}; die Proberunde zählt nicht. Danach setzt dich deine erste Runde jeder Woche in eine Gruppe.`,
  },
  join: {
    title: 'Du hast diese Woche noch nicht gespielt',
    hint: 'Deine erste Runde der Woche setzt dich in eine Gruppe; der beste Score jedes Tages zählt zu deinen Punkten.',
    action: 'Spielen und Liga beitreten',
  },
  lastWeek: {
    promoted: (tier) => `Du bist in die ${tiers.de.league(tier)} aufgestiegen!`,
    demoted: (tier) => `Du bist in die ${tiers.de.league(tier)} abgestiegen.`,
    stayed: (tier) => `Du bist in der ${tiers.de.league(tier)} geblieben.`,
    finished: (tier, rank) =>
      `Letzte Woche warst du ${fmt.de.rank(rank)} in der ${tiers.de.league(tier)}.`,
    close: 'Schließen',
  },
  days: (count) => plural('de', count, { one: '1 Tag', other: `${count} Tage` }),
  zones: {
    promote: { name: 'Aufstiegszone', ribbon: 'AUFSTIEGSZONE' },
    demote: { name: 'Abstiegszone', ribbon: 'ABSTIEGSZONE' },
  },
};

const ar: LeagueMessages = {
  ribbon: 'الدوري الأسبوعي',
  rule: 'نقاطك: مجموع أفضل نتيجة في كل يوم',
  failed: 'تعذّر تحميل الدوري',
  retry: 'حاول مجددًا',
  play: 'العب',
  locked: {
    title: (remaining) =>
      plural('ar', remaining, {
        one: 'مباراة واحدة للوصول إلى الدوري',
        two: 'مباراتان للوصول إلى الدوري',
        few: `${remaining} مباريات للوصول إلى الدوري`,
        many: `${remaining} مباراة للوصول إلى الدوري`,
        other: `${remaining} مباراة للوصول إلى الدوري`,
      }),
    hint: (required) =>
      `يُفتح الدوري بعد ${plural('ar', required, {
        one: 'مباراتك الأولى',
        two: 'أول مباراتين لك',
        few: `أول ${required} مباريات لك`,
        many: `أول ${required} مباراة لك`,
        other: `أول ${required} مباراة لك`,
      })}، ولا تُحسب الجولة التجريبية. بعدها تضعك أول جولة لك في كل أسبوع ضمن مجموعة.`,
  },
  join: {
    title: 'لم تلعب هذا الأسبوع بعد',
    hint: 'أول جولة لك في الأسبوع تضعك في مجموعة، وتُضاف أفضل نتيجة لك في كل يوم إلى نقاطك.',
    action: 'العب وانضم إلى دوريك',
  },
  lastWeek: {
    promoted: (tier) => `صعدت إلى ${tiers.ar.league(tier)}!`,
    demoted: (tier) => `هبطت إلى ${tiers.ar.league(tier)}.`,
    stayed: (tier) => `بقيت في ${tiers.ar.league(tier)}.`,
    finished: (tier, rank) =>
      `في الأسبوع الماضي حللت في المركز ${iso(fmt.ar.rank(rank))} في ${tiers.ar.league(tier)}.`,
    close: 'إغلاق',
  },
  days: (count) =>
    plural('ar', count, {
      one: 'يوم واحد',
      two: 'يومان',
      few: `${count} أيام`,
      many: `${count} يومًا`,
      other: `${count} يوم`,
    }),
  zones: {
    promote: { name: 'منطقة الصعود', ribbon: 'منطقة الصعود' },
    demote: { name: 'منطقة الهبوط', ribbon: 'منطقة الهبوط' },
  },
};

const fr: LeagueMessages = {
  ribbon: 'LIGUE HEBDOMADAIRE',
  rule: 'Tes points : la somme du meilleur score de chaque jour',
  failed: 'Impossible de charger la ligue',
  retry: 'Réessayer',
  play: 'Jouer',
  locked: {
    title: (remaining) =>
      plural('fr', remaining, {
        one: `Encore ${remaining} partie avant la ligue`,
        other: `Encore ${remaining} parties avant la ligue`,
      }),
    hint: (required) =>
      `La ligue s'ouvre après ${plural('fr', required, {
        one: 'ta première partie',
        other: `tes ${required} premières parties`,
      })} ; la partie d'essai ne compte pas. Ensuite, ta première partie de chaque semaine te place dans un groupe.`,
  },
  join: {
    title: "Tu n'as pas encore joué cette semaine",
    hint: "Ta première partie de la semaine te place dans un groupe ; le meilleur score de chaque jour s'ajoute à tes points.",
    action: 'Jouer et rejoindre ta ligue',
  },
  lastWeek: {
    promoted: (tier) => `Tu passes en ${tiers.fr.league(tier)} !`,
    demoted: (tier) => `Tu redescends en ${tiers.fr.league(tier)}.`,
    stayed: (tier) => `Tu restes en ${tiers.fr.league(tier)}.`,
    finished: (tier, rank) =>
      `La semaine dernière, tu as fini ${fmt.fr.rank(rank)} en ${tiers.fr.league(tier)}.`,
    close: 'Fermer',
  },
  days: (count) => plural('fr', count, { one: `${count} jour`, other: `${count} jours` }),
  zones: {
    promote: { name: 'Zone de promotion', ribbon: 'ZONE DE PROMOTION' },
    demote: { name: 'Zone de relégation', ribbon: 'ZONE DE RELÉGATION' },
  },
};

const es: LeagueMessages = {
  ribbon: 'LIGA SEMANAL',
  rule: 'Tus puntos: la suma de la mejor puntuación de cada día',
  failed: 'No se pudo cargar la liga',
  retry: 'Reintentar',
  play: 'Jugar',
  locked: {
    title: (remaining) =>
      plural('es', remaining, {
        one: 'Falta 1 partida para la liga',
        other: `Faltan ${remaining} partidas para la liga`,
      }),
    hint: (required) =>
      `La liga se abre después de ${plural('es', required, {
        one: 'tu primera partida',
        other: `tus primeras ${required} partidas`,
      })}; la ronda de práctica no cuenta. Después, tu primera partida de cada semana te coloca en un grupo.`,
  },
  join: {
    title: 'Aún no has jugado esta semana',
    hint: 'Tu primera partida de la semana te coloca en un grupo; la mejor puntuación de cada día se suma a tus puntos.',
    action: 'Jugar y unirte a tu liga',
  },
  lastWeek: {
    promoted: (tier) => `¡Subiste a la ${tiers.es.league(tier)}!`,
    demoted: (tier) => `Bajaste a la ${tiers.es.league(tier)}.`,
    stayed: (tier) => `Te quedaste en la ${tiers.es.league(tier)}.`,
    finished: (tier, rank) =>
      `La semana pasada quedaste ${fmt.es.rank(rank)} en la ${tiers.es.league(tier)}.`,
    close: 'Cerrar',
  },
  days: (count) => plural('es', count, { one: '1 día', other: `${count} días` }),
  zones: {
    promote: { name: 'Zona de ascenso', ribbon: 'ZONA DE ASCENSO' },
    demote: { name: 'Zona de descenso', ribbon: 'ZONA DE DESCENSO' },
  },
};

export const league: Record<Locale, LeagueMessages> = { tr, en, de, ar, fr, es };
