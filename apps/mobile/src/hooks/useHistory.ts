import type { RunDetailResponse, RunHistoryResponse, RunMode } from '@quezby/types';
import { useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query';

import { api } from '@/api/client';

/**
 * The player's past games — every run played to its end, as the API's
 * replay found it — the newest first, a page at a time; `mode` narrows them
 * to daily runs or VS.
 */
export function useRunHistory(mode: RunMode | null) {
  return useInfiniteQuery<
    RunHistoryResponse,
    Error,
    InfiniteData<RunHistoryResponse>,
    readonly string[],
    string | undefined
  >({
    queryKey: ['history', mode ?? 'all'],
    queryFn: ({ pageParam }) => api.me.runs({ cursor: pageParam, ...(mode ? { mode } : {}) }),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** One past game with everything its replay counted. */
export function useRunDetail(runId: string | null) {
  return useQuery<RunDetailResponse>({
    queryKey: ['run', runId],
    queryFn: () => api.me.run(runId as string),
    enabled: runId !== null,
  });
}
