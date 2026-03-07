'use client';
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  ChevronUp, ChevronDown, Settings2, Plus, X, GripVertical,
  Search, ChevronLeft, ChevronRight, Loader2, Trash2,
} from 'lucide-react';
import type { NormalizedProp } from '@/hooks/useAllProps';
import { toast } from 'sonner';

// ─── Column definitions ───────────────────────────────────────────────────────
export type ColKey =
  | 'gameDate' | 'gameTime' | 'week' | 'matchup'
  | 'player' | 'team' | 'prop' | 'line' | 'overUnder'
  | 'playerAvg' | 'opponentRank' | 'opponentAvgVsStat'
  | 'yardsScore' | 'rankScore' | 'totalScore' | 'scoreDiff'
  | 'scalingFactor' | 'winProbability' | 'projWinPct' | 'seasonHitPct'
  | 'avgWinProb' | 'odds' | 'impliedProb' | 'bestEdgePct' | 'expectedValue'
  | 'kellyPct' | 'valueIcon' | 'confidenceScore' | 'gameStats' | 'actualResult'
  | 'actions';

interface ColDef {
  key:    ColKey;
  label:  string;
  short:  string;           // panel label
  width?: number;
  align?: 'left' | 'right' | 'center';
  fmt?:   (val: any, row: NormalizedProp) => React.ReactNode;
  colorFn?: (val: any) => string; // returns tailwind text color class
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    const dt = new Date(d.includes('T') ? d : `${d}T12:00:00`);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  } catch { return String(d); }
}

function fmtNum(v: any, decimals = 1): string {
  const n = parseFloat(String(v));
  return isNaN(n) ? '—' : n.toFixed(decimals);
}

function fmtPct(v: any, decimals = 1): string {
  const n = parseFloat(String(v));
  return isNaN(n) ? '—' : `${n.toFixed(decimals)}%`;
}

function pctColor(n: number): string {
  if (n >= 65) return 'text-emerald-400';
  if (n >= 55) return 'text-[#FFD700]';
  if (n >= 45) return 'text-zinc-300';
  return 'text-red-400';
}

function edgeColor(n: number): string {
  if (n >= 10) return 'text-emerald-400';
  if (n >= 5)  return 'text-[#FFD700]';
  if (n > 0)   return 'text-zinc-300';
  return 'text-red-400';
}

function ResultCell({ val, line, ou }: { val: any; line: number; ou: string }) {
  if (!val && val !== 0) return <span className="text-zinc-600">—</span>;
  const n = parseFloat(String(val));
  if (isNaN(n)) return <span className="text-zinc-400 font-mono text-xs">{val}</span>;
  const hit = ou?.toLowerCase() === 'over' ? n > line : ou?.toLowerCase() === 'under' ? n < line : null;
  return (
    <span className={`font-mono text-xs font-bold ${hit === true ? 'text-emerald-400' : hit === false ? 'text-red-400' : 'text-zinc-300'}`}>
      {n.toFixed(1)}{hit === true ? ' ✓' : hit === false ? ' ✗' : ''}
    </span>
  );
}

function GameStatsCell({ val }: { val: any }) {
  if (!val) return <span className="text-zinc-600">—</span>;
  return (
    <span className="text-zinc-400 font-mono text-[10px] max-w-[120px] truncate block" title={String(val)}>
      {String(val)}
    </span>
  );
}

function ValueIconCell({ val }: { val: any }) {
  if (!val) return <span className="text-zinc-600">—</span>;
  const s = String(val);
  const isGood = ['✅','⭐','🔥','💎','✓','green','high','strong'].some(v => s.toLowerCase().includes(v.toLowerCase()));
  const isBad  = ['❌','🚫','✗','red','low','weak'].some(v => s.toLowerCase().includes(v.toLowerCase()));
  return (
    <span className={`text-sm ${isGood ? 'text-emerald-400' : isBad ? 'text-red-400' : 'text-zinc-400'}`}>
      {s}
    </span>
  );
}

