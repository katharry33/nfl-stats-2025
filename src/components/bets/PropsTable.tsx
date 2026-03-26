'use client';

import React from 'react';
import { PropData } from '@/lib/types';
import { FlexibleDataTable } from '@/components/FlexibleDataTable';
import { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';

export interface PropsTableProps {
  data: PropData[];
  isLoading?: boolean;
  onAddLeg: (p: PropData) => void;
  onEdit?: (p: PropData) => void;
  onDelete?: (p: PropData) => void;
  onLoadMore?: () => void | Promise<void>;
  hasMore?: boolean;
  /** Pass 'bet-builder' or 'historical-vault' to get page-specific column defaults */
  variant?: 'bet-builder' | 'historical-vault';
}

// ─── Formatters ──────────────────────────────────────────────────────────────

function fOdds(odds: number | null | undefined) {
  if (odds === null || odds === undefined) return '—';
  return odds > 0 ? `+${odds}` : String(odds);
}
function fPct(val: number | null | undefined, dec = 1) {
  if (val === null || val === undefined || isNaN(Number(val))) return '—';
  return `${(Number(val) * 100).toFixed(dec)}%`;
}
function fNum(val: number | null | undefined, dec = 1) {
  if (val === null || val === undefined || isNaN(Number(val))) return '—';
  return Number(val).toFixed(dec);
}

// ─── Default Visibility per Page ─────────────────────────────────────────────

const BET_BUILDER_DEFAULTS: VisibilityState = {
  player: true,
  matchup: true,
  'prop-line': true,
  winProbability: true,
  confidenceScore: true,
  odds: true,
  action: true,
  // hidden by default
  overUnder: false,
  gameDate: false,
  gameTime: false,
  week: false,
  playerAvg: false,
  opponentRank: false,
  opponentAvgVsStat: false,
  totalScore: false,
  expectedValue: false,
  kellyPct: false,
  impliedProb: false,
  bestEdgePct: false,
  seasonHitPct: false,
  projWinPct: false,
  avgWinProb: false,
  yardsScore: false,
  rankScore: false,
  scoreDiff: false,
  scalingFactor: false,
  pace: false,
  valueIcon: false,
  actualResult: false,
};

const VAULT_DEFAULTS: VisibilityState = {
  player: true,
  matchup: true,
  'prop-line': true,
  gameDate: true,
  playerAvg: true,
  opponentRank: true,
  winProbability: true,
  odds: true,
  actualResult: true,
  action: true,
  // hidden by default
  overUnder: false,
  gameTime: false,
  week: false,
  opponentAvgVsStat: false,
  totalScore: false,
  confidenceScore: false,
  expectedValue: false,
  kellyPct: false,
  impliedProb: false,
  bestEdgePct: false,
  seasonHitPct: false,
  projWinPct: false,
  avgWinProb: false,
  yardsScore: false,
  rankScore: false,
  scoreDiff: false,
  scalingFactor: false,
  pace: false,
  valueIcon: false,
};

// ─── Column Definitions ───────────────────────────────────────────────────────

function buildColumns(
  onAddLeg: (p: PropData) => void,
  onEdit?: (p: PropData) => void,
  onDelete?: (p: PropData) => void
): ColumnDef<PropData>[] {
  return [
    // ── Identity
    {
      id: 'player',
      accessorKey: 'player',
      header: 'Player',
      cell: ({ row }) => (
        <div className="min-w-[140px]">
          <div className="font-bold text-white leading-tight">{row.original.player}</div>
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
            {row.original.team}
          </div>
        </div>
      ),
    },
    {
      id: 'matchup',
      accessorKey: 'matchup',
      header: 'Matchup',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-zinc-300 whitespace-nowrap">
          {row.original.matchup || '—'}
        </span>
      ),
    },
    {
      id: 'prop-line',
      accessorKey: 'prop',
      header: 'Prop / Line',
      cell: ({ row }) => (
        <div className="min-w-[110px]">
          <div className="text-white font-semibold capitalize text-xs">{row.original.prop}</div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-indigo-400 text-[10px] font-black">
              {row.original.overUnder === 'Over' ? '↑' : row.original.overUnder === 'Under' ? '↓' : ''}
            </span>
            <span className="text-indigo-300 font-mono font-bold text-xs">{row.original.line}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'overUnder',
      accessorKey: 'overUnder',
      header: 'O/U',
      cell: ({ row }) => (
        <Badge
          variant={row.original.overUnder === 'Over' ? 'default' : 'secondary'}
          className="text-[9px] font-black uppercase"
        >
          {row.original.overUnder || '—'}
        </Badge>
      ),
    },

    // ── Scheduling
    {
      id: 'gameDate',
      accessorKey: 'gameDate',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-zinc-400 text-xs font-mono">{row.original.gameDate || '—'}</span>
      ),
    },
    {
      id: 'gameTime',
      accessorKey: 'gameTime',
      header: 'Time',
      cell: ({ row }) => (
        <span className="text-zinc-400 text-xs">{row.original.gameTime || '—'}</span>
      ),
    },
    {
      id: 'week',
      accessorKey: 'week',
      header: 'Week',
      cell: ({ row }) => (
        <span className="text-zinc-400 text-xs font-mono">{row.original.week ?? '—'}</span>
      ),
    },

    // ── Player Analytics
    {
      id: 'playerAvg',
      accessorKey: 'playerAvg',
      header: 'Avg',
      cell: ({ row }) => (
        <span className="font-mono font-bold text-white text-xs">{fNum(row.original.playerAvg)}</span>
      ),
    },
    {
      id: 'opponentRank',
      accessorKey: 'opponentRank',
      header: 'Opp Rank',
      cell: ({ row }) => {
        const r = row.original.opponentRank;
        const cls =
          r <= 10 ? 'text-red-400' : r >= 22 ? 'text-emerald-400' : 'text-zinc-300';
        return <span className={`font-mono font-bold text-xs ${cls}`}>{r ?? '—'}</span>;
      },
    },
    {
      id: 'opponentAvgVsStat',
      accessorKey: 'opponentAvgVsStat',
      header: 'Opp Avg',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-zinc-300">{fNum(row.original.opponentAvgVsStat)}</span>
      ),
    },
    {
      id: 'pace',
      accessorKey: 'pace',
      header: 'Pace',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-zinc-400">{fNum(row.original.pace)}</span>
      ),
    },

    // ── Win Probability
    {
      id: 'winProbability',
      accessorKey: 'winProbability',
      header: 'Win Prob',
      cell: ({ row }) => {
        const val = row.original.winProbability;
        if (val === null || val === undefined)
          return <span className="text-zinc-600 text-xs">—</span>;
        const pct = Number(val) * 100;
        const barColor =
          pct > 60 ? 'bg-emerald-500' : pct > 50 ? 'bg-yellow-500' : 'bg-red-500';
        const txtColor =
          pct > 60 ? 'text-emerald-400' : pct > 50 ? 'text-yellow-400' : 'text-red-400';
        return (
          <div className="flex items-center gap-2 min-w-[90px]">
            <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden flex-shrink-0">
              <div
                className={`h-full rounded-full ${barColor}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <span className={`font-mono font-bold text-xs ${txtColor}`}>
              {pct.toFixed(1)}%
            </span>
          </div>
        );
      },
    },
    {
      id: 'projWinPct',
      accessorKey: 'projWinPct',
      header: 'Proj Win%',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-zinc-300">{fPct(row.original.projWinPct)}</span>
      ),
    },
    {
      id: 'seasonHitPct',
      accessorKey: 'seasonHitPct',
      header: 'Season Hit%',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-zinc-300">{fPct(row.original.seasonHitPct)}</span>
      ),
    },
    {
      id: 'avgWinProb',
      accessorKey: 'avgWinProb',
      header: 'Avg Win Prob',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-zinc-300">{fPct(row.original.avgWinProb)}</span>
      ),
    },

    // ── Market / Edge
    {
      id: 'odds',
      accessorKey: 'odds',
      header: 'Odds',
      cell: ({ row }) => {
        const odds = row.original.odds;
        if (!odds) return <span className="text-zinc-600 text-xs">—</span>;
        const isPos = odds > 0;
        return (
          <span
            className={`font-mono font-black text-sm ${isPos ? 'text-emerald-400' : 'text-zinc-300'}`}
          >
            {fOdds(odds)}
          </span>
        );
      },
    },
    {
      id: 'impliedProb',
      accessorKey: 'impliedProb',
      header: 'Implied%',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-zinc-400">{fPct(row.original.impliedProb)}</span>
      ),
    },
    {
      id: 'bestEdgePct',
      accessorKey: 'bestEdgePct',
      header: 'Edge%',
      cell: ({ row }) => {
        const val = row.original.bestEdgePct;
        const cls = val > 0 ? 'text-emerald-400' : 'text-red-400';
        return <span className={`font-mono font-bold text-xs ${cls}`}>{fPct(val)}</span>;
      },
    },
    {
      id: 'expectedValue',
      accessorKey: 'expectedValue',
      header: 'EV',
      cell: ({ row }) => {
        const val = row.original.expectedValue;
        const cls = val > 0 ? 'text-emerald-400' : 'text-red-400';
        return <span className={`font-mono font-bold text-xs ${cls}`}>{fNum(val, 3)}</span>;
      },
    },
    {
      id: 'kellyPct',
      accessorKey: 'kellyPct',
      header: 'Kelly%',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-zinc-300">{fPct(row.original.kellyPct)}</span>
      ),
    },

    // ── Scoring
    {
      id: 'totalScore',
      accessorKey: 'totalScore',
      header: 'Total Score',
      cell: ({ row }) => {
        const val = row.original.totalScore;
        const cls =
          val >= 70 ? 'text-emerald-400' : val >= 50 ? 'text-yellow-400' : 'text-zinc-400';
        return <span className={`font-mono font-bold text-xs ${cls}`}>{fNum(val, 0)}</span>;
      },
    },
    {
      id: 'confidenceScore',
      accessorKey: 'confidenceScore',
      header: 'Confidence',
      cell: ({ row }) => {
        const val = row.original.confidenceScore;
        const cls =
          val >= 70 ? 'text-emerald-400' : val >= 50 ? 'text-yellow-400' : 'text-zinc-400';
        return <span className={`font-mono font-bold text-xs ${cls}`}>{fNum(val, 0)}</span>;
      },
    },
    {
      id: 'yardsScore',
      accessorKey: 'yardsScore',
      header: 'Yards Score',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-zinc-400">{fNum(row.original.yardsScore)}</span>
      ),
    },
    {
      id: 'rankScore',
      accessorKey: 'rankScore',
      header: 'Rank Score',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-zinc-400">{fNum(row.original.rankScore)}</span>
      ),
    },
    {
      id: 'scoreDiff',
      accessorKey: 'scoreDiff',
      header: 'Score Diff',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-zinc-400">{fNum(row.original.scoreDiff)}</span>
      ),
    },
    {
      id: 'scalingFactor',
      accessorKey: 'scalingFactor',
      header: 'Scale Factor',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-zinc-400">{fNum(row.original.scalingFactor, 3)}</span>
      ),
    },
    {
      id: 'valueIcon',
      accessorKey: 'valueIcon',
      header: 'Value',
      cell: ({ row }) => (
        <span className="text-base">{row.original.valueIcon || '—'}</span>
      ),
    },

    // ── Result
    {
      id: 'actualResult',
      accessorKey: 'actualResult',
      header: 'Result',
      cell: ({ row }) => {
        const r = row.original.actualResult;
        if (!r) return <span className="text-zinc-600 text-[10px] uppercase font-black">Pending</span>;
        return (
          <Badge
            variant={r === 'Won' ? 'default' : r === 'Lost' ? 'destructive' : 'secondary'}
            className="text-[9px] font-black uppercase"
          >
            {r}
          </Badge>
        );
      },
    },

    // ── Actions
    {
      id: 'action',
      header: '',
      enableSorting: false,
      cell: ({ row, table }) => {
        const meta = table.options.meta as {
          onAddLeg: (p: PropData) => void;
          onEdit?: (p: PropData) => void;
          onDelete?: (p: PropData) => void;
        };
        return (
          <div className="flex items-center gap-1 whitespace-nowrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => meta.onAddLeg(row.original)}
              className="h-7 px-2.5 text-[9px] font-black uppercase border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 hover:border-indigo-400"
            >
              + Leg
            </Button>
            {meta.onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => meta.onEdit!(row.original)}
                className="h-7 w-7 p-0 text-zinc-500 hover:text-white"
              >
                <Pencil size={11} />
              </Button>
            )}
            {meta.onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => meta.onDelete!(row.original)}
                className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400"
              >
                <Trash2 size={11} />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PropsTable({
  data,
  isLoading,
  onAddLeg,
  onEdit,
  onDelete,
  onLoadMore,
  hasMore,
  variant = 'bet-builder',
}: PropsTableProps) {
  const columns = React.useMemo(
    () => buildColumns(onAddLeg, onEdit, onDelete),
    [onAddLeg, onEdit, onDelete]
  );

  const defaultVisibility =
    variant === 'historical-vault' ? VAULT_DEFAULTS : BET_BUILDER_DEFAULTS;

  return (
    <FlexibleDataTable<PropData, any>
      columns={columns}
      data={data}
      isLoading={isLoading}
      tableId={`props-${variant}`}
      meta={{ onAddLeg, onEdit, onDelete }}
      defaultColumnVisibility={defaultVisibility}
      onLoadMore={onLoadMore}
      hasMore={hasMore}
    />
  );
}