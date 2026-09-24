import {
  API_URL_LOCAL as RAW_API_URL_LOCAL,
  API_URL_PRODUCTION as RAW_API_URL_PRODUCTION,
  API_URL_STAGING as RAW_API_URL_STAGING,
  GOOGLE_IOS_CLIENT_ID_LOCAL,
  GOOGLE_IOS_CLIENT_ID_PRODUCTION,
  GOOGLE_IOS_CLIENT_ID_STAGING,
  GOOGLE_WEB_CLIENT_ID_LOCAL,
  GOOGLE_WEB_CLIENT_ID_PRODUCTION,
  GOOGLE_WEB_CLIENT_ID_STAGING,
} from '@env';
import { NativeModules, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

import {
  environmentFromBundleId,
  hostOfScriptUrl,
  localApiUrl,
  type AppEnvironment,
} from '@/config/environment';

/**
 * The app's only door to `@env`. Everything in `apps/mobile/.env` ships inside
 * the bundle — public values only — and each one falls back here, so a
 * missing `.env` degrades rather than crashes.
 */
function value(raw: string | undefined, fallback: string): string {
  return raw && raw.length > 0 ? raw : fallback;
}

export const APP_ENV: AppEnvironment = environmentFromBundleId(
  DeviceInfo.getBundleId(),
);

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

const GOOGLE_WEB: Record<AppEnvironment, string | undefined> = {
  local: GOOGLE_WEB_CLIENT_ID_LOCAL,
  staging: GOOGLE_WEB_CLIENT_ID_STAGING,
  production: GOOGLE_WEB_CLIENT_ID_PRODUCTION,
};

const GOOGLE_IOS: Record<AppEnvironment, string | undefined> = {
  local: GOOGLE_IOS_CLIENT_ID_LOCAL,
  staging: GOOGLE_IOS_CLIENT_ID_STAGING,
  production: GOOGLE_IOS_CLIENT_ID_PRODUCTION,
};

/**
 * This build's Google OAuth clients — public ids, not secrets. Null when not
 * configured for this environment (or iOS lacks its own client): the Google
 * button is then not offered at all.
 */
export const GOOGLE_CLIENTS: { webClientId: string; iosClientId: string | null } | null = (() => {
  const web = value(GOOGLE_WEB[APP_ENV], '');
  const ios = value(GOOGLE_IOS[APP_ENV], '');
  if (web === '' || (PLATFORM === 'ios' && ios === '')) return null;
  return { webClientId: web, iosClientId: ios === '' ? null : ios };
})();
