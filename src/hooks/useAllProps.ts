import { useState, useEffect, useCallback, useRef } from 'react';

export interface NormalizedProp {
  id: string;
  league: 'nfl' | 'nba'; // Added league to the interface
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
  league?: 'nfl' | 'nba'; // Added league param
  week?: number;
  season?: number;
  initialLoad?: boolean;
}

const API_BASE = '/api';

export function useAllProps({ 
  league = 'nfl', 
  week, 
  season, 
  initialLoad = true 
}: UseAllPropsParams = {}) {
  const [props, setProps] = useState<NormalizedProp[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  // Track the current request to prevent race conditions when switching leagues
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async (isNewQuery: boolean) => {
    // Cancel any pending requests if we are starting a fresh query (e.g., league switch)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const currentOffset = isNewQuery ? 0 : offset;
    
    if (isNewQuery) {
      setProps([]);
      setOffset(0);
    }
    
    setLoading(true);

    try {
      const url = new URL(`${window.location.origin}${API_BASE}/props`);
      url.searchParams.append('league', league); // Crucial: Tell API which sport
      if (week) url.searchParams.append('week', String(week));
      if (season) url.searchParams.append('season', String(season));
      url.searchParams.append('offset', String(currentOffset));
      url.searchParams.append('limit', String(limit));

      const res = await fetch(url.toString(), {
        signal: abortControllerRef.current.signal
      });
      
      if (!res.ok) throw new Error('Network response was not ok');
      
      const newData = await res.json();
      
      setProps(prev => isNewQuery ? newData : [...prev, ...newData]);
      setHasMore(newData.length === limit);
      setOffset(currentOffset + newData.length);

    } catch (error: any) {
      if (error.name === 'AbortError') return; // Ignore cancellations
      console.error("Failed to fetch props:", error);
    } finally {
      setLoading(false);
    }
  }, [league, week, season, offset, limit]);

  // Trigger load on mount OR when filters change
  useEffect(() => {
    loadData(true);
    
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [league, week, season]); // Hook re-runs automatically when league/week/season change

  const refresh = () => loadData(true);

  const deleteProp = async (id: string) => {
    // Local optimistic update
    setProps(prev => prev.filter(p => p.id !== id));
    
    // Suggestion: Add an actual DELETE fetch here later
    // await fetch(`/api/props/${id}?league=${league}`, { method: 'DELETE' });
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