import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchPaginatedProps } from '@/lib/services/props-service';

export function usePropsQuery(filters: any) {
  return useInfiniteQuery({
    // 1. Include search and league to ensure fresh fetches on toggle
    queryKey: ['props-vault', filters.league, filters.season, filters.date, filters.week, filters.search],
    
    // 2. Pass filters and pageParam
    queryFn: ({ pageParam }) => 
      fetchPaginatedProps({ ...filters }, pageParam),

    initialPageParam: null as any, 

    getNextPageParam: (lastPage: any) => {
      // If Firestore returns no docs, stop the infinite scroll
      if (!lastPage.docs || lastPage.docs.length === 0) return undefined;
      return lastPage.lastVisible || undefined;
    },
    
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}