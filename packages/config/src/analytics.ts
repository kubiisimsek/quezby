import type { AnalyticsCode, AnalyticsEvent, AnalyticsScreen } from '@quezby/types';

/**
 * What the app may tell the API about how it is used — only with the
 * player's consent (`docs/product/analytics.md`). A closed catalog: a visit
 * names screens and moments from these lists and nothing else, so the API's
 * totals keep a fixed set of keys and no free text ever leaves the phone.
 * The API's twins are `App\Enums\AnalyticsScreen`, `App\Enums\AnalyticsEvent`
 * and `config/quezby.php` › `analytics.limits`, tested against
 * `fixtures/analytics.json`. Codes are only ever added, never renamed.
 */
const SCREENS: Record<AnalyticsScreen, true> = {
  welcome: true,
  login: true,
  tutorial: true,
  username: true,
  protect: true,
  home: true,
  leaderboard: true,
  league: true,
  search: true,
  profile: true,
  game: true,
  help: true,
  daily: true,
  friends: true,
  thread: true,
  history: true,
  avatar: true,
  notifications: true,
  friend_list: true,
  account: true,
  alerts: true,
};

const EVENTS: Record<AnalyticsEvent, true> = {
  share_result: true,
  share_daily: true,
  rival: true,
  player_card: true,
  offline_run: true,
  outdated_run: true,
  unsent_run: true,
  offline_gate: true,
  update_gate: true,
  tutorial_done: true,
  nickname_skip: true,
  protect_skip: true,
  protect_reminder: true,
};

export const ANALYTICS_SCREENS = Object.keys(SCREENS) as AnalyticsScreen[];

export const ANALYTICS_EVENTS = Object.keys(EVENTS) as AnalyticsEvent[];

/** Moments that happen once in a player's life: the API keeps when they first did. */
export const ANALYTICS_MILESTONES: readonly AnalyticsEvent[] = [
  'tutorial_done',
  'nickname_skip',
  'protect_skip',
  'protect_reminder',
];

/** How much one phone may record and send — the phone keeps to it, the API holds it to it. */
export const ANALYTICS = {
  /** Visits one request may carry. */
  visitsPerBatch: 10,
  /** Steps a visit's journey keeps; its counts go on after them. */
  journeySteps: 40,
  /** The most one code counts in one visit. */
  maxCount: 999,
  /** Finished visits the phone keeps while it cannot send them; the oldest go first. */
  outbox: 20,
  /** A visit older than this is not sent, and the API would not take it. */
  maxAgeDays: 7,
  /** The longest a visit may count, in seconds. */
  maxVisitSeconds: 14_400,
  /** How long the phone waits after a send that failed on the way. */
  retryAfterMs: 60_000,
  /** How long the phone stops recording once the API answers `record: false`. */
  pauseMs: 86_400_000,
} as const;

export function isAnalyticsScreen(value: string): value is AnalyticsScreen {
  return Object.prototype.hasOwnProperty.call(SCREENS, value);
}

export function isAnalyticsEvent(value: string): value is AnalyticsEvent {
  return Object.prototype.hasOwnProperty.call(EVENTS, value);
}

export function isAnalyticsCode(value: string): value is AnalyticsCode {
  return isAnalyticsScreen(value) || isAnalyticsEvent(value);
}
