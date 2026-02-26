'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2, AlertCircle, RefreshCw, ChevronDown, ChevronRight,
  Layers, Minus, Trash2, Pencil, CheckSquare, Square, X,
} from 'lucide-react';
import { Bet } from '@/lib/types';
import { BettingStats } from '@/components/bets/betting-stats';
import { EditBetModal } from '@/components/bets/edit-bet-modal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtLine(n: any): string {
  // 1. Handle null/undefined/empty
  if (n === null || n === undefined || n === '') return '—';
  
  // 2. Convert to number (handles strings like "244.5")
  const num = typeof n === 'number' ? n : parseFloat(String(n));
  
  // 3. Check if the result is actually a valid number
  if (isNaN(num)) return '—';
  
  // 4. Return formatted string
  return num.toFixed(1);
}

function fmtDate(raw: string | null | undefined): string {
  if (!raw) return '—';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  } catch { return '—'; }
}

function fmtOdds(n: number | null | undefined): string {
  if (!n) return '—';
  return n > 0 ? `+${n}` : String(n);
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

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

// ─── Checkbox cell ────────────────────────────────────────────────────────────

function CheckCell({ id, selected, onToggle }: { id: string; selected: boolean; onToggle: (id: string) => void }) {
  return (
    <td className="px-3 py-3 text-center w-10" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => onToggle(id)}
        className="text-slate-500 hover:text-emerald-400 transition-colors"
      >
        {selected
          ? <CheckSquare className="h-4 w-4 text-emerald-400" />
          : <Square className="h-4 w-4" />
        }
      </button>
    </td>
  );
}

// ─── ParlayRow ────────────────────────────────────────────────────────────────

