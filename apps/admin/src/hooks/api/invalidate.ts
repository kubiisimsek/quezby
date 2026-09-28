import type { QueryClient } from '@tanstack/react-query';

/**
 * A moderation decision moves a player or a run between every list the panel
 * shows — boards, suspects, reports, the queue, the log — so all of them refresh.
 */
export function afterModeration(queryClient: QueryClient): Promise<void> {
  return Promise.all(
    ['players', 'runs', 'suspects', 'reports', 'boards', 'leagues', 'audit', 'overview', 'counts'].map((resource) =>
      queryClient.invalidateQueries({ queryKey: [resource] }),
    ),
  ).then(() => undefined);
}
