'use client';
// src/components/bets/PropsTable.tsx

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  ChevronUp, ChevronDown, ChevronRight, Trash2, Plus,
  Loader2, Settings2, Search, X, ChevronsUpDown, GripVertical,
} from 'lucide-react';
import type { NormalizedProp } from '@/hooks/useAllProps';
import { SweetSpotBadge } from '@/components/bets/SweetSpotBadge';
import { scoreProp, type ScoringCriteria } from '@/lib/utils/sweetSpotScore';

// ─── Column definitions ───────────────────────────────────────────────────────
interface ColDef { id: string; label: string; default: boolean; }
const ALL_COLUMNS: ColDef[] = [
  { id: 'week',        label: 'Wk/Date',    default: true  },
  { id: 'player',      label: 'Player',      default: true  },
  { id: 'team',        label: 'Team',        default: false },
  { id: 'matchup',     label: 'Matchup',     default: true  },
  { id: 'propLine',    label: 'Prop / Line', default: true  },
  { id: 'gameStat',    label: 'Game Stat',   default: true  },
  { id: 'result',      label: 'Result',      default: true  },
  { id: 'playerAvg',   label: 'Player Avg',  default: false },
  { id: 'scoreDiff',   label: 'Score Diff',  default: true  },
  { id: 'oppRank',     label: 'Opp Rank',    default: false },
  { id: 'oppAvg',      label: 'Opp Avg',     default: false },
  { id: 'hitPct',      label: 'Hit %',       default: true  },
  { id: 'avgWinProb',  label: 'Win Prob',    default: false },
  { id: 'edge',        label: 'Edge / EV',   default: true  },
  { id: 'conf',        label: 'Confidence',  default: true  },
  { id: 'projWinPct',  label: 'Proj Win %',  default: false },
  { id: 'impliedProb', label: 'Implied',     default: false },
  { id: 'kelly',       label: 'Kelly %',     default: false },
  { id: 'valueIcon',   label: 'Value',       default: false },
  { id: 'odds',        label: 'Odds',        default: false },
  { id: 'season',      label: 'Season',      default: false },
];

const STORAGE_KEY = 'sweetspot_col_order_v2';
const DEFAULT_COL_ORDER = ALL_COLUMNS.filter(c => c.default).map(c => c.id);
const VALID_COL_IDS = new Set(ALL_COLUMNS.map(c => c.id));

function loadColOrder(): string[] {
  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved) {
      const parsed: string[] = JSON.parse(saved);
      const filtered = parsed.filter(id => VALID_COL_IDS.has(id));
      // Append any new default cols not in saved order
      const missingDefaults = ALL_COLUMNS
        .filter(c => c.default && !filtered.includes(c.id))
        .map(c => c.id);
      return [...filtered, ...missingDefaults];
    }
  } catch {}
  return [...DEFAULT_COL_ORDER];
}

function saveColOrder(order: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(order)); } catch {}
}

// ─── Sort / filter types ──────────────────────────────────────────────────────
type SortKey =
  | 'week' | 'player' | 'matchup' | 'propLine' | 'playerAvg' | 'scoreDiff'
  | 'oppRank' | 'oppAvg' | 'hitPct' | 'avgWinProb' | 'edge' | 'conf'
  | 'projWinPct' | 'impliedProb' | 'kelly' | 'odds' | 'gameStat' | 'result';
type SortDir = 'asc' | 'desc';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function n(v: any): number {
  return v == null || isNaN(Number(v)) ? -Infinity : Number(v);
}

function fmtNum(v: any, dp = 1): string {
  const x = Number(v);
  return v == null || isNaN(x) ? '—' : x.toFixed(dp);
}

/**
 * Format a percentage value stored either as a decimal (0–1) or whole number (0–100).
 * Returns '—' when value is null, undefined, or 0 (0 typically means "no data found").
 */
function fmtPct(v: any, dp = 0): string {
  if (v == null || v === '') return '—';
  const x = Number(v);
  if (isNaN(x) || x === 0) return '—';
  const pct = x <= 1.5 ? x * 100 : x;
  return pct.toFixed(dp) + '%';
}

function fmtOdds(v: any): string {
  const x = Number(v);
  if (!x || !isFinite(x)) return '—';
  return x > 0 ? `+${x}` : `${x}`;
}

// ─── Field accessors ──────────────────────────────────────────────────────────
/** Game stat actual result — handles legacy field names */
function getGameStat(p: any): number | null {
  const raw =
    p.gameStat ?? p.gamestats ?? p['Game Stats'] ?? p['game stats'] ?? p.gameStats ?? null;
  if (raw == null) return null;
  const x = Number(raw);
  return isNaN(x) ? null : x;
}

