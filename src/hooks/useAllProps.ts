'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface NormalizedProp {
  id: string;
  league?: string;
  player?: string | null;
  team?: string | null;
  prop?: string | null;
  line?: number | null;
  overUnder?: string | null;
  odds?: number | null;
  bestOdds?: number | null;
  bestBook?: string | null;
  matchup?: string | null;
  gameDate?: string | null;
  week?: number | null;
  season?: number | null;
  playerAvg?: number | null;
  seasonHitPct?: number | null;
  opponentRank?: number | null;
  opponentAvgVsStat?: number | null;
  scoreDiff?: number | null;
  confidenceScore?: number | null;
  projWinPct?: number | null;
  avgWinProb?: number | null;
  bestEdgePct?: number | null;
  expectedValue?: number | null;
  kellyPct?: number | null;
  valueIcon?: string | null;
  impliedProb?: number | null;
  pace?: number | null;
  defRating?: number | null;
  fdOdds?: number | null;
  dkOdds?: number | null;
  gameStat?: number | null;
  actualResult?: string | null;
  bdlId?: number | null;
  brid?: string | null;
  type?: string;
  price?: number;
  lastUpdated?: string;
  updatedAt?: string;
  enrichedAt?: string;
}

interface UseAllPropsOptions {
  league: string;
  season: string | number;
  week?: number | string;
  date?: string;
  search?: string; // Added Search
  limit?: number;
}

export function useAllProps({
  league,
  season,
  week,
  date,
  search,
  limit = 50,
}: UseAllPropsOptions) {
  const [props, setProps] = useState<NormalizedProp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const abortRef = useRef<AbortController | null>(null);

  const fetchProps = useCallback(async (currentOffset: number, isRefresh = false) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      setLoading(true);
      const params = new URLSearchParams({
        league,
        season: String(season),
        offset: String(currentOffset),
        limit: String(limit),
      });
      if (week && week !== 'All') params.append('week', String(week));
      if (date && date !== 'All') params.append('date', date);
      if (search) params.append('search', search); // Pass search to backend

      const res = await fetch(`/api/props?${params}`, {
        signal: abortRef.current.signal,
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (!res.ok) throw new Error(`Server responded with ${res.status}`);

      // Logic check: Ensure we handle the "docs" wrapper if your API returns {docs, total}
      const rawData = await res.json();
      const data: NormalizedProp[] = Array.isArray(rawData) ? rawData : (rawData.docs || []);

      setProps(prev => isRefresh ? data : [...prev, ...data]);
      setHasMore(data.length >= limit);
      setError(null);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message ?? 'Failed to fetch props');
    } finally {
      setLoading(false);
    }
  }, [league, season, week, date, search, limit]);

  useEffect(() => {
    setOffset(0);
    fetchProps(0, true);
    return () => abortRef.current?.abort();
  }, [league, season, week, date, search, fetchProps]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const next = offset + limit;
    setOffset(next);
    fetchProps(next, false);
  }, [loading, hasMore, offset, limit, fetchProps]);

  const refresh = useCallback(() => {
    setOffset(0);
    fetchProps(0, true);
  }, [fetchProps]);

  return { props, loading, error, hasMore, loadMore, refresh };
}