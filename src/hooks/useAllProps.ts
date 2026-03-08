// src/hooks/useAllProps.ts
import { useState, useCallback } from 'react';
import { NFLProp } from '@/lib/types';

// The NormalizedProp type combines the base NFLProp with a guaranteed string ID.
export type NormalizedProp = NFLProp & { id: string };

export interface UseAllPropsReturn {
  allProps: NormalizedProp[];
  loading: boolean;
  error: string | null;
  propTypes: string[];
  fetchProps: (bustCache?: boolean) => Promise<void>;
}

export function useAllProps(): UseAllPropsReturn {
  const [allProps, setAllProps] = useState<NormalizedProp[]>([]);
  const [propTypes, setPropTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProps = useCallback(async (bustCache = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/all-props?limit=10000${bustCache ? '&bust=1' : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch props');
      }
      const data = await res.json();
      setAllProps(data.props);
      setPropTypes(data.propTypes);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { allProps, loading, error, propTypes, fetchProps };
}
