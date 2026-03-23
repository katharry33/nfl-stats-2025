import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchPaginatedProps } from '@/lib/services/props-service';

export function usePropsQuery(filters: any) {
  return useInfiniteQuery({
    // 1. Keep the queryKey specific to all filter changes
    queryKey: ['props-vault', filters.league, filters.week, filters.date, filters.season, filters.search],
    
    // 2. The queryFn must destructure { pageParam }
    queryFn: ({ pageParam }) => 
      fetchPaginatedProps(filters, pageParam),

    // 3. initialPageParam MUST be null for Firestore startAfter(null) to work or be ignored
    initialPageParam: null as any, 

    // 4. Return undefined if there's no more data to stop the fetcher
    getNextPageParam: (lastPage: any) => {
      return lastPage.lastVisible || undefined;
    },
    
    // 5. Optimization: Don't refetch on window focus while you're debugging
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}