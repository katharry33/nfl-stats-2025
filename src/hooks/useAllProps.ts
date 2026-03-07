// src/hooks/useAllProps.ts
'use client';
import { useState, useCallback, useRef } from 'react';

export interface NormalizedProp {
  id:               string;
  player:           string;
  team:             string;
  prop:             string;
  line:             number;
  overUnder:        string;
  matchup:          string;
  week:             number | null;
  gameDate:         string | null;
  gameTime:         string;
  season:           number | null;
  // analytics
  playerAvg:        any;
  opponentRank:     any;
  opponentAvgVsStat:any;
  yardsScore:       any;
  rankScore:        any;
  totalScore:       any;
  scoreDiff:        any;
  scalingFactor:    any;
  winProbability:   any;
  projWinPct:       any;
  seasonHitPct:     any;
  avgWinProb:       any;
  odds:             any;
  impliedProb:      any;
  bestEdgePct:      any;
  expectedValue:    any;
  kellyPct:         any;
  valueIcon:        any;
  confidenceScore:  any;
  gameStats:        any;
  actualResult:     string;
}

// Module-level client cache — survives component remounts within the same session
let clientCache: NormalizedProp[] | null = null;
let clientCachePropTypes: string[] | null = null;
let clientCacheTime = 0;
const CLIENT_CACHE_TTL_MS = 5 * 60 * 1000;

function isClientCacheValid() {
  return clientCache !== null && Date.now() - clientCacheTime < CLIENT_CACHE_TTL_MS;
}

export function useAllProps() {
  const [allProps,  setAllProps]  = useState<NormalizedProp[]>(clientCache ?? []);
  const [propTypes, setPropTypes] = useState<string[]>(clientCachePropTypes ?? []);
  const [loading,   setLoading]   = useState(!isClientCacheValid());
  const [error,     setError]     = useState<string | null>(null);
  const [cacheAge,  setCacheAge]  = useState<number | null>(null);
  const fetching = useRef(false);

  const fetchProps = useCallback(async (bust = false) => {
    if (!bust && isClientCacheValid()) {
      setAllProps(clientCache!);
      setPropTypes(clientCachePropTypes!);
      setLoading(false);
      return;
    }
    if (fetching.current) return;
    fetching.current = true;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: '10000' });
      if (bust) params.set('bust', '1');
      const res = await fetch(`/api/all-props?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const props: NormalizedProp[] = data.props ?? [];
      const types: string[] = data.propTypes ?? [];
      clientCache          = props;
      clientCachePropTypes = types;
      clientCacheTime      = Date.now();
      setAllProps(props);
      setPropTypes(types);
      setCacheAge(data.cacheAge ?? null);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load props');
    } finally {
      setLoading(false);
      fetching.current = false;
    }
  }, []);

  // Optimistic delete — removes from local state and busts cache
  const deleteProp = useCallback(async (id: string) => {
    setAllProps(prev => {
      const updated = prev.filter(p => p.id !== id);
      clientCache = updated;
      return updated;
    });
    const res = await fetch(`/api/all-props?id=${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      // Revert by re-fetching
      clientCache = null;
      throw new Error('Delete failed');
    }
  }, []);

  return {
    allProps, propTypes, loading, error, cacheAge,
    fetchProps, deleteProp,
    totalCount: allProps.length,
  };
}