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
  { id: 'bestEdgePct',  label: 'Edge %',      field: 'bestEdgePct',     leagues: ['nfl','nba'], default: false, sortable: true,
    render: v => <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#4ade80' }}>{fmtPct(v, 1)}</span> },
  { id: 'confScore',    label: 'Confidence',  field: 'confidenceScore', leagues: ['nfl','nba'], default: true,  sortable: true,
    render: (v, _, t) => <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 11, color: t.accent }}>{fmtPct(v)}</span> },
  { id: 'opponentRank', label: 'Opp Rank',    field: 'opponentRank',    leagues: ['nfl','nba'], default: false, sortable: true,
    render: v => <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#8892a4' }}>{v ?? '—'}</span> },
  { id: 'impliedProb',  label: 'Impl Prob',   field: 'impliedProb',     leagues: ['nfl','nba'], default: false, sortable: true,
    render: v => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{fmtPct(v)}</span> },
  { id: 'expectedValue',label: 'EV',          field: 'expectedValue',   leagues: ['nfl','nba'], default: false, sortable: true,
    render: v => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{fmt(v, 3)}</span> },
  { id: 'kellyPct',     label: 'Kelly %',     field: 'kellyPct',        leagues: ['nfl','nba'], default: false, sortable: true,
    render: v => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{fmtPct(v, 1)}</span> },
  { id: 'bestOdds',     label: 'Best Odds',   field: 'bestOdds',        leagues: ['nfl','nba'], default: false, sortable: true,
    render: v => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{v ?? '—'}</span> },
  { id: 'bestBook',     label: 'Book',        field: 'bestBook',        leagues: ['nfl','nba'], default: false, sortable: true,
    render: v => <span style={{ fontSize: 10, color: '#8892a4' }}>{v || '—'}</span> },
  { id: 'gameStat',     label: 'Actual',      field: 'gameStat',        leagues: ['nfl','nba'], default: true,  sortable: true,
    render: v => <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#f0f2f8' }}>{v ?? '—'}</span> },
  { id: 'result',       label: 'Result',      field: 'actualResult',    leagues: ['nfl','nba'], default: true,  sortable: true,
    render: v => <ResultBadge v={v} /> },
  { id: 'season',       label: 'Season',      field: 'season',          leagues: ['nfl','nba'], default: false, sortable: true,
    render: v => <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#3a3f52' }}>{v ?? '—'}</span> },
];

// Ascending so oldest shows first — more natural for historical archives
const SEASONS   = ['2024', '2025'];
const NFL_WEEKS = ['all', ...Array.from({ length: 22 }, (_, i) => String(i + 1))];
const PAGE_SIZE = 50;

// ─── Inline Edit Modal ────────────────────────────────────────────────────────

function EditPropModal({ prop, league, onClose, onSave, onDelete }: {
  prop: any; league: League;
  onClose: () => void;
  onSave:   (updated: any) => Promise<void>;
  onDelete: (id: string)   => Promise<void>;
}) {
  const [data,     setData]     = useState({ ...prop });
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = (k: string, v: any) => setData((p: any) => ({ ...p, [k]: v }));

  const INPUT = {
    width: '100%', background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
    padding: '8px 12px', fontSize: 12, color: '#f0f2f8',
    fontFamily: 'monospace', outline: 'none',
  } as React.CSSProperties;

  const LABEL = {
    fontSize: 9, fontWeight: 900, textTransform: 'uppercase' as const,
    letterSpacing: '0.12em', color: '#3a3f52', display: 'block', marginBottom: 6,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 520, boxShadow: '0 25px 60px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#f0f2f8', margin: 0 }}>Edit Prop</h3>
            <p style={{ fontSize: 9, color: '#3a3f52', fontFamily: 'monospace', margin: '4px 0 0' }}>{prop.id?.slice(-14)}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3a3f52' }}><X size={16} /></button>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={LABEL}>Player</label><input value={data.player ?? ''} onChange={e => set('player', e.target.value)} style={INPUT} /></div>
            <div><label style={LABEL}>Team</label><input value={data.team ?? ''} onChange={e => set('team', e.target.value)} style={INPUT} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div><label style={LABEL}>Prop</label><input value={data.prop ?? ''} onChange={e => set('prop', e.target.value)} style={INPUT} /></div>
            <div><label style={LABEL}>Line</label><input type="number" step="0.5" value={data.line ?? ''} onChange={e => set('line', parseFloat(e.target.value))} style={INPUT} /></div>
            <div><label style={LABEL}>O/U</label>
              <select value={data.overUnder ?? 'Over'} onChange={e => set('overUnder', e.target.value)} style={{ ...INPUT, cursor: 'pointer', backgroundColor: '#0a0a0a' }}>
                <option value="Over">Over</option>
                <option value="Under">Under</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={LABEL}>Matchup</label><input value={data.matchup ?? ''} onChange={e => set('matchup', e.target.value)} style={INPUT} /></div>
            <div><label style={LABEL}>Game Date</label><input type="date" value={data.gameDate?.split('T')[0] ?? ''} onChange={e => set('gameDate', e.target.value)} style={INPUT} /></div>
          </div>
          {league === 'nfl' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={LABEL}>Week</label><input type="number" value={data.week ?? ''} onChange={e => set('week', parseInt(e.target.value))} style={INPUT} /></div>
              <div><label style={LABEL}>Season</label><input type="number" value={data.season ?? ''} onChange={e => set('season', parseInt(e.target.value))} style={INPUT} /></div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div><label style={LABEL}>Actual Stat</label><input type="number" step="0.5" value={data.gameStat ?? ''} onChange={e => set('gameStat', parseFloat(e.target.value))} style={INPUT} /></div>
            <div><label style={LABEL}>Result</label>
              <select value={data.actualResult ?? ''} onChange={e => set('actualResult', e.target.value || null)} style={{ ...INPUT, cursor: 'pointer', backgroundColor: '#0a0a0a' }}>
                <option value="">— Pending —</option>
                <option value="won">Hit ✅</option>
                <option value="lost">Miss ❌</option>
                <option value="push">Push</option>
              </select>
            </div>
            <div><label style={LABEL}>Best Odds</label><input type="number" value={data.bestOdds ?? ''} onChange={e => set('bestOdds', parseInt(e.target.value))} style={INPUT} /></div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, padding: '0 24px 24px' }}>
          <button onClick={async () => { if (!confirm('Delete this prop?')) return; setDeleting(true); try { await onDelete(prop.id); onClose(); } catch (e: any) { toast.error(e.message); } finally { setDeleting(false); } }}
            disabled={deleting}
            style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(248,113,113,0.25)', color: '#f87171', background: 'none', cursor: 'pointer', opacity: deleting ? 0.5 : 1 }}>
            {deleting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
          </button>
          <button onClick={onClose}
            style={{ padding: '10px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', color: '#8892a4', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', fontSize: 11, fontWeight: 900, textTransform: 'uppercase' }}>
            Cancel
          </button>
          <button onClick={async () => { setSaving(true); try { await onSave(data); onClose(); } catch (e: any) { toast.error(e.message); } finally { setSaving(false); } }}
            disabled={saving}
            style={{ flex: 1, padding: '10px 0', borderRadius: 12, background: '#4ade80', color: '#000', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}>
            {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Post-Game Modal ──────────────────────────────────────────────────────────

function PostGameModal({ league, season, theme, onClose, onComplete }: {
  league: League; season: string; theme: ThemeShape;
  onClose: () => void; onComplete: () => void;
}) {
  const [date,    setDate]    = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const toastId = toast.loading(`Grading ${date}…`);
    try {
      const endpoint = league === 'nba' ? '/api/nba/grade' : '/api/grade';
      const res  = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, season: parseInt(season) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      toast.success(`${date}: ${data.gradedPerm ?? data.gradedFromDaily ?? data.graded ?? 0} graded`, { id: toastId });
      onComplete(); onClose();
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: `1px solid ${theme.accentBorder}`, borderRadius: 20, width: '100%', maxWidth: 400, padding: 24, boxShadow: '0 25px 60px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: theme.accent, margin: 0 }}>🏆 Post-Game Grading</h3>
            <p style={{ fontSize: 10, color: '#3a3f52', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '6px 0 0' }}>
              {league.toUpperCase()} · Season {season}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3a3f52' }}><X size={16} /></button>
        </div>

        <p style={{ fontSize: 12, color: '#8892a4', margin: 0 }}>
          Fetches box scores via <strong style={{ color: '#f0f2f8' }}>Basketball Reference</strong> for the selected date,
          grades all pending props, and fills in actual stats and results.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#3a3f52' }}>Game Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#f0f2f8', outline: 'none', fontFamily: 'monospace' }} />
        </div>

        <ul style={{ margin: 0, padding: '0 0 0 4px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {['Fills gameStat + actualResult on prop docs', 'Migrates daily collection → permanent history', 'Updates bettingLog leg statuses'].map(s => (
            <li key={s} style={{ fontSize: 11, color: '#8892a4' }}>✅ {s}</li>
          ))}
        </ul>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', color: '#8892a4', background: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 900, textTransform: 'uppercase' }}>Cancel</button>
          <button onClick={run} disabled={loading}
            style={{ flex: 2, padding: '10px 0', borderRadius: 12, background: theme.accentBg, color: theme.accent, border: `1px solid ${theme.accentBorder}`, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: loading ? 0.7 : 1 }}>
            {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trophy size={13} />}
            {loading ? 'Grading…' : 'Run Post-Game'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Column picker ────────────────────────────────────────────────────────────

function ColPicker({ league, visibleIds, order, onClose, onChange }: {
  league: League; visibleIds: Set<string>; order: string[];
  onClose: () => void; onChange: (v: Set<string>, o: string[]) => void;
}) {
  const available = ALL_COLS.filter(c => c.leagues.includes(league));
  const [localVisible, setLocalVisible] = useState(new Set(visibleIds));
  const [localOrder,   setLocalOrder]   = useState([...order]);
  const dragRef = useRef<string | null>(null);
  const toggle = (id: string) => { const s = new Set(localVisible); s.has(id) ? s.delete(id) : s.add(id); setLocalVisible(s); };
  const ordered = [
    ...localOrder.filter(id => available.find(c => c.id === id)),
    ...available.filter(c => !localOrder.includes(c.id)).map(c => c.id),
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, width: '100%', maxWidth: 360, boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#f0f2f8', margin: 0 }}>Columns</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3a3f52' }}><X size={16} /></button>
        </div>
        <div style={{ padding: '12px 20px', maxHeight: 400, overflowY: 'auto' }}>
          {ordered.map(id => {
            const col = available.find(c => c.id === id); if (!col) return null;
            const on = localVisible.has(id);
            return (
              <div key={id} draggable
                onDragStart={() => { dragRef.current = id; }}
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  if (!dragRef.current || dragRef.current === id) return;
                  const arr = [...localOrder];
                  const fi = arr.indexOf(dragRef.current), ti = arr.indexOf(id);
                  if (fi >= 0 && ti >= 0) { arr.splice(fi, 1); arr.splice(ti, 0, dragRef.current!); }
                  setLocalOrder(arr); dragRef.current = null;
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, cursor: 'grab', marginBottom: 2 }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <GripVertical size={13} style={{ color: '#3a3f52', flexShrink: 0 }} />
                <button onClick={() => toggle(id)} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  {on ? <Eye size={13} style={{ color: '#4ade80', flexShrink: 0 }} /> : <EyeOff size={13} style={{ color: '#3a3f52', flexShrink: 0 }} />}
                  <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: on ? '#f0f2f8' : '#3a3f52' }}>{col.label}</span>
                </button>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={() => onChange(localVisible, localOrder)}
            style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', background: '#4ade80', color: '#000', border: 'none', cursor: 'pointer' }}>Apply</button>
          <button onClick={onClose}
            style={{ padding: '10px 16px', borderRadius: 10, fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: '#8892a4', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Slip button ──────────────────────────────────────────────────────────────

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

// ─── Select ───────────────────────────────────────────────────────────────────

function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '6px 12px' }}>
      <span style={{ fontSize: 9, fontWeight: 900, color: '#3a3f52', textTransform: 'uppercase', letterSpacing: '0.15em', whiteSpace: 'nowrap' }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ background: 'transparent', color: '#f0f2f8', fontSize: 12, fontWeight: 700, outline: 'none', cursor: 'pointer', border: 'none' }}>
        {options.map(o => <option key={o.value} value={o.value} style={{ backgroundColor: '#1a1d27', color: '#f0f2f8' }}>{o.label}</option>)}
      </select>
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
  const [showPicker,  setShowPicker]  = useState(false);
  const [showPostGame,setShowPostGame]= useState(false);
  const [editProp,    setEditProp]    = useState<any | null>(null);

  const theme: ThemeShape = THEME[league];

  const defaultState = useCallback((l: League) => {
    const cols = ALL_COLS.filter(c => c.leagues.includes(l) && c.default);
    return { visible: new Set(cols.map(c => c.id)), order: cols.map(c => c.id) };
  }, []);

  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => defaultState('nfl').visible);
  const [colOrder,   setColOrder]   = useState<string[]>(()  => defaultState('nfl').order);

  useEffect(() => { const s = defaultState(league); setVisibleIds(s.visible); setColOrder(s.order); }, [league, defaultState]);

  const activeCols = useMemo(() =>
    colOrder.filter(id => visibleIds.has(id)).map(id => ALL_COLS.find(c => c.id === id)).filter(Boolean) as ColDef[],
    [colOrder, visibleIds]);

  const fetchProps = useCallback(async (resetPage = false) => {
    setLoading(true);
    const p = resetPage ? 0 : page;
    if (resetPage) setPage(0);
    const today  = new Date().toISOString().split('T')[0];
    const params = new URLSearchParams({ league, season, offset: String(p * PAGE_SIZE), limit: String(PAGE_SIZE), before: today });
    if (league === 'nfl' && week !== 'all') params.set('week', week);
    if (search.trim()) params.set('search', search.trim());
    try {
      const res  = await fetch(`/api/all-props?${params}`);
      const data = await res.json();
      const arr  = Array.isArray(data) ? data.filter((r: any) => r.player && r.prop) : [];
      const seen = new Set<string>();
      const deduped = arr.filter((r: any) => { const k = `${r.player}|${r.prop}|${r.line}|${r.overUnder}|${r.gameDate}`; if (seen.has(k)) return false; seen.add(k); return true; });
      setProps(deduped);
      setTotal(parseInt(res.headers.get('X-Total-Count') ?? String(deduped.length), 10));
    } catch { toast.error('Failed to load props'); }
    setLoading(false);
  }, [league, season, week, search, page]);

  useEffect(() => { fetchProps(true); }, [league, season, week]);

  const sorted = useMemo(() => {
    const col = ALL_COLS.find(c => c.id === sortKey);
    if (!col) return props;
    return [...props].sort((a, b) => {
      const av = a[col.field] ?? '', bv = b[col.field] ?? '';
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      const an = Number(av ?? -Infinity), bn = Number(bv ?? -Infinity);
      return sortDir === 'asc' ? an - bn : bn - an;
    });
  }, [props, sortKey, sortDir]);

  const handleSort = (id: string) => { setSortDir(d => id === sortKey ? (d === 'desc' ? 'asc' : 'desc') : 'desc'); setSortKey(id); };

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

  const handleSaveProp = async (updated: any) => {
    const colName = league === 'nba' ? `nbaProps_${season}` : `allProps_${season}`;
    const res = await fetch(`/api/all-props/${updated.id}?collection=${colName}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    toast.success('Prop updated');
    fetchProps();
  };

  const handleDeleteProp = async (id: string) => {
    const res = await fetch(`/api/all-props/${id}?league=${league}&season=${season}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setProps(prev => prev.filter(p => p.id !== id));
    toast.success('Prop deleted');
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const SortTh = ({ col }: { col: ColDef }) => {
    const active = sortKey === col.id;
    if (!col.sortable) return <th style={{ padding: '10px 14px', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#3a3f52', whiteSpace: 'nowrap', textAlign: 'left' }}>{col.label}</th>;
    return (
      <th onClick={() => handleSort(col.id)} style={{ padding: '10px 14px', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: active ? theme.accent : '#3a3f52', transition: 'color 0.15s' }}>
          {col.label}
          {active ? (sortDir === 'desc' ? <ChevronDown size={10} /> : <ChevronUp size={10} />) : <ChevronsUpDown size={10} style={{ opacity: 0.3 }} />}
        </div>
      </th>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, background: 'var(--surface)', border: `1px solid ${theme.accentBorder}`, borderRadius: 24, padding: '20px 28px', boxShadow: `0 0 0 1px ${theme.accentBorder}, 0 8px 32px rgba(0,0,0,0.3)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, background: theme.accentBg, border: `1px solid ${theme.accentBorder}` }}>{theme.icon}</div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.02em', color: theme.accent, margin: 0 }}>{theme.label} Historical Props</h1>
            <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#3a3f52', margin: '4px 0 0' }}>
              {loading ? 'Loading…' : `${total} props · season ${season}${league === 'nfl' && week !== 'all' ? ` · wk ${week}` : ''}`}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 14, padding: 4, gap: 4 }}>
          {(['nfl', 'nba'] as League[]).map(l => {
            const t = THEME[l]; const active = league === l;
            return (
              <button key={l} onClick={() => { setLeague(l); setPage(0); }}
                style={{ padding: '8px 20px', borderRadius: 10, fontSize: 11, fontWeight: 900, cursor: 'pointer', transition: 'all 0.15s', border: 'none', ...(active ? { background: t.accentBg, color: t.accent, boxShadow: `0 0 0 1px ${t.accentBorder}` } : { background: 'transparent', color: '#3a3f52' }) }}>
                {t.icon} {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <div style={{ position: 'relative' }}>
          <Search size={11} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#3a3f52', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchProps(true)} placeholder="Player, team, prop…"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 14px 8px 34px', fontSize: 12, outline: 'none', width: 220, color: '#f0f2f8', transition: 'border-color 0.15s' }}
            onFocus={e => e.currentTarget.style.borderColor = theme.accentBorder}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
        </div>

        <Select value={season} onChange={v => { setSeason(v); setPage(0); }} label="Season" options={SEASONS.map(s => ({ value: s, label: s }))} />
        {league === 'nfl' && <Select value={week} onChange={v => { setWeek(v); setPage(0); }} label="Week" options={NFL_WEEKS.map(w => ({ value: w, label: w === 'all' ? 'All' : `WK ${w}` }))} />}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Post-game */}
          <button onClick={() => setShowPostGame(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', border: `1px solid ${theme.accentBorder}`, background: theme.accentBg, color: theme.accent }}>
            <Trophy size={11} /> Post-Game
          </button>

          {/* Enrich */}
          <button onClick={handleEnrich} disabled={enriching}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: enriching ? 'not-allowed' : 'pointer', opacity: enriching ? 0.7 : 1, border: '1px solid rgba(34,211,238,0.2)', background: 'rgba(34,211,238,0.08)', color: '#22d3ee' }}>
            {enriching ? <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={11} />} Fill Gaps
          </button>

          <button onClick={() => setShowPicker(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892a4', cursor: 'pointer' }}>
            <Settings2 size={11} /> Columns
          </button>

          <button onClick={() => fetchProps(true)} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8892a4', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}>
            <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {activeCols.map(col => <SortTh key={col.id} col={col} />)}
                <th style={{ padding: '10px 12px', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#3a3f52', textAlign: 'left' }}>Slip</th>
                <th style={{ padding: '10px 12px', width: 72 }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={activeCols.length + 2} style={{ padding: '80px 16px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#3a3f52' }}>
                    <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Loading…</span>
                  </div>
                </td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={activeCols.length + 2} style={{ padding: '80px 16px', textAlign: 'center', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#3a3f52' }}>
                  No props found{search ? ` matching "${search}"` : ''}
                </td></tr>
              ) : sorted.map((prop, i) => {
                // Row with inline hover-reveal actions
                const rowRef = React.createRef<HTMLTableRowElement>();
                return (
                  <tr key={prop.id ?? i}
                    style={{ borderTop: '1px solid var(--border)', transition: 'background 0.1s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = theme.accentBg; const actions = e.currentTarget.querySelector('.row-actions') as HTMLElement; if (actions) actions.style.opacity = '1'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; const actions = e.currentTarget.querySelector('.row-actions') as HTMLElement; if (actions) actions.style.opacity = '0'; }}>
                    {activeCols.map(col => (
                      <td key={col.id} style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                        {col.render(prop[col.field], prop, theme)}
                      </td>
                    ))}
                    <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                      <SlipButton prop={prop} league={league} />
                    </td>
                    <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                      <div className="row-actions" style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: 0, transition: 'opacity 0.15s' }}>
                        <button onClick={() => setEditProp(prop)}
                          title="Edit prop"
                          style={{ padding: 6, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#3a3f52', transition: 'color 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#f0f2f8')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#3a3f52')}>
                          <Edit3 size={12} />
                        </button>
                        <button onClick={() => { if (confirm('Delete this prop?')) handleDeleteProp(prop.id); }}
                          title="Delete prop"
                          style={{ padding: 6, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#3a3f52', transition: 'color 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#3a3f52')}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#3a3f52' }}>Page {page + 1} of {totalPages} · {total} total</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => { setPage(p => Math.max(0, p - 1)); fetchProps(); }} disabled={page === 0 || loading}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#8892a4', cursor: (page === 0 || loading) ? 'not-allowed' : 'pointer', opacity: (page === 0 || loading) ? 0.4 : 1 }}>
                <ChevronLeft size={11} /> Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => { const p = totalPages <= 7 ? i : Math.min(Math.max(page - 3, 0), totalPages - 7) + i; return (
                <button key={p} onClick={() => { setPage(p); fetchProps(); }}
                  style={{ width: 32, height: 32, borderRadius: 10, fontSize: 10, fontWeight: 900, cursor: 'pointer', border: `1px solid ${page === p ? theme.accentBorder : 'var(--border)'}`, background: page === p ? theme.accentBg : 'transparent', color: page === p ? theme.accent : '#3a3f52', transition: 'all 0.15s' }}>
                  {p + 1}
                </button>
              ); })}
              <button onClick={() => { setPage(p => Math.min(totalPages - 1, p + 1)); fetchProps(); }} disabled={page >= totalPages - 1 || loading}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#8892a4', cursor: (page >= totalPages - 1 || loading) ? 'not-allowed' : 'pointer', opacity: (page >= totalPages - 1 || loading) ? 0.4 : 1 }}>
                Next <ChevronRight size={11} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showPicker && <ColPicker league={league} visibleIds={visibleIds} order={colOrder} onClose={() => setShowPicker(false)} onChange={(v, o) => { setVisibleIds(v); setColOrder(o); setShowPicker(false); }} />}
      {editProp && <EditPropModal prop={editProp} league={league} onClose={() => setEditProp(null)} onSave={handleSaveProp} onDelete={handleDeleteProp} />}
      {showPostGame && <PostGameModal league={league} season={season} theme={theme} onClose={() => setShowPostGame(false)} onComplete={() => fetchProps(true)} />}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}