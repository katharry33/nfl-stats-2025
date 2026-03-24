'use client';
'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { NormalizedProp } from '@/lib/types';

// ─── DIRECT IMPORTS (No index file) ───
// Adjust these paths if your files are named differently (e.g., result-badge.tsx)
import { AddToBetslipButton } from '@/components/bets/add-to-betslip-button'; 
import { ScoreDiff } from '@/components/bets/ScoreDiff'; 
import { ResultBadge } from '@/components/bets/ResultBadge';
import { fmt, fmtPct } from '@/lib/utils/formatters'; // Or wherever your formatters live

// ⚠️ CRITICAL: If you get "Element type is invalid", check if these should be 
// import ScoreDiff from ... (default) or import { ScoreDiff } from ... (named)

export const getVaultColumns = (league: 'nba' | 'nfl'): ColumnDef<NormalizedProp>[] => {
  const columns: ColumnDef<NormalizedProp>[] = [
    { accessorKey: 'player', header: 'Player', id: 'player' },
    { accessorKey: 'team', header: 'Team', id: 'team' },
    { accessorKey: 'matchup', header: 'Matchup', id: 'matchup' },
    { accessorKey: 'prop', header: 'Prop', id: 'prop' },
    {
      id: 'line',
      header: 'Line',
      accessorKey: 'line',
      cell: ({ row }) => {
        const isOver = row.original.overUnder?.toLowerCase() === 'over';
        return (
          <div className="flex flex-col items-start gap-0.5">
            <span className="font-black text-white text-[11px] tabular-nums">
              {row.original.line}
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md border ${isOver 
                  ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400/80' 
                  : 'bg-rose-400/5 border-rose-400/10 text-rose-300/60'
              }`}>
                {isOver ? 'Over' : 'Under'}
              </span>
              <span className="text-[9px] font-bold text-zinc-600">
                @{row.original.odds}
              </span>
            </div>
          </div>
        );
      }
    },
    { accessorKey: 'overUnder', header: 'O/U', id: 'overUnder' },
    { accessorKey: 'odds', header: 'Odds', id: 'odds' },
    
    // Enrichment / Analytics
    { 
        accessorKey: 'playerAvg', 
        header: 'Avg', 
        id: 'playerAvg',
        cell: ({ getValue }) => fmt(getValue() as number) 
    },
    { 
        accessorKey: 'scoreDiff', 
        header: 'vs Line', 
        id: 'scoreDiff',
        // Safety check: rendering a string if the component is missing
        cell: ({ getValue }) => {
            const val = getValue();
            return ScoreDiff ? <ScoreDiff v={val} /> : <span>{String(val)}</span>;
        }
    },
    { 
        accessorKey: 'seasonHitPct', 
        header: 'Hit %', 
        id: 'hitPct', 
        cell: ({ getValue }) => fmtPct(getValue() as number) 
    },
    { accessorKey: 'opponentRank', header: 'Opp Rank', id: 'oppRank' },
    
    // Post-Game
    { 
        accessorKey: 'gameStat', 
        header: 'Actual', 
        id: 'actual',
        cell: ({ getValue }) => (
            <span className="font-mono font-black text-white underline decoration-indigo-500/20 underline-offset-4 tabular-nums">
                {String(getValue() ?? '—')}
            </span>
        )
    },
    { 
        accessorKey: 'actualResult', 
        header: 'Result', 
        id: 'result',
        cell: ({ getValue }) => {
            const val = getValue();
            return ResultBadge ? <ResultBadge v={val} /> : <span>{String(val)}</span>;
        }
    },

    // Edge & Advanced
    { accessorKey: 'confidenceScore', header: 'Conf', id: 'confidence' },
    { 
        accessorKey: 'expectedValue', 
        header: 'EV', 
        id: 'ev', 
        cell: ({ getValue }) => fmt(getValue() as number) 
    },
    { 
        accessorKey: 'bestEdgePct', 
        header: 'Edge', 
        id: 'edge', 
        cell: ({ getValue }) => fmtPct(getValue() as number) 
    },
    { 
        accessorKey: 'kellyPct', 
        header: 'Kelly', 
        id: 'kelly', 
        cell: ({ getValue }) => fmtPct(getValue() as number) 
    },
  ];

  if (league === 'nba') {
    columns.push(
      { accessorKey: 'pace', header: 'Pace', id: 'pace' },
      { accessorKey: 'defRating', header: 'Def Rtg', id: 'defRating' }
    );
  }

  if (league === 'nfl') {
    columns.push(
      { accessorKey: 'week', header: 'Week', id: 'week' },
      { accessorKey: 'opponentAvgVsStat', header: 'Opp Avg', id: 'oppAvg' }
    );
  }

  columns.push({
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <div className="w-[120px] flex justify-end">
        {AddToBetslipButton ? (
            <AddToBetslipButton 
                prop={row.original} 
                selection={row.original.overUnder || 'Over'} 
            />
        ) : null}
      </div>
    ),
  });

  return columns;
};