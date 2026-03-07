'use client';
import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronUp, ChevronDown, ChevronRight, Trash2, Edit2,
  CheckCircle2, XCircle, Clock, Loader2, Save, Zap, Ghost, ShieldCheck,
} from 'lucide-react';
import type { Bet } from '@/lib/types';
import { toast } from 'sonner';
import { getWeekFromDate } from '@/lib/utils/nfl-week';

// ─── Types ────────────────────────────────────────────────────────────────────
type SortKey     = 'week' | 'gameDate' | 'odds' | 'stake' | 'status' | 'payout';
type SortDir     = 'asc' | 'desc';
type StatusFilter = 'all' | 'won' | 'lost' | 'pending' | 'void' | 'cashed';
type SeasonFilter = 'all' | '2024' | '2025';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    const dt = new Date(d.includes('T') ? d : `${d}T12:00:00`);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  } catch { return '—'; }
}

function fmtOdds(n: any): string {
  const v = Number(n);
  if (!v || !isFinite(v)) return '—';
  return v > 0 ? `+${v}` : `${v}`;
}

function parseBoost(raw: any): number {
  if (!raw || raw === 'None' || raw === '') return 0;
  if (typeof raw === 'number') return raw;
  const n = parseFloat(String(raw).replace('%', ''));
  return isNaN(n) ? 0 : n;
}

function statusStyle(s: string): string {
  const l = (s ?? '').toLowerCase();
  if (l === 'won' || l === 'win')    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (l === 'lost' || l === 'loss')  return 'text-red-400 bg-red-500/10 border-red-500/20';
  if (l === 'cashed')                return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  if (l === 'void' || l === 'push')  return 'text-zinc-500 bg-white/[0.04] border-white/10';
  return 'text-[#FFD700] bg-[#FFD700]/10 border-[#FFD700]/20';
}

function statusLabel(s: string): string {
  const m: Record<string, string> = {
    won:'Won', win:'Won', lost:'Lost', loss:'Lost', 
    pending:'Pending', void:'Void', push:'Void', cashed:'Cashed',
  };
  return m[(s ?? '').toLowerCase()] ?? (s ?? 'Pending');
}

// NFL season: "2024" = Sept 2024–Feb 2025, "2025" = Sept 2025–Feb 2026
// We use the `season` field stored on the doc (year of the season start)
function getSeasonFromBet(b: any): string | null {
  if (b.season) return String(b.season);
  // Fall back to deriving from gameDate
  if (b.gameDate) {
    try {
      const dt = new Date(b.gameDate);
      const yr = dt.getUTCFullYear();
      const mo = dt.getUTCMonth() + 1; // 1-based
      // NFL season starts in Sept; if Jan/Feb count as prior year season
      return String(mo <= 7 ? yr - 1 : yr);
    } catch { return null; }
  }
  return null;
}

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All',     value: 'all'     },
  { label: 'Won',     value: 'won'     },
  { label: 'Lost',    value: 'lost'    },
  { label: 'Pending', value: 'pending' },
  { label: 'Void',    value: 'void'    },
  { label: 'Cashed',  value: 'cashed'  },
];

const SEASON_OPTIONS: { label: string; value: SeasonFilter }[] = [
  { label: 'All Seasons', value: 'all'  },
  { label: '2024–25',     value: '2024' },
  { label: '2025–26',     value: '2025' },
];

