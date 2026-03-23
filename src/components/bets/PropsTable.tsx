'use client';

import React from 'react';
import { FlexibleDataTable } from '@/components/data-table/flexible-data-table';
import type { NormalizedProp } from '@/hooks/useAllProps';

interface PropsTableProps {
  props:          NormalizedProp[]; // This comes from useAllProps
  league:         string;
  isLoading:      boolean;
  onAddToBetSlip: (prop: NormalizedProp) => void;
  slipIds:        Set<string>;
}

export function PropsTable({
  props,
  league,
  isLoading,
  onAddToBetSlip,
  slipIds,
}: PropsTableProps) {
  
  const sortedProps = [...props].sort((a, b) => (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0));

  // Define your NBA/NFL specific columns here
  const columns = [
    { accessorKey: 'player', header: 'Player', sortable: true },
    { accessorKey: 'prop', header: 'Type', sortable: true },
    { accessorKey: 'line', header: 'Line', sortable: true },
    { 
      accessorKey: 'bestOdds', 
      header: 'Odds', 
      cell: (val: number) => val > 0 ? `+${val}` : val 
    },
    {
      accessorKey: 'id',
      header: 'Action',
      cell: (_: string, row: NormalizedProp) => (
        <button 
          onClick={() => onAddToBetSlip(row)}
          disabled={slipIds.has(row.id)}
          className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
            slipIds.has(row.id) 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
              : 'bg-orange-500 text-white hover:bg-orange-400'
          }`}
        >
          {slipIds.has(row.id) ? 'Added' : '+ Slip'}
        </button>
      )
    }
  ];

  return (
    <FlexibleDataTable
      data={sortedProps}
      columns={columns}
      isLoading={isLoading}
      tableId={`${league}-props-table`}
    />
  );
}