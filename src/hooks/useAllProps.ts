import { useState, useEffect, useCallback } from 'react';

// FIX 1: Ensure 'export' is here so the component can see it
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
  gameStat?: number;
  actualResult?: string;
}

// Interface for the hook arguments
interface UseAllPropsFilters {
  week?: number;
  season?: number;
}

// FIX 2: Update signature to accept the object instead of a number
export function useAllProps(filters: UseAllPropsFilters = {}) {
  const [props, setProps] = useState<NormalizedProp[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchProps = useCallback(async (isInitial = false) => {
    if (loading || (!hasMore && !isInitial)) return;

    setLoading(true);
    try {
      const cursor = isInitial ? '' : `&lastId=${lastId}`;
      
      // Build query params from filters
      const weekParam = filters.week ? `&week=${filters.week}` : '';
      const seasonParam = filters.season ? `&season=${filters.season}` : '';
      
      const res = await fetch(`/api/all-props?limit=1000${cursor}${weekParam}${seasonParam}`);
      const data = await res.json();

      const newProps: NormalizedProp[] = data.props || [];

      setProps(prev => isInitial ? newProps : [...prev, ...newProps]);
      setLastId(data.lastId || null);
      setHasMore(data.hasMore ?? false);
    } catch (err) {
      console.error("Pagination error:", err);
    } finally {
      setLoading(false);
    }
    // Add filters to dependency array
  }, [lastId, loading, hasMore, filters.week, filters.season]);

  const refresh = useCallback(() => {
    setLastId(null);
    setHasMore(true);
    fetchProps(true);
  }, [fetchProps]);

  useEffect(() => { 
    fetchProps(true); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.week, filters.season]); 

  return { props, loading, hasMore, loadMore: () => fetchProps(false), refresh };
}
