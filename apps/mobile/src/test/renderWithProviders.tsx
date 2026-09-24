import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * A cache of its own for one test. No retries, so a failing query fails at
 * once; no garbage-collection timer to keep Jest waiting after the run.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
}

/**
 * Renders under what a screen expects around it — a fresh query cache, safe
 * area insets and a navigation container — and hands the cache back so a
 * test can seed it (`queryClient.setQueryData`) or read what was fetched.
 */
export async function renderWithProviders(
  ui: ReactElement,
  { queryClient = createTestQueryClient() }: { queryClient?: QueryClient } = {},
) {
  function Providers({ children }: { children: ReactNode }) {
    return (
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>{children}</NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    );
  }

  const result = await render(ui, { wrapper: Providers });
  return { ...result, queryClient };
}
