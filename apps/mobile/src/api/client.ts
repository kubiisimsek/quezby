import { createApiClient } from '@quezby/sdk';

import { currentInstallId, useSession } from '@/auth/session';
import { API_URL, APP_BUILD, APP_PLATFORM, APP_VERSION, DEVICE_MODEL, OS_VERSION } from '@/config/env';
import { currentLocale } from '@/i18n/language';
import { logApp } from '@/lib/appLog';

/** Every network call in the app goes through this one client. */
export const api = createApiClient({
  baseUrl: API_URL,
  appVersion: APP_VERSION,
  getToken: () => useSession.getState().token,
  onUnauthorized: () => {
    void useSession.getState().signOut();
  },
  // A request that never reached the API leaves no trace there: the phone keeps it for the Loglar page.
  onUnreached: ({ method, path, code }) => {
    if (path === '/me/logs') return;
    logApp('warning', code === 'timeout' ? 'api.timeout' : 'api.unreachable', `${method} ${path.split('?')[0]}`);
  },
  // The language the game speaks: the API answers in it, and an account made now is born with it.
  locale: () => currentLocale(),
  // The phone, for the API's device registry — kept for every player, consent or not; no names, no IP.
  device: () => {
    const installId = currentInstallId();
    return installId
      ? { installId, platform: APP_PLATFORM, os: OS_VERSION, model: DEVICE_MODEL, build: APP_BUILD }
      : null;
  },
});
