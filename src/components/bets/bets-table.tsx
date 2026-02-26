'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Bet } from '@/lib/types';
import {
  Loader2, CheckSquare, Square, Layers, Minus, ChevronDown, ChevronRight,
  Pencil, Trash2, X
} from 'lucide-react';

// Helper functions for formatting, moved here to be self-contained.
function fmtLine(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—';
  return n.toFixed(1);
}
function fmtOdds(n: number | null | undefined): string {
  if (!n) return '—';
  return n > 0 ? `+${n}` : String(n);
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? '').toLowerCase();
  const cls =
    s === 'won'  || s === 'win'  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' :
    s === 'lost' || s === 'loss' ? 'bg-red-500/15 text-red-400 border-red-500/25' :
    s === 'void' || s === 'push' ? 'bg-slate-700/20 text-slate-600 border-slate-700/20' :
                                   'bg-slate-700/40 text-slate-400 border-slate-600/30';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${cls}`}>
      {status ?? 'PENDING'}
    </span>
  );
}

function CheckCell({ id, selected, onToggle }: { id: string; selected: boolean; onToggle: (id: string) => void }) {
    return (
      <td className="px-3 py-3 text-center w-10" onClick={e => e.stopPropagation()}>
        <button onClick={() => onToggle(id)} className="text-slate-500 hover:text-emerald-400 transition-colors">
          {selected ? <CheckSquare className="h-4 w-4 text-emerald-400" /> : <Square className="h-4 w-4" />}
        </button>
      </td>
    );
}

function ParlayRow({ bet, selected, onToggle, onEdit, onDelete }: { bet: any; selected: boolean; onToggle: (id: string) => void; onEdit: (bet: any) => void; onDelete: (id: string) => void; }) {
  const [open, setOpen] = useState(false);
  const legsEmpty = !bet.legs || bet.legs.length === 0;

  return (
    <>
      <tr onClick={() => !legsEmpty && setOpen(o => !o)} className={`border-b border-slate-800/60 transition-colors group ${selected ? 'bg-emerald-950/20' : ''} ${!legsEmpty ? 'cursor-pointer hover:bg-slate-800/20' : 'opacity-60'}`}>
        <CheckCell id={bet.id} selected={selected} onToggle={onToggle} />
        <td className="w-8 px-2 py-3 text-center">
          {legsEmpty ? <Minus className="h-3.5 w-3.5 text-slate-700 mx-auto" /> : open ? <ChevronDown className="h-4 w-4 text-slate-400 mx-auto" /> : <ChevronRight className="h-4 w-4 text-slate-500 mx-auto" />}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <div>
              <div className="font-bold text-slate-100 text-sm">{legsEmpty ? 'Parlay (legs unavailable)' : `${bet.legs.length}-Leg Parlay`}</div>
              {!legsEmpty && <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[240px]">{bet.legs.map((l: any) => l.player).filter(Boolean).join(' · ')}</div>}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 font-mono text-sm text-emerald-400">{fmtOdds(bet.odds)}</td>
        <td className="px-4 py-3 text-sm font-mono text-slate-300">{bet.stake ? `$${Number(bet.stake).toFixed(2)}` : <span className="text-slate-700">—</span>}</td>
        <td className="px-4 py-3 text-xs font-mono text-slate-400">{bet.displayWeek}</td>
        <td className="px-4 py-3 text-xs text-slate-400">{bet.displayDate}</td>
        <td className="px-4 py-3"><StatusBadge status={bet.status} /></td>
        <td className="px-4 py-3"><span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-bold uppercase">PARLAY</span></td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={e => { e.stopPropagation(); onEdit(bet); }} className="p-1.5 text-slate-500 hover:text-white rounded"><Pencil className="h-3.5 w-3.5" /></button>
            <button onClick={e => { e.stopPropagation(); onDelete(bet.id); }} className="p-1.5 text-slate-500 hover:text-rose-400 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </td>
      </tr>
      {open && bet.legs.map((leg: any, i: number) => (
        <tr key={leg.id ?? i} className="bg-slate-950/60 border-b border-slate-800/40">
            <td colSpan={2} />
            <td className="px-4 py-2 pl-8">
                <div className="flex items-center gap-2">
                <span className="text-[9px] bg-blue-900/40 text-blue-300 border border-blue-700/40 px-1.5 py-0.5 rounded font-bold">LEG {i + 1}</span>
                <div>
                    <div className="text-sm text-slate-200 font-medium">{leg.player || '—'}</div>
                    <div className="text-[10px] text-slate-500 capitalize">{leg.prop}</div>
                </div>
                </div>
            </td>
            <td className="px-4 py-2 text-xs"><span className={leg.selection?.toLowerCase() === 'over' ? 'text-blue-400 font-bold' : 'text-orange-400 font-bold'}>{leg.selection || '—'}</span><span className="text-slate-400 ml-1 font-mono">{fmtLine(leg.line)}</span></td>
            <td className="px-4 py-2 text-slate-700">—</td>
            <td className="px-4 py-2 text-xs font-mono text-slate-500">{leg.week ? `WK ${leg.week}` : '-'}</td>
            <td className="px-4 py-2 text-xs text-slate-600 uppercase font-mono">{leg.matchup || '—'}</td>
            <td className="px-4 py-2"><StatusBadge status={leg.status} /></td>
            <td className="px-4 py-2"><span className="text-[9px] text-slate-600">LEG</span></td>
            <td />
        </tr>
      ))}
    </>
  );
}

function SingleRow({ bet, selected, onToggle, onEdit, onDelete }: { bet: any; selected: boolean; onToggle: (id: string) => void; onEdit: (bet: any) => void; onDelete: (id: string) => void; }) {
  const leg = bet.legs?.[0] ?? {};
  return (
    <tr className={`border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors group ${selected ? 'bg-emerald-950/20' : ''}`}>
      <CheckCell id={bet.id} selected={selected} onToggle={onToggle} />
      <td className="w-8 px-2 py-3" />
      <td className="px-4 py-3">
        <div className="font-semibold text-slate-100 text-sm">{leg.player || '—'}</div>
        <div className="text-[10px] text-slate-500 uppercase mt-0.5">{leg.prop}</div>
      </td>
      <td className="px-4 py-3 text-sm">
        <span className={`font-bold ${leg.selection?.toLowerCase() === 'over' ? 'text-blue-400' : 'text-orange-400'}`}>{leg.selection || '—'}</span>
        <span className="text-white font-bold font-mono ml-1.5">{fmtLine(leg.line)}</span>
      </td>
      <td className="px-4 py-3 text-sm font-mono text-slate-300">{bet.stake ? `$${Number(bet.stake).toFixed(2)}` : <span className="text-slate-700">—</span>}</td>
      <td className="px-4 py-3 text-xs font-mono text-slate-400">{bet.displayWeek}</td>
      <td className="px-4 py-3 text-xs text-slate-400">{bet.displayDate}</td>
      <td className="px-4 py-3"><StatusBadge status={bet.status} /></td>
      <td className="px-4 py-3"><span className="text-[10px] text-slate-600">SINGLE</span></td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(bet)} className="p-1.5 text-slate-500 hover:text-white rounded"><Pencil className="h-3.5 w-3.5" /></button>
            <button onClick={() => onDelete(bet.id)} className="p-1.5 text-slate-500 hover:text-rose-400 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </td>
    </tr>
  );
}

interface BetsTableProps {
  bets: Bet[];
  loading: boolean;
  onDelete: (ids: string[]) => Promise<void>;
  onEdit: (bet: Bet) => void;
}

export function BetsTable({ bets, loading, onDelete, onEdit }: BetsTableProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkDeleting, setBulkDeleting] = useState(false);

    const allVisibleIds = useMemo(() => bets.map(b => b.id), [bets]);
    const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id));
    const someSelected = selectedIds.size > 0;

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
    }, []);

    const toggleSelectAll = () => {
        setSelectedIds(allSelected ? new Set() : new Set(allVisibleIds));
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        setBulkDeleting(true);
        await onDelete(Array.from(selectedIds));
        setSelectedIds(new Set());
        setBulkDeleting(false);
    };

    if (loading && bets.length === 0) {
        return (
            <div className="flex flex-col items-center py-24 gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
                <p className="text-slate-600 text-xs uppercase font-mono tracking-wider">Loading Bets…</p>
            </div>
        );
    }

    if (!loading && bets.length === 0) {
        return (
            <div className="flex flex-col items-center py-24 border border-dashed border-slate-800 rounded-2xl gap-2">
                <p className="text-slate-400 text-sm font-medium">No Bets Found</p>
                <p className="text-slate-600 text-xs">No bets matched your search or filters.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            {someSelected && (
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl">
                    <span className="text-sm text-slate-300 font-semibold">{selectedIds.size} selected</span>
                    <button onClick={handleBulkDelete} disabled={bulkDeleting} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors">
                        {bulkDeleting ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/> Deleting...</> : <><Trash2 className="h-3.5 w-3.5"/> Delete Selected</>}
                    </button>
                    <button onClick={() => setSelectedIds(new Set())} className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors ml-auto">
                        <X className="h-3.5 w-3.5" /> Clear
                    </button>
                </div>
            )}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-x-auto">
                <table className="w-full min-w-[960px]">
                    <thead className="bg-slate-900/80 border-b border-slate-800">
                        <tr>
                            <th className="w-10 px-3 py-3 text-center"><button onClick={toggleSelectAll} className="text-slate-500 hover:text-emerald-400 transition-colors"><Square className="h-4 w-4 mx-auto"/></button></th>
                            <th className="w-8 px-2 py-3" />
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Player / Parlay</th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Selection / Odds</th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Stake</th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Week</th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</th>
                            <th className="px-4 py-3 w-20" />
                        </tr>
                    </thead>
                    <tbody>
                        {bets.map(bet => (
                            bet.betType === 'Parlay'
                            ? <ParlayRow key={bet.id} bet={bet} selected={selectedIds.has(bet.id)} onToggle={toggleSelect} onEdit={onEdit} onDelete={(id) => onDelete([id])} />
                            : <SingleRow key={bet.id} bet={bet} selected={selectedIds.has(bet.id)} onToggle={toggleSelect} onEdit={onEdit} onDelete={(id) => onDelete([id])} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}