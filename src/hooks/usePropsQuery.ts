// hooks/usePropsQuery.ts
import { useState, useEffect, useCallback } from 'react';

export function usePropsQuery({
  sport,
  season,
  date,
  week,
  search,
  page = 1,
  pageSize = 50,
  sortBy,
  sortDir,
  columns
}: {
  sport: 'nba'|'nfl';
  season?: number;
  date?: string;
  week?: number;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc'|'desc';
  columns?: string[];
}) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|undefined>();

  const fetchPage = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const params = new URLSearchParams();
      params.set('sport', sport);
      if (season) params.set('season', String(season));
      if (date) params.set('date', date);
      if (week) params.set('week', String(week));
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (sortBy) params.set('sortBy', sortBy);
      if (sortDir) params.set('sortDir', sortDir);
      if (columns && columns.length) params.set('columns', columns.join(','));

      const res = await fetch(`/api/props?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch props');
      const json = await res.json();
      setData(json.items || []);
      setTotal(json.total || 0);
    } catch (err: any) {
      setError(err.message || 'Unknown');
    } finally {
      setLoading(false);
    }
  }, [sport, season, date, week, search, page, pageSize, sortBy, sortDir, columns]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  return { data, total, loading, error, refetch: fetchPage };
}
