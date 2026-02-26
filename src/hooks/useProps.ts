'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
// This is the line you're looking for:
import type { NFLProp, SortKey, SortDir } from '@/lib/types'; 

export function useProps(week: number, seasons: number[] = [2025, 2024]) {
  const [props, setProps] = useState<any[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProps = useCallback(async () => {
    // ... your fetch logic ...
  }, [week, seasons]);

  useEffect(() => { fetchProps(); }, [fetchProps]);

  // FIX: Type Guard to prevent "string | undefined" errors
  const propTypes = useMemo(() => {
    return Array.from(new Set(props.map(p => p.Prop).filter((v): v is string => !!v))).sort();
  }, [props]);

  const teams = useMemo(() => {
    return Array.from(new Set(props.map(p => p.Team).filter((v): v is string => !!v))).sort();
  }, [props]);

  return {
    props,
    isLoading,
    error,
    propTypes,
    teams,
    // ... rest of your returns
  };
} // <--- ENSURE THIS CLOSING BRACE EXISTS AT THE END OF THE FILE