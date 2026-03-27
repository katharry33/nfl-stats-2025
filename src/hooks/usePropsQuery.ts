'use client';

import { useState, useEffect } from 'react';
import { PropDoc } from '@/lib/types';

type Sport = 'nba' | 'nfl';

interface UsePropsQueryArgs {
  league: Sport;
  season: number;
  date?: string;
}

export function usePropsQuery({ league, season, date }: UsePropsQueryArgs) {
  const [data, setData] = useState<PropDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(undefined);

        const params = new URLSearchParams({
          league,
          season: String(season),
        });

        if (date) params.append('date', date);

        const res = await fetch(`/api/props?${params.toString()}`);

        if (!res.ok) {
          const errJson = await res.json();
          throw new Error(errJson.error || 'Failed to fetch props');
        }

        const json = await res.json();
        setData(json.props || []);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [league, season, date]);

  return { data, loading, error };
}
