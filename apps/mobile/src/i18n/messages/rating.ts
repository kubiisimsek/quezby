import type { LeagueTier, Locale, RatingChangeKind } from '@quezby/types';

import { formatsFor, iso, type Formats } from '@/i18n/format';
import { dativeOf } from '@/i18n/grammar/tr';
import { plural } from '@/i18n/plural';

import { tiers } from './tiers';

const fmt: Record<Locale, Formats> = {
  tr: formatsFor('tr'),
  en: formatsFor('en'),
  de: formatsFor('de'),
  ar: formatsFor('ar'),
  fr: formatsFor('fr'),
  es: formatsFor('es'),
};

const NBSP = ' ';

/** A rating's move with its sign — a real minus, and ±0 for none: "+42", "−18". */
function signed(locale: Locale, value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±';
  return `${sign}${fmt[locale].score(Math.abs(value))}`;
}

/**
 * Elo: the rating a player's league comes from. Every counted run plays
 * against a target — the score to beat — and moves the rating up past it, down
 * short of it, never more than a hundred. The first runs place the player; a
 * fresh promotion is shielded for a few runs. The numbers are the API's;
 * these are the words round them. Tier names are `tiers`'s.
 */
const tr = {
  elo: (value: string) => `${value} Elo`,
  delta: (value: number) => signed('tr', value),
  target: (value: string) => `Hedef ${value}`,
  targetHint: 'Bu skoru geçersen Elo’n artar.',
  /** How far the next league is: "Altın’a 158 Elo". */
  toNext: (tier: LeagueTier, points: string) => `${dativeOf(tiers.tr.names[tier])} ${points} Elo`,
  /** MasterClass: the one league with no top. */
  noCeiling: 'Tavanı yok',
  peak: (value: string) => `En yüksek ${value}`,
  shield: (runs: number) => `Kalkan · ${runs} tur`,
  placement: {
    ribbon: 'YERLEŞME',
    title: (played: number, required: number) => `Yerleşme ${played}/${required}`,
    hint: (required: number) => `İlk ${required} dereceli oyunun hangi ligde başlayacağını belirler.`,
  },
  /** The result screen's Elo tile. */
  result: {
    ribbon: 'ELO',
    line: (score: string, target: string) => `Skor ${score} · Hedef ${target}`,
    placed: (tier: LeagueTier) => `Yerleştin: ${tiers.tr.league(tier)}!`,
    promoted: (tier: LeagueTier) => `${dativeOf(tiers.tr.names[tier])} yükseldin!`,
    demoted: (tier: LeagueTier) => `${dativeOf(tiers.tr.names[tier])} düştün.`,
    shielded: 'Kalkan seni ligde tuttu',
    forfeit: 'Hükmen yenilgi',
    void: 'Bu tur Elo’ya sayılmadı',
    pending: 'Skorun incelenince Elo’ya yazılır',
    next: (target: string) => `Sıradaki hedef ${target}`,
  },
  history: {
    title: 'SON DEĞİŞİMLER',
    kinds: {
      placement: 'Yerleşme',
      run: 'Tur',
      forfeit: 'Hükmen',
      void: 'Sayılmadı',
      reversal: 'Geri alındı',
    } satisfies Record<RatingChangeKind, string>,
    run: (score: string, target: string) => `${score} · hedef ${target}`,
  },
  /** Zirve's Elo tab. */
  board: {
    tab: 'Elo',
    hint: 'Son 14 günde oynayanlar',
    empty: 'Henüz kimse yok',
    emptyHint: 'Yerleşme turlarını bitiren oyuncular burada görünür.',
  },
};

export type RatingMessages = typeof tr;

const en: RatingMessages = {
  elo: (value) => `${value} Elo`,
  delta: (value) => signed('en', value),
  target: (value) => `Target ${value}`,
  targetHint: 'Beat this score and your Elo goes up.',
  toNext: (tier, points) => `${points} Elo to ${tiers.en.names[tier]}`,
  noCeiling: 'No ceiling',
  peak: (value) => `Best ${value}`,
  shield: (runs) => plural('en', runs, { one: 'Shield · 1 run', other: `Shield · ${runs} runs` }),
  placement: {
    ribbon: 'PLACEMENT',
    title: (played, required) => `Placement ${played}/${required}`,
    hint: (required) => `Your first ${required} ranked games decide which league you start in.`,
  },
  result: {
    ribbon: 'ELO',
    line: (score, target) => `Score ${score} · Target ${target}`,
    placed: (tier) => `You're placed: ${tiers.en.league(tier)}!`,
    promoted: (tier) => `You moved up to ${tiers.en.league(tier)}!`,
    demoted: (tier) => `You dropped to ${tiers.en.league(tier)}.`,
    shielded: 'Your shield kept you in the league',
    forfeit: 'Forfeit',
    void: "This run didn't count for Elo",
    pending: 'Your Elo updates once your score is checked',
    next: (target) => `Next target ${target}`,
  },
  history: {
    title: 'LATEST CHANGES',
    kinds: {
      placement: 'Placement',
      run: 'Run',
      forfeit: 'Forfeit',
      void: "Didn't count",
      reversal: 'Taken back',
    },
    run: (score, target) => `${score} · target ${target}`,
  },
  board: {
    tab: 'Elo',
    hint: 'Played in the last 14 days',
    empty: 'Nobody here yet',
    emptyHint: 'Players show up here once their placement runs are done.',
  },
};