/** Free-text result (e.g. "won" / "lost") — handles legacy field names */
function getActualResult(p: any): string | null {
  return p.actualResult ?? p.actualStats ?? p['Actual Stats'] ?? p['actual stats'] ?? p.result ?? null;
}

/** Did the prop hit? Derived from gameStat vs line + over/under direction */
function getHit(p: any): boolean | null {
  const stat = getGameStat(p);
  const line = p.line ?? p.Line;
  const ou = (p.overUnder ?? p['Over/Under'] ?? '').toString().toLowerCase();
  if (stat == null || line == null || !ou) return null;
  if (ou === 'over') return stat > Number(line);
  if (ou === 'under') return stat < Number(line);
  return null;
}

/**
 * Score Diff = playerAvg − line
 * Pre-game signal: how far above (positive) or below (negative) the line
 * the player's season average sits. Positive = player trends over the line.
 */
function getScoreDiff(p: any): number | null {
  const avg  = p.playerAvg != null ? Number(p.playerAvg) : null;
  const line = p.line       != null ? Number(p.line)      : null;
  if (avg != null && line != null && !isNaN(avg) && !isNaN(line)) {
    return Math.round((avg - line) * 10) / 10;
  }
  return p.scoreDiff != null ? Number(p.scoreDiff) : null;
}

// ─── Color helpers ────────────────────────────────────────────────────────────
const CYAN = '#22d3ee';
const INDIGO = '#818cf8';
const SLATE = '#475569';
const RED = '#ef4444';

function getHitColorClass(rate: number | null) {
  if (rate === null || typeof rate === 'undefined' || isNaN(rate)) return 'text-slate-400';
  const r = rate <= 1.5 ? rate * 100 : rate;
  if (r >= 65) return `text-[${CYAN}]`;
  if (r >= 55) return `text-[${INDIGO}]`;
  if (r >= 45) return `text-[${SLATE}]`;
  return `text-[${RED}]`;
}

function scoreDiffCls(d: number | null) {
  if (d == null) return 'text-slate-400';
  if (d > 3) return `text-[${CYAN}]`;
  if (d > 0) return `text-[${INDIGO}]`;
  return `text-[${RED}]`;
}
function oppRankCls(r: number | null) {
  if (r == null) return 'text-slate-400';
  // Lower rank is better (weaker opponent)
  if (r <= 8) return `text-[${CYAN}]`;
  if (r <= 16) return `text-[${INDIGO}]`;
  return `text-[${RED}]`;
}
function confCls(v: number | null) {
  return getHitColorClass(v);
}
function hitPctCls(v: number | null) {
  return getHitColorClass(v);
}
function evCls(v: number | null) {
  if (v == null) return 'text-slate-400';
  return v > 0 ? `text-[${CYAN}]` : `text-[${RED}]`;
}
function kellyClss(v: number | null) {
  if (v == null) return 'text-slate-400';
  const pct = v <= 1 ? v * 100 : v;
  if (pct >= 10) return `text-[${CYAN}]`;
  if (pct >= 5) return `text-[${INDIGO}]`;
  return 'text-slate-400';
}


// ─── Sort value extractor ─────────────────────────────────────────────────────
function getSortVal(p: NormalizedProp, key: SortKey): number | string {
  switch (key) {
    case 'week':        return n(p.week);
    case 'player':      return p.player ?? '';
    case 'matchup':     return p.matchup ?? '';
    case 'propLine':    return p.prop ?? '';
    case 'playerAvg':   return n(p.playerAvg);
    case 'scoreDiff':   return n(getScoreDiff(p));
    case 'oppRank':     return n(p.opponentRank);
    case 'oppAvg':      return n(p.opponentAvgVsStat);
    case 'hitPct':      return n(p.seasonHitPct);
    case 'avgWinProb':  return n(p.avgWinProb);
    case 'edge':        return n(p.bestEdgePct);
    case 'conf':        return n(p.confidenceScore);
    case 'projWinPct':  return n(p.projWinPct);
    case 'impliedProb': return n(p.impliedProb);
    case 'kelly':       return n(p.kellyPct);
    case 'gameStat':    return n(getGameStat(p));
    case 'result':      return getActualResult(p) ?? '';
    case 'odds':        return n(p.odds);
    default:            return '';
  }
}

