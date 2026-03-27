'use client';

import React from 'react';
import { PropsTable } from '@/components/PropsTable';
import { usePropsQuery } from '@/hooks/usePropsQuery';
import type { Sport } from '@/lib/types';

interface PropsTableContainerProps {
  league: Sport;
  season: number;
  date?: string;
  search?: string;
  propFilter?: string;
  view?: 'table' | 'card';
  onAddLeg?: (p: any) => void;
  onEdit?: (p: any) => void;
  onDelete?: (p: any) => void;
}

export function PropsTableContainer({
  league,
  season,
  date,
  search = '',
  propFilter = 'all',
  view = 'table',
  onAddLeg,
  onEdit,
  onDelete
}: PropsTableContainerProps) {

  const { data, loading } = usePropsQuery({
    league,
    season,
    date: date || undefined
  });

  const filtered = React.useMemo(() => {
    let rows = data || [];

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((p) =>
        p.player?.toLowerCase().includes(q) ||
        p.team?.toLowerCase().includes(q) ||
        p.opponent?.toLowerCase().includes(q)
      );
    }

    if (propFilter !== 'all') {
      rows = rows.filter((p) => p.propType === propFilter);
    }

    return rows;
  }, [data, search, propFilter]);

  return (
    <div className="relative">
      <PropsTable
        data={filtered}
        isLoading={loading}
        view={view}
        onAddLeg={onAddLeg}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}
