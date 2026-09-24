import { RULES, type BonusKind, type ReelKind } from '@quezby/engine';

import type { IconName } from '@/ui/icons';
import type { TagTone } from '@/ui/kit';

/**
 * How to play, in one place: the welcome, the help screen and the in-game
 * hints all read it. The numbers come from the engine's `RULES`, so the copy
 * can never promise a rule the game does not keep.
 */
export const REEL_GUIDE: Record<
  ReelKind,
  { icon: IconName; tone: TagTone; title: string; body: string; badge: string | null; hint: string }
> = {
  skip: {
    icon: 'arrowUp',
    tone: 'neutral',
    title: 'Sıradan reel',
    body: 'Yukarı kaydır. Ne kadar hızlı, o kadar puan.',
    badge: null,
    hint: 'Sıkıcı içerik — yukarı kaydır',
  },
  like: {
    icon: 'heart',
    tone: 'primary',
    title: 'Arkadaşın',
    body: 'Pembe reeli çift dokunarak beğen. Geçersen ceza.',
    badge: 'Arkadaşın',
    hint: 'Arkadaşının postu — çift dokun',
  },
  hold: {
    icon: 'hand',
    tone: 'warn',
    title: 'Altın reel',
    body: 'Basılı tut, çubuk yeşildeyken bırak. Tam ortası mükemmel.',
    badge: 'Altın reel',
    hint: 'Basılı tut, yeşil bölgede bırak',
  },
  freeze: {
    icon: 'handStop',
    tone: 'bad',
    title: 'Dokunma!',
    body: 'Kırmızı reelde elini çek, süre bitsin. Refleksini yen.',
    badge: 'Dokunma',
    hint: 'Hiçbir şeye dokunma, geçmesini bekle',
  },
};

export const REEL_ORDER: readonly ReelKind[] = ['skip', 'like', 'hold', 'freeze'];

/** The named combos: what they are called, what sets them off, and the toast in the game. */
export const BONUS_GUIDE: Record<BonusKind, { name: string; toast: string; body: string; icon: IconName }> = {
  flawless: {
    name: 'Kusursuz seviye',
    toast: 'Kusursuz seviye!',
    body: `Bir seviyenin ${RULES.levelEvery} reelini hiç hata yapmadan bitir.`,
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
    body: 'Beğeniden ya da altın reelden hemen sonra gelen kırmızı reele dokunma.',
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
