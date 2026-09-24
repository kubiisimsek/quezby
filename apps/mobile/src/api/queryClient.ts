import { QueryClient } from '@tanstack/react-query';

/**
 * One cache for the whole app, importable outside React so a mutation can
 * write its answer into it (`rememberMe`) rather than wait for a refetch.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});
