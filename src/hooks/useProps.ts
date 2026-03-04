'use client';

import { useState, useEffect, useCallback } from 'react';
import type { NFLProp } from '@/lib/types';

interface ApiFilters {
  propType?: string;
  team?: string;
}

export function useProps(week: number, seasons: number[], filters: ApiFilters) {
  const [props, setProps] = useState<NFLProp[]>([]);
  const [propTypes, setPropTypes] = useState<string[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch props with filters
      const propsParams = new URLSearchParams({ week: week.toString() });
      seasons.forEach(s => propsParams.append('season', s.toString()));
      if (filters.propType) propsParams.append('prop', filters.propType);
      if (filters.team) propsParams.append('team', filters.team);

      const propsRes = await fetch(`/api/props?${propsParams.toString()}`);
      if (!propsRes.ok) {
        const err = await propsRes.json();
        throw new Error(err.error || 'Failed to fetch props');
      }
      const propsData = await propsRes.json();
      setProps(propsData.props || []);

      // Fetch all available filter options for the UI
      const optionsParams = new URLSearchParams({ week: week.toString() });
      seasons.forEach(s => optionsParams.append('season', s.toString()));
      
      const optionsRes = await fetch(`/api/all-props/options?${optionsParams.toString()}`);
      if (optionsRes.ok) {
        const optionsData = await optionsRes.json();
        setPropTypes(optionsData.propTypes || []);
        setTeams(optionsData.teams || []);
      } else {
        console.warn('Could not load filter options.');
      }
    } catch (err: any) {
      setError(err.message);
      setProps([]);
    } finally {
      setLoading(false);
    }
  }, [week, JSON.stringify(seasons), filters.propType, filters.team]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { props, isLoading, error, propTypes, teams };
}
