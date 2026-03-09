'use client';
// src/components/bets/PropsTable.tsx

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Plus, Minus, Trash2 } from 'lucide-react';
import type { NormalizedProp } from '@/hooks/useAllProps';

type SortDir = 'asc' | 'desc';

interface Col {
  key: string;
  label: string;
  sortable?: boolean;
  fmt?: (v: any) => string;
  align?: 'left' | 'right' | 'center';
}

const COLS: Col[] = [
    { key: 'week',              label: 'Wk',          sortable: true,  align: 'center' },
    { key: 'gameDate',          label: 'Date',         sortable: true  },
    { key: 'matchup',           label: 'Matchup',      sortable: true  },
    { key: 'player',            label: 'Player',       sortable: true  },
    { key: 'prop',              label: 'Prop',         sortable: true  },
    { key: 'line',              label: 'Line',         sortable: true,  align: 'right', fmt: v => v?.toFixed(1) ?? '—' },
    { key: 'overUnder',         label: 'O/U',          sortable: true,  align: 'center' },
    { key: 'odds',              label: 'Odds',         sortable: true,  align: 'right', fmt: v => v != null ? (v > 0 ? `+${v}` : `${v}`) : '—' },
    { key: 'confidenceScore',   label: 'Conf',         sortable: true,  align: 'right', fmt: v => v?.toFixed(2) ?? '—' },
    { key: 'actualResult',      label: 'Result',       sortable: true,  align: 'center' },
    { key: 'actions',           label: '',             sortable: false, align: 'center' },
  ];
  

function resultColor(result: string) {
  if (result === 'won')  return 'text-emerald-400';
  if (result === 'lost') return 'text-red-400';
  if (result === 'push') return 'text-zinc-400';
  return 'text-zinc-600';
}

interface PropsTableProps {
  props: NormalizedProp[];
  isLoading: boolean;
  slipIds?: Set<string>;
  onAddToBetSlip: (prop: NormalizedProp) => void;
  onDelete: (id: string) => void;
}

export function PropsTable({
  props = [],
  isLoading,
  slipIds = new Set(),
  onAddToBetSlip,
  onDelete,
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
  
  const pendingCount = props.filter((p) => p.status === 'pending').length;

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
    <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0a0a0e]">
      <table className="w-full text-xs text-zinc-300 border-collapse">
        <thead>
          <tr className="border-b border-white/5">
            {COLS.map(col => (
              <th
                key={col.key}
                onClick={() => col.sortable && handleSort(col.key)}
                className={`
                  px-3 py-3 font-black uppercase tracking-widest text-[9px] whitespace-nowrap select-none
                  ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                  ${col.sortable ? 'cursor-pointer hover:text-[#FFD700] transition-colors' : ''}
                  ${sortKey === col.key ? 'text-[#FFD700]' : 'text-zinc-600'}
                `}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
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
            const inSlip = slipIds.has(String(prop.id));
            return (
              <tr
                key={prop.id || i}
                className={`
                  border-b border-white/[0.03] transition-colors
                  ${inSlip ? 'bg-[#FFD700]/5' : 'hover:bg-white/[0.02]'}
                `}
              >
                {COLS.map(col => {
                  const raw = (prop as any)[col.key];
                  const display = col.fmt ? col.fmt(raw) : (raw ?? '—');

                  if (col.key === 'actions') {
                    return (
                      <td key="actions" className="px-3 py-2 text-center">
                         <div className="flex items-center justify-center gap-1">
                           <button
                            onClick={() => onAddToBetSlip(prop)}
                            disabled={inSlip}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed ${inSlip ? 'bg-[#FFD700]/50 text-black' : 'bg-zinc-800 text-[#FFD700] hover:bg-[#FFD700] hover:text-black'}`}>
                            <Plus className="w-3 h-3" />
                           </button>
                           <button
                            onClick={() => onDelete(String(prop.id))}
                            className="w-6 h-6 rounded-lg flex items-center justify-center bg-red-500/10 text-red-400 hover:bg-red-500/20">
                             <Trash2 className="w-3 h-3" />
                           </button>
                         </div>
                      </td>
                    );
                  }

                  let cellClass = `px-3 py-2 whitespace-nowrap ${
                    col.align === 'right' ? 'text-right' : 
                    col.align === 'center' ? 'text-center' : 'text-left'
                  }`;

                  if (col.key === 'actualResult') {
                    return <td key={col.key} className={`${cellClass} ${resultColor(raw)} uppercase font-bold tracking-wider`}>{raw || '—'}</td>;
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
        </tbody>
      </table>
      <div className="px-3 py-2 text-right text-[10px] text-zinc-600 font-mono">
        {props.length.toLocaleString()} props ({pendingCount.toLocaleString()} pending)
      </div>
    </div>
  );
}
