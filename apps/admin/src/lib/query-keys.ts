/**
 * Every query's key, in one place, so a mutation can say exactly what it
 * made stale. The first element is the resource; invalidating it refreshes
 * every list and record of that resource.
 */
export const keys = {
  me: ['me'] as const,
  counts: ['counts'] as const,
  overview: ['overview'] as const,
  players: (query?: object) => (query ? (['players', 'list', query] as const) : (['players'] as const)),
  player: (id: string) => ['players', 'one', id] as const,
  playerActivity: (id: string) => ['players', 'activity', id] as const,
  runs: (query?: object) => (query ? (['runs', 'list', query] as const) : (['runs'] as const)),
  run: (id: string) => ['runs', 'one', id] as const,
  suspects: (query?: object) => (query ? (['suspects', query] as const) : (['suspects'] as const)),
  reports: (query?: object) => (query ? (['reports', query] as const) : (['reports'] as const)),
  boards: (query?: object) => (query ? (['boards', 'rows', query] as const) : (['boards'] as const)),
  boardKeys: (query: object) => ['boards', 'keys', query] as const,
  ratings: () => ['ratings', 'overview'] as const,
  calibration: (query: object) => ['ratings', 'calibration', query] as const,
  content: (query?: object) => (query ? (['content', query] as const) : (['content'] as const)),
  analytics: (query?: object) => (query ? (['analytics', query] as const) : (['analytics'] as const)),
  audit: (query?: object) => (query ? (['audit', query] as const) : (['audit'] as const)),
  logs: (query?: object) => (query ? (['logs', query] as const) : (['logs'] as const)),
  logSummary: (range: string) => ['logs', 'summary', range] as const,
  admins: ['admins'] as const,
  system: ['system'] as const,
};
