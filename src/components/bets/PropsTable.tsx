// components/PropsTable.tsx
'use client';

import React from 'react';
import { FlexibleDataTable } from './flexible-data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';

export interface PropData {
  id: string;
  player: string;
  prop: string;
  line: number;
  odds: number;
  team: string;
  matchup: string;
  scoreDiff?: number;
  league: 'nba' | 'nfl';
  gameDate: string;
  week?: number;
  season: number;
}

interface PropsTableProps {
  data: PropData[];
  isLoading?: boolean;
  onAddLeg: (prop: PropData) => void;
}

export function PropsTable({ data, isLoading, onAddLeg }: PropsTableProps) {
  const columns: ColumnDef<PropData>[] = [
    {
      id: 'player',
      header: 'Player',
      accessorKey: 'player',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-black text-white uppercase tracking-tight">{row.original.player}</span>
          <span className="text-[10px] text-zinc-500 font-bold uppercase">{row.original.team}</span>
        </div>
      ),
    },
    {
      id: 'prop',
      header: 'Market',
      accessorKey: 'prop',
      cell: ({ row }) => (
        <Badge variant="outline" className="border-white/10 text-[10px] font-black uppercase tracking-widest text-indigo-400">
          {row.original.prop.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      id: 'line',
      header: 'Line',
      accessorKey: 'line',
      cell: ({ row }) => <span className="font-mono font-bold text-lg text-white">{row.original.line}</span>,
    },
    {
      id: 'odds',
      header: 'Odds',
      accessorKey: 'odds',
      cell: ({ row }) => (
        <span className={row.original.odds > 0 ? 'text-emerald-400' : 'text-zinc-300'}>
          {row.original.odds > 0 ? `+${row.original.odds}` : row.original.odds}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={() => onAddLeg(row.original)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all active:scale-95"
        >
          Add to Slip
        </button>
      ),
    },
  ];

  return (
    <div className="bg-[#121214] border border-white/5 rounded-[24px] overflow-hidden shadow-2xl">
      <FlexibleDataTable
        tableId="props-selection-table"
        columns={columns}
        data={data}
        isLoading={isLoading}
      />
    </div>
  );
}
