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
  ja: formatsFor('ja'),
  ko: formatsFor('ko'),
};

const NBSP = ' ';

/** A rating's move with its sign — a real minus, and ±0 for none: "+42", "−18". */
function signed(locale: Locale, value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±';
  return `${sign}${fmt[locale].score(Math.abs(value))}`;
}

/**
 * qb — the players' name for the Elo rating — is what a player's league
 * comes from. Every counted run plays
 * against a target — the score to beat — and moves the rating up past it, down
 * short of it, by the score's share of it: never more than 200. The first
 * runs place the player; a fresh promotion is shielded for a few runs. The
 * numbers are the API's; these are the words round them. Tier names are
 * `tiers`'s.
 */
const tr = {
  elo: (value: string) => `${value} qb`,
  delta: (value: number) => signed('tr', value),
  /** How far the next league is: "Altın’a 158 qb". */
  toNext: (tier: LeagueTier, points: string) => `${dativeOf(tiers.tr.names[tier])} ${points} qb`,
  /** MasterClass: the one league with no top. */
  noCeiling: 'Tavanı yok',
  peak: (value: string) => `En yüksek ${value}`,
  shield: (runs: number) => `Kalkan · ${runs} tur`,
  placement: {
    ribbon: 'YERLEŞME',
    title: (played: number, required: number) => `Yerleşme ${played}/${required}`,
    hint: (required: number) => `İlk ${required} dereceli oyunun hangi ligde başlayacağını belirler.`,
  },
  /** The result screen's qb tile. */
  result: {
    ribbon: 'QB',
    line: (score: string, target: string) => `Skor ${score} · Hedef ${target}`,
    placed: (tier: LeagueTier) => `Yerleştin: ${tiers.tr.league(tier)}!`,
    promoted: (tier: LeagueTier) => `${dativeOf(tiers.tr.names[tier])} yükseldin!`,
    demoted: (tier: LeagueTier) => `${dativeOf(tiers.tr.names[tier])} düştün.`,
    shielded: 'Kalkan seni ligde tuttu',
    forfeit: 'Hükmen yenilgi',
    void: 'Bu tur qb’ye sayılmadı',
    pending: 'Skorun incelenince qb’ye yazılır',
    /** Dereceli's result: the score alone before a target, the move read aloud, the verdict, the banners. */
    score: (score: string) => `Skor ${score}`,
    deltaLabel: (delta: string) => `${delta} qb`,
    verdict: { beat: 'Hedefi geçtin', short: 'Hedefin altında', even: 'Hedefi tutturdun' },
    banner: { up: 'YÜKSELDİN!', down: 'DÜŞTÜN', placed: 'YERLEŞTİN!' },
  },
  history: {
    title: 'qb hareketleri',
    /** The league stage's corner slab that opens them, read aloud. */
    open: 'qb hareketlerini aç',
    empty: 'Henüz qb hareketin yok.',
    kinds: {
      placement: 'Yerleşme',
      run: 'Tur',
      forfeit: 'Hükmen',
      void: 'Sayılmadı',
      reversal: 'Geri alındı',
      adjust: 'Düzeltme',
    } satisfies Record<RatingChangeKind, string>,
    run: (score: string, target: string) => `${score} · hedef ${target}`,
  },
};

export type RatingMessages = typeof tr;

const en: RatingMessages = {
  elo: (value) => `${value} qb`,
  delta: (value) => signed('en', value),
  toNext: (tier, points) => `${points} qb to ${tiers.en.names[tier]}`,
  noCeiling: 'No ceiling',
  peak: (value) => `Best ${value}`,
  shield: (runs) => plural('en', runs, { one: 'Shield · 1 run', other: `Shield · ${runs} runs` }),
  placement: {
    ribbon: 'PLACEMENT',
    title: (played, required) => `Placement ${played}/${required}`,
    hint: (required) => `Your first ${required} ranked games decide which league you start in.`,
  },
  result: {
    ribbon: 'QB',
    line: (score, target) => `Score ${score} · Target ${target}`,
    placed: (tier) => `You're placed: ${tiers.en.league(tier)}!`,
    promoted: (tier) => `You moved up to ${tiers.en.league(tier)}!`,
    demoted: (tier) => `You dropped to ${tiers.en.league(tier)}.`,
    shielded: 'Your shield kept you in the league',
    forfeit: 'Forfeit',
    void: "This run didn't count for qb",
    pending: 'Your qb updates once your score is checked',
    score: (score) => `Score ${score}`,
    deltaLabel: (delta) => `${delta} qb`,
    verdict: { beat: 'Target beaten', short: 'Short of the target', even: 'Right on target' },
    banner: { up: 'PROMOTED!', down: 'DEMOTED', placed: 'PLACED!' },
  },
  history: {
    title: 'qb history',
    open: 'Open your qb history',
    empty: 'No qb moves yet.',
    kinds: {
      placement: 'Placement',
      run: 'Run',
      forfeit: 'Forfeit',
      void: "Didn't count",
      reversal: 'Taken back',
      adjust: 'Adjusted',
    },
    run: (score, target) => `${score} · target ${target}`,
  },
};

