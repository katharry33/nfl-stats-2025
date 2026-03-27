'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { NormalizedProp } from '@/lib/types';
import { AddToBetslipButton } from '@/components/bets/add-to-betslip-button';
import { ScoreDiff } from '@/components/ScoreDiff';
import { ResultBadge } from '@/components/ResultBadge';
import { fmt, fmtPct, formatBetDate } from '@/lib/utils/formatters';

export const getVaultColumns = (league: 'nba' | 'nfl'): ColumnDef<NormalizedProp>[] => {
  const isNFL = league === 'nfl';

  return [
    {
      // We use a stable ID 'time_period' so reordering works for both sports
      id: 'time_period',
      accessorKey: isNFL ? 'week' : 'gameDate',
      header: isNFL ? 'WK' : 'DATE',
      cell: ({ getValue }) => {
        const val = getValue();
        if (isNFL) return <span className="font-bold text-zinc-400">{val || '—'}</span>;
        
        // Format NBA Date: 2026-03-23 -> 3/23
        const dateStr = String(val || '');
        const shortDate = dateStr.split('-').slice(1).join('/');
        return <span className="text-[10px] font-medium text-zinc-500">{shortDate || '—'}</span>;
      }
    },
    {
      accessorKey: 'player',
      header: 'PLAYER',
      cell: ({ row }) => <span className="font-bold text-white uppercase">{row.original.player}</span>
    },
    { 
      accessorKey: 'matchup', 
      header: 'MATCHUP', 
      id: 'matchup',
      cell: ({ getValue }) => <span className="text-zinc-400 tabular-nums">{String(getValue())}</span>
    },
    { accessorKey: 'prop', header: 'PROP', id: 'prop' },

    // COMBINED LINE & O/U
    { 
      id: 'line_ou',
      header: 'LINE', 
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-white">{row.original.line}</span>
          <span className="text-[9px] font-black uppercase text-zinc-500 tracking-tighter">
            {row.original.overUnder}
          </span>
        </div>
      )
    },

    // ADDED MISSING STATS
    { 
      accessorKey: 'playerAvg', 
      header: 'AVG', 
      id: 'playerAvg',
      cell: ({ getValue }) => <span className="text-zinc-300">{fmt(getValue() as number)}</span>
    },
    { 
      accessorKey: 'opponentRank', 
      header: 'OPP RNK', 
      id: 'oppRank',
      cell: ({ getValue }) => (
        <span className={`font-bold ${Number(getValue()) <= 10 ? 'text-rose-400' : 'text-zinc-400'}`}>
          #{getValue() ?? '—'}
        </span>
      )
    },

    // VALUE & ANALYTICS
    { accessorKey: 'expectedValue', header: 'EV', id: 'ev', cell: ({ getValue }) => fmt(getValue() as number, 2) },
    { accessorKey: 'confidenceScore', header: 'CONF', id: 'conf' },

    // RESULTS
    { accessorKey: 'gameStat', header: 'ACTUAL', id: 'actual' },
    { 
      accessorKey: 'scoreDiff', 
      header: 'DIFF', 
      id: 'diff',
      cell: ({ getValue }) => <ScoreDiff v={getValue()} /> 
    },
    { 
      accessorKey: 'actualResult', 
      header: 'RESULT', 
      id: 'result',
      cell: ({ getValue }) => <ResultBadge v={getValue()} /> 
    }
  ];
};