// ─── Sortable TH ─────────────────────────────────────────────────────────────
function SortTh({
  label, col, sortKey, sortDir, onSort, className = '',
}: {
  label: string; col: SortKey; sortKey: SortKey; sortDir: SortDir;
  onSort: (k: SortKey) => void; className?: string;
}) {
  const active = sortKey === col;
  return (
    <th
      onClick={() => onSort(col)}
      className={`px-3 py-2.5 cursor-pointer select-none group ${className}`}
    >
      <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400 transition-colors whitespace-nowrap">
        {label}
        {active
          ? sortDir === 'desc'
            ? <ChevronDown className="h-3 w-3 text-[#22d3ee]" />
            : <ChevronUp   className="h-3 w-3 text-[#22d3ee]" />
          : <ChevronsUpDown className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
      </div>
    </th>
  );
}

// ─── Column picker with drag-to-reorder ──────────────────────────────────────
function ColumnPicker({
  colOrder, onToggle, onReorder,
}: {
  colOrder: string[];
  onToggle: (id: string) => void;
  onReorder: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const dragItem = useRef<string | null>(null);
  const dragOver = useRef<string | null>(null);

  const visibleCols = colOrder
    .map(id => ALL_COLUMNS.find(c => c.id === id))
    .filter((c): c is ColDef => !!c);
  const hiddenCols = ALL_COLUMNS.filter(c => !colOrder.includes(c.id));

  const handleDragStart = (id: string) => { dragItem.current = id; };
  const handleDragEnter = (id: string) => { dragOver.current = id; };
  const handleDragEnd   = () => {
    if (
      dragItem.current &&
      dragOver.current &&
      dragItem.current !== dragOver.current
    ) {
      const next = [...colOrder];
      const from = next.indexOf(dragItem.current);
      const to   = next.indexOf(dragOver.current);
      next.splice(from, 1);
      next.splice(to, 0, dragItem.current);
      onReorder(next);
    }
    dragItem.current = dragOver.current = null;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[9px] font-black uppercase transition-all ${
          open
            ? 'bg-[#22d3ee]/10 border-[#22d3ee]/30 text-[#22d3ee]'
            : 'border-white/8 text-zinc-600 hover:text-white'
        }`}
      >
        <Settings2 className="h-3.5 w-3.5" />
        Columns ({colOrder.length})
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-52 bg-[#0f1115] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[480px]">

            {/* Visible / draggable */}
            <div className="px-3 pt-2.5 pb-1.5 border-b border-white/6">
              <p className="text-[8px] font-black uppercase text-zinc-700 tracking-widest">
                Visible · drag to reorder
              </p>
            </div>
            <div className="overflow-y-auto flex-1 p-1">
              {visibleCols.map(c => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={() => handleDragStart(c.id)}
                  onDragEnter={() => handleDragEnter(c.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => e.preventDefault()}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/4 cursor-grab active:cursor-grabbing group select-none"
                >
                  <GripVertical className="h-3 w-3 text-zinc-700 group-hover:text-zinc-500 shrink-0" />
                  <span className="flex-1 text-xs font-bold text-zinc-300">{c.label}</span>
                  <button
                    onClick={() => onToggle(c.id)}
                    className="p-0.5 text-zinc-700 hover:text-red-400 transition-colors"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Hidden */}
            {hiddenCols.length > 0 && (
              <>
                <div className="px-3 pt-2.5 pb-1.5 border-t border-white/6">
                  <p className="text-[8px] font-black uppercase text-zinc-700 tracking-widest">
                    Hidden · click to add
                  </p>
                </div>
                <div className="overflow-y-auto max-h-44 p-1">
                  {hiddenCols.map(c => (
                    <button
                      key={c.id}
                      onClick={() => onToggle(c.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/4 transition-colors group"
                    >
                      <Plus className="h-3 w-3 text-zinc-700 group-hover:text-[#22d3ee]" />
                      <span className="text-xs font-bold text-zinc-600 group-hover:text-zinc-300">
                        {c.label}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Reset */}
            <div className="border-t border-white/6 p-1">
              <button
                onClick={() => onReorder([...DEFAULT_COL_ORDER])}
                className="w-full px-2 py-1.5 text-[9px] font-black uppercase text-zinc-700 hover:text-zinc-400 transition-colors rounded-xl hover:bg-white/4"
              >
                Reset to defaults
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Expanded detail panel ────────────────────────────────────────────────────
function PropDetail({ prop }: { prop: NormalizedProp }) {
  const gameStat     = getGameStat(prop);
  const hit          = getHit(prop);
  const actualResult = getActualResult(prop);
  const scoreDiff    = getScoreDiff(prop);

  const fields: [string, string][] = [
    ['Game Stat',        gameStat != null ? fmtNum(gameStat) : '—'],
    ['Result',           hit !== null ? (hit ? '✓ HIT' : '✗ MISS') : (actualResult ? String(actualResult) : '—')],
    ['Score Diff',       scoreDiff != null ? (scoreDiff > 0 ? '+' : '') + fmtNum(scoreDiff) : '—'],
    ['Player Avg',       fmtNum(prop.playerAvg)],
    ['Opp Rank',         prop.opponentRank != null ? `#${prop.opponentRank}` : '—'],
    ['Opp Avg vs Stat',  fmtNum(prop.opponentAvgVsStat)],
    ['Hit %',            fmtPct(prop.seasonHitPct)],
    ['Avg Win Prob',     fmtPct(prop.avgWinProb)],
    ['Proj Win %',       fmtPct(prop.projWinPct)],
    ['Implied Prob',     fmtPct(prop.impliedProb)],
    ['Best Edge',        prop.bestEdgePct != null ? (Number(prop.bestEdgePct) > 0 ? '+' : '') + fmtPct(prop.bestEdgePct, 1) : '—'],
    ['Expected Value',   prop.expectedValue != null ? (Number(prop.expectedValue) > 0 ? '+' : '') + fmtNum(prop.expectedValue, 3) : '—'],
    ['Kelly %',          fmtPct(prop.kellyPct, 1)],
    ['Confidence',       fmtPct(prop.confidenceScore)],
    ['Value Icon',       prop.valueIcon ?? '—'],
    ['FD Odds',          fmtOdds(prop.fdOdds)],
    ['DK Odds',          fmtOdds(prop.dkOdds)],
    ['Best Odds',        fmtOdds(prop.bestOdds)],
    ['Best Book',        prop.bestBook ?? '—'],
    ['Season',           prop.season != null ? String(prop.season) : '—'],
  ];

  return (
    <div className="p-4 bg-[#0a0c0f] border-t border-[#22d3ee]/10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {fields.map(([label, val]) => (
        <div key={label} className="bg-black/30 rounded-xl px-3 py-2">
          <p className="text-[8px] font-black uppercase text-zinc-700 tracking-widest mb-0.5">{label}</p>
          <p className="text-xs font-mono font-bold text-zinc-300">{val}</p>
        </div>
      ))}
    </div>
  );
}

