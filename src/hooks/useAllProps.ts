// src/hooks/useAllProps.ts
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
      if (week != null) params.set('week', String(week));
      if (bustCache) params.set('bust', 'true');
      
      const res = await fetch(`/api/all-props?${params.toString()}`);
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
    } finally {
      setLoading(false);
    }
  }, [week]);

  const deleteProp = useCallback(async (id: string) => {
    const originalProps = [...allProps];
    setAllProps(prev => prev.filter(p => p.id !== id));
    toast.info('Prop deleted.');

    try {
      const res = await fetch(`/api/props/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Failed to delete on server');
      }
    } catch (err) {
      toast.error('Failed to delete prop.');
      setAllProps(originalProps); // Revert optimistic update
    }
  }, [allProps]);

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
