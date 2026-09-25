import { RULES, type BonusKind, type ReelKind } from '@quezby/engine';

import type { IconName } from '@/ui/icons';
import type { CoachGesture, TagTone } from '@/ui/kit';

/**
 * How to play, in one place: the help screen, the practice run's coach
 * cards and the in-game hints all read it. The numbers come from the
 * engine's `RULES`, so the copy can never promise a rule the game does not
 * keep.
 */
export const REEL_GUIDE: Record<
  ReelKind,
  {
    icon: IconName;
    tone: TagTone;
    title: string;
    body: string;
    badge: string | null;
    hint: string;
    /** What the coach card acts out the first time the practice run shows this kind. */
    gesture: CoachGesture;
  }
> = {
  skip: {
    icon: 'arrowUp',
    tone: 'neutral',
    title: 'Sıradan post',
    body: 'Yukarı kaydır. Ne kadar hızlı, o kadar puan.',
    badge: null,
    hint: 'Sıkıcı içerik — yukarı kaydır',
    gesture: 'swipe',
  },
  like: {
    icon: 'heart',
    tone: 'primary',
    title: 'Arkadaşın',
    body: 'Pembe postu çift dokunarak beğen. Geçersen ceza.',
    badge: 'Arkadaşın',
    hint: 'Arkadaşının postu — çift dokun',
    gesture: 'doubleTap',
  },
  hold: {
    icon: 'hand',
    tone: 'warn',
    title: 'Altın post',
    body: 'Basılı tut, çubuk yeşildeyken bırak. Tam ortası mükemmel.',
    badge: 'Altın post',
    hint: 'Basılı tut, yeşil bölgede bırak',
    gesture: 'hold',
  },
  freeze: {
    icon: 'handStop',
    tone: 'bad',
    title: 'Dokunma!',
    body: 'Kırmızı postta elini çek, süre bitsin. Refleksini yen.',
    badge: 'Dokunma',
    hint: 'Hiçbir şeye dokunma, geçmesini bekle',
    gesture: 'still',
  },
};

export const REEL_ORDER: readonly ReelKind[] = ['skip', 'like', 'hold', 'freeze'];

/** The named combos: what they are called, what sets them off, and the toast in the game. */
export const BONUS_GUIDE: Record<BonusKind, { name: string; toast: string; body: string; icon: IconName }> = {
  flawless: {
    name: 'Kusursuz seviye',
    toast: 'Kusursuz seviye!',
    body: `Bir seviyenin ${RULES.levelEvery} postunu hiç hata yapmadan bitir.`,
    icon: 'star',
  },
  lightning: {
    name: 'Şimşek',
    toast: 'Şimşek!',
    body: `Art arda ${RULES.lightningRun} hızlı kaydırma ya da beğeni.`,
    icon: 'bolt',
  },
  coolHead: {
    name: 'Soğukkanlı',
    toast: 'Soğukkanlı!',
    body: 'Beğeniden ya da altın posttan hemen sonra gelen kırmızı postta elini çek.',
    icon: 'handStop',
  },
  comeback: {
    name: 'Geri dönüş',
    toast: 'Geri dönüş!',
    body: `Dopamin %${RULES.comebackLow / 10}’un altına düştükten sonra %${RULES.comebackHigh / 10}’ye geri çık.`,
    icon: 'trendUp',
  },
};

export const BONUS_ORDER: readonly BonusKind[] = ['flawless', 'lightning', 'coolHead', 'comeback'];

/**
 * A phone that failed Google’s or Apple’s integrity check — rooted or
 * jailbroken, an emulator, a changed app — plays on, but its runs never rank.
 * The result of such a run (`flagReason: 'device'`) and the lobby say so, in
 * these words.
 */
export const DEVICE_FAILED = {
  title: 'Bu cihazda skorlar sıralamaya girmiyor',
  why: {
    android:
      'Google’ın güvenlik kontrolü bu cihazı onaylamadı: root’lu bir telefon, emülatör ya da değiştirilmiş bir uygulama olabilir.',
    ios: 'Apple’ın güvenlik kontrolü bu cihazı onaylamadı: jailbreak’li bir telefon ya da değiştirilmiş bir uygulama olabilir.',
  },
} as const;