const de: RatingMessages = {
  elo: (value) => `${value} Elo`,
  delta: (value) => signed('de', value),
  target: (value) => `Ziel ${value}`,
  targetHint: 'Schlag diesen Score und dein Elo steigt.',
  toNext: (tier, points) => `Noch ${points} Elo bis ${tiers.de.names[tier]}`,
  noCeiling: 'Nach oben offen',
  peak: (value) => `Bestwert ${value}`,
  shield: (runs) => plural('de', runs, { one: 'Schild · 1 Runde', other: `Schild · ${runs} Runden` }),
  placement: {
    ribbon: 'EINSTUFUNG',
    title: (played, required) => `Einstufung ${played}/${required}`,
    hint: (required) => `Deine ersten ${required} gewerteten Spiele entscheiden, in welcher Liga du startest.`,
  },
  result: {
    ribbon: 'ELO',
    line: (score, target) => `Score ${score} · Ziel ${target}`,
    placed: (tier) => `Eingestuft: ${tiers.de.league(tier)}!`,
    promoted: (tier) => `Du bist in die ${tiers.de.league(tier)} aufgestiegen!`,
    demoted: (tier) => `Du bist in die ${tiers.de.league(tier)} abgestiegen.`,
    shielded: 'Dein Schild hat dich in der Liga gehalten',
    forfeit: 'Kampflos verloren',
    void: 'Diese Runde zählt nicht fürs Elo',
    pending: 'Dein Elo zählt, sobald dein Score geprüft ist',
    next: (target) => `Nächstes Ziel ${target}`,
  },
  history: {
    title: 'LETZTE ÄNDERUNGEN',
    kinds: {
      placement: 'Einstufung',
      run: 'Runde',
      forfeit: 'Kampflos',
      void: 'Nicht gezählt',
      reversal: 'Zurückgenommen',
    },
    run: (score, target) => `${score} · Ziel ${target}`,
  },
  board: {
    tab: 'Elo',
    hint: 'Gespielt in den letzten 14 Tagen',
    empty: 'Noch niemand da',
    emptyHint: 'Hier stehen alle, die ihre Einstufung abgeschlossen haben.',
  },
};

const ar: RatingMessages = {
  elo: (value) => `${iso(value)} إيلو`,
  delta: (value) => iso(signed('ar', value)),
  target: (value) => `الهدف ${iso(value)}`,
  targetHint: 'تجاوز هذه النتيجة ليرتفع تصنيفك.',
  toNext: (tier, points) => `${iso(points)} إيلو حتى ${tiers.ar.names[tier]}`,
  noCeiling: 'بلا سقف',
  peak: (value) => `الأعلى ${iso(value)}`,
  shield: (runs) =>
    plural('ar', runs, {
      one: 'درع · جولة واحدة',
      two: 'درع · جولتان',
      few: `درع · ${runs} جولات`,
      many: `درع · ${runs} جولة`,
      other: `درع · ${runs} جولة`,
    }),
  placement: {
    ribbon: 'التصنيف الأولي',
    title: (played, required) => `التصنيف الأولي ${iso(`${played}/${required}`)}`,
    hint: (required) =>
      `${plural('ar', required, {
        one: 'مباراتك المصنَّفة الأولى تحدد',
        two: 'أول مباراتين مصنَّفتين لك تحددان',
        few: `أول ${required} مباريات مصنَّفة لك تحدد`,
        many: `أول ${required} مباراة مصنَّفة لك تحدد`,
        other: `أول ${required} مباراة مصنَّفة لك تحدد`,
      })} الدوري الذي تبدأ فيه.`,
  },
  result: {
    ribbon: 'إيلو',
    line: (score, target) => `النتيجة ${iso(score)} · الهدف ${iso(target)}`,
    placed: (tier) => `تم تصنيفك: ${tiers.ar.league(tier)}!`,
    promoted: (tier) => `صعدت إلى ${tiers.ar.league(tier)}!`,
    demoted: (tier) => `هبطت إلى ${tiers.ar.league(tier)}.`,
    shielded: 'أبقاك الدرع في الدوري',
    forfeit: 'خسارة بالانسحاب',
    void: 'لم تُحسب هذه الجولة في التصنيف',
    pending: 'يُحدَّث تصنيفك بعد مراجعة نتيجتك',
    next: (target) => `الهدف التالي ${iso(target)}`,
  },
  history: {
    title: 'آخر التغييرات',
    kinds: {
      placement: 'تصنيف أولي',
      run: 'جولة',
      forfeit: 'انسحاب',
      void: 'لم تُحسب',
      reversal: 'أُلغيت',
    },
    run: (score, target) => `${iso(score)} · الهدف ${iso(target)}`,
  },
  board: {
    tab: 'إيلو',
    hint: 'من لعبوا في آخر 14 يومًا',
    empty: 'لا أحد هنا بعد',
    emptyHint: 'يظهر اللاعبون هنا بعد إنهاء جولات التصنيف الأولي.',
  },
};

