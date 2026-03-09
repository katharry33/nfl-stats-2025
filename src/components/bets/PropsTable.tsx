'use client';
// src/components/bets/PropsTable.tsx

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Plus, Minus } from 'lucide-react';
import type { NormalizedProp } from '@/hooks/useAllProps';

type SortDir = 'asc' | 'desc';

interface Col {
  key: string; // string so table cols aren't coupled to NFLProp's exact keys
  label: string;
  sortable?: boolean;
  fmt?: (v: any) => string;
  align?: 'left' | 'right' | 'center';
}

const COLS: Col[] = [
  { key: 'week',              label: 'Wk',          sortable: true,  align: 'center' },
  { key: 'gameDate',          label: 'Date',         sortable: true  },
  { key: 'gameTime',          label: 'Time',         sortable: false },
  { key: 'matchup',           label: 'Matchup',      sortable: true  },
  { key: 'player',            label: 'Player',       sortable: true  },
  { key: 'team',              label: 'Team',         sortable: true,  align: 'center' },
  { key: 'prop',              label: 'Prop',         sortable: true  },
  { key: 'line',              label: 'Line',         sortable: true,  align: 'right', fmt: v => v?.toFixed(1) ?? '—' },
  { key: 'playerAvg',         label: 'Avg',          sortable: true,  align: 'right', fmt: v => v?.toFixed(1) ?? '—' },
  { key: 'opponentRank',      label: 'Opp Rnk',     sortable: true,  align: 'right', fmt: v => v != null ? `#${v}` : '—' },
  { key: 'opponentAvgVsStat', label: 'Opp Avg',      sortable: true,  align: 'right', fmt: v => v?.toFixed(1) ?? '—' },
  { key: 'yardsScore',        label: 'Yds Score',    sortable: true,  align: 'right', fmt: v => v?.toFixed(2) ?? '—' },
  { key: 'rankScore',         label: 'Rnk Score',    sortable: true,  align: 'right', fmt: v => v?.toFixed(2) ?? '—' },
  { key: 'totalScore',        label: 'Total',        sortable: true,  align: 'right', fmt: v => v?.toFixed(2) ?? '—' },
  { key: 'scoreDiff',         label: 'Diff',         sortable: true,  align: 'right', fmt: v => v?.toFixed(2) ?? '—' },
  { key: 'scalingFactor',     label: 'Scale',        sortable: true,  align: 'right', fmt: v => v?.toFixed(3) ?? '—' },
  { key: 'winProbability',    label: 'Win Prob',     sortable: true,  align: 'right', fmt: v => v != null ? `${(v*100).toFixed(1)}%` : '—' },
  { key: 'overUnder',         label: 'O/U',          sortable: true,  align: 'center' },
  { key: 'projWinPct',        label: 'Proj Win%',    sortable: true,  align: 'right', fmt: v => v != null ? `${(v*100).toFixed(1)}%` : '—' },
  { key: 'seasonHitPct',      label: 'Hit%',         sortable: true,  align: 'right', fmt: v => v != null ? `${(v*100).toFixed(1)}%` : '—' },
  { key: 'avgWinProb',        label: 'Avg Win',      sortable: true,  align: 'right', fmt: v => v != null ? `${(v*100).toFixed(1)}%` : '—' },
  { key: 'odds',              label: 'Odds',         sortable: true,  align: 'right', fmt: v => v != null ? (v > 0 ? `+${v}` : `${v}`) : '—' },
  { key: 'impliedProb',       label: 'Impl%',        sortable: true,  align: 'right', fmt: v => v != null ? `${(v*100).toFixed(1)}%` : '—' },
  { key: 'bestEdgePct',       label: 'Edge%',        sortable: true,  align: 'right', fmt: v => v != null ? `${(v*100).toFixed(1)}%` : '—' },
  { key: 'expectedValue',     label: 'EV',           sortable: true,  align: 'right', fmt: v => v?.toFixed(3) ?? '—' },
  { key: 'kellyPct',          label: 'Kelly%',       sortable: true,  align: 'right', fmt: v => v != null ? `${(v*100).toFixed(1)}%` : '—' },
  { key: 'valueIcon',         label: 'Value',        sortable: true,  align: 'center' },
  { key: 'confidenceScore',   label: 'Conf',         sortable: true,  align: 'right', fmt: v => v?.toFixed(2) ?? '—' },
  { key: 'gameStat',          label: 'Result Stat',  sortable: true,  align: 'right', fmt: v => v?.toFixed(1) ?? '—' },
  { key: 'actualResult',      label: 'Result',       sortable: true,  align: 'center' },
  { key: 'actions',           label: '',             sortable: false, align: 'center' },
];

