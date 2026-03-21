'use client';

import React, {
  useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import {
  Search, ChevronDown, ChevronUp, ChevronsUpDown,
  RefreshCw, Zap, ChevronLeft, ChevronRight,
  Settings2, GripVertical, Eye, EyeOff, X,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Sport theming ────────────────────────────────────────────────────────────
const THEME = {
  nfl: { accent: '#4ade80', accentBg: 'rgba(74,222,128,0.08)', accentBorder: 'rgba(74,222,128,0.2)', accentDim: '#16a34a', label: 'NFL', icon: '🏈' },
  nba: { accent: '#fb923c', accentBg: 'rgba(251,146,60,0.08)',  accentBorder: 'rgba(251,146,60,0.2)',  accentDim: '#ea580c', label: 'NBA', icon: '🏀' },
} as const;
type League = 'nfl' | 'nba';

// ─── Column definitions ───────────────────────────────────────────────────────
// All possible fields from both allProps (NFL) and nbaProps (NBA) collections.
// `leagues` controls which sport shows the column in the picker.

interface ColDef {
  id:       string;
  label:    string;
  field:    string;   // actual data field name
  leagues:  League[];
  default:  boolean;
  sortable: boolean;
  width?:   number;
  render:   (v: any, row: any) => React.ReactNode;
}

const fmt  = (v: any, dp = 1) => { if (v == null) return '—'; const x = Number(v); return isNaN(x) ? '—' : x.toFixed(dp); };
const fmtPct = (v: any, dp = 0) => { if (v == null) return '—'; const x = Number(v); if (isNaN(x) || x === 0) return '—'; return (x <= 1.5 ? x * 100 : x).toFixed(dp) + '%'; };

function ResultBadge({ v }: { v: any }) {
  if (!v) return <span className="text-slate-700 text-[9px]">—</span>;
  const r = v.toLowerCase();
  const cls = r === 'won' || r === 'hit' ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/40' :
              r === 'lost' || r === 'miss' ? 'bg-red-900/40 text-red-400 border border-red-800/40' :
              'bg-slate-800 text-slate-400 border border-slate-700';
  return <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${cls}`}>{r === 'won' || r === 'hit' ? 'HIT' : r === 'lost' || r === 'miss' ? 'MISS' : v}</span>;
}

function ScoreDiff({ v }: { v: any }) {
  if (v == null) return <span className="text-slate-700">—</span>;
  const n = Number(v);
  if (isNaN(n)) return <span className="text-slate-700">—</span>;
  const color = n > 0 ? '#4ade80' : n < 0 ? '#f87171' : '#64748b';
  return <span className="font-mono font-black text-[11px]" style={{ color }}>{n > 0 ? '+' : ''}{n.toFixed(1)}</span>;
}

const ALL_COLS: ColDef[] = [
  // Core identity
  { id: 'player',       label: 'Player',       field: 'player',            leagues: ['nfl','nba'], default: true,  sortable: true,  render: (v, r) => <><p className="font-black text-[11px] italic uppercase text-white">{v}</p><p className="text-[9px] text-slate-600 font-bold uppercase">{r.team || '—'}</p></> },
  { id: 'week',         label: 'Week',         field: 'week',              leagues: ['nfl'],       default: true,  sortable: true,  width: 80,  render: v => v ? <span className="font-mono font-black text-[11px]">WK {v}</span> : <span className="text-slate-700">—</span> },
  { id: 'gameDate',     label: 'Date',         field: 'gameDate',          leagues: ['nfl','nba'], default: true,  sortable: true,  width: 100, render: v => <span className="font-mono text-[10px] text-slate-400">{v || '—'}</span> },
  { id: 'matchup',      label: 'Matchup',      field: 'matchup',           leagues: ['nfl','nba'], default: true,  sortable: true,  render: v => <span className="text-slate-400 text-[10px]">{v || '—'}</span> },
  { id: 'prop',         label: 'Prop',         field: 'prop',              leagues: ['nfl','nba'], default: false, sortable: true,  render: v => <span className="text-[9px] font-black uppercase text-slate-500">{v || '—'}</span> },
  { id: 'propLine',     label: 'Prop / Line',  field: 'prop',              leagues: ['nfl','nba'], default: true,  sortable: false, render: (v, r) => {
    const isOver = (r.overUnder ?? '').toLowerCase() === 'over';
    return <><span className="text-[9px] text-slate-500 font-black uppercase block">{v}</span><span className="font-mono font-black text-[11px] text-cyan-400">{r.line} <span style={{ color: isOver ? '#4ade80' : '#f87171' }}>{(r.overUnder ?? '').charAt(0)}</span></span></>;
  }},
  { id: 'overUnder',    label: 'O/U',          field: 'overUnder',         leagues: ['nfl','nba'], default: false, sortable: true,  render: v => <span className="text-[10px] font-black">{v || '—'}</span> },
  { id: 'line',         label: 'Line',         field: 'line',              leagues: ['nfl','nba'], default: false, sortable: true,  render: v => <span className="font-mono text-[11px]">{v ?? '—'}</span> },
  // Analytics
  { id: 'playerAvg',    label: 'Season Avg',   field: 'playerAvg',         leagues: ['nfl','nba'], default: true,  sortable: true,  render: v => <span className="font-mono text-[11px] text-slate-300">{fmt(v)}</span> },
  { id: 'scoreDiff',    label: 'Avg vs Line',  field: 'scoreDiff',         leagues: ['nfl','nba'], default: true,  sortable: true,  render: v => <ScoreDiff v={v} /> },
  { id: 'seasonHitPct', label: 'Hit %',        field: 'seasonHitPct',      leagues: ['nfl','nba'], default: true,  sortable: true,  render: v => <span className="font-mono font-black text-[11px] text-white">{fmtPct(v)}</span> },
  { id: 'bestEdgePct',  label: 'Edge %',       field: 'bestEdgePct',       leagues: ['nfl','nba'], default: true,  sortable: true,  render: v => <span className="font-mono text-[11px] text-emerald-400">{fmtPct(v, 1)}</span> },
  { id: 'confScore',    label: 'Confidence',   field: 'confidenceScore',   leagues: ['nfl','nba'], default: true,  sortable: true,  render: (v, _, theme?: any) => <span className="font-mono font-black text-[11px]">{fmtPct(v)}</span> },
  { id: 'opponentRank', label: 'Opp Rank',     field: 'opponentRank',      leagues: ['nfl','nba'], default: false, sortable: true,  render: v => <span className="font-mono text-[11px] text-slate-400">{v ?? '—'}</span> },
  { id: 'opponentAvg',  label: 'Opp Avg',      field: 'opponentAvgVsStat', leagues: ['nfl','nba'], default: false, sortable: true,  render: v => <span className="font-mono text-[11px] text-slate-400">{fmt(v)}</span> },
  { id: 'projWinPct',   label: 'Proj Win',     field: 'projWinPct',        leagues: ['nfl','nba'], default: false, sortable: true,  render: v => <span className="font-mono text-[11px]">{fmtPct(v)}</span> },
  { id: 'avgWinProb',   label: 'Avg Win Prob', field: 'avgWinProb',        leagues: ['nfl','nba'], default: false, sortable: true,  render: v => <span className="font-mono text-[11px]">{fmtPct(v)}</span> },
  { id: 'impliedProb',  label: 'Impl Prob',    field: 'impliedProb',       leagues: ['nfl','nba'], default: false, sortable: true,  render: v => <span className="font-mono text-[11px]">{fmtPct(v)}</span> },
  { id: 'expectedValue',label: 'EV',           field: 'expectedValue',     leagues: ['nfl','nba'], default: false, sortable: true,  render: v => <span className="font-mono text-[11px]">{fmt(v, 3)}</span> },
  { id: 'kellyPct',     label: 'Kelly %',      field: 'kellyPct',          leagues: ['nfl','nba'], default: false, sortable: true,  render: v => <span className="font-mono text-[11px]">{fmtPct(v, 1)}</span> },
  // Odds
  { id: 'bestOdds',     label: 'Best Odds',    field: 'bestOdds',          leagues: ['nfl','nba'], default: false, sortable: true,  render: v => <span className="font-mono text-[11px]">{v ?? '—'}</span> },
  { id: 'bestBook',     label: 'Book',         field: 'bestBook',          leagues: ['nfl','nba'], default: false, sortable: true,  render: v => <span className="text-[10px] text-slate-500">{v || '—'}</span> },
  { id: 'fdOdds',       label: 'FD Odds',      field: 'fdOdds',            leagues: ['nfl','nba'], default: false, sortable: true,  render: v => <span className="font-mono text-[11px]">{v ?? '—'}</span> },
  { id: 'dkOdds',       label: 'DK Odds',      field: 'dkOdds',            leagues: ['nfl','nba'], default: false, sortable: true,  render: v => <span className="font-mono text-[11px]">{v ?? '—'}</span> },
  // Post-game
  { id: 'gameStat',     label: 'Actual',       field: 'gameStat',          leagues: ['nfl','nba'], default: true,  sortable: true,  render: v => <span className="font-mono text-[11px] text-slate-300">{v ?? '—'}</span> },
  { id: 'result',       label: 'Result',       field: 'actualResult',      leagues: ['nfl','nba'], default: true,  sortable: true,  render: v => <ResultBadge v={v} /> },
  // NFL-specific
  { id: 'season',       label: 'Season',       field: 'season',            leagues: ['nfl','nba'], default: false, sortable: true,  render: v => <span className="font-mono text-[10px] text-slate-600">{v ?? '—'}</span> },
  { id: 'bdlId',        label: 'BDL ID',       field: 'bdlId',             leagues: ['nba'],       default: false, sortable: false, render: v => <span className="font-mono text-[10px] text-slate-600">{v ?? '—'}</span> },
  { id: 'brid',         label: 'BR ID',        field: 'brid',              leagues: ['nba'],       default: false, sortable: false, render: v => <span className="font-mono text-[10px] text-slate-600">{v ?? '—'}</span> },
];

const SEASONS   = ['2025', '2024'];
const NFL_WEEKS = ['all', ...Array.from({ length: 22 }, (_, i) => String(i + 1))];
const PAGE_SIZE = 50;

// ─── Column picker modal ──────────────────────────────────────────────────────

function ColPicker({
  league, visibleIds, order, onClose,
  onChange,
}: {
  league:     League;
  visibleIds: Set<string>;
  order:      string[];
  onClose:    () => void;
  onChange:   (visible: Set<string>, order: string[]) => void;
}) {
  const available = ALL_COLS.filter(c => c.leagues.includes(league));
  const [localVisible, setLocalVisible] = useState(new Set(visibleIds));
  const [localOrder,   setLocalOrder]   = useState([...order]);
  const dragRef = useRef<string | null>(null);

  const toggle = (id: string) => {
    const s = new Set(localVisible);
    s.has(id) ? s.delete(id) : s.add(id);
    setLocalVisible(s);
  };

  const onDragStart = (id: string) => { dragRef.current = id; };
  const onDrop      = (targetId: string) => {
    if (!dragRef.current || dragRef.current === targetId) return;
    const arr = [...localOrder];
    const fi  = arr.indexOf(dragRef.current);
    const ti  = arr.indexOf(targetId);
    if (fi < 0 || ti < 0) return;
    arr.splice(fi, 1);
    arr.splice(ti, 0, dragRef.current);
    setLocalOrder(arr);
    dragRef.current = null;
  };

  // Ordered list — show ordered cols first, then unordered ones
  const ordered = [
    ...localOrder.filter(id => available.find(c => c.id === id)),
    ...available.filter(c => !localOrder.includes(c.id)).map(c => c.id),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h3 className="text-sm font-black uppercase tracking-widest text-white">Configure Columns</h3>
          <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors"><X size={16} /></button>
        </div>

        <div className="px-5 py-3 max-h-96 overflow-y-auto space-y-1">
          {ordered.map(id => {
            const col = available.find(c => c.id === id);
            if (!col) return null;
            const on = localVisible.has(id);
            return (
              <div
                key={id}
                draggable
                onDragStart={() => onDragStart(id)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => onDrop(id)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-grab active:cursor-grabbing hover:bg-white/5 transition-colors"
              >
                <GripVertical size={13} className="text-slate-700 shrink-0" />
                <button onClick={() => toggle(id)} className="flex items-center gap-2 flex-1 text-left">
                  {on
                    ? <Eye size={13} className="text-emerald-400 shrink-0" />
                    : <EyeOff size={13} className="text-slate-700 shrink-0" />
                  }
                  <span className={`text-[11px] font-black uppercase tracking-widest ${on ? 'text-white' : 'text-slate-600'}`}>
                    {col.label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-white/8">
          <button
            onClick={() => onChange(localVisible, localOrder)}
            className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-white transition-all"
            style={{ backgroundColor: '#16a34a' }}
          >
            Apply
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 bg-white/5 hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HistoricalPropsPage() {
  const [league,     setLeague]     = useState<League>('nfl');
  const [season,     setSeason]     = useState('2025');
  const [week,       setWeek]       = useState('all');
  const [search,     setSearch]     = useState('');
  const [sortKey,    setSortKey]    = useState('confidenceScore');
  const [sortDir,    setSortDir]    = useState<'asc' | 'desc'>('desc');
  const [page,       setPage]       = useState(0);
  const [props,      setProps]      = useState<any[]>([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [enriching,  setEnriching]  = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const theme = THEME[league];

  // Default visible + order per league
  const defaultState = useCallback((l: League) => {
    const cols = ALL_COLS.filter(c => c.leagues.includes(l) && c.default);
    return {
      visible: new Set(cols.map(c => c.id)),
      order:   cols.map(c => c.id),
    };
  }, []);

  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => defaultState('nfl').visible);
  const [colOrder,   setColOrder]   = useState<string[]>(()  => defaultState('nfl').order);

  // Reset columns when league changes
  useEffect(() => {
    const s = defaultState(league);
    setVisibleIds(s.visible);
    setColOrder(s.order);
  }, [league, defaultState]);

  // Active columns in order
  const activeCols = useMemo(() =>
    colOrder
      .filter(id => visibleIds.has(id))
      .map(id => ALL_COLS.find(c => c.id === id))
      .filter(Boolean) as ColDef[],
    [colOrder, visibleIds]
  );

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchProps = useCallback(async (resetPage = false) => {
    setLoading(true);
    const p = resetPage ? 0 : page;
    if (resetPage) setPage(0);

    const params = new URLSearchParams({ league, season, offset: String(p * PAGE_SIZE), limit: String(PAGE_SIZE) });
    if (league === 'nfl' && week !== 'all') params.set('week', week);
    if (search.trim()) params.set('search', search.trim());

    try {
      const res  = await fetch(`/api/all-props?${params}`);
      const data = await res.json();
      setProps(Array.isArray(data) ? data.filter((r: any) => r.player && r.prop) : []);
      setTotal(parseInt(res.headers.get('X-Total-Count') ?? String(Array.isArray(data) ? data.length : 0), 10));
    } catch {
      toast.error('Failed to load props');
    }
    setLoading(false);
  }, [league, season, week, search, page]);

  useEffect(() => { fetchProps(true); }, [league, season, week]);

  // ── Sort ───────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const col = ALL_COLS.find(c => c.id === sortKey);
    if (!col) return props;
    return [...props].sort((a, b) => {
      const av = a[col.field] ?? (typeof a[col.field] === 'number' ? -Infinity : '');
      const bv = b[col.field] ?? (typeof b[col.field] === 'number' ? -Infinity : '');
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      const an = Number(av ?? -Infinity), bn = Number(bv ?? -Infinity);
      return sortDir === 'asc' ? an - bn : bn - an;
    });
  }, [props, sortKey, sortDir]);

  const handleSort = (id: string) => {
    setSortDir(d => id === sortKey ? (d === 'desc' ? 'asc' : 'desc') : 'desc');
    setSortKey(id);
  };

  // ── Enrich ─────────────────────────────────────────────────────────────────
  const handleEnrich = async () => {
    setEnriching(true);
    try {
      const url = league === 'nba'
        ? `/api/nba/enrich?mode=all&season=${season}&force=false`
        : `/api/enrich?season=${season}${week !== 'all' ? `&week=${week}` : ''}&skipEnriched=true`;
      const res  = await fetch(url);
      const data = await res.json();
      toast.success(`Enriched ${data.enriched ?? data.propsEnriched ?? 0} props`);
      fetchProps(true);
    } catch { toast.error('Enrichment failed'); }
    setEnriching(false);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── Sort header ────────────────────────────────────────────────────────────
  const SortTh = ({ col }: { col: ColDef }) => {
    const active = sortKey === col.id;
    if (!col.sortable) return <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-600">{col.label}</th>;
    return (
      <th onClick={() => handleSort(col.id)} className="px-4 py-3 cursor-pointer select-none group">
        <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest transition-colors group-hover:text-white ${active ? '' : 'text-slate-600'}`}
          style={active ? { color: theme.accent } : {}}>
          {col.label}
          {active ? (sortDir === 'desc' ? <ChevronDown size={10} /> : <ChevronUp size={10} />) : <ChevronsUpDown size={10} className="opacity-30 group-hover:opacity-70" />}
        </div>
      </th>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">
            <span style={{ color: theme.accent }}>{theme.icon} {theme.label}</span> <span className="text-white">Historical Props</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mt-0.5">
            {loading ? 'Loading...' : `${total} props · season ${season}${league === 'nfl' && week !== 'all' ? ` · week ${week}` : ''}`}
          </p>
        </div>

        {/* Sport toggle */}
        <div className="flex bg-[#111] border border-white/8 rounded-xl p-1 gap-1 self-start sm:self-auto">
          {(['nfl', 'nba'] as League[]).map(l => {
            const t = THEME[l];
            const active = league === l;
            return (
              <button key={l} onClick={() => { setLeague(l); setPage(0); }}
                className="px-5 py-2 rounded-lg text-xs font-black transition-all"
                style={active ? { backgroundColor: t.accentBg, color: t.accent, border: `1px solid ${t.accentBorder}` } : { color: '#475569', border: '1px solid transparent' }}
              >
                {t.icon} {t.label.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchProps(true)}
            placeholder="Player, team, prop..."
            className="bg-[#111] border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none w-52 placeholder:text-slate-700"
            onFocus={e => e.currentTarget.style.borderColor = theme.accentBorder}
            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
          />
        </div>

        {/* Season */}
        <div className="flex items-center gap-2 bg-[#111] border border-white/8 rounded-xl px-3 py-2.5">
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Season</span>
          <select value={season} onChange={e => { setSeason(e.target.value); setPage(0); }}
            className="bg-transparent text-xs font-bold outline-none cursor-pointer" style={{ color: theme.accent }}>
            {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Week — NFL only */}
        {league === 'nfl' && (
          <div className="flex items-center gap-2 bg-[#111] border border-white/8 rounded-xl px-3 py-2.5">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Week</span>
            <select value={week} onChange={e => { setWeek(e.target.value); setPage(0); }}
              className="bg-transparent text-xs font-bold outline-none cursor-pointer" style={{ color: theme.accent }}>
              {NFL_WEEKS.map(w => <option key={w} value={w}>{w === 'all' ? 'All' : `WK ${w}`}</option>)}
            </select>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Column picker */}
          <button onClick={() => setShowPicker(true)}
            className="flex items-center gap-2 px-3 py-2.5 bg-[#111] border border-white/8 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">
            <Settings2 size={11} /> Columns
          </button>

          <button onClick={() => fetchProps(true)} disabled={loading}
            className="flex items-center gap-2 px-3 py-2.5 bg-[#111] border border-white/8 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all disabled:opacity-50">
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          <button onClick={handleEnrich} disabled={enriching}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            style={{ backgroundColor: theme.accentBg, color: theme.accent, border: `1px solid ${theme.accentBorder}` }}>
            {enriching ? <RefreshCw size={11} className="animate-spin" /> : <Zap size={11} />}
            Enrich
          </button>
        </div>
      </div>

      {/* Enrichment note */}
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-700">
        Enrich fills: season avg · hit % · opp rank · confidence · kelly · EV &nbsp;·&nbsp;
        <span className="text-slate-600">Game results filled by post-game script after games complete</span>
      </p>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#0a0a0a' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                {activeCols.map(col => <SortTh key={col.id} col={col} />)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={activeCols.length} className="px-4 py-20 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-600">
                    <RefreshCw size={13} className="animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Loading props...</span>
                  </div>
                </td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={activeCols.length} className="px-4 py-20 text-center text-[10px] font-black uppercase tracking-widest text-slate-700">
                  No props found{search ? ` matching "${search}"` : ''}
                </td></tr>
              ) : sorted.map((prop, i) => (
                <tr key={prop.id ?? i} className="border-t border-white/4 transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = theme.accentBg)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {activeCols.map(col => (
                    <td key={col.id} className="px-4 py-3.5">
                      {col.render(prop[col.field], prop)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
              Page {page + 1} of {totalPages} · {total} total
            </span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => { setPage(p => Math.max(0, p - 1)); fetchProps(); }}
                disabled={page === 0 || loading}
                className="flex items-center gap-1 px-3 py-2 bg-[#111] border border-white/8 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:text-white disabled:opacity-30 transition-all">
                <ChevronLeft size={11} /> Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i : Math.min(Math.max(page - 3, 0), totalPages - 7) + i;
                return (
                  <button key={p} onClick={() => { setPage(p); fetchProps(); }}
                    className="w-8 h-8 rounded-lg text-[10px] font-black transition-all"
                    style={page === p
                      ? { backgroundColor: theme.accentBg, color: theme.accent, border: `1px solid ${theme.accentBorder}` }
                      : { color: '#475569', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {p + 1}
                  </button>
                );
              })}
              <button onClick={() => { setPage(p => Math.min(totalPages - 1, p + 1)); fetchProps(); }}
                disabled={page >= totalPages - 1 || loading}
                className="flex items-center gap-1 px-3 py-2 bg-[#111] border border-white/8 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:text-white disabled:opacity-30 transition-all">
                Next <ChevronRight size={11} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Column picker modal */}
      {showPicker && (
        <ColPicker
          league={league}
          visibleIds={visibleIds}
          order={colOrder}
          onClose={() => setShowPicker(false)}
          onChange={(v, o) => { setVisibleIds(v); setColOrder(o); setShowPicker(false); }}
        />
      )}
    </div>
  );
}