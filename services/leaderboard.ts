import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import type { Difficulty } from '@/utils/sudoku';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export type LeaderboardRow = {
  id: string;
  user_id: string;
  username: string;
  difficulty_level: Difficulty;
  fastest_time: number;
  updated_at: string;
};

async function restFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase configuration');
  }
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase REST error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export function useTop10(difficulty: Difficulty) {
  return useQuery({
    queryKey: ['leaderboard', 'top10', difficulty],
    queryFn: async () => {
      const rows = await restFetch<LeaderboardRow[]>(
        `/rest/v1/leaderboard?select=*&difficulty_level=eq.${difficulty}&order=fastest_time.asc&limit=10`,
      );
      return rows;
    },
    enabled: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
  });
}

export function useUserBest(difficulty: Difficulty) {
  const { user, session } = useAuth();
  return useQuery({
    queryKey: ['leaderboard', 'userBest', difficulty, user?.id ?? 'anon'],
    queryFn: async () => {
      if (!user || !session) return null;
      const rows = await restFetch<LeaderboardRow[]>(
        `/rest/v1/leaderboard?select=*&user_id=eq.${user.id}&difficulty_level=eq.${difficulty}&limit=1`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      return rows[0] ?? null;
    },
    enabled: Boolean(user && session && SUPABASE_URL && SUPABASE_ANON_KEY),
  });
}

export function useUserRank(difficulty: Difficulty) {
  const { user, session } = useAuth();
  return useQuery({
    queryKey: ['leaderboard', 'rank', difficulty, user?.id ?? 'anon'],
    queryFn: async () => {
      if (!user || !session) return null as { rank: number; best: number } | null;
      const bestRows = await restFetch<LeaderboardRow[]>(
        `/rest/v1/leaderboard?select=fastest_time&user_id=eq.${user.id}&difficulty_level=eq.${difficulty}&limit=1`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      const best = bestRows[0]?.fastest_time;
      if (typeof best !== 'number') return null;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?select=id&difficulty_level=eq.${difficulty}&fastest_time=lt.${best}`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
          Prefer: 'count=exact',
          Range: '0-0',
          Accept: 'application/json',
        },
      });
      const contentRange = res.headers.get('content-range');
      const count = contentRange ? Number(contentRange.split('/')?.[1] ?? '0') : 0;
      return { rank: count + 1, best };
    },
    enabled: Boolean(user && session && SUPABASE_URL && SUPABASE_ANON_KEY),
  });
}

export function useSubmitTime() {
  const { user, session, username } = useAuth();
  const canSubmit = useMemo(() => Boolean(user && session && SUPABASE_URL && SUPABASE_ANON_KEY), [user, session]);

  return useMutation({
    mutationKey: ['leaderboard', 'submit'],
    mutationFn: async (params: { difficulty: Difficulty; timeSeconds: number }) => {
      if (!user || !session) throw new Error('Not authenticated');
      const { difficulty, timeSeconds } = params;
      const existing = await restFetch<LeaderboardRow[]>(
        `/rest/v1/leaderboard?select=*&user_id=eq.${user.id}&difficulty_level=eq.${difficulty}&limit=1`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (existing.length === 0) {
        const inserted = await restFetch<LeaderboardRow[]>(
          '/rest/v1/leaderboard',
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({
              user_id: user.id,
              username: username || user.email,
              difficulty_level: difficulty,
              fastest_time: timeSeconds,
            }),
          },
        );
        return inserted[0];
      }
      const current = existing[0];
      if (typeof current.fastest_time === 'number' && current.fastest_time <= timeSeconds) {
        return current;
      }
      const updated = await restFetch<LeaderboardRow[]>(
        `/rest/v1/leaderboard?id=eq.${current.id}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ fastest_time: timeSeconds, username: username || current.username }),
        },
      );
      return updated[0];
    },
  });
}
