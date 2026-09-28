import type {
  DailyResponse,
  LeaderboardBoard,
  LeaderboardResponse,
  LeaderboardScope,
  LeagueResponse,
  PlayerResponse,
  StatsResponse,
  UserSearchResponse,
} from '@quezby/types';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { api } from '@/api/client';

/**
 * Server state for the competitive screens. Every number on them — ranks,
 * gaps, points, zones, countdowns — comes from these answers; the app only
 * draws them.
 */
export const boardKey = (board: LeaderboardBoard, scope: LeaderboardScope, limit: number) =>
  ['leaderboard', board, scope, limit] as const;

export function useLeaderboard(board: LeaderboardBoard, scope: LeaderboardScope = 'everyone', limit = 100) {
  return useQuery<LeaderboardResponse>({
    queryKey: boardKey(board, scope, limit),
    queryFn: () => api.leaderboards.get(board, { scope, limit }),
    placeholderData: keepPreviousData,
  });
}

export function useDaily() {
  return useQuery<DailyResponse>({ queryKey: ['daily'], queryFn: () => api.daily.get() });
}

export function useLeague() {
  return useQuery<LeagueResponse>({ queryKey: ['league'], queryFn: () => api.leagues.current() });
}

export function useStats() {
  return useQuery<StatsResponse>({ queryKey: ['stats'], queryFn: () => api.me.stats() });
}

export function usePlayer(username: string | null) {
  return useQuery<PlayerResponse>({
    queryKey: ['player', username],
    queryFn: () => api.users.get(username as string),
    enabled: username !== null,
  });
}

/** `value`, once it has stopped changing for `ms`. */
export function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

/** Players whose name starts with what was typed, once the typing pauses. */
export function useUserSearch(query: string) {
  const term = useDebounced(query.trim().toLowerCase(), 300);
  const valid = /^[a-z0-9.*]{2,20}$/.test(term);
  return useQuery<UserSearchResponse>({
    queryKey: ['search', term],
    queryFn: () => api.users.search(term),
    enabled: valid,
    placeholderData: keepPreviousData,
  });
}
