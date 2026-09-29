import type { AdminCalibrationQuery } from '@quezby/types';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useApi } from '@/lib/api';
import { keys } from '@/lib/query-keys';

/** The leagues' players, the highest ratings and the rules they run on. */
export function useRatings() {
  const api = useApi();
  return useQuery({ queryKey: keys.ratings(), queryFn: () => api.ratings.get() });
}

/** How the target table fits the players of a window — changing nothing. */
export function useCalibration(query: AdminCalibrationQuery) {
  const api = useApi();
  return useQuery({ queryKey: keys.calibration(query), queryFn: () => api.ratings.calibration(query), placeholderData: keepPreviousData });
}
