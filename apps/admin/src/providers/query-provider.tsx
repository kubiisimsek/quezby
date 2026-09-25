import { ApiError } from '@quezby/sdk/admin';
import { QueryClient } from '@tanstack/react-query';

/**
 * Lists stay fresh for half a minute; a failed read is tried once more —
 * unless the API said no on purpose (a 4xx), which a retry cannot change.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failures, error) =>
          failures < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      },
      mutations: { retry: false },
    },
  });
}
