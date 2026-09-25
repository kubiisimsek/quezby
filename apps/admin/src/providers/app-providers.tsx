import type { AdminClient } from '@quezby/sdk/admin';
import * as Tooltip from '@radix-ui/react-tooltip';
import { QueryClientProvider, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { Toaster } from 'sonner';

import { ApiProvider } from '@/lib/api';
import { ThemeProvider, useTheme } from '@/providers/theme-provider';
import { useSession } from '@/stores/session';

/**
 * Everything a page stands on: the theme, the query cache, the API client,
 * tooltips and toasts — and the watch that ends a session on time.
 */
export function AppProviders({
  client,
  queryClient,
  children,
}: {
  client: AdminClient;
  queryClient: QueryClient;
  children: ReactNode;
}) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ApiProvider client={client}>
          <Tooltip.Provider delayDuration={120}>
            <SessionWatch />
            {children}
            <PanelToaster />
          </Tooltip.Provider>
        </ApiProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

/**
 * Signs out at the session's `expiresAt` without waiting for a 401, and
 * forgets every cached answer the moment a session ends — the next admin at
 * this browser sees nothing of the last one's.
 */
function SessionWatch() {
  const queryClient = useQueryClient();
  const session = useSession((state) => state.session);
  const signOut = useSession((state) => state.signOut);

  useEffect(() => {
    if (!session) {
      queryClient.clear();
      return;
    }
    const left = new Date(session.expiresAt).getTime() - Date.now();
    // setTimeout overflows past ~24.8 days; a panel session is hours long.
    const timer = window.setTimeout(() => signOut('expired'), Math.max(0, Math.min(left, 2_147_000_000)));
    return () => window.clearTimeout(timer);
  }, [session, signOut, queryClient]);

  return null;
}

function PanelToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      position="bottom-right"
      theme={resolvedTheme}
      toastOptions={{
        classNames: {
          toast: '!gap-3 !rounded-panel !border-0 !bg-raised !text-ink !shadow-raised !font-sans !text-body !font-semibold',
          description: '!text-ink-muted !font-medium',
          icon: '!text-primary-text',
        },
      }}
    />
  );
}
