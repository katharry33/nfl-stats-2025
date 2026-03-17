'use client';
import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronUp, ChevronDown, ChevronRight, Trash2, Edit2,
  CheckCircle2, XCircle, Clock, Loader2, Save, Zap, Ghost, ShieldCheck,
} from 'lucide-react';
import type { Bet } from '@/lib/types';
import { toast } from 'sonner';
import { getWeekFromDate } from '@/lib/utils/nfl-week';
import { SweetSpotBadge } from '@/components/bets/SweetSpotBadge';
import { scoreProp, type ScoringCriteria } from '@/lib/utils/sweetSpotScore';

type SortKey      = 'week' | 'gameDate' | 'odds' | 'stake' | 'status' | 'payout';
type SortDir      = 'asc' | 'desc';
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

// Light-theme status chips
function statusStyle(s: string): string {
  const l = (s ?? '').toLowerCase();
  if (l === 'won' || l === 'win')   return 'text-profit bg-profit/10 border-profit/25';
  if (l === 'lost' || l === 'loss') return 'text-loss bg-loss/10 border-loss/25';
  if (l === 'cashed')               return 'text-edge bg-edge/10 border-edge/25';
  if (l === 'void' || l === 'push') return 'text-muted-foreground bg-secondary border-border';
  return 'text-primary bg-primary/10 border-primary/25'; // pending
}

function statusLabel(s: string): string {
  const m: Record<string, string> = {
    won:'Won', win:'Won', lost:'Lost', loss:'Lost',
    pending:'Pending', void:'Void', push:'Void', cashed:'Cashed',
  };
  return m[(s ?? '').toLowerCase()] ?? (s ?? 'Pending');
}