const de: RatingMessages = {
  elo: (value) => `${value} qb`,
  delta: (value) => signed('de', value),
  toNext: (tier, points) => `Noch ${points} qb bis ${tiers.de.names[tier]}`,
  noCeiling: 'Nach oben offen',
  peak: (value) => `Bestwert ${value}`,
  shield: (runs) => plural('de', runs, { one: 'Schild · 1 Runde', other: `Schild · ${runs} Runden` }),
  placement: {
    ribbon: 'EINSTUFUNG',
    title: (played, required) => `Einstufung ${played}/${required}`,
    hint: (required) => `Deine ersten ${required} gewerteten Spiele entscheiden, in welcher Liga du startest.`,
  },
  result: {
    ribbon: 'QB',
    line: (score, target) => `Score ${score} · Ziel ${target}`,
    placed: (tier) => `Eingestuft: ${tiers.de.league(tier)}!`,
    promoted: (tier) => `Du bist in die ${tiers.de.league(tier)} aufgestiegen!`,
    demoted: (tier) => `Du bist in die ${tiers.de.league(tier)} abgestiegen.`,
    shielded: 'Dein Schild hat dich in der Liga gehalten',
    forfeit: 'Kampflos verloren',
    void: 'Diese Runde zählt nicht fürs qb',
    pending: 'Dein qb zählt, sobald dein Score geprüft ist',
    score: (score) => `Punkte ${score}`,
    deltaLabel: (delta) => `${delta} qb`,
    verdict: { beat: 'Ziel geschafft', short: 'Unter dem Ziel', even: 'Ziel genau getroffen' },
    banner: { up: 'AUFGESTIEGEN!', down: 'ABGESTIEGEN', placed: 'EINGESTUFT!' },
  },
  history: {
    title: 'qb-Verlauf',
    open: 'qb-Verlauf öffnen',
    empty: 'Noch keine qb-Bewegungen.',
    kinds: {
      placement: 'Einstufung',
      run: 'Runde',
      forfeit: 'Kampflos',
      void: 'Nicht gezählt',
      reversal: 'Zurückgenommen',
      adjust: 'Korrektur',
    },
    run: (score, target) => `${score} · Ziel ${target}`,
  },
};

const ar: RatingMessages = {
  elo: (value) => `${iso(value)} qb`,
  delta: (value) => iso(signed('ar', value)),
  toNext: (tier, points) => `${iso(points)} qb حتى ${tiers.ar.names[tier]}`,
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
    ribbon: 'QB',
    line: (score, target) => `النتيجة ${iso(score)} · الهدف ${iso(target)}`,
    placed: (tier) => `تم تصنيفك: ${tiers.ar.league(tier)}!`,
    promoted: (tier) => `صعدت إلى ${tiers.ar.league(tier)}!`,
    demoted: (tier) => `هبطت إلى ${tiers.ar.league(tier)}.`,
    shielded: 'أبقاك الدرع في الدوري',
    forfeit: 'خسارة بالانسحاب',
    void: 'لم تُحسب هذه الجولة في التصنيف',
    pending: 'يُحدَّث تصنيفك بعد مراجعة نتيجتك',
    score: (score) => `النتيجة ${iso(score)}`,
    deltaLabel: (delta) => `${iso(delta)} qb`,
    verdict: { beat: 'تجاوزت الهدف', short: 'دون الهدف', even: 'أصبت الهدف تمامًا' },
    banner: { up: 'ترقّيت!', down: 'هبطت', placed: 'تم تصنيفك!' },
  },
  history: {
    title: `سجل ${iso('qb')}`,
    open: `افتح سجل ${iso('qb')}`,
    empty: `لا حركات ${iso('qb')} بعد.`,
    kinds: {
      placement: 'تصنيف أولي',
      run: 'جولة',
      forfeit: 'انسحاب',
      void: 'لم تُحسب',
      reversal: 'أُلغيت',
      adjust: 'تعديل',
    },
    run: (score, target) => `${iso(score)} · الهدف ${iso(target)}`,
  },
};

