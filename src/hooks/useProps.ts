// src/hooks/useProps.ts
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { NFLProp } from '@/lib/enrichment/types';

export type SortKey = 'confidenceScore' | 'bestEdgePct' | 'seasonHitPct' | 'projWinPct' | 'line' | 'Player';
export type SortDir = 'asc' | 'desc';

export interface PropFilters {
  prop?: string;
  team?: string;
  valueOnly?: boolean;
  minEdge?: number;
  searchQuery?: string;
}

type PropWithId = NFLProp & { id: string; valueIcon?: string | null };

export interface UsePropsReturn {
  props: PropWithId[];
  filteredProps: PropWithId[];
  isLoading: boolean;
  error: string | null;
  filters: PropFilters;
  setFilters: (f: Partial<PropFilters>) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  setSort: (key: SortKey) => void;
  refresh: () => void;
  // Available filter options derived from data
  propTypes: string[];
  teams: string[];
}

export function useProps(week: number, seasons: number[] = [2025, 2024]): UsePropsReturn {
  const [props, setProps]       = useState<PropWithId[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [filters, setFiltersState] = useState<PropFilters>({});
  const [sortKey, setSortKey]   = useState<SortKey>('confidenceScore');
  const [sortDir, setSortDir]   = useState<SortDir>('desc');

  const fetchProps = useCallback(async () => {
    if (!week) return;
    setLoading(true);
    setError(null);

    try {
      const allProps: PropWithId[] = [];
      for (const season of seasons) {
        const params = new URLSearchParams({ week: String(week), season: String(season) });
        const res = await fetch(`/api/props?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.props) {
          allProps.push(...data.props);
        }
      }
      setProps(allProps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load props');
    } finally {
      setLoading(false);
    }
  }, [week, seasons]);

  useEffect(() => { fetchProps(); }, [fetchProps]);

  const setFilters = useCallback((partial: Partial<PropFilters>) => {
    setFiltersState(prev => ({ ...prev, ...partial }));
  }, []);

  const setSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
      else setSortDir('desc');
      return key;
    });
  }, []);

  // Derived filter options from the raw data
  const propTypes = useMemo(() => {
    const set = new Set(props.map(p => p.Prop).filter(Boolean));
    return Array.from(set).sort();
  }, [props]);

  const teams = useMemo(() => {
    const set = new Set(props.map(p => p.Team).filter(Boolean));
    return Array.from(set).sort();
  }, [props]);

  // Apply filters + sort client-side
  const filteredProps = useMemo(() => {
    let result: PropWithId[] = [...props];

    if (filters.prop) {
      result = result.filter(p => p.Prop === filters.prop);
    }
    if (filters.team) {
      result = result.filter(p => p.Team === filters.team);
    }
    if (filters.valueOnly) {
      result = result.filter(p => p.valueIcon === '🔥' || p.valueIcon === '⚠️');
    }
    if (filters.minEdge && filters.minEdge > 0) {
      result = result.filter(p => (p.bestEdgePct ?? 0) >= filters.minEdge!);
    }
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(p =>
        p.Player.toLowerCase().includes(q) ||
        p.Team?.toLowerCase().includes(q) ||
        p.Matchup?.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      const aVal = (a as any)[sortKey] ?? (typeof (a as any)[sortKey] === 'string' ? '' : -Infinity);
      const bVal = (b as any)[sortKey] ?? (typeof (b as any)[sortKey] === 'string' ? '' : -Infinity);
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [props, filters, sortKey, sortDir]);

  return {
    props,
    filteredProps,
    isLoading,
    error,
    filters,
    setFilters,
    sortKey,
    sortDir,
    setSort,
    refresh: fetchProps,
    propTypes,
    teams,
  };
}
