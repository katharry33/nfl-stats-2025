'use client';

import React, {
  useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import {
  Search, ChevronDown, ChevronUp, ChevronsUpDown,
  RefreshCw, Zap, ChevronLeft, ChevronRight,
  Settings2, GripVertical, Eye, EyeOff, X,
  Edit3, Trash2, Plus, Check, Save, Loader2, Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBetSlip } from '@/context/betslip-context';

// ─── Sport theming ────────────────────────────────────────────────────────────
const THEME = {
  nfl: {
    accent:       '#22c55e',
    accentBg:     'rgba(34,197,94,0.08)',
    accentBorder: 'rgba(34,197,94,0.18)',
    accentDim:    '#15803d',
    label:        'NFL',
    icon:         '🏈',
  },
  nba: {
    accent:       '#f97316',
    accentBg:     'rgba(249,115,22,0.08)',
    accentBorder: 'rgba(249,115,22,0.18)',
    accentDim:    '#c2410c',
    label:        'NBA',
    icon:         '🏀',
  },
} as const;
type League = 'nfl' | 'nba';
type ThemeShape = { accent: string; accentBg: string; accentBorder: string; accentDim: string; label: string; icon: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(raw: any): string {
  if (!raw) return '—';
  const s = typeof raw === 'string' ? raw : String(raw);
  const d = new Date(s.includes('T') ? s : s + 'T12:00:00Z');
  if (isNaN(d.getTime())) return s.split('T')[0] ?? s;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

const fmt    = (v: any, dp = 1) => { if (v == null) return '—'; const x = Number(v); return isNaN(x) ? '—' : x.toFixed(dp); };
const fmtPct = (v: any, dp = 0) => { if (v == null) return '—'; const x = Number(v); if (isNaN(x) || x === 0) return '—'; return (x <= 1.5 ? x * 100 : x).toFixed(dp) + '%'; };

// ─── RE-ADDED SELECT COMPONENT ────────────────────────────────────────────────
function Select({ value, onChange, options, label }: { 
  value: string; 
  onChange: (v: string) => void; 
  options: { value: string; label: string }[]; 
  label: string 
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '6px 12px' }}>
      <span style={{ fontSize: 9, fontWeight: 900, color: '#3a3f52', textTransform: 'uppercase', letterSpacing: '0.15em', whiteSpace: 'nowrap' }}>{label}</span>
      <select 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        style={{ background: 'transparent', color: '#f0f2f8', fontSize: 12, fontWeight: 700, outline: 'none', cursor: 'pointer', border: 'none' }}
      >
        {options.map(o => <option key={o.value} value={o.value} style={{ backgroundColor: '#1a1d27', color: '#f0f2f8' }}>{o.label}</option>)}
      </select>
    </div>
  );
}

function ResultBadge({ v }: { v: any }) {
  if (!v) return <span style={{ color: '#3a3f52', fontSize: 9 }}>—</span>;
  const r = v.toLowerCase();
  const isWin  = r === 'won'  || r === 'hit';
  const isLoss = r === 'lost' || r === 'miss';
  const style: React.CSSProperties = isWin
    ? { background: 'rgba(74,222,128,0.12)',  color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }
    : isLoss
    ? { background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }
    : { background: 'rgba(148,163,184,0.08)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.15)' };
  return (
    <span style={{ ...style, padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {isWin ? 'HIT' : isLoss ? 'MISS' : v}
    </span>
  );
}

function ScoreDiff({ v }: { v: any }) {
  if (v == null) return <span style={{ color: '#3a3f52' }}>—</span>;
  const n = Number(v);
  if (isNaN(n)) return <span style={{ color: '#3a3f52' }}>—</span>;
  const color = n > 0 ? '#4ade80' : n < 0 ? '#f87171' : '#64748b';
  return <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 11, color }}>{n > 0 ? '+' : ''}{n.toFixed(1)}</span>;
}

// ─── Column definitions ───────────────────────────────────────────────────────
interface ColDef {
  id: string; label: string; field: string;
  leagues: League[]; default: boolean; sortable: boolean;
  render: (v: any, row: any, theme: ThemeShape) => React.ReactNode;
}

const ALL_COLS: ColDef[] = [
  { id: 'player',       label: 'Player',      field: 'player',          leagues: ['nfl','nba'], default: true,  sortable: true,
    render: (v, r) => <><p style={{ fontWeight: 900, fontSize: 11, fontStyle: 'italic', textTransform: 'uppercase', color: '#f0f2f8', margin: 0 }}>{v}</p><p style={{ fontSize: 9, color: '#3a3f52', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>{r.team || '—'}</p></> },
  { id: 'week',         label: 'Week',        field: 'week',            leagues: ['nfl'],       default: true,  sortable: true,
    render: (v, _, t) => v ? <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 11, color: t.accent }}>WK {v}</span> : <span style={{ color: '#3a3f52' }}>—</span> },
  { id: 'gameDate',     label: 'Date',        field: 'gameDate',        leagues: ['nfl','nba'], default: true,  sortable: true,
    render: v => <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#8892a4' }}>{formatDate(v)}</span> },
  { id: 'matchup',      label: 'Matchup',     field: 'matchup',         leagues: ['nfl','nba'], default: true,  sortable: true,
    render: v => <span style={{ color: '#8892a4', fontSize: 10 }}>{v || '—'}</span> },
  { id: 'propLine',     label: 'Prop / Line', field: 'prop',            leagues: ['nfl','nba'], default: true,  sortable: false,
    render: (v, r) => {
      const isOver = (r.overUnder ?? '').toLowerCase() === 'over';
      return <>
        <span style={{ fontSize: 9, color: '#8892a4', fontWeight: 900, textTransform: 'uppercase', display: 'block' }}>{v}</span>
        <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 11, color: '#22d3ee' }}>
          {r.line} <span style={{ color: isOver ? '#4ade80' : '#f87171' }}>{(r.overUnder ?? '').charAt(0)}</span>
        </span>
      </>;
    }},
  { id: 'playerAvg',    label: 'Season Avg',  field: 'playerAvg',       leagues: ['nfl','nba'], default: true,  sortable: true,
    render: v => <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#f0f2f8' }}>{fmt(v)}</span> },
  { id: 'scoreDiff',    label: 'vs Line',     field: 'scoreDiff',       leagues: ['nfl','nba'], default: true,  sortable: true,
    render: v => <ScoreDiff v={v} /> },
  { id: 'seasonHitPct', label: 'Hit %',       field: 'seasonHitPct',    leagues: ['nfl','nba'], default: true,  sortable: true,
    render: v => <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 11, color: '#f0f2f8' }}>{fmtPct(v)}</span> },
  { id: 'confScore',    label: 'Confidence',  field: 'confidenceScore', leagues: ['nfl','nba'], default: true,  sortable: true,
    render: (v, _, t) => <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 11, color: t.accent }}>{fmtPct(v)}</span> },
  { id: 'gameStat',     label: 'Actual',      field: 'gameStat',        leagues: ['nfl','nba'], default: true,  sortable: true,
    render: v => <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#f0f2f8' }}>{v ?? '—'}</span> },
  { id: 'result',       label: 'Result',      field: 'actualResult',    leagues: ['nfl','nba'], default: true,  sortable: true,
    render: v => <ResultBadge v={v} /> },
];