function resultColor(result: string) {
  if (result === 'won')  return 'text-emerald-400';
  if (result === 'lost') return 'text-red-400';
  if (result === 'push') return 'text-zinc-400';
  return 'text-zinc-600';
}

function edgeColor(edge: number | undefined) {
  if (edge == null) return 'text-zinc-500';
  if (edge > 0.1)  return 'text-emerald-400 font-bold';
  if (edge > 0.05) return 'text-yellow-400';
  if (edge > 0)    return 'text-zinc-300';
  return 'text-red-400';
}

interface PropsTableProps {
  props: NormalizedProp[];
  isLoading: boolean;
  isInBetSlip: (id: string) => boolean;
  onAddToBetSlip: (prop: NormalizedProp) => void;
  onRemoveFromBetSlip: (id: string) => void;
}

export function PropsTable({
  props, isLoading, isInBetSlip, onAddToBetSlip, onRemoveFromBetSlip,
}: PropsTableProps) {
  const [sortKey, setSortKey] = useState<string>('confidenceScore');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    return [...props].sort((a, b) => {
      const av = (a as any)[sortKey];
      const bv = (b as any)[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [props, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/5">
      <table className="w-full text-xs text-zinc-300 border-collapse">
        <thead>
          <tr className="bg-[#0a0a0e] border-b border-white/5">
            {COLS.map(col => (
              <th
                key={col.key}
                onClick={() => col.sortable && col.key !== 'actions' && handleSort(col.key)}
                className={`
                  px-3 py-3 font-black uppercase tracking-widest text-[9px] whitespace-nowrap select-none
                  ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                  ${col.sortable ? 'cursor-pointer hover:text-[#FFD700] transition-colors' : ''}
                  ${sortKey === col.key ? 'text-[#FFD700]' : 'text-zinc-600'}
                `}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && col.key !== 'actions' && sortKey === col.key && (
                    sortDir === 'asc'
                      ? <ChevronUp className="w-2.5 h-2.5" />
                      : <ChevronDown className="w-2.5 h-2.5" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((prop, i) => {
            const active = prop.id ? isInBetSlip(prop.id) : false;
            return (
              <tr
                key={prop.id || i}
                className={`
                  border-b border-white/[0.03] transition-colors
                  ${active ? 'bg-[#FFD700]/5 border-[#FFD700]/10' : 'hover:bg-white/[0.02]'}
                  ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}
                `}
              >
                {COLS.map(col => {
                  if (col.key === 'actions') {
                    return (
                      <td key="actions" className="px-3 py-2 text-center">
                        <button
                          onClick={() => {
                            if (!prop.id) return;
                            active ? onRemoveFromBetSlip(prop.id) : onAddToBetSlip(prop);
                          }}
                          className={`
                            w-6 h-6 rounded-lg flex items-center justify-center mx-auto transition-all
                            ${active
                              ? 'bg-[#FFD700] text-black'
                              : 'bg-zinc-800 text-[#FFD700] hover:bg-[#FFD700] hover:text-black border border-white/10'}
                          `}
                        >
                          {active ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        </button>
                      </td>
                    );
                  }

                  const raw = (prop as any)[col.key];
                  const display = col.fmt ? col.fmt(raw) : (raw ?? '—');

                  // Special cell styling
                  let cellClass = `px-3 py-2 whitespace-nowrap ${
                    col.align === 'right' ? 'text-right' :
                    col.align === 'center' ? 'text-center' : 'text-left'
                  }`;

                  if (col.key === 'valueIcon') {
                    return <td key={col.key} className={`${cellClass} text-base`}>{raw ?? ''}</td>;
                  }
                  if (col.key === 'actualResult') {
                    return <td key={col.key} className={`${cellClass} ${resultColor(raw)} uppercase font-bold tracking-wider`}>{raw || '—'}</td>;
                  }
                  if (col.key === 'bestEdgePct') {
                    return <td key={col.key} className={`${cellClass} ${edgeColor(raw)}`}>{display}</td>;
                  }
                  if (col.key === 'player') {
                    return <td key={col.key} className={`${cellClass} font-bold text-white`}>{display}</td>;
                  }
                  if (col.key === 'overUnder') {
                    return (
                      <td key={col.key} className={`${cellClass} font-bold ${raw === 'Over' ? 'text-emerald-400' : raw === 'Under' ? 'text-red-400' : 'text-zinc-500'}`}>
                        {raw || '—'}
                      </td>
                    );
                  }

                  return <td key={col.key} className={cellClass}>{String(display)}</td>;
                })}
              </tr>
            );
          })}

          {sorted.length === 0 && (
            <tr>
              <td colSpan={COLS.length} className="px-6 py-12 text-center text-zinc-600 text-xs uppercase tracking-widest">
                No props found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}