// ─── PropsTable ───────────────────────────────────────────────────────────────
interface PropsTableProps {
  props:            NormalizedProp[];
  isLoading:        boolean;
  onAddToBetSlip:   (prop: NormalizedProp) => void;
  slipIds?:         Set<string>;
  onDelete?:        (id: string) => Promise<void>;
  showSweetSpots?:  boolean;
  sweetSpotCriteria?: ScoringCriteria | null;
}

const PAGE_SIZE = 50;

export function PropsTable({
  props = [], isLoading, onAddToBetSlip, slipIds = new Set(), onDelete,
  showSweetSpots, sweetSpotCriteria,
}: PropsTableProps) {
  // Column order persisted to localStorage
  const [colOrder,   setColOrder]   = useState<string[]>(loadColOrder);
  const [sortKey,    setSortKey]    = useState<SortKey>('conf');
  const [sortDir,    setSortDir]    = useState<SortDir>('desc');
  const [search,     setSearch]     = useState('');
  const [fMatchup,   setFMatchup]   = useState('');
  const [fProp,      setFProp]      = useState('');
  const [fOU,        setFOU]        = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [page,       setPage]       = useState(0);

  const score = useCallback((p: NormalizedProp) => {
    if (!showSweetSpots || !sweetSpotCriteria) return null;
    return scoreProp({
      prop:            p.prop,
      overUnder:       p.overUnder,
      scoreDiff:       p.scoreDiff,
      confidenceScore: p.confidenceScore,
      opponentRank:    p.opponentRank,
      bestEdgePct:     p.bestEdgePct,
      kellyPct:        p.kellyPct,
    }, sweetSpotCriteria);
  }, [showSweetSpots, sweetSpotCriteria]);

  const visibleSet = useMemo(() => new Set(colOrder), [colOrder]);

  const handleColToggle = useCallback((id: string) => {
    setColOrder(prev => {
      const next = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id];
      saveColOrder(next);
      return next;
    });
  }, []);

  const handleColReorder = useCallback((next: string[]) => {
    setColOrder(next);
    saveColOrder(next);
  }, []);

  const handleSort = useCallback((key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(0);
  }, [sortKey]);

  const matchupOptions = useMemo(
    () => Array.from(new Set(props.map(p => p.matchup).filter(Boolean))).sort() as string[],
    [props],
  );
  const propOptions = useMemo(
    () => Array.from(new Set(props.map(p => p.prop).filter(Boolean))).sort() as string[],
    [props],
  );

  const filtered = useMemo(() => {
    let list = props;
    if (search)   list = list.filter(p =>
      (p.player ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.team ?? '').toLowerCase().includes(search.toLowerCase()),
    );
    if (fMatchup) list = list.filter(p => p.matchup === fMatchup);
    if (fProp)    list = list.filter(p => p.prop    === fProp);
    if (fOU)      list = list.filter(p => p.overUnder?.toLowerCase() === fOU.toLowerCase());
    return list;
  }, [props, search, fMatchup, fProp, fOU]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = getSortVal(a, sortKey);
      const bv = getSortVal(b, sortKey);
      if (typeof av === 'string')
        return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === 'asc'
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated  = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSelect = (id: string) =>
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelected(
      selected.size === paginated.length ? new Set() : new Set(paginated.map(p => p.id)),
    );

  const hasFilters = search || fMatchup || fProp || fOU;

  // Inline SortTh shorthand
  const ST = ({ label, c, cls = '' }: { label: string; c: SortKey; cls?: string }) => (
    <SortTh
      label={label} col={c}
      sortKey={sortKey} sortDir={sortDir}
      onSort={handleSort} className={cls}
    />
  );

  if (isLoading && props.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-zinc-600">
        <Loader2 className="h-6 w-6 animate-spin mr-3" />
        <span className="text-sm font-black uppercase italic">Loading props…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* ── Filter bar ── */}
      <div className="flex flex-col gap-2">

        {/* Row 1: search + matchup + prop + O/U + clear */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-600" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Player or team…"
              className="pl-7 pr-7 py-1.5 w-40 bg-black/40 border border-white/8 text-white text-xs font-mono rounded-xl outline-none focus:ring-1 focus:ring-[#22d3ee]/30 placeholder:text-zinc-700"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <select
            value={fMatchup}
            onChange={e => { setFMatchup(e.target.value); setPage(0); }}
            className="py-1.5 px-2.5 bg-black/40 border border-white/8 text-zinc-300 text-xs font-mono rounded-xl outline-none focus:ring-1 focus:ring-[#22d3ee]/30"
          >
            <option value="">All Matchups</option>
            {matchupOptions.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <select
            value={fProp}
            onChange={e => { setFProp(e.target.value); setPage(0); }}
            className="py-1.5 px-2.5 bg-black/40 border border-white/8 text-zinc-300 text-xs font-mono rounded-xl outline-none focus:ring-1 focus:ring-[#22d3ee]/30"
          >
            <option value="">All Props</option>
            {propOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <div className="flex rounded-xl overflow-hidden border border-white/8">
            {(['', 'Over', 'Under'] as const).map(v => (
              <button
                key={v}
                onClick={() => { setFOU(v); setPage(0); }}
                className={`px-2.5 py-1.5 text-[9px] font-black uppercase transition-colors ${
                  fOU === v
                    ? 'bg-[#22d3ee]/20 text-[#22d3ee]'
                    : 'bg-black/40 text-zinc-600 hover:text-zinc-400'
                }`}
              >
                {v || 'All'}
              </button>
            ))}
          </div>

          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setFMatchup(''); setFProp(''); setFOU(''); setPage(0); }}
              className="flex items-center gap-1 text-[9px] text-zinc-600 hover:text-white font-black uppercase transition-colors"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>

        {/* Row 2: bulk delete + count + column picker */}
        <div className="flex flex-wrap items-center gap-2">
          {selected.size > 0 && onDelete && (
            <button
              onClick={() => { [...selected].forEach(id => onDelete(id)); setSelected(new Set()); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-black uppercase transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete {selected.size}
            </button>
          )}
          <span className="text-zinc-700 text-[10px] font-mono ml-auto">
            {sorted.length} of {props.length} props
          </span>
          <ColumnPicker
            colOrder={colOrder}
            onToggle={handleColToggle}
            onReorder={handleColReorder}
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-black/40 border-b border-white/[0.06]">
              <tr>
                {/* Checkbox */}
                <th className="px-3 py-2.5 w-8">
                  <input
                    type="checkbox"
                    checked={paginated.length > 0 && selected.size === paginated.length}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded border-zinc-700 bg-black/40 accent-[#22d3ee]"
                  />
                </th>

                {/* Render headers in user-defined order */}
                {colOrder.map(id => {
                  switch (id) {
                    case 'week':        return <ST key={id} label="Wk/Date"    c="week"        cls="text-left" />;
                    case 'player':      return <ST key={id} label="Player"      c="player"      cls="text-left" />;
                    case 'team':        return <th key={id} className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-zinc-600 text-left whitespace-nowrap">Team</th>;
                    case 'matchup':     return <ST key={id} label="Matchup"     c="matchup"     cls="text-left" />;
                    case 'propLine':    return <ST key={id} label="Prop/Line"   c="propLine"    cls="text-center" />;
                    case 'gameStat':    return <ST key={id} label="Game Stat"   c="gameStat"    cls="text-center" />;
                    case 'result':      return <ST key={id} label="Result"      c="result"      cls="text-center" />;
                    case 'playerAvg':   return <ST key={id} label="Player Avg"  c="playerAvg"   cls="text-center" />;
                    case 'scoreDiff':   return <ST key={id} label="Score Diff"  c="scoreDiff"   cls="text-center" />;
                    case 'oppRank':     return <ST key={id} label="Opp Rank"    c="oppRank"     cls="text-center" />;
                    case 'oppAvg':      return <ST key={id} label="Opp Avg"     c="oppAvg"      cls="text-center" />;
                    case 'hitPct':      return <ST key={id} label="Hit %"       c="hitPct"      cls="text-center" />;
                    case 'avgWinProb':  return <ST key={id} label="Win Prob"    c="avgWinProb"  cls="text-center" />;
                    case 'edge':        return <ST key={id} label="Edge / EV"   c="edge"        cls="text-center" />;
                    case 'conf':        return <ST key={id} label="Conf"        c="conf"        cls="text-center" />;
                    case 'projWinPct':  return <ST key={id} label="Proj Win %"  c="projWinPct"  cls="text-center" />;
                    case 'impliedProb': return <ST key={id} label="Implied"     c="impliedProb" cls="text-center" />;
                    case 'kelly':       return <ST key={id} label="Kelly %"     c="kelly"       cls="text-center" />;
                    case 'valueIcon':   return <th key={id} className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-zinc-600 text-center">Value</th>;
                    case 'odds':        return <ST key={id} label="Odds"        c="odds"        cls="text-center" />;
                    case 'season':      return <th key={id} className="px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-zinc-600 text-center">Season</th>;
                    default: return null;
                  }
                })}

                {showSweetSpots && <th className="px-2 py-2.5 w-8" />}

                {/* Actions column */}
                <th className="px-3 py-2.5 w-20" />
              </tr>
            </thead>

            <tbody>
              {paginated.map((prop, idx) => {
                const id           = prop.id ? String(prop.id) : `idx-${idx}`;
                const inSlip       = slipIds.has(id);
                const isExpanded   = expandedId === id;
                const isSelected   = selected.has(id);
                const gameStat     = getGameStat(prop);
                const hit          = getHit(prop);
                const actualResult = getActualResult(prop);
                const scoreDiffVal = getScoreDiff(prop);
                const isOver       = prop.overUnder?.toLowerCase() === 'over';
                const sweetSpotResult = score(prop);

                return (
                  <React.Fragment key={id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : id)}
                      className={`border-t border-white/[0.04] cursor-pointer transition-colors
                        ${isSelected  ? 'bg-[#22d3ee]/[0.03]' : idx % 2 === 0 ? 'bg-black/10' : ''}
                        ${isExpanded  ? 'bg-[#22d3ee]/[0.02]' : 'hover:bg-white/[0.02]'}
                        ${sweetSpotResult?.tier === 'bullseye' ? 'shadow-[inset_2px_0_0_0_#22d3ee]' : ''}
                        ${sweetSpotResult?.tier === 'hot'      ? 'shadow-[inset_2px_0_0_0_#f97316]' : ''}`}>

                      {/* Checkbox */}
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox" checked={isSelected}
                          onChange={() => toggleSelect(id)}
                          className="w-3.5 h-3.5 rounded border-zinc-700 bg-black/40 accent-[#22d3ee]"
                        />
                      </td>

                      {/* Render cells in user-defined order */}
                      {colOrder.map(colId => {
                        switch (colId) {

                          case 'week': return (
                            <td key={colId} className="px-3 py-3 whitespace-nowrap">
                              <span className="text-zinc-500 text-xs font-mono">
                                {prop.week ? `WK${prop.week}` : '—'}
                              </span>
                              {prop.gameDate && (
                                <p className="text-zinc-700 text-[9px] font-mono">
                                  {new Date(prop.gameDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </p>
                              )}
                            </td>
                          );

                          case 'player': return (
                            <td key={colId} className="px-3 py-3">
                              <p className="text-white text-xs font-black italic uppercase truncate max-w-[120px]">
                                {prop.player}
                              </p>
                            </td>
                          );

                          case 'team': return (
                            <td key={colId} className="px-3 py-3">
                              <span className="text-[9px] text-[#FFD700] font-black uppercase bg-[#FFD700]/10 px-1.5 py-0.5 rounded">
                                {prop.team ?? '—'}
                              </span>
                            </td>
                          );

                          case 'matchup': return (
                            <td key={colId} className="px-3 py-3 text-xs text-zinc-400 whitespace-nowrap">
                              {prop.matchup ?? '—'}
                            </td>
                          );

                          case 'propLine': return (
                            <td key={colId} className="px-3 py-3 text-center whitespace-nowrap">
                              <p className="text-[9px] text-zinc-500 uppercase font-medium">{prop.prop}</p>
                              <div className="flex items-center justify-center gap-1 mt-0.5">
                                <span className="font-mono text-xs font-bold text-white">{prop.line}</span>
                                <span className={`text-[9px] font-black uppercase ${isOver ? 'text-blue-400' : 'text-orange-400'}`}>
                                  {prop.overUnder?.charAt(0) ?? ''}
                                </span>
                              </div>
                            </td>
                          );

                          case 'gameStat': return (
                            <td key={colId} className="px-3 py-3 text-center whitespace-nowrap">
                              {gameStat != null ? (
                                <span className={`font-mono text-xs font-bold ${
                                  hit === true  ? 'text-emerald-400' :
                                  hit === false ? 'text-red-400'     : 'text-zinc-300'
                                }`}>
                                  {fmtNum(gameStat)}
                                </span>
                              ) : (
                                <span className="text-zinc-700 text-xs">—</span>
                              )}
                            </td>
                          );

                          case 'result': return (
                            <td key={colId} className="px-3 py-3 text-center whitespace-nowrap">
                              {hit !== null ? (
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                                  hit
                                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                    : 'text-red-400 bg-red-500/10 border-red-500/20'
                                }`}>
                                  {hit ? 'HIT' : 'MISS'}
                                </span>
                              ) : actualResult ? (
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border text-zinc-500 bg-white/[0.04] border-white/10">
                                  {String(actualResult).toUpperCase()}
                                </span>
                              ) : (
                                <span className="text-zinc-700 text-xs">—</span>
                              )}
                            </td>
                          );

                          case 'playerAvg': return (
                            <td key={colId} className="px-3 py-3 text-center font-mono text-xs text-zinc-300">
                              {fmtNum(prop.playerAvg)}
                            </td>
                          );

                          case 'scoreDiff': return (
                            <td key={colId} className="px-3 py-3 text-center">
                              <span className={`font-mono text-xs font-bold ${scoreDiffCls(scoreDiffVal)}`}>
                                {scoreDiffVal != null
                                  ? (scoreDiffVal > 0 ? '+' : '') + fmtNum(scoreDiffVal)
                                  : '—'}
                              </span>
                            </td>
                          );

                          case 'oppRank': return (
                            <td key={colId} className="px-3 py-3 text-center">
                              <span className={`text-xs font-bold ${oppRankCls(prop.opponentRank ?? null)}`}>
                                {prop.opponentRank != null ? `#${prop.opponentRank}` : '—'}
                              </span>
                            </td>
                          );

                          case 'oppAvg': return (
                            <td key={colId} className="px-3 py-3 text-center font-mono text-xs text-zinc-400">
                              {fmtNum(prop.opponentAvgVsStat)}
                            </td>
                          );

                          case 'hitPct': return (
                            <td key={colId} className="px-3 py-3 text-center">
                              <span className={`font-mono text-xs font-bold ${hitPctCls(prop.seasonHitPct ?? null)}`}>
                                {fmtPct(prop.seasonHitPct)}
                              </span>
                            </td>
                          );

                          case 'avgWinProb': return (
                            <td key={colId} className="px-3 py-3 text-center font-mono text-xs text-zinc-300">
                              {fmtPct(prop.avgWinProb)}
                            </td>
                          );

                          case 'edge': return (
                            <td key={colId} className="px-3 py-3 text-center">
                              {prop.bestEdgePct != null && Number(prop.bestEdgePct) !== 0 ? (
                                <>
                                  <p className={`text-[10px] font-bold leading-none ${evCls(Number(prop.bestEdgePct))}`}>
                                    {Number(prop.bestEdgePct) > 0 ? '+' : ''}{fmtPct(prop.bestEdgePct, 1)}
                                  </p>
                                  {prop.expectedValue != null && Number(prop.expectedValue) !== 0 && (
                                    <p className={`text-[9px] font-mono mt-0.5 ${evCls(Number(prop.expectedValue))}`}>
                                      EV {Number(prop.expectedValue) > 0 ? '+' : ''}{fmtNum(prop.expectedValue, 3)}
                                    </p>
                                  )}
                                </> 
                              ) : (
                                <span className="text-zinc-700 text-xs">—</span>
                              )}
                            </td>
                          );

                          case 'conf': return (
                            <td key={colId} className="px-3 py-3 text-center">
                              <span className={`text-xs font-bold font-mono ${confCls(prop.confidenceScore ?? null)}`}>
                                {fmtPct(prop.confidenceScore)}
                              </span>
                            </td>
                          );

                          case 'projWinPct': return (
                            <td key={colId} className="px-3 py-3 text-center font-mono text-xs text-zinc-400">
                              {fmtPct(prop.projWinPct)}
                            </td>
                          );

                          case 'impliedProb': return (
                            <td key={colId} className="px-3 py-3 text-center font-mono text-xs text-zinc-400">
                              {fmtPct(prop.impliedProb)}
                            </td>
                          );

                          case 'kelly': return (
                            <td key={colId} className="px-3 py-3 text-center">
                              <span className={`font-mono text-xs font-bold ${kellyClss(prop.kellyPct ?? null)}`}>
                                {fmtPct(prop.kellyPct, 1)}
                              </span>
                            </td>
                          );

                          case 'valueIcon': return (
                            <td key={colId} className="px-3 py-3 text-center text-base">
                              {prop.valueIcon ?? '—'}
                            </td>
                          );

                          case 'odds': return (
                            <td key={colId} className="px-3 py-3 text-center font-mono text-xs text-zinc-400">
                              {fmtOdds(prop.odds)}
                            </td>
                          );

                          case 'season': return (
                            <td key={colId} className="px-3 py-3 text-center font-mono text-[10px] text-zinc-600">
                              {prop.season ?? '—'}
                            </td>
                          );

                          default: return null;
                        }
                      })}

                      {/* Sweet Spot Badge */}
                      {showSweetSpots && (
                        <td className="px-2 py-2 w-8" onClick={e => e.stopPropagation()}>
                          {sweetSpotResult && sweetSpotResult.tier !== 'cold' && (
                            <SweetSpotBadge result={sweetSpotResult} size="sm" />
                          )}
                        </td>
                      )}

                      {/* Actions */}
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {onDelete && (
                            <button
                              onClick={() => prop.id && onDelete(String(prop.id))}
                              className="p-1.5 text-zinc-700 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => !inSlip && onAddToBetSlip(prop)}
                            disabled={inSlip}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${
                              inSlip
                                ? 'bg-[#22d3ee]/20 border border-[#22d3ee]/30 text-[#22d3ee]/60 cursor-not-allowed'
                                : 'bg-[#22d3ee] text-black hover:bg-[#20c2d8]'
                            }`}
                          >
                            {inSlip ? '✓' : <Plus className="h-3 w-3" />}
                          </button>
                          <ChevronRight className={`h-3.5 w-3.5 text-zinc-700 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={colOrder.length + (showSweetSpots ? 3 : 2)} className="p-0">
                          <PropDetail prop={prop} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {paginated.length === 0 && !isLoading && (
                <tr>
                  <td
                    colSpan={colOrder.length + (showSweetSpots ? 3 : 2)}
                    className="px-6 py-16 text-center text-zinc-700 text-sm font-black uppercase italic"
                  >
                    No props match filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t 'border-white/4' bg-black/20">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-xl border 'border-white/8' text-zinc-500 hover:text-white text-xs font-black uppercase disabled:opacity-30 transition-colors"
            >
              ← Prev
            </button>
            <span className="text-zinc-600 text-[10px] font-mono">
              Page {page + 1} / {totalPages} · {sorted.length.toLocaleString()} props
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-3 py-1.5 rounded-xl border 'border-white/8' text-zinc-500 hover:text-white text-xs font-black uppercase disabled:opacity-30 transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
