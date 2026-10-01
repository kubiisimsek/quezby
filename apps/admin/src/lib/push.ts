import type { AdminPushFilters, AdminPushMessage, LeagueTier, Locale, Platform } from '@quezby/types';

import { LEAGUE_TIER, LOCALE_LABEL } from '@/lib/format';

/** What the Push bildirimi form holds, and how it turns into the API's filters and words. */

export type TierChoice = LeagueTier | 'none';
export type DailyChoice = 'any' | 'played' | 'not_played';
export type PlayedChoice = 'any' | `within:${number}` | `idle:${number}`;
export type JoinedChoice = 'any' | `${number}`;
export type PlatformChoice = 'any' | Platform;
export type AccountChoice = 'any' | 'guest' | 'registered';

export const LOCALES = Object.keys(LOCALE_LABEL) as Locale[];

export const PLAYED_OPTIONS: { value: PlayedChoice; label: string }[] = [
  { value: 'any', label: 'Fark etmez' },
  { value: 'within:1', label: 'Son 24 saatte oynadı' },
  { value: 'within:3', label: 'Son 3 günde oynadı' },
  { value: 'within:7', label: 'Son 7 günde oynadı' },
  { value: 'within:30', label: 'Son 30 günde oynadı' },
  { value: 'idle:3', label: '3 gündür oynamadı' },
  { value: 'idle:7', label: '7 gündür oynamadı' },
  { value: 'idle:14', label: '14 gündür oynamadı' },
  { value: 'idle:30', label: '30 gündür oynamadı' },
];

export const JOINED_OPTIONS: { value: JoinedChoice; label: string }[] = [
  { value: 'any', label: 'Fark etmez' },
  { value: '1', label: 'Son 24 saatte katıldı' },
  { value: '7', label: 'Son 7 günde katıldı' },
  { value: '30', label: 'Son 30 günde katıldı' },
  { value: '90', label: 'Son 90 günde katıldı' },
];

export type Choices = {
  username: string;
  tiers: TierChoice[];
  daily: DailyChoice;
  played: PlayedChoice;
  joined: JoinedChoice;
  platform: PlatformChoice;
  locales: Locale[];
  account: AccountChoice;
};

export const NO_CHOICE: Choices = { username: '', tiers: [], daily: 'any', played: 'any', joined: 'any', platform: 'any', locales: [], account: 'any' };

/** What the form says, as the API's filters — the empty ones left out. */
export function filtersOf(choices: Choices): AdminPushFilters {
  const filters: AdminPushFilters = {};
  const username = choices.username.trim().replace(/^@/, '');
  if (username) filters.username = username;
  if (choices.tiers.length > 0) filters.tiers = choices.tiers;
  if (choices.daily !== 'any') filters.daily = choices.daily;
  if (choices.played.startsWith('within:')) filters.playedWithinDays = Number(choices.played.slice(7));
  if (choices.played.startsWith('idle:')) filters.notPlayedForDays = Number(choices.played.slice(5));
  if (choices.joined !== 'any') filters.joinedWithinDays = Number(choices.joined);
  if (choices.platform !== 'any') filters.platform = choices.platform;
  if (choices.locales.length > 0) filters.locales = choices.locales;
  if (choices.account !== 'any') filters.account = choices.account;
  return filters;
}

export function tiersInWords(tiers: TierChoice[]): string {
  return tiers.map((tier) => (tier === 'none' ? 'Ligi yok' : LEAGUE_TIER[tier])).join(', ');
}

/** The filters in words: "Elmas, Ligi yok · Bugün Günün akışını oynamadı · iOS". */
export function describeFilters(filters: AdminPushFilters): string {
  const parts = [
    filters.username ? `@${filters.username}` : null,
    filters.tiers ? tiersInWords(filters.tiers) : null,
    filters.daily === 'played' ? 'Bugün Günün akışını oynadı' : filters.daily === 'not_played' ? 'Bugün Günün akışını oynamadı' : null,
    filters.playedWithinDays ? `Son ${filters.playedWithinDays} günde oynadı` : null,
    filters.notPlayedForDays ? `${filters.notPlayedForDays} gündür oynamadı` : null,
    filters.joinedWithinDays ? `Son ${filters.joinedWithinDays} günde katıldı` : null,
    filters.platform === 'ios' ? 'iOS' : filters.platform === 'android' ? 'Android' : null,
    filters.locales?.map((locale) => LOCALE_LABEL[locale]).join(', '),
    filters.account === 'guest' ? 'Misafir' : filters.account === 'registered' ? 'Kayıtlı' : null,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' · ') : 'Herkes';
}

export type Words = Record<Locale, AdminPushMessage>;

export const NO_WORDS = Object.fromEntries(LOCALES.map((locale) => [locale, { title: 'Quezby', body: '' }])) as Words;

/** The languages with words written: a title and a body. */
export function writtenOf(words: Words): Locale[] {
  return LOCALES.filter((locale) => words[locale].title.trim() !== '' && words[locale].body.trim() !== '');
}

/** Languages with words but no title — they would not be sent. */
export function untitledOf(words: Words): Locale[] {
  return LOCALES.filter((locale) => words[locale].body.trim() !== '' && words[locale].title.trim() === '');
}

export function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((one) => one !== value) : [...list, value];
}