const fr: RatingMessages = {
  elo: (value) => `${value}${NBSP}qb`,
  delta: (value) => signed('fr', value),
  toNext: (tier, points) => `Encore ${points}${NBSP}qb jusqu’à ${tiers.fr.names[tier]}`,
  noCeiling: 'Pas de plafond',
  peak: (value) => `Meilleur ${value}`,
  shield: (runs) => plural('fr', runs, { one: 'Bouclier · 1 partie', other: `Bouclier · ${runs} parties` }),
  placement: {
    ribbon: 'PLACEMENT',
    title: (played, required) => `Placement ${played}/${required}`,
    hint: (required) => `Tes ${required} premières parties classées décident de ta ligue de départ.`,
  },
  result: {
    ribbon: 'QB',
    line: (score, target) => `Score ${score} · Objectif ${target}`,
    placed: (tier) => `Placement terminé${NBSP}: ${tiers.fr.league(tier)}${NBSP}!`,
    promoted: (tier) => `Tu montes en ${tiers.fr.league(tier)}${NBSP}!`,
    demoted: (tier) => `Tu descends en ${tiers.fr.league(tier)}.`,
    shielded: 'Ton bouclier t’a gardé dans la ligue',
    forfeit: 'Défaite par forfait',
    void: 'Cette partie ne compte pas pour le qb',
    pending: 'Ton qb sera mis à jour une fois ton score vérifié',
    score: (score) => `Score ${score}`,
    deltaLabel: (delta) => `${delta} qb`,
    verdict: { beat: 'Objectif dépassé', short: 'Sous l’objectif', even: 'Objectif atteint pile' },
    banner: { up: 'PROMU !', down: 'RÉTROGRADÉ', placed: 'CLASSÉ !' },
  },
  history: {
    title: 'Historique qb',
    open: 'Ouvrir l’historique qb',
    empty: 'Aucun mouvement de qb pour l’instant.',
    kinds: {
      placement: 'Placement',
      run: 'Partie',
      forfeit: 'Forfait',
      void: 'Non comptée',
      reversal: 'Annulé',
      adjust: 'Ajustement',
    },
    run: (score, target) => `${score} · objectif ${target}`,
  },
};

const es: RatingMessages = {
  elo: (value) => `${value} qb`,
  delta: (value) => signed('es', value),
  toNext: (tier, points) => `${points} qb para ${tiers.es.names[tier]}`,
  noCeiling: 'Sin techo',
  peak: (value) => `Mejor ${value}`,
  shield: (runs) => plural('es', runs, { one: 'Escudo · 1 partida', other: `Escudo · ${runs} partidas` }),
  placement: {
    ribbon: 'CLASIFICACIÓN',
    title: (played, required) => `Clasificación ${played}/${required}`,
    hint: (required) => `Tus primeras ${required} partidas competitivas deciden en qué liga empiezas.`,
  },
  result: {
    ribbon: 'QB',
    line: (score, target) => `Puntuación ${score} · Objetivo ${target}`,
    placed: (tier) => `¡Clasificación lista: ${tiers.es.league(tier)}!`,
    promoted: (tier) => `¡Subiste a la ${tiers.es.league(tier)}!`,
    demoted: (tier) => `Bajaste a la ${tiers.es.league(tier)}.`,
    shielded: 'Tu escudo te mantuvo en la liga',
    forfeit: 'Derrota por abandono',
    void: 'Esta partida no cuenta para el qb',
    pending: 'Tu qb se actualiza cuando se revise tu puntuación',
    score: (score) => `Puntuación ${score}`,
    deltaLabel: (delta) => `${delta} qb`,
    verdict: { beat: 'Objetivo superado', short: 'Por debajo del objetivo', even: 'Objetivo clavado' },
    banner: { up: '¡ASCENDISTE!', down: 'DESCENDISTE', placed: '¡CLASIFICADO!' },
  },
  history: {
    title: 'Historial de qb',
    open: 'Abrir el historial de qb',
    empty: 'Aún no hay movimientos de qb.',
    kinds: {
      placement: 'Clasificación',
      run: 'Partida',
      forfeit: 'Abandono',
      void: 'No contó',
      reversal: 'Anulado',
      adjust: 'Ajuste',
    },
    run: (score, target) => `${score} · objetivo ${target}`,
  },
};