function getSeasonFromBet(b: any): string | null {
  if (b.season) return String(b.season);
  if (b.gameDate) {
    try {
      const dt = new Date(b.gameDate);
      const yr = dt.getUTCFullYear();
      const mo = dt.getUTCMonth() + 1;
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
  { value: 'won',     label: 'Win',  icon: CheckCircle2, cls: 'bg-profit/10 text-profit border-profit/30' },
  { value: 'lost',    label: 'Loss', icon: XCircle,      cls: 'bg-loss/10 text-loss border-loss/30' },
  { value: 'pending', label: 'Pend', icon: Clock,        cls: 'bg-primary/10 text-primary border-primary/30' },
  { value: 'void',    label: 'Void', icon: XCircle,      cls: 'bg-secondary text-muted-foreground border-border' },
];

const INPUT_CLS = 'bg-secondary border border-border text-foreground font-mono text-xs rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary/30 w-full';

// ─── Bet Icons ────────────────────────────────────────────────────────────────

function BetIcons({ bet }: { bet: any }) {
  const boost = parseBoost(bet.boost);
  return (
    <div className="flex items-center gap-1 mt-0.5">
      {bet.isBonusBet && (
        <span className="flex items-center gap-0.5 text-[8px] font-semibold text-edge bg-edge/10 border border-edge/25 px-1 py-0.5 rounded">
          <ShieldCheck className="h-2.5 w-2.5" />BONUS
        </span>
      )}
      {bet.isGhostParlay && (
        <span className="flex items-center gap-0.5 text-[8px] font-semibold text-muted-foreground bg-secondary border border-border px-1 py-0.5 rounded">
          <Ghost className="h-2.5 w-2.5" />GHOST
        </span>
      )}
      {boost > 0 && (
        <span className="flex items-center gap-0.5 text-[8px] font-semibold text-primary bg-primary/10 border border-primary/25 px-1 py-0.5 rounded">
          <Zap className="h-2.5 w-2.5" />{boost}%
        </span>
      )}
    </div>
  );
}

function StakeCell({ bet }: { bet: any }) {
  const stake    = Number(bet.stake || bet.wager) || 0;
  const isCashed = (bet.status ?? '').toLowerCase() === 'cashed';
  const cashOut  = isCashed ? (Number(bet.cashOutAmount ?? bet.payout) || null) : null;
  return (
    <div>
      <span className="text-foreground text-xs font-mono">{stake ? `$${stake.toFixed(2)}` : '—'}</span>
      {cashOut !== null && (
        <p className="text-edge text-[9px] font-mono">cashed ${cashOut.toFixed(2)}</p>
      )}
    </div>
  );
}

// ─── Inline editor ────────────────────────────────────────────────────────────

function InlineEditor({ bet, onSave, onCancel, scoreLeg }: {
  bet: Bet; onSave: (u: any) => Promise<void>; onCancel: () => void; scoreLeg: (leg: any) => any;
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
      const isoDate = gameDate ? new Date(`${gameDate}T12:00:00.000Z`).toISOString() : b.gameDate;
      await onSave({ ...b, status, stake: Number(stake) || b.stake, odds: Number(odds) || b.odds,
        week: Number(week) || b.week, gameDate: isoDate,
        season: isoDate ? new Date(isoDate).getUTCFullYear() : b.season,
        cashOutAmount: status === 'cashed' ? (Number(cashOut) || null) : null,
        payout: status === 'cashed' ? (Number(cashOut) || null) : b.payout,
        legs, deletedLegIds });
    } finally { setSaving(false); }
  };

  return (
    <div className="p-4 space-y-4 bg-secondary/50 border-t border-border">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Game Date', type: 'date', value: gameDate, onChange: (v: string) => handleDateChange(v), extra: '[color-scheme:light]' },
          { label: 'NFL Week',  type: 'number', value: week,   onChange: (v: string) => setWeek(v), placeholder: '1–22' },
          { label: 'Stake ($)', type: 'number', value: stake,  onChange: (v: string) => setStake(v) },
          { label: 'Odds',      type: 'number', value: odds,   onChange: (v: string) => setOdds(v) },
        ].map(f => (
          <div key={f.label} className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">{f.label}</label>
            <input type={f.type} value={f.value} placeholder={f.placeholder}
              onChange={e => f.onChange(e.target.value)}
              className={`${INPUT_CLS} ${f.extra ?? ''}`} />
          </div>
        ))}
      </div>

      {/* Status */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase w-10 shrink-0">Status</span>
        {(['pending','won','lost','void','cashed'] as const).map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-2.5 py-1 rounded-lg border text-[10px] font-semibold uppercase transition-all ${
              status === s ? statusStyle(s) : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
            }`}>
            {statusLabel(s)}
          </button>
        ))}
        {status === 'cashed' && (
          <input type="number" placeholder="Cash out $" value={cashOut}
            onChange={e => setCashOut(e.target.value)}
            className="w-32 bg-secondary border border-border text-foreground font-mono text-xs rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-primary/30" />
        )}
      </div>

      {/* Legs */}
      {legs.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Legs — tap result to update
          </p>
          {legs.map(leg => {
            const legResult = scoreLeg(leg);
            return (
              <div key={leg.id} className="bg-card border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-foreground text-xs font-semibold truncate">{leg.player || '—'}</p>
                    <p className="text-muted-foreground text-[10px] font-mono">
                      {leg.prop} · {leg.line} {leg.selection}{leg.odds ? ` · ${fmtOdds(leg.odds)}` : ''}
                    </p>
                  </div>
                  {legResult && legResult.tier !== 'cold' && <SweetSpotBadge result={legResult} size="sm" />}
                  <button onClick={() => removeLeg(leg.id)}
                    className="text-muted-foreground hover:text-loss transition-colors shrink-0 p-1 rounded hover:bg-loss/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {LEG_STATUSES.map(r => {
                    const Icon = r.icon;
                    const active = (leg.status || 'pending') === r.value;
                    return (
                      <button key={r.value} onClick={() => updateLegStatus(leg.id, r.value)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-semibold uppercase transition-all ${
                          active ? r.cls : 'border-border text-muted-foreground hover:border-primary/30'
                        }`}>
                        <Icon className="h-3 w-3" />{r.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs font-semibold uppercase transition-colors">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold uppercase transition-colors disabled:opacity-50">
          {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</> : <><Save className="h-3.5 w-3.5" />Save Changes</>}
        </button>
      </div>
    </div>
  );
}

// ─── Sort TH ──────────────────────────────────────────────────────────────────

function SortTh({ label, col, sortKey, sortDir, onSort }: {
  label: string; col: SortKey; sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void;
}) {
  const active = sortKey === col;
  return (
    <th className="text-left px-3 py-2.5 cursor-pointer select-none group" onClick={() => onSort(col)}>
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground group-hover:text-foreground transition-colors whitespace-nowrap">
        {label}
        {active
          ? sortDir === 'desc' ? <ChevronDown className="h-3 w-3 text-primary" /> : <ChevronUp className="h-3 w-3 text-primary" />
          : <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
      </div>
    </th>
  );
}

// ─── BetsTable ────────────────────────────────────────────────────────────────

interface BetsTableProps {
  bets: Bet[]; loading: boolean;
  onDelete: (ids: string[]) => void;
  onSave: (bet: Bet) => Promise<void>;
  onEdit: (bet: Bet) => void;
  sweetSpotCriteria?: ScoringCriteria | null;
}

export function BetsTable({ bets, loading, onDelete, onSave, onEdit, sweetSpotCriteria }: BetsTableProps) {
  const [sortKey,      setSortKey]      = useState<SortKey>('gameDate');
  const [sortDir,      setSortDir]      = useState<SortDir>('desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [seasonFilter, setSeasonFilter] = useState<SeasonFilter>('all');
  const [weekFilter,   setWeekFilter]   = useState('');
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [page,         setPage]         = useState(0);
  const PAGE_SIZE = 25;

  function scoreLeg(leg: any) {
    if (!sweetSpotCriteria) return null;
    return scoreProp({ prop: leg.prop, overUnder: leg.overUnder ?? leg.selection,
      scoreDiff: leg.scoreDiff ?? null, confidenceScore: leg.confidenceScore ?? null,
      opponentRank: leg.opponentRank ?? null, bestEdgePct: leg.bestEdgePct ?? null,
      kellyPct: leg.kellyPct ?? null }, sweetSpotCriteria);
  }

  function scoreBet(bet: Bet) {
    if (!sweetSpotCriteria) return null;
    const leg = (bet as any).legs?.[0] ?? bet;
    return scoreProp({ prop: (bet as any).prop ?? leg?.prop,
      overUnder: (bet as any).overUnder ?? leg?.overUnder ?? leg?.selection,
      scoreDiff: (bet as any).scoreDiff ?? leg?.scoreDiff ?? null,
      confidenceScore: (bet as any).confidenceScore ?? leg?.confidenceScore ?? null,
      opponentRank: (bet as any).opponentRank ?? leg?.opponentRank ?? null,
      bestEdgePct: (bet as any).bestEdgePct ?? leg?.bestEdgePct ?? null,
      kellyPct: (bet as any).kellyPct ?? leg?.kellyPct ?? null,
      legCount: (bet as any).legs?.length ?? 1 }, sweetSpotCriteria);
  }

  const handleSort = useCallback((key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(0);
  }, [sortKey]);

  const filtered = useMemo(() => {
    let list = [...bets];
    if (statusFilter !== 'all') {
      list = list.filter(b => {
        const s = (b.status ?? '').toLowerCase();
        if (statusFilter === 'won')  return s === 'won' || s === 'win';
        if (statusFilter === 'lost') return s === 'lost' || s === 'loss';
        if (statusFilter === 'void') return s === 'void' || s === 'push';
        return s === statusFilter;
      });
    }
    if (seasonFilter !== 'all') list = list.filter(b => getSeasonFromBet(b) === seasonFilter);
    const wn = parseInt(weekFilter);
    if (!isNaN(wn) && wn > 0) list = list.filter(b => Number((b as any).week) === wn);
    list.sort((a, b) => {
      const av = getVal(a, sortKey), bv = getVal(b, sortKey);
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
    try { await onSave(updated); setExpandedId(null); toast.success('Saved!'); }
    catch (err: any) { toast.error('Save failed', { description: err.message }); }
  }, [onSave]);

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      <span className="text-sm">Loading bets…</span>
    </div>
  );

  if (!bets.length) return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <p className="text-sm">No bets found</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map(f => (
            <button key={f.value} onClick={() => { setStatusFilter(f.value); setPage(0); }}
              className={`px-3 py-1 rounded-lg border text-[10px] font-semibold uppercase transition-all ${
                statusFilter === f.value
                  ? f.value === 'all' ? 'bg-foreground text-background border-foreground' : statusStyle(f.value)
                  : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground bg-card'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-border">
            {SEASON_OPTIONS.map(s => (
              <button key={s.value} onClick={() => { setSeasonFilter(s.value); setPage(0); }}
                className={`px-3 py-1.5 text-[10px] font-semibold uppercase transition-colors whitespace-nowrap ${
                  seasonFilter === s.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:text-foreground'
                }`}>
                {s.label}
              </button>
            ))}
          </div>

          <input type="number" min={1} max={22} placeholder="Week #" value={weekFilter}
            onChange={e => { setWeekFilter(e.target.value); setPage(0); }}
            className="w-20 bg-card border border-border text-foreground text-xs font-mono rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary/30"
          />

          {selected.size > 0 && (
            <button onClick={() => { onDelete([...selected]); setSelected(new Set()); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-loss/25 text-loss hover:bg-loss/5 text-xs font-semibold uppercase transition-colors">
              <Trash2 className="h-3.5 w-3.5" />Delete {selected.size}
            </button>
          )}

          <span className="text-muted-foreground text-[11px] font-mono ml-auto">
            {filtered.length} of {bets.length} bets
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-secondary border-b border-border">
              <tr>
                <th className="px-3 py-2.5 w-8">
                  <input type="checkbox"
                    checked={paginated.length > 0 && selected.size === paginated.length}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded border-border accent-primary" />
                </th>
                <SortTh label="Week"   col="week"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Date"   col="gameDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Bet</th>
                <SortTh label="Odds"   col="odds"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Stake"  col="stake"    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Status" col="status"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Payout" col="payout"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-2 py-2.5 w-8" />
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

                const betResult = scoreBet(bet);

                return (
                  <React.Fragment key={bet.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : (bet.id ?? null))}
                      className={`border-t border-border cursor-pointer transition-colors
                        ${isSelected  ? 'bg-primary/5'   : idx % 2 === 0 ? 'bg-card' : 'bg-secondary/30'}
                        ${isExpanded  ? 'bg-primary/5'   : 'hover:bg-secondary/60'}
                        ${betResult?.tier === 'bullseye' ? 'shadow-[inset_2px_0_0_0_hsl(var(--primary))]' : ''}
                        ${betResult?.tier === 'hot'      ? 'shadow-[inset_2px_0_0_0_hsl(var(--profit))]'  : ''}`}>

                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected}
                          onChange={() => toggleSelect(bet.id ?? '')}
                          className="w-3.5 h-3.5 rounded border-border accent-primary" />
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-muted-foreground text-xs font-mono">
                          {b.week ? `WK${b.week}` : '—'}
                        </span>
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-foreground text-xs font-mono">{fmtDate(b.gameDate)}</span>
                      </td>

                      <td className="px-3 py-3 max-w-[200px]">
                        <p className="text-foreground text-xs font-semibold truncate">{betLabel}</p>
                        <p className="text-muted-foreground text-[10px] font-mono truncate">{subLabel}</p>
                        <BetIcons bet={b} />
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`text-xs font-mono font-semibold ${Number(b.odds) > 0 ? 'text-profit' : 'text-foreground'}`}>
                          {fmtOdds(b.odds)}
                        </span>
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap">
                        <StakeCell bet={b} />
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-lg border ${statusStyle(b.status ?? 'pending')}`}>
                          {statusLabel(b.status ?? 'pending')}
                        </span>
                      </td>

                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-foreground text-xs font-mono">
                          {b.payout ? `$${Number(b.payout).toFixed(2)}` : '—'}
                        </span>
                      </td>

                      <td className="px-2 py-2 w-8" onClick={e => e.stopPropagation()}>
                        {betResult && betResult.tier !== 'cold' && <SweetSpotBadge result={betResult} size="sm" />}
                      </td>

                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {onEdit && (
                            <button onClick={() => onEdit(bet)} title="Edit"
                              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => onDelete([bet.id!])} title="Delete"
                            className="p-1.5 text-muted-foreground hover:text-loss hover:bg-loss/10 rounded-lg transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={10} className="p-0">
                          <InlineEditor bet={bet} onSave={handleInlineSave} onCancel={() => setExpandedId(null)} scoreLeg={scoreLeg} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/30">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs font-semibold uppercase disabled:opacity-30 transition-colors bg-card">
              ← Prev
            </button>
            <span className="text-muted-foreground text-[11px] font-mono">
              Page {page + 1} / {totalPages} · {filtered.length} bets
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
              className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs font-semibold uppercase disabled:opacity-30 transition-colors bg-card">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}