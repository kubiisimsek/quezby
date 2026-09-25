import { createAdminClient, type AdminClient } from '@quezby/sdk/admin';
import { createContext, useContext, type ReactNode } from 'react';

import { currentToken, useSession } from '@/stores/session';

/**
 * The panel's only way to the API: the SDK's admin client, handed down by
 * context so a screen never calls `fetch` and a test can hand it a fake.
 */
const ApiContext = createContext<AdminClient | null>(null);

export function ApiProvider({ client, children }: { client: AdminClient; children: ReactNode }) {
  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}

export function useApi(): AdminClient {
  const client = useContext(ApiContext);
  if (!client) throw new Error('useApi needs an <ApiProvider>.');
  return client;
}

/** The client the panel runs on: the session's token, and a 401 ends the session. */
export function createPanelClient(baseUrl: string = __API_ORIGIN__): AdminClient {
  return createAdminClient({
    baseUrl,
    getToken: currentToken,
    onUnauthorized: () => useSession.getState().signOut('expired'),
  });
}
