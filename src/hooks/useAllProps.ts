import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { NFLProp } from '@/lib/types';

export type NormalizedProp = NFLProp & { id: string };

export interface UseAllPropsReturn {
  allProps: NormalizedProp[];
  propTypes: string[];
  loading: boolean;
  error: string | null;
  cacheAge: number | null;
  totalCount: number;
  fetchProps: (force?: boolean) => Promise<void>;
  deleteProp: (id: string) => Promise<void>;
}

export function useAllProps(week?: number): UseAllPropsReturn {
  const [allProps, setAllProps] = useState<NormalizedProp[]>([]);
  const [propTypes, setPropTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheAge, setCacheAge] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchProps = useCallback(async (bustCache = false) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      // Ensure we pass the week if available
      if (week !== undefined && week !== null) {
        params.set('week', String(week));
      }
      
      // If we are forcing a refresh after enrichment, tell the API
      if (bustCache) {
        params.set('bust', 'true');
        params.set('refresh', 'true'); // Added for backend cache-control clarity
      }
      
      const res = await fetch(`/api/all-props?${params.toString()}`, {
        // Force browser-level cache bypass if bustCache is true
        cache: bustCache ? 'no-store' : 'default'
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch props: ${res.status} ${errorText}`);
      }
      
      const data = await res.json();
      setAllProps(data.props ?? []);
      setPropTypes(data.propTypes ?? []);
      setTotalCount(data.totalCount ?? 0);
      setCacheAge(data.cacheAge ?? null);
    } catch (err: any) {
      setError(err.message);
      toast.error(`Fetch Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [week]);

  const deleteProp = useCallback(async (id: string) => {
    // Keep a snapshot for potential rollback
    let snapshot: NormalizedProp[] = [];
    
    setAllProps(prev => {
      snapshot = prev;
      return prev.filter(p => p.id !== id);
    });
    
    toast.info('Prop deleted.');

    try {
      const res = await fetch(`/api/props/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed on server');
    } catch (err) {
      toast.error('Failed to delete prop. Reverting...');
      setAllProps(snapshot); // Revert to snapshot on failure
    }
  }, []); // Removed allProps from dependency to prevent unnecessary recreations

  return { 
    allProps, 
    loading, 
    error, 
    propTypes, 
    fetchProps,
    cacheAge,
    totalCount,
    deleteProp,
  };
}