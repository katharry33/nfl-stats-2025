'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface NormalizedProp {
  id: string;
  player: string;
  team: string;
  prop: string;
  line: number;
  type?: string; // 'Over' or 'Under'
  price?: number;
  matchup?: string;
  league?: string;
  confidenceScore?: number;
  valueIcon?: string;
  lastUpdated?: string;
}

interface UseAllPropsOptions {
  league: string;
  season: string | number;
  week?: number | string;
  date?: string;
  limit?: number;
}

export function useAllProps({ 
  league, 
  season, 
  week, 
  date, 
  limit = 50 
}: UseAllPropsOptions) {
  const [props, setProps] = useState<NormalizedProp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchProps = useCallback(async (currentOffset: number, isRefresh: boolean = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        league,
        season: String(season),
        offset: String(currentOffset),
        limit: String(limit),
      });

      if (week) params.append('week', String(week));
      if (date) params.append('date', date);

      // FIXED: Pointed to /api/props instead of /api/all-props
      const response = await fetch(`/api/props?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data: NormalizedProp[] = await response.json();

      setProps(prev => isRefresh ? data : [...prev, ...data]);
      setHasMore(data.length >= limit);
      setError(null);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Fetch Error:', err);
      setError(err.message || 'Failed to fetch props');
    } finally {
      setLoading(false);
    }
  }, [league, season, week, date, limit]);

  useEffect(() => {
    setOffset(0);
    fetchProps(0, true);
    return () => abortControllerRef.current?.abort();
  }, [league, season, week, date, fetchProps]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const nextOffset = offset + limit;
    setOffset(nextOffset);
    fetchProps(nextOffset, false);
  }, [loading, hasMore, offset, limit, fetchProps]);

  const refresh = useCallback(() => {
    setOffset(0);
    fetchProps(0, true);
  }, [fetchProps]);

  return { props, loading, error, hasMore, loadMore, refresh };
}