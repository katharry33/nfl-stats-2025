'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { PropDoc } from '@/lib/types';

type Sport = 'nba' | 'nfl';

interface UsePropsQueryArgs {
  league: Sport;
  season?: number;
  date?: string;
  week?: number;
  search?: string;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  columns?: string; 
}

export function usePropsQuery({
  league,
  season,
  date,
  week,
  search,
  pageSize = 50,
  sortBy,
  sortDir,
  columns,
}: UsePropsQueryArgs) {
  const [data, setData] = useState<PropDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const isFetching = useRef(false);

  const fetchProps = useCallback(async (isNextPage = false) => {
    if (isFetching.current) return;
    
    isFetching.current = true;
    setLoading(true);
    setError(undefined);

    try {
      const collectionYear = league === 'nba' && season === 2026 ? 2025 : season;
      const params = new URLSearchParams({
        sport: league,
        season: String(collectionYear || ''),
        pageSize: String(pageSize),
      });

      if (date) params.append('date', date);
      if (week) params.append('week', String(week));
      if (search) params.append('search', search);
      if (sortBy) params.append('sortBy', sortBy);
      if (sortDir) params.append('sortDir', sortDir);
      if (columns) params.append('columns', columns);
      
      if (isNextPage && cursor) {
        params.append('cursor', cursor);
      }

      const res = await fetch(`/api/props?${params.toString()}`);
      
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to fetch props');
      }

      const json = await res.json();
      const items = json.items.map((item: any) => ({ ...item, league }));
      
      setData(prev => isNextPage ? [...prev, ...items] : items);
      setCursor(json.cursor || null);
      setHasMore(!!json.cursor);
    } catch (err: any) {
      setError(err.message || 'Unknown Error');
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [league, season, date, week, search, pageSize, sortBy, sortDir, columns, cursor]);

  useEffect(() => {
    setCursor(null);
    setData([]);
    fetchProps(false); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [league, season, date, week, search]); 

  return { 
    data, 
    loading, 
    error, 
    hasMore, 
    refetch: () => fetchProps(false),
    loadMore: () => fetchProps(true) 
  };
}
