import { useState, useEffect, useCallback } from 'react';

export interface NormalizedProp {
  id: string;
  player?: string;
  prop?: string;
  line?: number;
  overUnder?: string;
  bestOdds?: number;
  odds?: number;
  matchup?: string;
  team?: string;
  week?: number;
  season?: number;
  gameDate?: string;
  gameStat?: number;     // Added for enrichment results
  actualResult?: string; // Added for enrichment results
}

export function useAllProps() {
  const [props, setProps] = useState<NormalizedProp[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchProps = useCallback(async (isInitial = false) => {
    // If we're already loading, or if there's no more data (and not a reset), bail out.
    if (loading || (!hasMore && !isInitial)) return;

    setLoading(true);
    setError(null);

    try {
      const cursor = isInitial ? '' : `&lastId=${lastId}`;
      const res = await fetch(`/api/all-props?limit=1000${cursor}`);
      
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      
      const data = await res.json();
      const newProps: NormalizedProp[] = data.props || [];

      setProps(prev => isInitial ? newProps : [...prev, ...newProps]);
      setLastId(data.lastId || null);
      setHasMore(data.hasMore ?? false);
    } catch (err: any) {
      console.error("Pagination error:", err);
      setError(err.message || "Failed to load historical props");
    } finally {
      setLoading(false);
    }
  }, [lastId, loading, hasMore]);

  // Reset the state and trigger a fresh fetch
  const refresh = useCallback(async () => {
    setProps([]); // Clear current list to show loading state
    setLastId(null);
    setHasMore(true);
    await fetchProps(true);
  }, [fetchProps]);

  // Initial load on mount
  useEffect(() => {
    fetchProps(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  return { 
    props, 
    loading, 
    error,
    hasMore, 
    loadMore: () => fetchProps(false), 
    refresh 
  };
}