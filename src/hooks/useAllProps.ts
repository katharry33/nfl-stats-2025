import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { NFLProp } from '@/lib/types';

// Standardized structure for the UI
export type NormalizedProp = NFLProp & { 
  id: string;
  scoreDiff: number;
  seasonHitPct: number;
  confidenceScore: number;
  expectedValue: number;
  projWinPct: number;
  bestEdgePct: number;
  actualResult?: string;
};

export interface UseAllPropsOptions {
  week?: number;
  season?: number;
}

export interface UseAllPropsReturn {
  props: NormalizedProp[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  deleteProp: (id: string) => Promise<void>;
  allProps: NormalizedProp[];
  propTypes: string[];
  fetchProps: (force?: boolean) => Promise<void>;
}

// Utility to grab values from messy Firestore docs
const getStat = (raw: any, key: string): number => {
  const camelKey = key;
  const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);
  const spaceKey = pascalKey.replace(/([A-Z])/g, ' $1').trim();
  
  const val = raw[camelKey] ?? raw[spaceKey] ?? raw[pascalKey] ?? 0;
  return typeof val === 'number' ? val : parseFloat(val) || 0;
};

const PAGE_SIZE = 50;

export function useAllProps(options?: UseAllPropsOptions | number): UseAllPropsReturn {
  const opts: UseAllPropsOptions = typeof options === 'number'
    ? { week: options }
    : (options ?? {});

  const { week, season } = opts;

  const [props, setProps] = useState<NormalizedProp[]>([]);
  const [propTypes, setPropTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const loadingRef = useRef(false);

  // Normalization logic applied to every incoming prop
  const normalizeData = useCallback((rawArray: any[]): NormalizedProp[] => {
    return rawArray.map(item => ({
      ...item,
      id: String(item.id || item._id),
      // Coalesce messy keys into clean ones for the table
      scoreDiff:       getStat(item, 'scoreDiff'),
      seasonHitPct:    getStat(item, 'seasonHitPct'),
      confidenceScore: getStat(item, 'confidenceScore'),
      expectedValue:   getStat(item, 'expectedValue'),
      projWinPct:      getStat(item, 'projWinPct'),
      bestEdgePct:     getStat(item, 'bestEdgePct'),
      actualResult:    item.actualResult ?? item['actual stats'] ?? item.actualResult,
      player:          item.player ?? item.Player ?? 'Unknown',
      prop:            item.prop ?? item.Prop ?? 'Prop',
    }));
  }, []);

  const buildParams = useCallback((cursorVal?: string | null, bust?: boolean) => {
    const p = new URLSearchParams();
    if (week !== undefined) p.set('week', String(week));
    if (season !== undefined) p.set('season', String(season));
    p.set('collection', week !== undefined && season === undefined ? 'weekly' : 'all');
    p.set('limit', String(PAGE_SIZE));
    if (cursorVal) p.set('cursor', cursorVal);
    if (bust) p.set('bust', 'true');
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
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      
      setProps(normalizeData(data.props ?? [])); // <--- Normalized here
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
  }, [buildParams, normalizeData]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !cursor || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(`/api/all-props?${buildParams(cursor)}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      
      const newProps = normalizeData(data.props ?? []); // <--- Normalized here
      setProps(prev => [...prev, ...newProps]);
      setHasMore(data.hasMore ?? false);
      setCursor(data.cursor ?? null);
    } catch (err: any) {
      toast.error(`Load more failed: ${err.message}`);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [hasMore, cursor, buildParams, normalizeData]);

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