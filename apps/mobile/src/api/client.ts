import { createApiClient } from '@quezby/sdk';

import { currentInstallId, useSession } from '@/auth/session';
import { API_URL, APP_BUILD, APP_PLATFORM, APP_VERSION, DEVICE_MODEL, OS_VERSION } from '@/config/env';

/** Every network call in the app goes through this one client. */
export const api = createApiClient({
  baseUrl: API_URL,
  appVersion: APP_VERSION,
  getToken: () => useSession.getState().token,
  onUnauthorized: () => {
    void useSession.getState().signOut();
  },
  // The phone, for the API's device registry — kept for every player, consent or not; no names, no IP.
  device: () => {
    const installId = currentInstallId();
    return installId
      ? { installId, platform: APP_PLATFORM, os: OS_VERSION, model: DEVICE_MODEL, build: APP_BUILD }
      : null;
  },
});
