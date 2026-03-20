import { useState, useEffect, useCallback, useRef } from 'react';

export interface NormalizedProp {
  id: string;
  league: 'nfl' | 'nba';
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
  pace?: number;        
  defRating?: number;   
}

interface UseAllPropsParams {
  league?: 'nfl' | 'nba';
  week?: number;
  season?: number;
}

const API_BASE = '/api';

export function useAllProps({ 
  league = 'nba', 
  week, 
  season = 2025 
}: UseAllPropsParams = {}) {
  const [props, setProps] = useState<NormalizedProp[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const abortControllerRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async (isNewQuery: boolean) => {
    // 1. Manage Abort Controller to prevent race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const currentOffset = isNewQuery ? 0 : offset;
    
    if (isNewQuery) {
      setProps([]);
      setOffset(0);
      setHasMore(true);
    }
    
    setLoading(true);

    try {
      const url = new URL(`${window.location.origin}${API_BASE}/all-props`);
      url.searchParams.append('league', league);
      url.searchParams.append('season', String(season));
      if (week) url.searchParams.append('week', String(week));
      url.searchParams.append('offset', String(currentOffset));
      url.searchParams.append('limit', String(limit));

      const res = await fetch(url.toString(), {
        signal: abortControllerRef.current.signal
      });
      
      const newData = await res.json();

      // 2. Validate Response
      if (res.ok && Array.isArray(newData)) {
        setProps(prev => isNewQuery ? newData : [...prev, ...newData]);
        setHasMore(newData.length === limit);
        setOffset(currentOffset + newData.length);
      } else {
        console.error("API Error or Malformed Data:", newData);
        if (isNewQuery) setProps([]); 
        setHasMore(false);
      }

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error("Failed to fetch props:", error);
    } finally {
      setLoading(false);
    }
  }, [league, week, season, offset]);

  // 3. Trigger initial load and reset on dependency change
  useEffect(() => {
    loadData(true);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [league, season, week]); // dependencies that trigger a fresh fetch

  const refresh = () => loadData(true);

  const deleteProp = async (id: string) => {
    // Optimistic Update
    setProps(prev => prev.filter(p => p.id !== id));
    
    try {
      // Ensure we hit the right collection for deletion too
      await fetch(`${API_BASE}/all-props/${id}?league=${league}&season=${season}`, { 
        method: 'DELETE' 
      });
    } catch (error) {
      console.error("Delete failed on server:", error);
    }
  };

  return { 
    props, 
    loading, 
    hasMore, 
    loadMore: () => loadData(false), 
    refresh, 
    deleteProp 
  };
}