const SEASONS   = ['2024', '2025'];
const NFL_WEEKS = ['all', ...Array.from({ length: 22 }, (_, i) => String(i + 1))];
const PAGE_SIZE = 50;

// ─── Inline components (SlipButton, etc) ──────────────────────────────────────
function SlipButton({ prop, league }: { prop: any; league: League }) {
  const { addLeg, selections } = useBetSlip();
  const [ou, setOu] = useState<'Over' | 'Under' | ''>((prop.overUnder as any) || '');
  const id     = `hist-${prop.id}-${ou}`;
  const inSlip = (selections ?? []).some((s: any) => s.id === id);
  const add = () => {
    if (!ou)    { toast.error('Select Over or Under'); return; }
    if (inSlip) { toast.info('Already in slip'); return; }
    addLeg({ id, propId: id, player: prop.player ?? '', prop: prop.prop ?? '', line: Number(prop.line) || 0, selection: ou, odds: Number(prop.bestOdds ?? prop.odds) || -110, matchup: prop.matchup ?? '', team: prop.team ?? '', week: prop.week, season: prop.season, gameDate: prop.gameDate ?? new Date().toISOString(), league, status: 'pending', source: 'historical-props' });
    toast.success(`${prop.player} ${ou} ${prop.line} added`);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 80 }}>
      <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', fontSize: 9 }}>
        {(['Over', 'Under'] as const).map(s => (
          <button key={s} onClick={() => setOu(prev => prev === s ? '' : s)}
            style={{ flex: 1, padding: '3px 0', fontWeight: 900, textTransform: 'uppercase', border: 'none', cursor: 'pointer', transition: 'all 0.15s', ...(ou === s ? { background: s === 'Over' ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)', color: s === 'Over' ? '#4ade80' : '#f87171' } : { background: 'transparent', color: '#3a3f52' }) }}>
            {s[0]}
          </button>
        ))}
      </div>
      <button onClick={add} disabled={!ou || inSlip}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '3px 0', borderRadius: 8, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', cursor: (!ou || inSlip) ? 'not-allowed' : 'pointer', opacity: (!ou || inSlip) ? 0.4 : 1, border: 'none', transition: 'all 0.15s', ...(inSlip ? { background: 'rgba(52,211,153,0.1)', color: '#34d399' } : { background: 'rgba(255,255,255,0.04)', color: '#8892a4' }) }}>
        {inSlip ? <><Check size={9} /> Slip</> : <><Plus size={9} /> Slip</>}
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HistoricalPropsPage() {
  const [league,      setLeague]      = useState<League>('nfl');
  const [season,      setSeason]      = useState('2025');
  const [week,        setWeek]        = useState('all');
  const [search,      setSearch]      = useState('');
  const [sortKey,     setSortKey]     = useState('gameDate');
  const [sortDir,     setSortDir]     = useState<'asc' | 'desc'>('desc');
  const [page,        setPage]        = useState(0);
  const [props,       setProps]       = useState<any[]>([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [enriching,   setEnriching]   = useState(false);
  
  const theme: ThemeShape = THEME[league];

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
      setProps(data);
    } catch { toast.error('Failed to load props'); }
    setLoading(false);
  }, [league, season, week, search, page]);

  useEffect(() => { fetchProps(true); }, [league, season, week]);

  const handleEnrich = async () => {
    setEnriching(true);
    const toastId = toast.loading('Enriching...');
    try {
      const res = await fetch('/api/props', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ league, season: Number(season), week: week === 'all' ? null : Number(week) })
      });
      const data = await res.json();
      toast.success(`Enriched ${data.count || 0} props`, { id: toastId });
      fetchProps(true);
    } catch (err: any) { toast.error(err.message, { id: toastId }); }
    setEnriching(false);
  };

  return (
    <div style={{ padding: '24px 32px', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: theme.accent, margin: 0 }}>
          {theme.icon} {theme.label} Archives
        </h1>
        <button onClick={handleEnrich} disabled={enriching} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 12, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)', color: '#22d3ee', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer' }}>
          {enriching ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Fill Gaps
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#3a3f52' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 16px 10px 40px', fontSize: 13, color: '#f0f2f8' }} />
        </div>
        <Select label="Season" value={season} onChange={setSeason} options={SEASONS.map(s => ({ value: s, label: s }))} />
        {league === 'nfl' && <Select label="Week" value={week} onChange={setWeek} options={NFL_WEEKS.map(w => ({ value: w, label: w === 'all' ? 'All Weeks' : `Week ${w}` }))} />}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '14px 20px', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', color: '#3a3f52' }}>Slip</th>
              {ALL_COLS.filter(c => c.leagues.includes(league)).map(col => (
                <th key={col.id} style={{ padding: '14px 20px', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', color: '#3a3f52' }}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                <td style={{ padding: '14px 20px' }}><SlipButton prop={row} league={league} /></td>
                {ALL_COLS.filter(c => c.leagues.includes(league)).map(col => (
                  <td key={col.id} style={{ padding: '14px 20px' }}>{col.render(row[col.field], row, theme)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}