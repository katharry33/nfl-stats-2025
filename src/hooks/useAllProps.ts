
import { useState, useEffect, useCallback } from 'react';

export interface NormalizedProp {
  id: string;
  player: string | null;
  team: string | null;
  prop: string | null;
  line: number | null;
  overUnder: string | null;
  odds: number | null;
  bestOdds: number | null;
  bestBook: string | null;
  matchup: string | null;
  gameDate: string | null;
  week: number | null;
  season: number | null;
  valueIcon: string | null;
  playerAvg: number | null;
  seasonHitPct: number | null;
  opponentRank: number | null;
  opponentAvgVsStat: number | null;
  scoreDiff: number | null;
  confidenceScore: number | null;
  avgWinProb: number | null;
  bestEdgePct: number | null;
  expectedValue: number | null;
  kellyPct: number | null;
  projWinPct: number | null;
  impliedProb: number | null;
  fdOdds: number | null;
  dkOdds: number | null;
}

interface UseAllPropsParams {
  week?: number;
  season?: number;
  initialLoad?: boolean;
}

const API_BASE = '/api';

async function fetchFromApi(endpoint: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/${endpoint}`);
    if (!res.ok) {
      console.error(`Failed to fetch ${endpoint}: ${res.statusText}`);
      return [];
    }
    return await res.json();
  } catch (err) {
    console.error(`Error fetching ${endpoint}:`, err);
    return [];
  }
}

export function useAllProps({ week, season, initialLoad = false }: UseAllPropsParams = {}) {
  const [props, setProps] = useState<NormalizedProp[]>([]);
  const [loading, setLoading] = useState(initialLoad);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const buildUrl = useCallback(() => {
    const url = new URL(`${API_BASE}/props`);
    if (week) url.searchParams.append('week', String(week));
    if (season) url.searchParams.append('season', String(season));
    url.searchParams.append('offset', String(offset));
    url.searchParams.append('limit', String(limit));
    return url.toString();
  }, [week, season, offset]);

  const loadData = useCallback(async (isNewQuery: boolean) => {
    if (isNewQuery) {
      setOffset(0);
      setProps([]);
    }
    setLoading(true);

    try {
      const url = buildUrl();
      const res = await fetch(url);
      const newData = await res.json();
      
      setProps(prev => isNewQuery ? newData : [...prev, ...newData]);
      setHasMore(newData.length === limit);
      setOffset(prev => prev + newData.length);

    } catch (error) {
      console.error("Failed to fetch props:", error);
    } finally {
      setLoading(false);
    }
  }, [buildUrl, limit]);

  useEffect(() => {
    if (initialLoad) {
      loadData(true);
    }
  }, [initialLoad, loadData]);

  const refresh = () => loadData(true);

  const deleteProp = async (id: string) => {
    // DB-side deletion removed for this example.
    // Simulating by filtering out from the local state.
    setProps(prev => prev.filter(p => p.id !== id));
  };

  return { props, loading, hasMore, loadMore: () => loadData(false), refresh, deleteProp };
}
