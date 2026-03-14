// src/hooks/useAllProps.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { NFLProp } from '@/lib/types';

export type NormalizedProp = NFLProp & { id: string };

export interface UseAllPropsOptions {
  week?:   number;
  season?: number;
}

export interface UseAllPropsReturn {
  props:    NormalizedProp[];
  loading:  boolean;
  error:    string | null;
  hasMore:  boolean;
  loadMore: () => void;
  refresh:  () => void;
  deleteProp: (id: string) => Promise<void>;
  // Legacy aliases for Bet Builder compatibility
  allProps:   NormalizedProp[];
  propTypes:  string[];
  fetchProps: (force?: boolean) => Promise<void>;
}

const PAGE_SIZE = 50;

export function useAllProps(options?: UseAllPropsOptions | number): UseAllPropsReturn {
  // Support both: useAllProps(weekNumber) and useAllProps({ week, season })
  const opts: UseAllPropsOptions = typeof options === 'number'
    ? { week: options }
    : (options ?? {});

  const { week, season } = opts;

  const [props,     setProps]     = useState<NormalizedProp[]>([]);
  const [propTypes, setPropTypes] = useState<string[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [hasMore,   setHasMore]   = useState(false);
  const [cursor,    setCursor]    = useState<string | null>(null);
  const loadingRef = useRef(false);

  const buildParams = useCallback((cursorVal?: string | null, bust?: boolean) => {
    const p = new URLSearchParams();
    if (week   !== undefined) p.set('week',   String(week));
    if (season !== undefined) p.set('season', String(season));
    // Bet Builder passes week only → weekly; Historical Props → all
    p.set('collection', week !== undefined && season === undefined ? 'weekly' : 'all');
    p.set('limit', String(PAGE_SIZE));
    if (cursorVal) p.set('cursor', cursorVal);
    if (bust)      p.set('bust', 'true');
    return p.toString();
  }, [week, season]);

  const fetchProps = useCallback(async (force = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/all-props?${buildParams(null, force)}`, {
        cache: force ? 'no-store' : 'default',
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      const data = await res.json();
      setProps(data.props ?? []);
      setPropTypes(data.propTypes ?? []);
      setHasMore(data.hasMore ?? false);
      setCursor(data.cursor ?? null);
    } catch (err: any) {
      setError(err.message);
      toast.error(`Fetch error: ${err.message}`);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [buildParams]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !cursor || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(`/api/all-props?${buildParams(cursor)}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setProps(prev => [...prev, ...(data.props ?? [])]);
      setHasMore(data.hasMore ?? false);
      setCursor(data.cursor ?? null);
    } catch (err: any) {
      toast.error(`Load more failed: ${err.message}`);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [hasMore, cursor, buildParams]);

  const refresh = useCallback(() => fetchProps(true), [fetchProps]);

  const deleteProp = useCallback(async (id: string) => {
    let snapshot: NormalizedProp[] = [];
    setProps(prev => { snapshot = prev; return prev.filter(p => p.id !== id); });
    try {
      const res = await fetch(`/api/all-props/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Prop deleted.');
    } catch {
      toast.error('Delete failed — reverting.');
      setProps(snapshot);
    }
  }, []);

  useEffect(() => { fetchProps(); }, [fetchProps]);

  return { props, loading, error, hasMore, loadMore, refresh, deleteProp, allProps: props, propTypes, fetchProps };
}