// ─── All column definitions ───────────────────────────────────────────────────
const ALL_COLS: ColDef[] = [
  {
    key: 'gameDate', label: 'Game Date', short: 'Game Date', width: 90,
    fmt: v => <span className="text-zinc-400 font-mono text-xs whitespace-nowrap">{fmtDate(v)}</span>,
  },
  { key: 'player', label: 'Player', short: 'Player', width: 140,
    fmt: v => <span className="text-white font-black text-xs italic uppercase">{v || '—'}</span>,
  },
  { key: 'prop',   label: 'Prop',   short: 'Prop',   width: 120,
    fmt: v => <span className="text-zinc-300 text-xs">{v || '—'}</span>,
  },
  { key: 'line',   label: 'Line',   short: 'Line',   width: 60,  align: 'right',
    fmt: v => <span className="text-zinc-200 font-mono font-bold text-xs">{v ?? '—'}</span>,
  },
  { key: 'overUnder', label: 'O/U', short: 'O/U',   width: 55, align: 'center',
    fmt: v => {
      const l = (v ?? '').toLowerCase();
      const cls = l === 'over' ? 'text-blue-400' : l === 'under' ? 'text-orange-400' : 'text-zinc-600';
      return <span className={`text-[10px] font-black uppercase ${cls}`}>{v || '—'}</span>;
    },
  },
  { key: 'scoreDiff', label: 'Score Diff', short: 'Score Diff', width: 80, align: 'right',
    fmt: v => {
      const n = parseFloat(String(v));
      if (isNaN(n)) return <span className="text-zinc-600">—</span>;
      return <span className={`font-mono text-xs font-bold ${n >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{n >= 0 ? `+${n.toFixed(1)}` : n.toFixed(1)}</span>;
    },
  },
  { key: 'seasonHitPct', label: 'Season Hit %', short: 'Hit %', width: 80, align: 'right',
    fmt: v => { const n = parseFloat(String(v)); return isNaN(n) ? <span className="text-zinc-600">—</span> : <span className={`font-mono text-xs font-bold ${pctColor(n)}`}>{n.toFixed(1)}%</span>; },
  },
  { key: 'avgWinProb', label: 'Avg Win Prob', short: 'Avg Win', width: 85, align: 'right',
    fmt: v => { const n = parseFloat(String(v)); return isNaN(n) ? <span className="text-zinc-600">—</span> : <span className={`font-mono text-xs font-bold ${pctColor(n)}`}>{n.toFixed(1)}%</span>; },
  },
  { key: 'bestEdgePct', label: 'Edge %', short: 'Edge %', width: 70, align: 'right',
    fmt: v => { const n = parseFloat(String(v)); return isNaN(n) ? <span className="text-zinc-600">—</span> : <span className={`font-mono text-xs font-bold ${edgeColor(n)}`}>{n >= 0 ? `+${n.toFixed(1)}` : n.toFixed(1)}%</span>; },
  },
  { key: 'expectedValue', label: 'EV', short: 'EV', width: 65, align: 'right',
    fmt: v => { const n = parseFloat(String(v)); return isNaN(n) ? <span className="text-zinc-600">—</span> : <span className={`font-mono text-xs font-bold ${n >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{n >= 0 ? `+${n.toFixed(2)}` : n.toFixed(2)}</span>; },
  },
  { key: 'kellyPct', label: 'Kelly %', short: 'Kelly %', width: 70, align: 'right',
    fmt: v => { const n = parseFloat(String(v)); return isNaN(n) ? <span className="text-zinc-600">—</span> : <span className={`font-mono text-xs ${n > 0 ? 'text-[#FFD700]' : 'text-zinc-500'}`}>{n.toFixed(1)}%</span>; },
  },
  { key: 'confidenceScore', label: 'Conf.', short: 'Conf.', width: 60, align: 'right',
    fmt: v => { const n = parseFloat(String(v)); return isNaN(n) ? <span className="text-zinc-600">—</span> : <span className={`font-mono text-xs font-bold ${pctColor(n)}`}>{n.toFixed(1)}</span>; },
  },
  { key: 'gameStats', label: 'Game Stats', short: 'Game Stats', width: 130,
    fmt: v => <GameStatsCell val={v} />,
  },
  { key: 'actualResult', label: 'Actual', short: 'Actual', width: 80, align: 'right',
    fmt: (v, row) => <ResultCell val={v} line={row.line} ou={row.overUnder} />,
  },
  // ── Additional columns (hidden by default) ────────────────────────────────
  { key: 'week',          label: 'Wk',               short: 'Week',        width: 50,  align: 'center',
    fmt: v => <span className="text-zinc-500 font-mono text-xs">{v != null ? `WK${v}` : '—'}</span>,
  },
  { key: 'gameTime',      label: 'Game Time',         short: 'Game Time',   width: 80  },
  { key: 'matchup',       label: 'Matchup',           short: 'Matchup',     width: 120 },
  { key: 'team',          label: 'Team',              short: 'Team',        width: 65,  align: 'center',
    fmt: v => v ? <span className="text-[9px] font-black text-[#FFD700] bg-[#FFD700]/10 px-1.5 py-0.5 rounded uppercase">{v}</span> : <span className="text-zinc-600">—</span>,
  },
  { key: 'playerAvg',     label: 'Player Avg',        short: 'Player Avg',  width: 80,  align: 'right',
    fmt: v => <span className="font-mono text-xs text-zinc-300">{fmtNum(v)}</span>,
  },
  { key: 'opponentRank',  label: 'Opp Rank',          short: 'Opp Rank',    width: 75,  align: 'right',
    fmt: v => <span className="font-mono text-xs text-zinc-300">{v ?? '—'}</span>,
  },
  { key: 'opponentAvgVsStat', label: 'Opp Avg vs Stat', short: 'Opp Avg',  width: 90,  align: 'right',
    fmt: v => <span className="font-mono text-xs text-zinc-300">{fmtNum(v)}</span>,
  },
  { key: 'yardsScore',    label: 'Yards Score',       short: 'Yds Score',   width: 80,  align: 'right',
    fmt: v => <span className="font-mono text-xs text-zinc-300">{fmtNum(v)}</span>,
  },
  { key: 'rankScore',     label: 'Rank Score',        short: 'Rank Score',  width: 80,  align: 'right',
    fmt: v => <span className="font-mono text-xs text-zinc-300">{fmtNum(v)}</span>,
  },
  { key: 'totalScore',    label: 'Total Score',       short: 'Total Score', width: 80,  align: 'right',
    fmt: v => <span className="font-mono text-xs text-zinc-300">{fmtNum(v)}</span>,
  },
  { key: 'scalingFactor', label: 'Scaling Factor',    short: 'Scale',       width: 75,  align: 'right',
    fmt: v => <span className="font-mono text-xs text-zinc-300">{fmtNum(v, 2)}</span>,
  },
  { key: 'winProbability',label: 'Win Prob',          short: 'Win Prob',    width: 75,  align: 'right',
    fmt: v => { const n = parseFloat(String(v)); return isNaN(n) ? <span className="text-zinc-600">—</span> : <span className={`font-mono text-xs ${pctColor(n)}`}>{n.toFixed(1)}%</span>; },
  },
  { key: 'projWinPct',    label: 'Proj Win %',        short: 'Proj Win',    width: 75,  align: 'right',
    fmt: v => { const n = parseFloat(String(v)); return isNaN(n) ? <span className="text-zinc-600">—</span> : <span className={`font-mono text-xs font-bold ${pctColor(n)}`}>{n.toFixed(1)}%</span>; },
  },
  { key: 'odds',          label: 'Odds',              short: 'Odds',        width: 65,  align: 'right',
    fmt: v => { const n = Number(v); return isNaN(n) || !n ? <span className="text-zinc-600">—</span> : <span className={`font-mono text-xs font-bold ${n > 0 ? 'text-emerald-400' : 'text-zinc-300'}`}>{n > 0 ? `+${n}` : n}</span>; },
  },
  { key: 'impliedProb',   label: 'Implied Prob',      short: 'Impl Prob',   width: 80,  align: 'right',
    fmt: v => <span className="font-mono text-xs text-zinc-300">{fmtPct(v)}</span>,
  },
  { key: 'valueIcon',     label: 'Value',             short: 'Value',       width: 60,  align: 'center',
    fmt: v => <ValueIconCell val={v} />,
  },
  { key: 'actions', label: '', short: 'Actions', width: 70, align: 'center' },
];

const DEFAULT_VISIBLE: ColKey[] = [
  'gameDate','player','prop','line','overUnder',
  'scoreDiff','seasonHitPct','avgWinProb','bestEdgePct',
  'expectedValue','kellyPct','confidenceScore','gameStats','actualResult',
  'actions',
];

// ─── Column Settings Panel ────────────────────────────────────────────────────
function ColumnSettings({ visible, order, onClose, onToggle, onReorder }: {
  visible:   Set<ColKey>;
  order:     ColKey[];
  onClose:   () => void;
  onToggle:  (k: ColKey) => void;
  onReorder: (o: ColKey[]) => void;
}) {
  const [dragging, setDragging] = useState<ColKey | null>(null);
  const [over,     setOver]     = useState<ColKey | null>(null);

  const colMap = Object.fromEntries(ALL_COLS.map(c => [c.key, c.short]));

  const drop = (target: ColKey) => {
    if (!dragging || dragging === target) return;
    const from = order.indexOf(dragging);
    const to   = order.indexOf(target);
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, dragging);
    onReorder(next);
    setDragging(null);
    setOver(null);
  };

  const dataKeys = order.filter(k => k !== 'actions');

  return (
    <div className="absolute right-0 top-10 z-50 w-56 bg-[#0f1115] border border-white/10 rounded-2xl shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Columns</span>
        <div className="flex items-center gap-2">
          <button onClick={() => onReorder([...ALL_COLS.filter(c=>c.key!=='actions').map(c=>c.key), 'actions'])}
            className="text-[9px] text-zinc-600 hover:text-zinc-400 font-black uppercase transition-colors">Reset</button>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="max-h-72 overflow-y-auto py-1.5 scrollbar-thin">
        {dataKeys.map(key => (
          <div
            key={key}
            draggable
            onDragStart={() => setDragging(key)}
            onDragOver={e => { e.preventDefault(); setOver(key); }}
            onDrop={() => drop(key)}
            onDragEnd={() => { setDragging(null); setOver(null); }}
            className={`flex items-center gap-2.5 px-3 py-1.5 cursor-grab active:cursor-grabbing select-none transition-colors
              ${over === key     ? 'bg-[#FFD700]/10 border-l-2 border-[#FFD700]' : 'hover:bg-white/[0.03]'}
              ${dragging === key ? 'opacity-40' : ''}`}>
            <GripVertical className="h-3 w-3 text-zinc-700 shrink-0" />
            <input
              type="checkbox" checked={visible.has(key)}
              onChange={() => onToggle(key)}
              className="w-3.5 h-3.5 rounded border-zinc-700 accent-[#FFD700] shrink-0"
            />
            <span className="text-xs text-zinc-400 font-bold truncate">{colMap[key] ?? key}</span>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 border-t border-white/[0.06]">
        <p className="text-[9px] text-zinc-700 font-mono">Drag · toggle · reorder</p>
      </div>
    </div>
  );
}

// ─── Per-column filter input ──────────────────────────────────────────────────
function ColFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-zinc-700 pointer-events-none" />
      <input
        value={value} onChange={e => onChange(e.target.value)}
        onClick={e => e.stopPropagation()}
        placeholder="filter…"
        className="w-full pl-5 pr-4 py-0.5 bg-black/40 border border-white/[0.06] rounded-lg
          text-[9px] text-zinc-400 font-mono placeholder:text-zinc-700 outline-none
          focus:border-[#FFD700]/30 transition-colors"
      />
      {value && (
        <button onClick={e => { e.stopPropagation(); onChange(''); }}
          className="absolute right-1 top-1/2 -translate-y-1/2 text-zinc-700 hover:text-zinc-400 transition-colors">
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}

// ─── Main Table ───────────────────────────────────────────────────────────────
interface PropsTableProps {
  props:        NormalizedProp[];
  loading:      boolean;
  onAddToSlip:  (prop: NormalizedProp) => void;
  onDelete:     (id: string) => Promise<void>;
  slipIds?:     Set<string>;
}

export function PropsTable({ props, loading, onAddToSlip, onDelete, slipIds = new Set() }: PropsTableProps) {
  const [visibleKeys,  setVisibleKeys]  = useState<Set<ColKey>>(new Set(DEFAULT_VISIBLE));
  const [colOrder,     setColOrder]     = useState<ColKey[]>(ALL_COLS.map(c => c.key));
  const [sortKey,      setSortKey]      = useState<ColKey>('gameDate');
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('desc');
  const [colFilters,   setColFilters]   = useState<Partial<Record<ColKey, string>>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [page,         setPage]         = useState(0);
  const [deleting,     setDeleting]     = useState<Set<string>>(new Set());
  const settingsRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 100;

  // Close settings on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleCol = useCallback((key: ColKey) => {
    setVisibleKeys(prev => {
      const n = new Set(prev);
      if (key === 'actions') return n; // can't hide actions
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }, []);

  const setFilter = useCallback((key: ColKey, val: string) => {
    setColFilters(prev => ({ ...prev, [key]: val }));
    setPage(0);
  }, []);

  const handleSort = useCallback((key: ColKey) => {
    if (key === 'actions') return;
    if (key === sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(0);
  }, [sortKey]);

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(prev => new Set(prev).add(id));
    try {
      await onDelete(id);
      toast.success('Prop deleted');
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeleting(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  }, [onDelete]);

  // Visible columns in order
  const visibleCols = useMemo(() =>
    colOrder
      .filter(k => visibleKeys.has(k))
      .map(k => ALL_COLS.find(c => c.key === k)!)
      .filter(Boolean),
    [colOrder, visibleKeys]
  );

  // Filter + sort (all in-memory — fast at 10k)
  const filtered = useMemo(() => {
    let list = [...props];

    // Per-column text filters
    for (const [key, val] of Object.entries(colFilters)) {
      if (!val?.trim()) continue;
      const lv = val.toLowerCase();
      list = list.filter(row => {
        const rv = (row as any)[key];
        if (rv == null) return false;
        return String(rv).toLowerCase().includes(lv);
      });
    }

    // Sort
    list.sort((a, b) => {
      const av = (a as any)[sortKey];
      const bv = (b as any)[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const an = Number(av); const bn = Number(bv);
      const cmp = (!isNaN(an) && !isNaN(bn)) ? an - bn : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [props, colFilters, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageSlice  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const hasFilters = Object.values(colFilters).some(v => v?.trim());

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-600">
        <Loader2 className="h-5 w-5 animate-spin mr-3" />
        <span className="text-sm font-black uppercase italic">Loading props…</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-zinc-600 text-[10px] font-mono">
          <span className="text-zinc-300 font-bold">{filtered.length.toLocaleString()}</span>
          {filtered.length !== props.length && <> of {props.length.toLocaleString()}</>} props
          {hasFilters && <span className="text-[#FFD700]/60 ml-1">(filtered)</span>}
        </span>
        {hasFilters && (
          <button onClick={() => { setColFilters({}); setPage(0); }}
            className="flex items-center gap-1 text-[9px] text-zinc-600 hover:text-white font-black uppercase transition-colors">
            <X className="h-3 w-3" />Clear all filters
          </button>
        )}
        <div className="relative ml-auto" ref={settingsRef}>
          <button onClick={() => setShowSettings(p => !p)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[9px] font-black uppercase transition-all ${
              showSettings
                ? 'bg-[#FFD700]/10 border-[#FFD700]/30 text-[#FFD700]'
                : 'border-white/[0.08] text-zinc-500 hover:text-white hover:border-white/20'
            }`}>
            <Settings2 className="h-3 w-3" /> Columns
            <span className="text-[8px] opacity-60">({visibleKeys.size - 1})</span>
          </button>
          {showSettings && (
            <ColumnSettings
              visible={visibleKeys}
              order={colOrder}
              onClose={() => setShowSettings(false)}
              onToggle={toggleCol}
              onReorder={o => setColOrder(o as ColKey[])}
            />
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {/* Sort header */}
            <thead>
              <tr className="bg-black/50 border-b border-white/[0.06]">
                {visibleCols.map(col => {
                  const active = sortKey === col.key;
                  const sortable = col.key !== 'actions';
                  return (
                    <th
                      key={col.key}
                      style={{ minWidth: col.width ?? 80 }}
                      onClick={() => sortable && handleSort(col.key)}
                      className={`px-2.5 py-2 ${sortable ? 'cursor-pointer select-none group' : ''}`}>
                      <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-zinc-600
                        ${col.align === 'right'  ? 'justify-end'   : ''}
                        ${col.align === 'center' ? 'justify-center' : ''}
                        ${sortable ? 'hover:text-zinc-400 transition-colors' : ''}
                        whitespace-nowrap`}>
                        {col.label}
                        {active
                          ? sortDir === 'desc'
                            ? <ChevronDown className="h-3 w-3 text-[#FFD700] shrink-0" />
                            : <ChevronUp   className="h-3 w-3 text-[#FFD700] shrink-0" />
                          : sortable
                            ? <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity shrink-0" />
                            : null}
                      </div>
                    </th>
                  );
                })}
              </tr>

              {/* Per-column filter row */}
              <tr className="bg-black/30 border-b border-white/[0.04]">
                {visibleCols.map(col => (
                  <td key={col.key} className="px-1.5 py-1">
                    {col.key !== 'actions' ? (
                      <ColFilter
                        value={colFilters[col.key] ?? ''}
                        onChange={v => setFilter(col.key, v)}
                      />
                    ) : null}
                  </td>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {pageSlice.map((row, idx) => {
                const isDel = deleting.has(row.id);
                return (
                  <tr key={row.id}
                    className={`border-t border-white/[0.04] transition-colors
                      ${isDel ? 'opacity-30' : idx % 2 === 0 ? 'bg-black/10 hover:bg-white/[0.02]' : 'hover:bg-white/[0.02]'}`}>
                    {visibleCols.map(col => {
                      // ── Actions cell ──
                      if (col.key === 'actions') {
                        const inSlip = slipIds.has(row.id);
                        return (
                          <td key="actions" className="px-2 py-2">
                            <div className="flex items-center gap-1 justify-center">
                              <button
                                onClick={() => onAddToSlip(row)}
                                disabled={inSlip || isDel}
                                title={inSlip ? 'Already in slip' : 'Add to slip'}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  inSlip
                                    ? 'bg-[#FFD700]/10 border-[#FFD700]/20 text-[#FFD700]/40 cursor-not-allowed'
                                    : 'bg-[#FFD700]/10 hover:bg-[#FFD700]/20 border-[#FFD700]/20 text-[#FFD700]'
                                }`}>
                                <Plus className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(row.id)}
                                disabled={isDel}
                                title="Delete prop"
                                className="p-1.5 rounded-lg border border-white/[0.06] text-zinc-700 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/10 transition-colors disabled:opacity-30">
                                {isDel ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                              </button>
                            </div>
                          </td>
                        );
                      }

                      // ── Data cell ──
                      const raw = (row as any)[col.key];
                      const content = col.fmt ? col.fmt(raw, row) : (raw != null ? String(raw) : '—');
                      const alignCls = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';

                      return (
                        <td key={col.key} className={`px-2.5 py-2.5 ${alignCls} max-w-[180px]`}>
                          {typeof content === 'string'
                            ? <span className="text-zinc-400 font-mono text-xs truncate block">{content}</span>
                            : content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {pageSlice.length === 0 && (
                <tr>
                  <td colSpan={visibleCols.length} className="px-4 py-16 text-center text-zinc-700 text-sm font-black uppercase italic">
                    No props match current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.04] bg-black/20">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/[0.08] text-zinc-500 hover:text-white text-xs font-black uppercase disabled:opacity-30 transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" />Prev
            </button>
            <span className="text-zinc-600 text-[10px] font-mono">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length).toLocaleString()} of {filtered.length.toLocaleString()}
              <span className="text-zinc-700 ml-1">· pg {page + 1}/{totalPages}</span>
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/[0.08] text-zinc-500 hover:text-white text-xs font-black uppercase disabled:opacity-30 transition-colors">
              Next<ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}