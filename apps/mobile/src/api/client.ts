import { createApiClient } from '@quezby/sdk';

import { useSession } from '@/auth/session';
import { API_URL, APP_VERSION } from '@/config/env';

/** Every network call in the app goes through this one client. */
export const api = createApiClient({
  baseUrl: API_URL,
  appVersion: APP_VERSION,
  getToken: () => useSession.getState().token,
  onUnauthorized: () => {
    void useSession.getState().signOut();
  },
});
