import React from 'react';
import { AddToBetslipButton } from '@/components/bets/add-to-betslip-button';
import { fmt, fmtPct, ScoreDiff, ResultBadge, formatBetDate } from '@/lib/utils';

export const ALL_PROP_COLUMNS = [
  { accessorKey: 'player', header: 'Player', sortable: true, filterable: true },
  { accessorKey: 'matchup', header: 'Matchup', sortable: true },
  { 
    accessorKey: 'playerAvg', 
    header: 'Avg', 
    sortable: true, 
    cell: (v: any) => fmt(v) 
  },
  { 
    accessorKey: 'scoreDiff', 
    header: 'vs Line', 
    sortable: true, 
    cell: (v: any) => <ScoreDiff v={v} /> 
  },
  { 
    accessorKey: 'actualResult', 
    header: 'Result', 
    sortable: true, 
    cell: (v: any) => <ResultBadge v={v} /> 
  },
  { 
    accessorKey: 'gameDate', 
    header: 'Date', 
    sortable: true, 
    cell: (v: any) => formatBetDate(v) 
  },
  {
    accessorKey: 'actions',
    header: '',
    cell: (_: any, row: any) => (
      <div className="w-[120px]">
        <AddToBetslipButton 
          prop={row} 
          selection={row.overUnder || row.selection || 'Over'} 
        />
      </div>
    ),
  }
];