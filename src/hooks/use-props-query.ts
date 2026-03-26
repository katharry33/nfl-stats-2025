// src/hooks/use-props-query.ts
import { useInfiniteQuery } from '@tanstack/react-query';

export function usePropsQuery(filters: {
  league: 'nba' | 'nfl';
  season: string;
  date?: string;
  week?: string | number;
  search?: string;
}) {
  const { league, season, week, date, search } = filters;

  return useInfiniteQuery({
    // The Key: A unique identifier for THIS specific set of data
    queryKey: [
      'props-vault', // Base identifier
      league,        // 'nba' | 'nfl'
      season,        // '2024' | '2025'
      { week, date, search } // Specific filters
    ],
    
    queryFn: async ({ pageParam = null }: { pageParam?: string | null }) => {
      // Construct URL safely
      const url = new URL(`/api/props`, window.location.origin);
      url.searchParams.append('league', league);
      url.searchParams.append('season', season);
      
      // Only append week/date if they are not 'All'
      if (week && week !== 'All') {
        url.searchParams.append('week', String(week));
      }
      if (date && date !== 'All') {
        url.searchParams.append('date', date);
      }
      
      if (pageParam) {
        url.searchParams.append('cursor', pageParam);
      }
      
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`Failed to fetch props: ${res.statusText}`);
      }
      return res.json();
    },
    
    // Pagination logic
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    
    initialPageParam: null,

    // ⚡ Performance Optimization
    staleTime: 1000 * 60 * 5, // 5 mins: Data stays "fresh" in cache
    gcTime: 1000 * 60 * 30,    // 30 mins: Data stays in memory even if unused
    refetchOnWindowFocus: false,
  });
}
