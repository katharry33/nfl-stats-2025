'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Loader2, CheckSquare, Square, Layers, Minus, 
  ChevronDown, ChevronRight, ChevronUp, 
  Pencil, Trash2, X, Zap 
} from 'lucide-react';
import { Bet } from '@/lib/types';

// ─── Updated Helpers ──────────────────────────────────────────────────────────

function fmtOdds(odds: number | null | undefined): string {
  if (odds == null) return '—';
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null || n === 0) return '—';
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(raw: string | null | undefined): string {
  if (!raw) return '—';
  try {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? '—'
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  } catch { return '—'; }
}


// ─── Visual Boost & Payout Components ────────────────────────────────────────

function PayoutCell({ payout, status, stake, odds, boost }: {
  payout: number | null; status: string; stake: number | null; odds?: number; boost?: number;
}) {
  const s = (status ?? '').toLowerCase();
  const isWon = s === 'won' || s === 'win' || s === 'cashed';
  const isLost = s === 'lost' || s === 'loss';
  
  return (
    <div className="flex flex-col items-end gap-0.5">
      {/* Primary Value: The Outcome or the POT */}
      <div className="flex flex-col items-end">
        <span className={`text-sm font-mono font-black tracking-tight ${
          isWon ? 'text-emerald-400' : isLost ? 'text-zinc-500' : 'text-[#FFD700]'
        }`}>
          {isWon ? fmtMoney(payout) : isLost ? '—' : fmtMoney(payout)}
        </span>
        
        {/* POT Label - Highlighted for visibility */}
        {!isWon && payout && (
          <div className="flex items-center gap-1 mt-0.5">
             <span className="text-[9px] px-1 bg-zinc-800 text-zinc-400 font-bold rounded">POT</span>
             <span className="text-xs text-zinc-300 font-mono font-bold tracking-tighter">
               {fmtMoney(payout)}
             </span>
          </div>
        )}
      </div>

      {/* Sub-details: Odds and Boost */}
      <div className="flex items-center gap-2 mt-1 opacity-80">
        <span className="text-[10px] font-mono text-zinc-500 font-bold">{fmtOdds(odds)}</span>
        {boost && boost > 0 ? (
          <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-black italic">
            <Zap className="h-2.5 w-2.5 fill-current" />
            {boost}%
          </span>
        ) : null}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? '').toLowerCase();
  const cls =
    s === 'won'  || s === 'win'  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' :
    s === 'lost' || s === 'loss' ? 'bg-red-500/15 text-red-400 border-red-500/25' :
    s === 'void' || s === 'push' ? 'bg-zinc-700/20 text-zinc-500 border-zinc-700/20' :
    s === 'cashed'               ? 'bg-blue-500/15 text-blue-400 border-blue-500/25' :
                                   'bg-amber-500/10 text-amber-400 border-amber-500/20';
  const label = s === 'won' || s === 'win' ? 'WON'
    : s === 'lost' || s === 'loss' ? 'LOST'
    : s === 'void' || s === 'push' ? 'VOID'
    : s === 'cashed' ? 'CASHED'
    : 'PENDING';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase border ${cls}`}>
      {label}
    </span>
  );
}

function CheckCell({ id, selected, onToggle }: {
  id: string; selected: boolean; onToggle: (id: string) => void;
}) {
  return (
    <td className="px-3 py-3 text-center w-10" onClick={e => e.stopPropagation()}>
      <button onClick={() => onToggle(id)} className="text-zinc-600 hover:text-[#FFD700] transition-colors">
        {selected ? <CheckSquare className="h-4 w-4 text-[#FFD700]" /> : <Square className="h-4 w-4" />}
      </button>
    </td>
  );
}

// ─── Updated ParlayRow ────────────────────────────────────────────────────────

function ParlayRow({ bet, selected, onToggle, onEdit, onDelete }: any) {
  const [open, setOpen] = useState(false);
  const legsEmpty = !bet.legs || bet.legs.length === 0;
  const displayDate = bet.legs?.[0]?.gameDate ?? bet.gameDate ?? bet.createdAt;
  const matchups = [...new Set((bet.legs ?? []).map((l: any) => l.matchup).filter(Boolean))].slice(0, 2).join(', ');

  return (
    <>
      <tr onClick={() => !legsEmpty && setOpen(o => !o)} 
          className={`border-b border-white/5 transition-all group ${selected ? 'bg-[#FFD700]/[0.06]' : 'hover:bg-white/[0.02]'}`}>
        <CheckCell id={bet.id} selected={selected} onToggle={onToggle} />
        <td className="w-8 px-2 py-3 text-center">
           {!legsEmpty && (open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
        </td>

        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-[#FFD700]/50" />
            <div>
              <div className="font-black text-white text-sm italic uppercase tracking-tight">
                {legsEmpty ? 'Parlay' : `${bet.legs.length}-Leg Parlay`}
              </div>
              <div className="text-[10px] text-zinc-500 truncate max-w-[180px]">
                 {bet.legs.map((l: any) => l.player).filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
        </td>

        <td className="px-4 py-3 text-xs font-mono font-black text-[#FFD700]/80">WK {bet.week || '—'}</td>
        <td className="px-4 py-3 text-xs text-zinc-500 font-mono truncate max-w-[100px]">{matchups || '—'}</td>
        <td className="px-4 py-3 text-xs text-zinc-400">{fmtDate(displayDate)}</td>
        <td className="px-4 py-3"><StatusBadge status={bet.status} /></td>

        {/* Updated Stake Display */}
        <td className="px-4 py-3">
          <div className="flex flex-col">
            <span className="text-sm font-mono font-black text-zinc-300">{fmtMoney(bet.stake)}</span>
            <div className="flex items-center gap-2">
              {bet.isBonusBet && <span className="text-[8px] text-blue-400 font-bold uppercase">Bonus Bet</span>}
              {bet.isGhostParlay && <span className="text-[8px] text-purple-400 font-bold uppercase">GHOST</span>}
            </div>
          </div>
        </td>

        {/* Updated Payout with Boost/Odds */}
        <td className="px-4 py-3 text-right">
          <PayoutCell 
            payout={bet.payout} 
            status={bet.status} 
            stake={bet.stake} 
            odds={bet.odds} 
            boost={bet.boost} 
          />
        </td>

        <td className="px-3 py-3 text-right">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={e => { e.stopPropagation(); onEdit(bet); }}
              className="p-1.5 text-zinc-600 hover:text-white rounded transition-colors">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                onDelete([bet.id as string]);
              }}
              className="p-1.5 text-zinc-600 hover:text-red-400 rounded transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
      {open && bet.legs.map((leg: any, i: number) => (
        <tr key={`${bet.id}-${leg.id ?? i}`} className="bg-black/40 border-b border-white/[0.03]">
          <td colSpan={2} />

          {/* Leg player/prop */}
          <td className="px-4 py-2 pl-10">
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20 px-1.5 py-0.5 rounded font-black shrink-0">
                LEG {i + 1}
              </span>
              <div className="min-w-0">
                <div className="text-sm text-zinc-200 font-bold truncate">{leg.player || '—'}</div>
                <div className="text-[10px] text-zinc-600 capitalize">{leg.prop || '—'}</div>
              </div>
            </div>
          </td>

          {/* Week */}
          <td className="px-4 py-2 text-xs font-mono text-zinc-600">
            {leg.week ? `WK ${leg.week}` : '—'}
          </td>

          {/* Matchup */}
          <td className="px-4 py-2 text-xs text-zinc-600 font-mono">{leg.matchup || '—'}</td>

          {/* Date */}
          <td className="px-4 py-2 text-xs text-zinc-600">{fmtDate(leg.gameDate)}</td>

          {/* Leg status */}
          <td className="px-4 py-2"><StatusBadge status={leg.status} /></td>

          {/* Selection / line */}
          <td className="px-4 py-2 text-xs" colSpan={2}>
            <span className={leg.selection?.toLowerCase() === 'over' ? 'text-blue-400 font-bold' : 'text-orange-400 font-bold'}>
              {leg.selection || '—'}
            </span>
            <span className="text-zinc-500 font-mono ml-1">{leg.line}</span>
            {leg.odds ? <span className="text-zinc-600 font-mono ml-2">({leg.odds > 0 ? '+' : ''}{leg.odds})</span> : null}
          </td>

          <td />
        </tr>
      ))}
    </>
  );
}

// ─── Updated SingleRow ────────────────────────────────────────────────────────

function SingleRow({ bet, selected, onToggle, onEdit, onDelete }: any) {
  const leg = bet.legs?.[0] ?? {};
  const displayDate = leg.gameDate ?? bet.gameDate ?? bet.createdAt;

  return (
    <tr className={`border-b border-white/5 transition-all group ${selected ? 'bg-[#FFD700]/[0.06]' : 'hover:bg-white/[0.02]'}`}>
      <CheckCell id={bet.id} selected={selected} onToggle={onToggle} />
      <td className="w-8 px-2 py-3" />
      <td className="px-4 py-3">
        <div className="font-black text-white text-sm italic uppercase tracking-tight">{leg.player || '—'}</div>
        <div className="text-[10px] text-zinc-600 uppercase">{leg.prop || '—'}</div>
      </td>
      <td className="px-4 py-3 text-xs font-mono font-black text-[#FFD700]/80">WK {bet.week || '—'}</td>
      <td className="px-4 py-3 text-xs text-zinc-500 font-mono">{leg.matchup || '—'}</td>
      <td className="px-4 py-3 text-xs text-zinc-400">{fmtDate(displayDate)}</td>
      <td className="px-4 py-3"><StatusBadge status={bet.status} /></td>
      
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <span className="text-sm font-mono font-black text-zinc-300">{fmtMoney(bet.stake)}</span>
          <div className="flex items-center gap-2">
            {bet.isBonusBet && <span className="text-[8px] text-blue-400 font-bold uppercase tracking-widest">Bonus Bet</span>}
            {bet.isGhostParlay && <span className="text-[8px] text-purple-400 font-bold uppercase tracking-widest">GHOST</span>}
          </div>
        </div>
      </td>

      <td className="px-4 py-3 text-right">
        <PayoutCell 
          payout={bet.payout} 
          status={bet.status} 
          stake={bet.stake} 
          odds={bet.odds} 
          boost={bet.boost} 
        />
      </td>
      <td className="px-3 py-3 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onEdit(bet); }} className="p-1.5 text-zinc-600 hover:text-white rounded transition-colors">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete([bet.id as string]); }} className="p-1.5 text-zinc-600 hover:text-red-400 rounded transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
      </td>
    </tr>
  );
}

type SortKey = 'player' | 'week' | 'date' | 'status' | 'stake' | 'payout';

type SortDir = 'asc' | 'desc';

function Th({ col, label, sortCol, sortDir, onSort, align = 'left' }: {
  col: string; label: string; sortCol: string; sortDir: SortDir;
  onSort: (c: string) => void; align?: 'left' | 'right';
}) {
  const active = sortCol === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]
        cursor-pointer select-none hover:text-zinc-300 transition-colors text-${align}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active
          ? sortDir === 'asc'
            ? <ChevronUp   className="h-3 w-3 text-[#FFD700]" />
            : <ChevronDown className="h-3 w-3 text-[#FFD700]" />
          : <ChevronDown className="h-3 w-3 text-zinc-800" />}
      </span>
    </th>
  );
}

interface BetsTableProps {
  bets: Bet[];
  loading: boolean;
  onDelete: (ids: string[]) => Promise<void>;
  onEdit: (bet: Bet) => void;
}

export function BetsTable({ bets, loading, onDelete, onEdit }: BetsTableProps) {
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [sortCol,      setSortCol]      = useState<SortKey>('date');
  const [sortDir,      setSortDir]      = useState<SortDir>('desc');

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col as SortKey); setSortDir('desc'); }
  };

  const sorted = useMemo(() => {
    const seen = new Set<string>();
    const unique = bets.filter(b => { if (seen.has(b.id)) return false; seen.add(b.id); return true; });
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...unique].sort((a: any, b: any) => {
      switch (sortCol) {
        case 'player': return (a.legs?.[0]?.player ?? '').localeCompare(b.legs?.[0]?.player ?? '') * dir;
        case 'week':   return ((a.week ?? 0) - (b.week ?? 0)) * dir;
        case 'date': {
          const ad = new Date(a.legs?.[0]?.gameDate ?? a.gameDate ?? a.createdAt ?? 0).getTime();
          const bd = new Date(b.legs?.[0]?.gameDate ?? b.gameDate ?? b.createdAt ?? 0).getTime();
          return (ad - bd) * dir;
        }
        case 'status': return (a.status ?? '').localeCompare(b.status ?? '') * dir;
        case 'stake':  return ((a.stake ?? 0) - (b.stake ?? 0)) * dir;
        case 'payout': return ((a.payout ?? 0) - (b.payout ?? 0)) * dir;
        default: return 0;
      }
    });
  }, [bets, sortCol, sortDir]);

  const allVisibleIds = useMemo(() => bets.map(b => b.id), [bets]);
  const allSelected   = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id));
  const someSelected  = selectedIds.size > 0;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    setBulkDeleting(true);
    await onDelete(Array.from(selectedIds));
    setSelectedIds(new Set());
    setBulkDeleting(false);
  };

  if (loading && bets.length === 0) {
    return (
      <div className="flex flex-col items-center py-24 gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-[#FFD700]" />
        <p className="text-zinc-600 text-xs uppercase font-mono tracking-wider">Loading bets…</p>
      </div>
    );
  }

  if (!loading && bets.length === 0) {
    return (
      <div className="flex flex-col items-center py-24 border border-dashed border-white/[0.06] rounded-[2rem] gap-2">
        <p className="text-zinc-400 text-sm font-black italic">No Bets Found</p>
        <p className="text-zinc-600 text-xs">No bets matched your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {someSelected && (
        <div className="flex items-center gap-3 px-4 py-3 bg-[#0f1115] border border-white/[0.06] rounded-2xl">
          <span className="text-sm text-zinc-300 font-black">{selectedIds.size} selected</span>
          <button onClick={handleBulkDelete} disabled={bulkDeleting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-colors">
            {bulkDeleting
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting…</>
              : <><Trash2  className="h-3.5 w-3.5" /> Delete Selected</>}
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="flex items-center gap-1 text-xs text-zinc-600 hover:text-white transition-colors ml-auto">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      )}

      <div className="rounded-[2rem] border border-white/[0.06] bg-[#0f1115] overflow-x-auto shadow-2xl">
        <table className="w-full min-w-[980px]">
          <thead className="border-b border-white/[0.06]">
            <tr>
              {/* Checkbox */}
              <th className="w-10 px-3 py-4 text-center">
                <button onClick={() => setSelectedIds(allSelected ? new Set() : new Set(allVisibleIds))}
                  className="text-zinc-600 hover:text-[#FFD700] transition-colors">
                  <Square className="h-4 w-4 mx-auto" />
                </button>
              </th>
              {/* Expand */}
              <th className="w-8 px-2 py-4" />
              {/* Columns in requested order */}
              <Th col="player"  label="Player / Parlay" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <Th col="week"    label="Week"            sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <th className="px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] text-left">Matchup</th>
              <Th col="date"    label="Date"            sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <Th col="status"  label="Status"          sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <Th col="stake"   label="Stake"           sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <Th col="payout"  label="Payout"          sortCol={sortCol} sortDir={sortDir} onSort={handleSort} align="right" />
              <th className="px-3 py-4 w-20" />
            </tr>
          </thead>
          <tbody>
            {sorted.map(bet => {
              const isParlay = Array.isArray(bet.legs) && bet.legs.length > 1;
              return isParlay
                ? <ParlayRow key={bet.id} bet={bet} selected={selectedIds.has(bet.id)}
                    onToggle={toggleSelect} onEdit={onEdit} onDelete={onDelete} />
                : <SingleRow key={bet.id} bet={bet} selected={selectedIds.has(bet.id)}
                    onToggle={toggleSelect} onEdit={onEdit} onDelete={onDelete} />
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