const LEG_STATUSES = [
  { value: 'won',     label: 'Win',  icon: CheckCircle2, cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  { value: 'lost',    label: 'Loss', icon: XCircle,      cls: 'bg-red-500/20 text-red-400 border-red-500/40' },
  { value: 'pending', label: 'Pend', icon: Clock,        cls: 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30' },
  { value: 'void',    label: 'Void', icon: XCircle,      cls: 'bg-white/[0.06] text-zinc-400 border-white/20' },
];

const INPUT_CLS = 'bg-black/40 border border-white/[0.08] text-white font-mono text-xs rounded-xl px-2 py-1.5 outline-none focus:ring-1 focus:ring-[#FFD700]/30 w-full';

// ─── Bet Icons ────────────────────────────────────────────────────────────────
function BetIcons({ bet }: { bet: any }) {
  const boost = parseBoost(bet.boost);
  return (
    <div className="flex items-center gap-1 mt-0.5">
      {bet.isBonusBet && (
        <span title="Bonus/Free Bet"
          className="flex items-center gap-0.5 text-[8px] font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1 py-0.5 rounded">
          <ShieldCheck className="h-2.5 w-2.5" />BONUS
        </span>
      )}
      {bet.isGhostParlay && (
        <span title="Ghost Parlay"
          className="flex items-center gap-0.5 text-[8px] font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1 py-0.5 rounded">
          <Ghost className="h-2.5 w-2.5" />GHOST
        </span>
      )}
      {boost > 0 && (
        <span title={`${boost}% odds boost`}
          className="flex items-center gap-0.5 text-[8px] font-black text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/20 px-1 py-0.5 rounded">
          <Zap className="h-2.5 w-2.5" />{boost}%
        </span>
      )}
    </div>
  );
}

// ─── Stake Cell ───────────────────────────────────────────────────────────────
// Shows stake, and for cashed bets shows the cash-out amount underneath
function StakeCell({ bet }: { bet: any }) {
  const stake   = Number(bet.stake || bet.wager) || 0;
  const isCashed = (bet.status ?? '').toLowerCase() === 'cashed';
  const cashOut  = isCashed ? (Number(bet.cashOutAmount ?? bet.payout) || null) : null;

  return (
    <div>
      <span className="text-zinc-300 text-xs font-mono">
        {stake ? `$${stake.toFixed(2)}` : '—'}
      </span>
      {cashOut !== null && (
        <p className="text-blue-400 text-[9px] font-mono">
          cashed ${cashOut.toFixed(2)}
        </p>
      )}
    </div>
  );
}

// ─── Inline Row Editor ────────────────────────────────────────────────────────
function InlineEditor({ bet, onSave, onCancel }: {
  bet: Bet;
  onSave: (u: any) => Promise<void>;
  onCancel: () => void;
}) {
  const b = bet as any;
  const [status,        setStatus]        = useState(b.status ?? 'pending');
  const [stake,         setStake]         = useState(String(b.stake ?? b.wager ?? ''));
  const [odds,          setOdds]          = useState(String(b.odds ?? ''));
  const [week,          setWeek]          = useState(String(b.week ?? ''));
  const [gameDate,      setGameDate]      = useState(b.gameDate ? b.gameDate.split('T')[0] : '');
  const [cashOut,       setCashOut]       = useState(String(b.cashOutAmount ?? b.payout ?? ''));
  const [legs,          setLegs]          = useState<any[]>(Array.isArray(b.legs) ? [...b.legs] : []);
  const [deletedLegIds, setDeletedLegIds] = useState<string[]>([]);
  const [saving,        setSaving]        = useState(false);

  const handleDateChange = (val: string) => {
    setGameDate(val);
    if (val) {
      const year = parseInt(val.split('-')[0]);
      if (year >= 2000 && year <= 2100) {
        const derived = getWeekFromDate(val);
        if (derived) setWeek(String(derived));
      }
    }
  };

  const updateLegStatus = (legId: string, newStatus: string) =>
    setLegs(prev => prev.map(l => l.id === legId ? { ...l, status: newStatus } : l));

  const removeLeg = (legId: string) => {
    setLegs(prev => prev.filter(l => l.id !== legId));
    setDeletedLegIds(prev => [...prev, legId]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const isoDate = gameDate
        ? new Date(`${gameDate}T12:00:00.000Z`).toISOString()
        : b.gameDate;
      await onSave({
        ...b,
        status,
        stake:         Number(stake)   || b.stake,
        odds:          Number(odds)    || b.odds,
        week:          Number(week)    || b.week,
        gameDate:      isoDate,
        season:        isoDate ? new Date(isoDate).getUTCFullYear() : b.season,
        cashOutAmount: status === 'cashed' ? (Number(cashOut) || null) : null,
        payout:        status === 'cashed' ? (Number(cashOut) || null) : b.payout,
        legs,
        deletedLegIds,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4 bg-[#0a0c0f] border-t border-[#FFD700]/10">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-zinc-600 uppercase">Game Date</label>
          <input type="date" value={gameDate} onChange={e => handleDateChange(e.target.value)}
            className={`${INPUT_CLS} [color-scheme:dark]`} />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-zinc-600 uppercase">NFL Week</label>
          <input type="number" min={1} max={22} value={week}
            onChange={e => setWeek(e.target.value)} placeholder="1–22" className={INPUT_CLS} />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-zinc-600 uppercase">Stake ($)</label>
          <input type="number" step="0.01" value={stake} onChange={e => setStake(e.target.value)} className={INPUT_CLS} />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-zinc-600 uppercase">Odds</label>
          <input type="number" value={odds} onChange={e => setOdds(e.target.value)} className={INPUT_CLS} />
        </div>
      </div>

      {/* Status */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[9px] font-black text-zinc-600 uppercase w-10 shrink-0">Status</span>
        {(['pending','won','lost','void','cashed'] as const).map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase transition-all ${
              status === s ? statusStyle(s) : 'border-white/[0.08] text-zinc-600 hover:border-white/20 hover:text-zinc-400'
            }`}>
            {statusLabel(s)}
          </button>
        ))}
        {status === 'cashed' && (
          <input type="number" placeholder="Cash out $" value={cashOut}
            onChange={e => setCashOut(e.target.value)}
            className="w-32 bg-black/40 border border-white/[0.08] text-white font-mono text-xs rounded-xl px-2 py-1 outline-none focus:ring-1 focus:ring-[#FFD700]/30" />
        )}
      </div>

      {/* Legs */}
      {legs.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
            Legs — tap result to update · 🗑 to remove
          </p>
          {legs.map(leg => (
            <div key={leg.id} className="bg-black/30 border border-white/[0.06] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-white text-xs font-black italic uppercase truncate">{leg.player || '—'}</p>
                  <p className="text-zinc-600 text-[10px] font-mono">
                    {leg.prop} · {leg.line} {leg.selection}{leg.odds ? ` · ${fmtOdds(leg.odds)}` : ''}
                  </p>
                </div>
                <button onClick={() => removeLeg(leg.id)}
                  className="text-zinc-700 hover:text-red-400 transition-colors shrink-0 p-1 rounded-lg hover:bg-red-500/10">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {LEG_STATUSES.map(r => {
                  const Icon = r.icon;
                  const active = (leg.status || 'pending') === r.value;
                  return (
                    <button key={r.value} onClick={() => updateLegStatus(leg.id, r.value)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase transition-all ${
                        active ? r.cls : 'border-white/[0.08] text-zinc-600 hover:border-white/20 hover:text-zinc-400'
                      }`}>
                      <Icon className="h-3 w-3" />{r.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-white/[0.08] text-zinc-500 hover:text-white text-xs font-black uppercase transition-colors">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#FFD700] hover:bg-[#e6c200] text-black text-xs font-black uppercase transition-colors disabled:opacity-50">
          {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</> : <><Save className="h-3.5 w-3.5" />Save Changes</>}
        </button>
      </div>
    </div>
  );
}

// ─── Sort Header ──────────────────────────────────────────────────────────────
function SortTh({ label, col, sortKey, sortDir, onSort }: {
  label: string; col: SortKey; sortKey: SortKey; sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === col;
  return (
    <th className="text-left px-3 py-2.5 cursor-pointer select-none group" onClick={() => onSort(col)}>
      <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest
        text-zinc-600 group-hover:text-zinc-400 transition-colors whitespace-nowrap">
        {label}
        {active
          ? sortDir === 'desc' ? <ChevronDown className="h-3 w-3 text-[#FFD700]" /> : <ChevronUp className="h-3 w-3 text-[#FFD700]" />
          : <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
      </div>
    </th>
  );
}

// ─── Main Table ───────────────────────────────────────────────────────────────
interface BetsTableProps {
  bets:     Bet[];
  loading:  boolean;
  onDelete: (ids: string[]) => void;
  onSave:   (updated: Bet) => Promise<void>;
  onEdit?:  (bet: Bet) => void;
}

export function BetsTable({ bets, loading, onDelete, onSave, onEdit }: BetsTableProps) {
  const [sortKey,       setSortKey]       = useState<SortKey>('gameDate');
  const [sortDir,       setSortDir]       = useState<SortDir>('desc');
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>('all');
  const [seasonFilter,  setSeasonFilter]  = useState<SeasonFilter>('all');
  const [weekFilter,    setWeekFilter]    = useState('');
  const [expandedId,    setExpandedId]    = useState<string | null>(null);
  const [selected,      setSelected]      = useState<Set<string>>(new Set());
  const [page,          setPage]          = useState(0);
  const PAGE_SIZE = 25;

  const handleSort = useCallback((key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(0);
  }, [sortKey]);

  const filtered = useMemo(() => {
    let list = [...bets];

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter(b => {
        const s = (b.status ?? '').toLowerCase();
        if (statusFilter === 'won')  return s === 'won' || s === 'win';
        if (statusFilter === 'lost') return s === 'lost' || s === 'loss';
        if (statusFilter === 'void') return s === 'void' || s === 'push';
        return s === statusFilter;
      });
    }

    // Season filter
    if (seasonFilter !== 'all') {
      list = list.filter(b => getSeasonFromBet(b) === seasonFilter);
    }

    // Week filter
    const wn = parseInt(weekFilter);
    if (!isNaN(wn) && wn > 0) list = list.filter(b => Number((b as any).week) === wn);

    // Sort
    list.sort((a, b) => {
      const av = getVal(a, sortKey);
      const bv = getVal(b, sortKey);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [bets, statusFilter, seasonFilter, weekFilter, sortKey, sortDir]);

  function getVal(x: any, key: SortKey): any {
    switch (key) {
      case 'gameDate': return new Date(x.gameDate ?? x.createdAt ?? 0).getTime();
      case 'odds':     return Number(x.odds) || 0;
      case 'stake':    return Number(x.stake || x.wager) || 0;
      case 'payout':   return Number(x.payout) || 0;
      case 'week':     return Number(x.week) || 0;
      case 'status':   return x.status ?? '';
      default:         return 0;
    }
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () =>
    setSelected(selected.size === paginated.length ? new Set() : new Set(paginated.map(b => b.id!)));

  const handleInlineSave = useCallback(async (updated: any) => {
    try {
      await onSave(updated);
      setExpandedId(null);
      toast.success('Saved!');
    } catch (err: any) {
      toast.error('Save failed', { description: err.message });
    }
  }, [onSave]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-600">
        <Loader2 className="h-6 w-6 animate-spin mr-3" />
        <span className="text-sm font-black uppercase italic">Loading bets…</span>
      </div>
    );
  }

  if (!bets.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-700">
        <p className="text-sm font-black uppercase italic">No bets found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Filters ── */}
      <div className="flex flex-col gap-2">
        {/* Row 1: status chips */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map(f => (
            <button key={f.value} onClick={() => { setStatusFilter(f.value); setPage(0); }}
              className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase transition-all ${
                statusFilter === f.value
                  ? f.value === 'all' ? 'bg-white/10 border-white/20 text-white' : statusStyle(f.value)
                  : 'border-white/[0.08] text-zinc-600 hover:border-white/20 hover:text-zinc-400'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Row 2: season + week + bulk delete + count */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Season selector */}
          <div className="flex rounded-xl overflow-hidden border border-white/[0.08]">
            {SEASON_OPTIONS.map(s => (
              <button key={s.value} onClick={() => { setSeasonFilter(s.value); setPage(0); }}
                className={`px-2.5 py-1.5 text-[9px] font-black uppercase transition-colors whitespace-nowrap ${
                  seasonFilter === s.value
                    ? 'bg-[#FFD700]/20 text-[#FFD700]'
                    : 'bg-black/40 text-zinc-600 hover:text-zinc-400'
                }`}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Week filter */}
          <input
            type="number" min={1} max={22} placeholder="Week #" value={weekFilter}
            onChange={e => { setWeekFilter(e.target.value); setPage(0); }}
            className="w-20 bg-black/40 border border-white/[0.08] text-white text-xs font-mono rounded-xl px-3 py-1.5 outline-none focus:ring-1 focus:ring-[#FFD700]/30"
          />

          {selected.size > 0 && (
            <button onClick={() => { onDelete([...selected]); setSelected(new Set()); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-black uppercase transition-colors">
              <Trash2 className="h-3.5 w-3.5" />Delete {selected.size}
            </button>
          )}

          <span className="text-zinc-700 text-[10px] font-mono ml-auto">
            {filtered.length} of {bets.length} bets
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-black/40 border-b border-white/[0.06]">
              <tr>
                <th className="px-3 py-2.5 w-8">
                  <input type="checkbox"
                    checked={paginated.length > 0 && selected.size === paginated.length}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded border-zinc-700 bg-black/40 accent-[#FFD700]" />
                </th>
                <SortTh label="Week"   col="week"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Date"   col="gameDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="text-left px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-zinc-600">Bet</th>
                <SortTh label="Odds"   col="odds"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Stake"  col="stake"    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Status" col="status"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Payout" col="payout"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-3 py-2.5 w-20" />
              </tr>
            </thead>
            <tbody>
              {paginated.map((bet, idx) => {
                const b    = bet as any;
                const legs: any[] = Array.isArray(b.legs) ? b.legs : [];
                const isExpanded = expandedId === bet.id;
                const isSelected = selected.has(bet.id ?? '');

                const betLabel = legs.length > 1
                  ? `${legs.length}-Leg ${b.type ?? 'Parlay'}`
                  : (legs[0]?.player || '—');
                const subLabel = legs.length > 1
                  ? legs.slice(0, 3).map((l: any) => l.player).filter(Boolean).join(', ') + (legs.length > 3 ? '…' : '')
                  : `${legs[0]?.prop ?? ''} ${legs[0]?.line ?? ''} ${legs[0]?.selection ?? ''}`.trim();

                return (
                  <React.Fragment key={bet.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : (bet.id ?? null))}
                      className={`border-t border-white/[0.04] cursor-pointer transition-colors
                        ${isSelected ? 'bg-[#FFD700]/[0.03]' : idx % 2 === 0 ? 'bg-black/10' : ''}
                        ${isExpanded ? 'bg-[#FFD700]/[0.02]' : 'hover:bg-white/[0.02]'}`}>

                      {/* Checkbox */}
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected}
                          onChange={() => toggleSelect(bet.id ?? '')}
                          className="w-3.5 h-3.5 rounded border-zinc-700 bg-black/40 accent-[#FFD700]" />
                      </td>

                      {/* Week */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-zinc-500 text-xs font-mono">
                          {b.week ? `WK${b.week}` : '—'}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-zinc-400 text-xs font-mono">{fmtDate(b.gameDate)}</span>
                      </td>

                      {/* Bet label + icons */}
                      <td className="px-3 py-3 max-w-[200px]">
                        <p className="text-white text-xs font-black italic uppercase truncate">{betLabel}</p>
                        <p className="text-zinc-600 text-[10px] font-mono truncate">{subLabel}</p>
                        <BetIcons bet={b} />
                      </td>

                      {/* Odds */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`text-xs font-mono font-bold ${Number(b.odds) > 0 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                          {fmtOdds(b.odds)}
                        </span>
                      </td>

                      {/* Stake + cashed amount */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <StakeCell bet={b} />
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${statusStyle(b.status ?? 'pending')}`}>
                          {statusLabel(b.status ?? 'pending')}
                        </span>
                      </td>

                      {/* Payout */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-zinc-300 text-xs font-mono">
                          {b.payout ? `$${Number(b.payout).toFixed(2)}` : '—'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {onEdit && (
                            <button onClick={() => onEdit(bet)} title="Full edit"
                              className="p-1.5 text-zinc-600 hover:text-[#FFD700] hover:bg-[#FFD700]/10 rounded-lg transition-colors">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => onDelete([bet.id!])} title="Delete"
                            className="p-1.5 text-zinc-700 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <ChevronRight className={`h-3.5 w-3.5 text-zinc-700 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="p-0">
                          <InlineEditor bet={bet} onSave={handleInlineSave} onCancel={() => setExpandedId(null)} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.04] bg-black/20">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1.5 rounded-xl border border-white/[0.08] text-zinc-500 hover:text-white text-xs font-black uppercase disabled:opacity-30 transition-colors">
              ← Prev
            </button>
            <span className="text-zinc-600 text-[10px] font-mono">
              Page {page + 1} / {totalPages} · {filtered.length} bets
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
              className="px-3 py-1.5 rounded-xl border border-white/[0.08] text-zinc-500 hover:text-white text-xs font-black uppercase disabled:opacity-30 transition-colors">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