const fr: RatingMessages = {
  elo: (value) => `${value}${NBSP}Elo`,
  delta: (value) => signed('fr', value),
  target: (value) => `Objectif ${value}`,
  targetHint: 'Dépasse ce score et ton Elo monte.',
  toNext: (tier, points) => `Encore ${points}${NBSP}Elo jusqu’à ${tiers.fr.names[tier]}`,
  noCeiling: 'Pas de plafond',
  peak: (value) => `Meilleur ${value}`,
  shield: (runs) => plural('fr', runs, { one: 'Bouclier · 1 partie', other: `Bouclier · ${runs} parties` }),
  placement: {
    ribbon: 'PLACEMENT',
    title: (played, required) => `Placement ${played}/${required}`,
    hint: (required) => `Tes ${required} premières parties classées décident de ta ligue de départ.`,
  },
  result: {
    ribbon: 'ELO',
    line: (score, target) => `Score ${score} · Objectif ${target}`,
    placed: (tier) => `Placement terminé${NBSP}: ${tiers.fr.league(tier)}${NBSP}!`,
    promoted: (tier) => `Tu montes en ${tiers.fr.league(tier)}${NBSP}!`,
    demoted: (tier) => `Tu descends en ${tiers.fr.league(tier)}.`,
    shielded: 'Ton bouclier t’a gardé dans la ligue',
    forfeit: 'Défaite par forfait',
    void: 'Cette partie ne compte pas pour l’Elo',
    pending: 'Ton Elo sera mis à jour une fois ton score vérifié',
    next: (target) => `Prochain objectif ${target}`,
  },
  history: {
    title: 'DERNIERS CHANGEMENTS',
    kinds: {
      placement: 'Placement',
      run: 'Partie',
      forfeit: 'Forfait',
      void: 'Non comptée',
      reversal: 'Annulé',
    },
    run: (score, target) => `${score} · objectif ${target}`,
  },
  board: {
    tab: 'Elo',
    hint: 'Joueurs actifs ces 14 derniers jours',
    empty: 'Personne pour l’instant',
    emptyHint: 'Les joueurs apparaissent ici une fois leur placement terminé.',
  },
};

const es: RatingMessages = {
  elo: (value) => `${value} Elo`,
  delta: (value) => signed('es', value),
  target: (value) => `Objetivo ${value}`,
  targetHint: 'Supera esta puntuación y tu Elo sube.',
  toNext: (tier, points) => `${points} Elo para ${tiers.es.names[tier]}`,
  noCeiling: 'Sin techo',
  peak: (value) => `Mejor ${value}`,
  shield: (runs) => plural('es', runs, { one: 'Escudo · 1 partida', other: `Escudo · ${runs} partidas` }),
  placement: {
    ribbon: 'CLASIFICACIÓN',
    title: (played, required) => `Clasificación ${played}/${required}`,
    hint: (required) => `Tus primeras ${required} partidas competitivas deciden en qué liga empiezas.`,
  },
  result: {
    ribbon: 'ELO',
    line: (score, target) => `Puntuación ${score} · Objetivo ${target}`,
    placed: (tier) => `¡Clasificación lista: ${tiers.es.league(tier)}!`,
    promoted: (tier) => `¡Subiste a la ${tiers.es.league(tier)}!`,
    demoted: (tier) => `Bajaste a la ${tiers.es.league(tier)}.`,
    shielded: 'Tu escudo te mantuvo en la liga',
    forfeit: 'Derrota por abandono',
    void: 'Esta partida no cuenta para el Elo',
    pending: 'Tu Elo se actualiza cuando se revise tu puntuación',
    next: (target) => `Siguiente objetivo ${target}`,
  },
  history: {
    title: 'ÚLTIMOS CAMBIOS',
    kinds: {
      placement: 'Clasificación',
      run: 'Partida',
      forfeit: 'Abandono',
      void: 'No contó',
      reversal: 'Anulado',
    },
    run: (score, target) => `${score} · objetivo ${target}`,
  },
  board: {
    tab: 'Elo',
    hint: 'Jugaron en los últimos 14 días',
    empty: 'Aún no hay nadie',
    emptyHint: 'Los jugadores aparecen aquí al terminar su clasificación.',
  },
};

export const rating: Record<Locale, RatingMessages> = { tr, en, de, ar, fr, es };
