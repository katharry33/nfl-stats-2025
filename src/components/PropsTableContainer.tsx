'use client';

import React from 'react';
import { usePropsQuery } from '@/hooks/usePropsQuery';
import { PropsTable } from '@/components/PropsTable';
import { PropDoc } from '@/lib/types';

interface PropsTableContainerProps {
  league: 'nba' | 'nfl';
  season: number;
  date?: string;
  week?: number | null;
  search: string;
  propFilter: string;
  view: 'table' | 'card';
  onViewData: (p: PropDoc) => void;
}

export function PropsTableContainer({
  league,
  season,
  date,
  week,
  search,
  propFilter,
  view,
  onViewData
}: PropsTableContainerProps) {

  // STRICT MODE
  const queryArgs =
    league === 'nfl'
      ? { league, season, week }
      : { league, season, date };

  const { data, loading } = usePropsQuery(queryArgs);

  let rows = data;

  // Search
  if (search.trim()) {
    const s = search.toLowerCase();
    rows = rows.filter((p) => {
      const anyP = p as any;
      return (
        p.player.toLowerCase().includes(s) ||
        anyP.matchup?.toLowerCase?.().includes(s) ||
        p.prop.toLowerCase().includes(s)
      );
    });
  }

  // Prop filter
  if (propFilter !== 'all') {
    rows = rows.filter((p) => p.propNorm === propFilter);
  }

  return (
    <PropsTable
      data={rows}
      isLoading={loading}
      view={view}
      onViewData={onViewData}
    />
  );
}
