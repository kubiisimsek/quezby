import type { QueryClient } from '@tanstack/react-query';

/**
 * A moderation decision moves a player or a run between every list the panel
 * shows — boards, ratings, suspects, reports, the queue, the log — so all of
 * them refresh: a reject takes back what the run did to the rating, a ban
 * takes the player off the highest ratings.
 */
export function afterModeration(queryClient: QueryClient): Promise<void> {
  return Promise.all(
    ['players', 'runs', 'suspects', 'reports', 'boards', 'ratings', 'audit', 'overview', 'counts'].map((resource) =>
      queryClient.invalidateQueries({ queryKey: [resource] }),
    ),
  ).then(() => undefined);
}
