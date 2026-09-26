import { RULES, type BonusKind, type ReelKind } from '@quezby/engine';

import type { Messages } from '@/i18n';
import type { IconName } from '@/ui/icons';
import type { CoachGesture, TagTone } from '@/ui/kit';

/**
 * How to play, in one place: the help screen, the practice run's coach
 * cards and the in-game hints all read it. The numbers come from the
 * engine's `RULES`, so the copy can never promise a rule the game does not
 * keep; the words come from the player's language (`t.reels`, `t.bonus`).
 */
export type ReelGuide = {
  icon: IconName;
  tone: TagTone;
  title: string;
  body: string;
  badge: string | null;
  hint: string;
  /** What the coach card acts out the first time the practice run shows this kind. */
  gesture: CoachGesture;
};

const REEL_LOOK: Record<ReelKind, Pick<ReelGuide, 'icon' | 'tone' | 'gesture'>> = {
  skip: { icon: 'arrowUp', tone: 'neutral', gesture: 'swipe' },
  like: { icon: 'heart', tone: 'primary', gesture: 'doubleTap' },
  hold: { icon: 'hand', tone: 'warn', gesture: 'hold' },
  freeze: { icon: 'handStop', tone: 'bad', gesture: 'still' },
};

export const REEL_ORDER: readonly ReelKind[] = ['skip', 'like', 'hold', 'freeze'];

/** Every kind of post: its look and its words in `t`'s language. */
export function reelGuide(t: Messages): Record<ReelKind, ReelGuide> {
  return {
    skip: { ...REEL_LOOK.skip, ...t.reels.skip },
    like: { ...REEL_LOOK.like, ...t.reels.like },
    hold: { ...REEL_LOOK.hold, ...t.reels.hold },
    freeze: { ...REEL_LOOK.freeze, ...t.reels.freeze },
  };
}

export type BonusGuide = { name: string; toast: string; body: string; icon: IconName };

const BONUS_ICONS: Record<BonusKind, IconName> = {
  flawless: 'star',
  lightning: 'bolt',
  coolHead: 'handStop',
  comeback: 'trendUp',
};

/** The named combos: what they are called, what sets them off, and the toast in the game. */
export function bonusGuide(t: Messages): Record<BonusKind, BonusGuide> {
  const words = t.bonus;
  return {
    flawless: {
      ...words.flawless,
      body: words.flawless.body(RULES.levelEvery),
      icon: BONUS_ICONS.flawless,
    },
    lightning: {
      ...words.lightning,
      body: words.lightning.body(RULES.lightningRun),
      icon: BONUS_ICONS.lightning,
    },
    coolHead: { ...words.coolHead, icon: BONUS_ICONS.coolHead },
    comeback: {
      ...words.comeback,
      body: words.comeback.body(RULES.comebackLow / 10, RULES.comebackHigh / 10),
      icon: BONUS_ICONS.comeback,
    },
  };
}

export const BONUS_ORDER: readonly BonusKind[] = ['flawless', 'lightning', 'coolHead', 'comeback'];

/**
 * A phone that failed Google’s or Apple’s integrity check — rooted or
 * jailbroken, an emulator, a changed app — plays on, but its runs never rank.
 * The result of such a run (`flagReason: 'device'`) and the lobby say so, in
 * these words.
 */
export function deviceFailed(t: Messages): { title: string; why: { android: string; ios: string } } {
  return { title: t.device.failedTitle, why: t.device.failedWhy };
}