function ParlayRow({
  bet, selected, onToggle, onEdit, onDelete,
}: {
  bet: any;
  selected: boolean;
  onToggle: (id: string) => void;
  onEdit: (bet: any) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        onClick={() => !bet.legsEmpty && setOpen(o => !o)}
        className={`border-b border-slate-800/60 transition-colors group ${
          selected ? 'bg-emerald-950/20' : ''
        } ${!bet.legsEmpty ? 'cursor-pointer hover:bg-slate-800/20' : 'opacity-60'}`}
      >
        <CheckCell id={bet.id} selected={selected} onToggle={onToggle} />

        {/* Expand icon */}
        <td className="w-8 px-2 py-3 text-center">
          {bet.legsEmpty ? (
            <Minus className="h-3.5 w-3.5 text-slate-700 mx-auto" />
          ) : open ? (
            <ChevronDown className="h-4 w-4 text-slate-400 mx-auto" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-500 mx-auto" />
          )}
        </td>

        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <div>
              <div className="font-bold text-slate-100 text-sm">
                {bet.legsEmpty ? 'Parlay (legs unavailable)' : `${bet.legs.length}-Leg Parlay`}
              </div>
              {!bet.legsEmpty && bet.legs.length > 0 && (
                <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[240px]">
                  {bet.legs.map((l: any) => l.player).filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 font-mono text-sm text-emerald-400">{fmtOdds(bet.odds)}</td>
        <td className="px-4 py-3 text-sm font-mono text-slate-300">
          {bet.stake ? `$${Number(bet.stake).toFixed(2)}` : <span className="text-slate-700">—</span>}
        </td>
        <td className="px-4 py-3 text-xs font-mono text-slate-400">
          {bet.week ? `WK ${bet.week}` : <span className="text-slate-700">—</span>}
        </td>
        <td className="px-4 py-3 text-xs text-slate-400">{fmtDate(bet.createdAt)}</td>
        <td className="px-4 py-3"><StatusBadge status={bet.status} /></td>
        <td className="px-4 py-3">
          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-bold uppercase">
            PARLAY
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={e => { e.stopPropagation(); onEdit(bet); }} className="p-1.5 text-slate-500 hover:text-white rounded">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(bet.id); }} className="p-1.5 text-slate-500 hover:text-rose-400 rounded">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>

      {open && bet.legs.map((leg: any, i: number) => (
        <tr key={leg.id ?? i} className="bg-slate-950/60 border-b border-slate-800/40">
          <td colSpan={2} />
          <td className="px-4 py-2 pl-8">
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-blue-900/40 text-blue-300 border border-blue-700/40 px-1.5 py-0.5 rounded font-bold">
                LEG {i + 1}
              </span>
              <div>
                <div className="text-sm text-slate-200 font-medium">{leg.player || '—'}</div>
                <div className="text-[10px] text-slate-500 capitalize">{leg.prop}</div>
              </div>
            </div>
          </td>
          <td className="px-4 py-2 text-xs">
            <span className={leg.selection?.toLowerCase() === 'over' ? 'text-blue-400 font-bold' : 'text-orange-400 font-bold'}>
              {leg.selection || '—'}
            </span>
            <span className="text-slate-400 ml-1 font-mono">{fmtLine(leg.line)}</span>
          </td>
          <td className="px-4 py-2 text-slate-700">—</td>
          <td className="px-4 py-2 text-xs font-mono text-slate-500">{leg.week ? `WK ${leg.week}` : '—'}</td>
          <td className="px-4 py-2 text-xs text-slate-600 uppercase font-mono">{leg.matchup || '—'}</td>
          <td className="px-4 py-2"><StatusBadge status={leg.status} /></td>
          <td className="px-4 py-2"><span className="text-[9px] text-slate-600">LEG</span></td>
          <td />
        </tr>
      ))}
    </>
  );
}

// ─── SingleRow ────────────────────────────────────────────────────────────────

function SingleRow({
  bet, selected, onToggle, onEdit, onDelete,
}: {
  bet: any;
  selected: boolean;
  onToggle: (id: string) => void;
  onEdit: (bet: any) => void;
  onDelete: (id: string) => void;
}) {
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
        <span className={`font-bold ${leg.selection?.toLowerCase() === 'over' ? 'text-blue-400' : 'text-orange-400'}`}>
          {leg.selection || '—'}
        </span>
        <span className="text-white font-bold font-mono ml-1.5">{fmtLine(leg.line)}</span>
      </td>
      <td className="px-4 py-3 text-sm font-mono text-slate-300">
        {bet.stake ? `$${Number(bet.stake).toFixed(2)}` : <span className="text-slate-700">—</span>}
      </td>
      <td className="px-4 py-3 text-xs font-mono text-slate-400">
        {bet.week ? `WK ${bet.week}` : <span className="text-slate-700">—</span>}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500 uppercase font-mono">{leg.matchup || '—'}</td>
      <td className="px-4 py-3"><StatusBadge status={bet.status} /></td>
      <td className="px-4 py-3"><span className="text-[10px] text-slate-600">SINGLE</span></td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(bet)} className="p-1.5 text-slate-500 hover:text-white rounded">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(bet.id)} className="p-1.5 text-slate-500 hover:text-rose-400 rounded">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BettingLogPage() {
  const [bets,        setBets]        = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(false);
  const [nextCursor,  setNextCursor]  = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);

  const [searchTerm,   setSearchTerm]   = useState('');
  const [weekFilter,   setWeekFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Bulk select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Edit
  const [editBet,  setEditBet]  = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchBets = useCallback(async (append = false, cursorOverride?: string | null) => {
    if (!append) { setLoading(true); setError(null); }
    else           setLoadingMore(true);

    try {
      const params = new URLSearchParams({ limit: '25' });
      if (weekFilter   !== 'all') params.set('week',   weekFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const cur = cursorOverride !== undefined ? cursorOverride : (append ? nextCursor : null);
      if (cur) params.set('cursor', cur);

      const res  = await fetch(`/api/betting-log?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      setBets(prev => append ? [...prev, ...(data.bets ?? [])] : (data.bets ?? []));
      setHasMore(data.hasMore    ?? false);
      setNextCursor(data.nextCursor ?? null);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load bets');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [weekFilter, statusFilter, nextCursor]);

  useEffect(() => { fetchBets(false, null); }, []); // eslint-disable-line
  useEffect(() => {
    setBets([]); setNextCursor(null); fetchBets(false, null);
  }, [weekFilter, statusFilter]); // eslint-disable-line

  // ── Search ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!searchTerm) return bets;
    const t = searchTerm.toLowerCase();
    return bets.filter(b =>
      b.legs?.some((l: any) =>
        l.player?.toLowerCase().includes(t) || l.matchup?.toLowerCase().includes(t),
      ),
    );
  }, [bets, searchTerm]);

  // ── Bulk select helpers ───────────────────────────────────────────────────
  const allFilteredIds  = useMemo(() => filtered.map(b => b.id), [filtered]);
  const allSelected     = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id));
  const someSelected    = selectedIds.size > 0;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredIds));
    }
  };

  // ── Single delete ─────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this bet and all its legs?')) return;
    try {
      const res = await fetch(`/api/delete-bet?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Delete failed');
      setBets(prev => prev.filter(b => b.id !== id));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  }, []);

  // ── Bulk delete ───────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected bet${selectedIds.size > 1 ? 's' : ''} and all their legs?`)) return;

    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    let failed = 0;

    await Promise.all(ids.map(async (id) => {
      try {
        const res = await fetch(`/api/delete-bet?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (!res.ok) failed++;
        else setBets(prev => prev.filter(b => b.id !== id));
      } catch {
        failed++;
      }
    }));

    setBulkDeleting(false);
    setSelectedIds(new Set());
    if (failed > 0) alert(`${failed} deletion(s) failed.`);
  };

  // ── Edit save ─────────────────────────────────────────────────────────────
  const handleSave = useCallback((updates: Partial<Bet>) => {
    setBets(prev => prev.map(b => (b.id === (updates as any).id ? { ...b, ...updates } : b)));
    setEditOpen(false);
  }, []);

  const activeFilters = searchTerm || weekFilter !== 'all' || statusFilter !== 'all';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Betting Log
            {!loading && (
              <span className="text-slate-500 text-base font-normal ml-2">({filtered.length.toLocaleString()})</span>
            )}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Track performance and manage active plays.</p>
        </div>
        <button
          onClick={() => { setBets([]); setNextCursor(null); fetchBets(false, null); }}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs rounded-lg border border-slate-700 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-950/40 border border-red-800/50 rounded-xl text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => fetchBets(false, null)} className="ml-auto text-xs underline">Retry</button>
        </div>
      )}

      {/* Stats */}
      {!loading && bets.length > 0 && <BettingStats bets={bets} />}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Search</label>
          <input
            type="text"
            placeholder="Player or matchup…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Week</label>
          <select value={weekFilter} onChange={e => setWeekFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="all">All Weeks</option>
            {Array.from({ length: 22 }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>Week {i + 1}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="all">All Status</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="pending">Pending</option>
            <option value="void">Void</option>
          </select>
        </div>
        {activeFilters && (
          <button onClick={() => { setSearchTerm(''); setWeekFilter('all'); setStatusFilter('all'); }}
            className="self-end px-3 py-2 text-xs font-bold text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg transition-colors">
            Clear Filters
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl">
          <span className="text-sm text-slate-300 font-semibold">
            {selectedIds.size} bet{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
          >
            {bulkDeleting
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting…</>
              : <><Trash2 className="h-3.5 w-3.5" /> Delete Selected</>
            }
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors ml-auto"
          >
            <X className="h-3.5 w-3.5" /> Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center py-24 gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
          <p className="text-slate-600 text-xs uppercase font-mono tracking-wider">Loading bets…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-24 border border-dashed border-slate-800 rounded-2xl gap-2">
          <p className="text-slate-500 text-sm">
            {activeFilters ? 'No bets matched your filters.' : 'No bets recorded yet.'}
          </p>
          {!activeFilters && (
            <p className="text-slate-700 text-xs">
              Head to{' '}
              <a href="/all-props" className="text-emerald-400 hover:underline">Historical Props</a>
              {' '}to add your first leg.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-slate-900/80 border-b border-slate-800">
              <tr>
                {/* Select all checkbox */}
                <th className="w-10 px-3 py-3 text-center">
                  <button onClick={toggleSelectAll} className="text-slate-500 hover:text-emerald-400 transition-colors">
                    {allSelected
                      ? <CheckSquare className="h-4 w-4 text-emerald-400 mx-auto" />
                      : <Square className="h-4 w-4 mx-auto" />
                    }
                  </button>
                </th>
                <th className="w-8 px-2 py-3" />
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Player / Parlay</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Selection / Odds</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Stake</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Week</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Matchup / Date</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
                {bets.map(bet => {
                    // IMPROVED LOGIC: Check the array length, not just the string label
                    const hasMultipleLegs = Array.isArray(bet.legs) && bet.legs.length > 1;
                    const isParlay = bet.betType === 'Parlay' || hasMultipleLegs;

                    if (isParlay) {
                        return (
                            <ParlayRow 
                                key={bet.id} 
                                bet={{ ...bet, betType: 'Parlay' }} // Force type for sub-component
                                selected={selectedIds.has(bet.id)} 
                                onToggle={toggleSelect} 
                                onEdit={b => { setEditBet(b); setEditOpen(true); }}
                                onDelete={handleDelete}
                            />
                        );
                    }

                    return (
                        <SingleRow 
                            key={bet.id} 
                            bet={bet} 
                            selected={selectedIds.has(bet.id)} 
                            onToggle={toggleSelect} 
                            onEdit={b => { setEditBet(b); setEditOpen(true); }}
                            onDelete={handleDelete}
                        />
                    );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Load More */}
      {hasMore && !loading && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => fetchBets(true)}
            disabled={loadingMore}
            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm border border-slate-700 flex items-center gap-2 transition-colors"
          >
            {loadingMore
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading…</>
              : <><ChevronDown className="h-4 w-4" /> Load More Bets</>
            }
          </button>
        </div>
      )}

      {!hasMore && bets.length > 0 && !loading && (
        <p className="text-center text-slate-700 text-xs pb-4">All {bets.length.toLocaleString()} bets loaded</p>
      )}

      <EditBetModal
        isOpen={editOpen}
        bet={editBet as Bet | null}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}