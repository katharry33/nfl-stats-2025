'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  Plus, Check, Loader2, Search,
} from 'lucide-react';
import type { NormalizedProp } from '@/hooks/useAllProps';

// --- Interfaces ---
interface PropsTableProps {
  props:          NormalizedProp[];
  league:         'nfl' | 'nba' | 'ncaab';
  isLoading:      boolean;
  onAddToBetSlip: (prop: NormalizedProp) => void;
  slipIds?:       Set<string>;
  onEdit?:        (prop: NormalizedProp) => void;
  onDelete?:      (id: string) => Promise<void>; // Add this line
}

interface ColDef {
  id:      string;
  label:   string;
  default: boolean;
  nbaOnly?: boolean;
}

// --- Column definitions ---
const ALL_COLUMNS: ColDef[] = [
  { id: 'week',         label: 'Week',           default: false },
  { id: 'player',       label: 'Player',         default: true  },
  { id: 'matchup',      label: 'Matchup',        default: true  },
  { id: 'propLine',     label: 'Prop / Line',    default: true  },
  { id: 'playerAvg',    label: 'Season Avg',     default: true  },
  { id: 'scoreDiff',    label: 'Avg vs Line',    default: true  },
  { id: 'hitPct',       label: 'Hit %',          default: true  },
  { id: 'edge',         label: 'Edge %',         default: true  },
  { id: 'conf',         label: 'Confidence',     default: true  },
  { id: 'pace',         label: 'Pace',           default: true, nbaOnly: true },
  { id: 'defRating',    label: 'Def Rating',     default: true, nbaOnly: true },
];

// --- Helpers ---
const nv  = (v: any) => (v == null || isNaN(Number(v)) ? -Infinity : Number(v));
const fmt = (v: any, dp = 1) => { 
  const x = Number(v); 
  return v == null || isNaN(x) ? '—' : x.toFixed(dp); 
};

function fmtPct(v: any, dp = 0) {
  if (v == null || v === '') return '—';
  const x = Number(v);
  if (isNaN(x) || x === 0) return '—';
  return (x <= 1.5 ? x * 100 : x).toFixed(dp) + '%';
}

function getSortVal(p: NormalizedProp, key: string): number | string {
  switch (key) {
    case 'player':    return p.player ?? '';
    case 'playerAvg': return nv(p.playerAvg);
    case 'scoreDiff': return nv(p.scoreDiff);
    case 'hitPct':    return nv(p.seasonHitPct);
    case 'edge':      return nv(p.bestEdgePct);
    case 'conf':      return nv(p.confidenceScore);
    case 'pace':      return nv(p.pace);
    case 'defRating': return nv(p.defRating);
    default:          return '';
  }
}

function SortTh({ col, label, sortKey, sortDir, onSort }: any) {
  const active = sortKey === col;
  return (
    <th onClick={() => onSort(col)} className="px-4 py-3 cursor-pointer select-none group">
      <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white transition-colors">
        {label}
        {active 
          ? (sortDir === 'desc' ? <ChevronDown className="h-3 w-3 text-cyan-400" /> : <ChevronUp className="h-3 w-3 text-cyan-400" />)
          : <ChevronsUpDown className="h-3 w-3 opacity-20 group-hover:opacity-100" />
        }
      </div>
    </th>
  );
}

