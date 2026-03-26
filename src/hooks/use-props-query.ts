// src/hooks/use-props-query.ts
import { useInfiniteQuery } from '@tanstack/react-query';

// Define the shape of the data coming back from your /api/props route
export interface PropsResponse {
  props: any[];
  nextCursor: string | null;
  total?: number;
}

export interface PropsFilters {
  league: 'nba' | 'nfl';
  season: string;
  date?: string;
  week?: string | number;
  search?: string;
  // [key: string]: any; // Optional: Add this if you want to allow passing extra state safely
}

export function usePropsQuery(filters: PropsFilters) {
  const { league, season, week, date, search } = filters;

  return useInfiniteQuery<PropsResponse>({
    queryKey: [
      'props-vault', 
      league, 
      season, 
      { week, date, search }
    ],
    
    queryFn: async ({ pageParam = null }) => {
      const url = new URL(`/api/props`, window.location.origin);
      url.searchParams.append('league', league);
      url.searchParams.append('season', season);
      
      if (week && week !== 'All') {
        url.searchParams.append('week', String(week));
      }
      if (date && date !== 'All') {
        url.searchParams.append('date', date);
      }
      if (search) {
        url.searchParams.append('search', search);
      }
      if (pageParam) {
        url.searchParams.append('cursor', String(pageParam));
      }
      
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`Failed to fetch props: ${res.statusText}`);
      }
      return res.json();
    },
    
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null,

    staleTime: 1000 * 60 * 5, 
    gcTime: 1000 * 60 * 30, 
    refetchOnWindowFocus: false,
  });
}