const ja: RatingMessages = {
  elo: (value) => `${value} qb`,
  delta: (value) => signed('ja', value),
  toNext: (tier, points) => `${tiers.ja.names[tier]}まであと${points} qb`,
  noCeiling: '上限なし',
  peak: (value) => `最高 ${value}`,
  shield: (runs) => `シールド · ${runs}回`,
  placement: {
    ribbon: '認定戦',
    title: (played, required) => `認定戦 ${played}/${required}`,
    hint: (required) => `最初の${required}回のランク戦で、スタートするリーグが決まります。`,
  },
  result: {
    ribbon: 'QB',
    line: (score, target) => `スコア ${score} · 目標 ${target}`,
    placed: (tier) => `認定完了：${tiers.ja.league(tier)}！`,
    promoted: (tier) => `${tiers.ja.league(tier)}に昇格！`,
    demoted: (tier) => `${tiers.ja.league(tier)}に降格しました。`,
    shielded: 'シールドのおかげでリーグに残留',
    forfeit: '不戦敗',
    void: 'このプレイはqbにカウントされませんでした',
    pending: 'スコアの確認後にqbへ反映されます',
    score: (score) => `スコア ${score}`,
    deltaLabel: (delta) => `${delta} qb`,
    verdict: { beat: '目標突破', short: '目標に届かず', even: '目標ぴったり' },
    banner: { up: '昇格！', down: '降格', placed: '認定完了！' },
  },
  history: {
    title: 'qbの履歴',
    open: 'qbの履歴を開く',
    empty: 'qbの変動はまだありません。',
    kinds: {
      placement: '認定戦',
      run: 'プレイ',
      forfeit: '不戦敗',
      void: 'ノーカウント',
      reversal: '取り消し',
      adjust: '調整',
    },
    run: (score, target) => `${score} · 目標 ${target}`,
  },
};

const ko: RatingMessages = {
  elo: (value) => `${value} qb`,
  delta: (value) => signed('ko', value),
  toNext: (tier, points) => `${tiers.ko.names[tier]}까지 ${points} qb`,
  noCeiling: '상한 없음',
  peak: (value) => `최고 ${value}`,
  shield: (runs) => `보호막 · ${runs}판`,
  placement: {
    ribbon: '배치고사',
    title: (played, required) => `배치고사 ${played}/${required}`,
    hint: (required) => `처음 ${required}판의 랭크전으로 시작할 리그가 정해져요.`,
  },
  result: {
    ribbon: 'QB',
    line: (score, target) => `점수 ${score} · 목표 ${target}`,
    placed: (tier) => `배치 완료: ${tiers.ko.league(tier)}!`,
    promoted: (tier) => `${tiers.ko.league(tier)}로 승급했어요!`,
    demoted: (tier) => `${tiers.ko.league(tier)}로 강등됐어요.`,
    shielded: '보호막 덕분에 리그에 남았어요',
    forfeit: '몰수패',
    void: '이번 게임은 qb에 반영되지 않았어요',
    pending: '점수 검토가 끝나면 qb에 반영돼요',
    score: (score) => `점수 ${score}`,
    deltaLabel: (delta) => `${delta} qb`,
    verdict: { beat: '목표 돌파', short: '목표 미달', even: '목표 적중' },
    banner: { up: '승급!', down: '강등', placed: '배치 완료!' },
  },
  history: {
    title: 'qb 기록',
    open: 'qb 기록 열기',
    empty: '아직 qb 변동이 없어요.',
    kinds: {
      placement: '배치고사',
      run: '게임',
      forfeit: '몰수패',
      void: '미반영',
      reversal: '취소됨',
      adjust: '조정',
    },
    run: (score, target) => `${score} · 목표 ${target}`,
  },
};

export const rating: Record<Locale, RatingMessages> = { tr, en, de, ar, fr, es, ja, ko };