// --- Main Component ---
export function PropsTable({
  props = [], league, isLoading, onAddToBetSlip,
  slipIds = new Set(),
}: PropsTableProps) {
  
  const initialCols = useMemo(() => {
    return ALL_COLUMNS
      .filter(c => c.default && (league === 'nba' || !c.nbaOnly))
      .map(c => c.id);
  }, [league]);

  const [colOrder] = useState<string[]>(initialCols);
  const [sortKey, setSortKey] = useState<string>('conf');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSort = useCallback((key: string) => {
    setSortDir(prev => (key === sortKey ? (prev === 'desc' ? 'asc' : 'desc') : 'desc'));
    setSortKey(key);
  }, [sortKey]);

  const filtered = useMemo(() =>
    props.filter(p =>
      (p.player ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.team   ?? '').toLowerCase().includes(search.toLowerCase())
    ), [props, search]);

  const sorted = useMemo(() =>
    ([...filtered].sort((a, b) => {
      const av = getSortVal(a, sortKey), bv = getSortVal(b, sortKey);
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    })), [filtered, sortKey, sortDir]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin mb-4 text-cyan-400" />
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Accessing Ledger...</span>
    </div>
  );

  return (
    <div className="bg-transparent overflow-hidden">
      <div className="flex items-center gap-4 p-4 border-b border-white/5 bg-black/20">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input 
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search Player/Team..."
            className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl text-[10px] uppercase font-bold tracking-widest text-white outline-none focus:border-cyan-500/50 transition-all" 
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-black/40">
              <th className="px-4 py-3 w-8" />
              {colOrder.map(id => (
                <SortTh key={id} col={id} label={ALL_COLUMNS.find(c => c.id === id)?.label ?? ''} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              ))}
              <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-slate-500">Slip</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((prop, idx) => {
              const id = String(prop.id ?? idx);
              const isExp = expandedId === id;
              const inSlip = slipIds.has(id);
              const isOver = (prop.overUnder ?? '').toLowerCase() === 'over';

              return (
                <React.Fragment key={id}>
                  <tr onClick={() => setExpandedId(isExp ? null : id)} className={`border-b border-white/5 cursor-pointer hover:bg-white/[0.02] ${isExp ? 'bg-white/[0.03]' : ''}`}>
                    <td className="px-4 py-4 text-center">
                      <ChevronDown className={`h-3 w-3 transition-transform ${isExp ? '' : '-rotate-90 text-slate-600'}`} />
                    </td>
                    {colOrder.map(colId => {
                      switch (colId) {
                        case 'player': return (
                          <td key={colId} className="px-4 py-4">
                            <p className="text-[11px] font-black text-white italic uppercase">{prop.player}</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase">{prop.team}</p>
                          </td>
                        );
                        case 'propLine': return (
                          <td key={colId} className="px-4 py-4 text-center">
                            <p className="text-[9px] uppercase text-slate-500 font-black mb-0.5">{prop.prop}</p>
                            <p className="text-xs font-black text-cyan-400 font-mono">
                              {prop.line} <span className={isOver ? 'text-emerald-400' : 'text-rose-400'}>{prop.overUnder?.charAt(0)}</span>
                            </p>
                          </td>
                        );
                        case 'playerAvg': return <td key={colId} className="px-4 py-4 text-center font-mono text-[11px] text-slate-300">{fmt(prop.playerAvg)}</td>;
                        case 'scoreDiff': return (
                          <td key={colId} className="px-4 py-4 text-center font-mono text-[11px] font-black">
                            <span className={Number(prop.scoreDiff) > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {prop.scoreDiff != null ? (Number(prop.scoreDiff) > 0 ? `+${fmt(prop.scoreDiff)}` : fmt(prop.scoreDiff)) : '—'}
                            </span>
                          </td>
                        );
                        case 'pace': return <td key={colId} className="px-4 py-4 text-center font-mono text-[11px] text-orange-400">{fmt(prop.pace)}</td>;
                        case 'defRating': return <td key={colId} className="px-4 py-4 text-center font-mono text-[11px] text-slate-400">{fmt(prop.defRating)}</td>;
                        case 'hitPct': return <td key={colId} className="px-4 py-4 text-center font-mono text-[11px] font-black text-white">{fmtPct(prop.seasonHitPct)}</td>;
                        case 'edge': return <td key={colId} className="px-4 py-4 text-center font-mono text-[11px] text-emerald-400">+{fmtPct(prop.bestEdgePct, 1)}</td>;
                        case 'conf': return <td key={colId} className="px-4 py-4 text-center font-mono text-[11px] font-black text-cyan-400 bg-cyan-400/5">{fmtPct(prop.confidenceScore)}</td>;
                        default: return <td key={colId} className="px-4 py-4 text-center">—</td>;
                      }
                    })}
                    <td className="px-4 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <button onClick={() => !inSlip && onAddToBetSlip(prop)}
                        className={`p-2 rounded-xl transition-all ${inSlip ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-400 hover:bg-cyan-500 hover:text-white'}`}>
                        {inSlip ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                  {isExp && (
                    <tr className="bg-white/[0.01]">
                      <td colSpan={colOrder.length + 2} className="p-6 border-b border-white/5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                           <DetailBox label="Kelly Criterion" value={fmtPct(prop.kellyPct, 1)} />
                           <DetailBox label="Implied Prob" value={fmtPct(prop.impliedProb)} />
                           <DetailBox label="Matchup" value={prop.matchup || 'N/A'} isText />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailBox({ label, value, isText = false }: { label: string, value: any, isText?: boolean }) {
  return (
    <div className="bg-black/40 p-3 rounded-2xl border border-white/10">
      <p className="text-[8px] uppercase font-black text-slate-500 mb-1 tracking-widest">{label}</p>
      <p className={`text-xs font-black uppercase ${isText ? 'text-slate-300' : 'text-white font-mono'}`}>{value ?? '—'}</p>
    </div>
  );
}