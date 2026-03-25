// src/hooks/use-props-query.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchPaginatedProps } from '@/lib/services/props-service';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

export function usePropsQuery(filters: {
  league: 'nba' | 'nfl';
  season?: number;
  date?: string;
  week?: number | string;
  search?: string;
  vaultMode?: boolean; // Critical for hitting the archive collections
}) {
  return useInfiniteQuery({
    // The key must change whenever ANY filter changes to trigger a refetch
    queryKey: ['props', filters],
    
    queryFn: ({ pageParam }: { pageParam: QueryDocumentSnapshot<DocumentData> | null }) => 
      fetchPaginatedProps(filters, pageParam),

    initialPageParam: null as QueryDocumentSnapshot<DocumentData> | null, 

    getNextPageParam: (lastPage) => {
      if (!lastPage.docs || lastPage.docs.length === 0) return undefined;
      return lastPage.lastVisible;
    },
    
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2, // 2 minutes is safer for active dev
  });
}