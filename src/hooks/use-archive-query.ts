import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchArchiveProps } from '@/lib/services/props-service';

// FIXED: Accept all filter properties, not just league/search
export function useArchiveQuery(filters: { 
  league: string; 
  search: string;
  season?: string;
  week?: string;
  date?: string;
  collection?: string;
}) {
  return useInfiniteQuery({
    // Adding the entire filters object to the key ensures 
    // the cache busts whenever ANY filter (like date) changes
    queryKey: ['props-archive', filters], 
    
    queryFn: ({ pageParam }) => fetchArchiveProps(filters, pageParam),
    
    initialPageParam: null as any,
    
    getNextPageParam: (lastPage: any) => {
      // Ensure we return undefined if there's no more data
      return lastPage?.lastVisible ?? undefined;
    },
    
    // Safety: prevent constant background refreshes while testing
    refetchOnWindowFocus: false, 
    staleTime: 1000 * 60 * 5, 
  });
}