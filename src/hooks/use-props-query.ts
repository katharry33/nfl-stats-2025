// src/hooks/use-props-query.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchPaginatedProps } from '@/lib/services/props-service';

export function usePropsQuery(filters: any) {
  return useInfiniteQuery({
    queryKey: ['props', filters], 
    queryFn: ({ pageParam = null }) => fetchPaginatedProps(filters, pageParam),
    initialPageParam: null,
    // FIX: Added explicit 'any' to lastPage
    getNextPageParam: (lastPage: any) => lastPage.lastVisible || undefined,
    staleTime: 1000 * 60 * 5, 
  });
}