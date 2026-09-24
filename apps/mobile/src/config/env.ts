import {
  API_URL_LOCAL as RAW_API_URL_LOCAL,
  API_URL_PRODUCTION as RAW_API_URL_PRODUCTION,
  API_URL_STAGING as RAW_API_URL_STAGING,
  GOOGLE_CLOUD_PROJECT_NUMBER as RAW_GOOGLE_CLOUD_PROJECT_NUMBER,
  GOOGLE_IOS_CLIENT_ID as RAW_GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID as RAW_GOOGLE_WEB_CLIENT_ID,
  QUEZBY_ENV,
} from '@env';
import { NativeModules, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

import {
  cloudProjectNumber,
  environmentFrom,
  hostOfScriptUrl,
  localApiUrl,
  type AppEnvironment,
} from '@/config/environment';

/**
 * The app's only door to `@env`. Everything in `apps/mobile/.env` ships inside
 * the bundle — public values only — and each one falls back here, so a
 * missing `.env` degrades rather than crashes. Tests never read the real file:
 * Jest maps `@env` to `src/types/env.mock.ts`.
 */
function value(raw: string | undefined, fallback: string): string {
  return raw && raw.length > 0 ? raw : fallback;
}

/** Which API this build talks to — `QUEZBY_ENV` in `.env`, local when unset. */
export const APP_ENV: AppEnvironment = environmentFrom(QUEZBY_ENV);

export const APP_VERSION: string = DeviceInfo.getVersion();

const PLATFORM: 'ios' | 'android' = Platform.OS === 'android' ? 'android' : 'ios';

function metroHost(): string | null {
  const sourceCode = NativeModules.SourceCode as
    | { scriptURL?: string; getConstants?: () => { scriptURL?: string } }
    | undefined;
  const scriptUrl =
    sourceCode?.getConstants?.().scriptURL ?? sourceCode?.scriptURL ?? null;
  return hostOfScriptUrl(scriptUrl);
}

const URLS: Record<AppEnvironment, string> = {
  local: value(RAW_API_URL_LOCAL, 'http://localhost:8000'),
  staging: value(RAW_API_URL_STAGING, 'https://staging-api.quezby.com'),
  production: value(RAW_API_URL_PRODUCTION, 'https://api.quezby.com'),
};

/** Where this build finds the API — the origin, without `/api`. */
export const API_URL: string =
  APP_ENV === 'local'
    ? localApiUrl(URLS.local, __DEV__ ? metroHost() : null, PLATFORM)
    : URLS[APP_ENV].replace(/\/$/, '');

export const APP_PLATFORM = PLATFORM;

/**
 * The app's Google OAuth clients — public ids, not secrets, and the same in
 * every environment: there is one app. Null when not configured (or iOS lacks
 * its own client): the Google button is then not offered at all.
 */
export const GOOGLE_CLIENTS: { webClientId: string; iosClientId: string | null } | null = (() => {
  const web = value(RAW_GOOGLE_WEB_CLIENT_ID, '');
  const ios = value(RAW_GOOGLE_IOS_CLIENT_ID, '');
  if (web === '' || (PLATFORM === 'ios' && ios === '')) return null;
  return { webClientId: web, iosClientId: ios === '' ? null : ios };
})();

/**
 * The Google Cloud project number Play Integrity answers for — public, not a
 * secret, and one for the app: Play Console links one project to it. Null
 * when unset (or not a number): the Android device check is then skipped and
 * the phone stays unverified.
 */
export const GOOGLE_CLOUD_PROJECT_NUMBER: string | null = cloudProjectNumber(
  RAW_GOOGLE_CLOUD_PROJECT_NUMBER,
);
