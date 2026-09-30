import { trigger } from 'react-native-haptic-feedback';

import { useSettings } from '@/stores/settings';

/**
 * The game's feel, in a few taps. A swipe ticks, a hit lands, a miss thumps,
 * a new record buzzes, a new league buzzes as it lands and a fall warns. Off
 * when the player turned vibration off.
 */
export type Feel = 'tick' | 'hit' | 'perfect' | 'miss' | 'record' | 'rankUp' | 'rankDown';

const PATTERN = {
  tick: 'selection',
  hit: 'impactLight',
  perfect: 'impactMedium',
  miss: 'notificationError',
  record: 'notificationSuccess',
  rankUp: 'notificationSuccess',
  rankDown: 'notificationWarning',
} as const;

export function feel(kind: Feel): void {
  if (!useSettings.getState().haptics) return;
  trigger(PATTERN[kind], {
    enableVibrateFallback: false,
    ignoreAndroidSystemSettings: false,
  });
}
