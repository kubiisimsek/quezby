import { trigger } from 'react-native-haptic-feedback';

import { useSettings } from '@/stores/settings';

/**
 * The game's feel, in four taps. A swipe ticks, a hit lands, a miss thumps,
 * and a new record buzzes. Off when the player turned vibration off.
 */
export type Feel = 'tick' | 'hit' | 'perfect' | 'miss' | 'record';

const PATTERN = {
  tick: 'selection',
  hit: 'impactLight',
  perfect: 'impactMedium',
  miss: 'notificationError',
  record: 'notificationSuccess',
} as const;

export function feel(kind: Feel): void {
  if (!useSettings.getState().haptics) return;
  trigger(PATTERN[kind], {
    enableVibrateFallback: false,
    ignoreAndroidSystemSettings: false,
  });
}
