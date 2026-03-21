'use client';

import React, {
  useState, useEffect, useCallback, useMemo, useRef,
} from 'react';
import {
  Search, ChevronDown, ChevronUp, ChevronsUpDown,
  RefreshCw, Zap, ChevronLeft, ChevronRight,
  Settings2, GripVertical, Eye, EyeOff, X,
  Edit3, Trash2, Plus, Check, Save, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useBetSlip } from '@/context/betslip-context';

// ─── Sport theming ────────────────────────────────────────────────────────────
const THEME = {
  nfl: { accent: '#4ade80', accentBg: 'rgba(74,222,128,0.08)', accentBorder: 'rgba(74,222,128,0.2)', accentDim: '#16a34a', label: 'NFL', icon: '🏈' },
  nba: { accent: '#fb923c', accentBg: 'rgba(251,146,60,0.08)',  accentBorder: 'rgba(251,146,60,0.2)',  accentDim: '#ea580c', label: 'NBA', icon: '🏀' },
} as const;
type League = 'nfl' | 'nba';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(raw: any): string {
  if (!raw) return '—';
  const s = typeof raw === 'string' ? raw : String(raw);
  const d = new Date(s.includes('T') ? s : s + 'T12:00:00Z');
  if (isNaN(d.getTime())) return s.split('T')[0] ?? s;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

const fmt     = (v: any, dp = 1) => { if (v == null) return '—'; const x = Number(v); return isNaN(x) ? '—' : x.toFixed(dp); };
const fmtPct  = (v: any, dp = 0) => { if (v == null) return '—'; const x = Number(v); if (isNaN(x) || x === 0) return '—'; return (x <= 1.5 ? x * 100 : x).toFixed(dp) + '%'; };

function ResultBadge({ v }: { v: any }) {
  if (!v) return <span className="text-slate-700 text-[9px]">—</span>;
  const r = v.toLowerCase();
  const cls = r === 'won' || r === 'hit'   ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/40' :
              r === 'lost' || r === 'miss'  ? 'bg-red-900/40 text-red-400 border border-red-800/40' :
                                              'bg-slate-800 text-slate-400 border border-slate-700';
  return <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${cls}`}>
    {r === 'won' || r === 'hit' ? 'HIT' : r === 'lost' || r === 'miss' ? 'MISS' : v}
  </span>;
}

function ScoreDiff({ v }: { v: any }) {
  if (v == null) return <span className="text-slate-700">—</span>;
  const n = Number(v);
  if (isNaN(n)) return <span className="text-slate-700">—</span>;
  const color = n > 0 ? '#4ade80' : n < 0 ? '#f87171' : '#64748b';
  return <span className="font-mono font-black text-[11px]" style={{ color }}>{n > 0 ? '+' : ''}{n.toFixed(1)}</span>;
}

// ─── Column definitions ───────────────────────────────────────────────────────

interface ColDef {
  id: string; label: string; field: string;
  leagues: League[]; default: boolean; sortable: boolean;
  render: (v: any, row: any, theme: typeof THEME.nfl) => React.ReactNode;
}

const ALL_COLS: ColDef[] = [
  { id: 'player',       label: 'Player',      field: 'player',            leagues: ['nfl','nba'], default: true,  sortable: true,
    render: (v, r) => <><p className="font-black text-[11px] italic uppercase text-white">{v}</p><p className="text-[9px] text-slate-600 font-bold uppercase">{r.team || '—'}</p></> },
  { id: 'week',         label: 'Week',        field: 'week',              leagues: ['nfl'],       default: true,  sortable: true,
    render: (v, _, t) => v ? <span className="font-mono font-black text-[11px]" style={{ color: t.accent }}>WK {v}</span> : <span className="text-slate-700">—</span> },
  { id: 'gameDate',     label: 'Date',        field: 'gameDate',          leagues: ['nfl','nba'], default: true,  sortable: true,
    render: v => <span className="font-mono text-[10px] text-slate-400">{formatDate(v)}</span> },
  { id: 'matchup',      label: 'Matchup',     field: 'matchup',           leagues: ['nfl','nba'], default: true,  sortable: true,
    render: v => <span className="text-slate-400 text-[10px]">{v || '—'}</span> },
  { id: 'propLine',     label: 'Prop / Line', field: 'prop',              leagues: ['nfl','nba'], default: true,  sortable: false,
    render: (v, r) => {
      const isOver = (r.overUnder ?? '').toLowerCase() === 'over';
      return <><span className="text-[9px] text-slate-500 font-black uppercase block">{v}</span>
        <span className="font-mono font-black text-[11px] text-cyan-400">{r.line} <span style={{ color: isOver ? '#4ade80' : '#f87171' }}>{(r.overUnder ?? '').charAt(0)}</span></span></>;
    }},
  { id: 'playerAvg',    label: 'Season Avg',  field: 'playerAvg',         leagues: ['nfl','nba'], default: true,  sortable: true,
    render: v => <span className="font-mono text-[11px] text-slate-300">{fmt(v)}</span> },
  { id: 'scoreDiff',    label: 'vs Line',     field: 'scoreDiff',         leagues: ['nfl','nba'], default: true,  sortable: true,
    render: v => <ScoreDiff v={v} /> },
  { id: 'seasonHitPct', label: 'Hit %',       field: 'seasonHitPct',      leagues: ['nfl','nba'], default: true,  sortable: true,
    render: v => <span className="font-mono font-black text-[11px] text-white">{fmtPct(v)}</span> },
  { id: 'bestEdgePct',  label: 'Edge %',      field: 'bestEdgePct',       leagues: ['nfl','nba'], default: false, sortable: true,
    render: v => <span className="font-mono text-[11px] text-emerald-400">{fmtPct(v, 1)}</span> },
  { id: 'confScore',    label: 'Confidence',  field: 'confidenceScore',   leagues: ['nfl','nba'], default: true,  sortable: true,
    render: (v, _, t) => <span className="font-mono font-black text-[11px]" style={{ color: t.accent }}>{fmtPct(v)}</span> },
  { id: 'opponentRank', label: 'Opp Rank',    field: 'opponentRank',      leagues: ['nfl','nba'], default: false, sortable: true,
    render: v => <span className="font-mono text-[11px] text-slate-400">{v ?? '—'}</span> },
  { id: 'impliedProb',  label: 'Impl Prob',   field: 'impliedProb',       leagues: ['nfl','nba'], default: false, sortable: true,
    render: v => <span className="font-mono text-[11px]">{fmtPct(v)}</span> },
  { id: 'expectedValue',label: 'EV',          field: 'expectedValue',     leagues: ['nfl','nba'], default: false, sortable: true,
    render: v => <span className="font-mono text-[11px]">{fmt(v, 3)}</span> },
  { id: 'kellyPct',     label: 'Kelly %',     field: 'kellyPct',          leagues: ['nfl','nba'], default: false, sortable: true,
    render: v => <span className="font-mono text-[11px]">{fmtPct(v, 1)}</span> },
  { id: 'bestOdds',     label: 'Best Odds',   field: 'bestOdds',          leagues: ['nfl','nba'], default: false, sortable: true,
    render: v => <span className="font-mono text-[11px]">{v ?? '—'}</span> },
  { id: 'bestBook',     label: 'Book',        field: 'bestBook',          leagues: ['nfl','nba'], default: false, sortable: true,
    render: v => <span className="text-[10px] text-slate-500">{v || '—'}</span> },
  { id: 'gameStat',     label: 'Actual',      field: 'gameStat',          leagues: ['nfl','nba'], default: true,  sortable: true,
    render: v => <span className="font-mono text-[11px] text-slate-300">{v ?? '—'}</span> },
  { id: 'result',       label: 'Result',      field: 'actualResult',      leagues: ['nfl','nba'], default: true,  sortable: true,
    render: v => <ResultBadge v={v} /> },
  { id: 'season',       label: 'Season',      field: 'season',            leagues: ['nfl','nba'], default: false, sortable: true,
    render: v => <span className="font-mono text-[10px] text-slate-600">{v ?? '—'}</span> },
];

const SEASONS   = ['2025', '2024'];
const NFL_WEEKS = ['all', ...Array.from({ length: 22 }, (_, i) => String(i + 1))];
const PAGE_SIZE = 50;

// ─── Select component (readable on dark) ─────────────────────────────────────

function Select({ value, onChange, options, label, accent }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string; accent: string;
}) {
  return (
    <div className="flex items-center gap-2 bg-[#111] border border-white/8 rounded-xl px-3 py-2">
      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest shrink-0">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-transparent text-xs font-bold outline-none cursor-pointer text-white"
        style={{ color: 'white' }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value} style={{ backgroundColor: '#0f0f0f', color: 'white' }}>
            {o.label}
          </option>
        ))}
      </select>
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

  const toggle  = (id: string) => { const s = new Set(localVisible); s.has(id) ? s.delete(id) : s.add(id); setLocalVisible(s); };
  const ordered = [
    ...localOrder.filter(id => available.find(c => c.id === id)),
    ...available.filter(c => !localOrder.includes(c.id)).map(c => c.id),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h3 className="text-sm font-black uppercase tracking-widest text-white">Configure Columns</h3>
          <button onClick={onClose} className="text-slate-600 hover:text-white"><X size={16} /></button>
        </div>
        <div className="px-5 py-3 max-h-96 overflow-y-auto space-y-1">
          {ordered.map(id => {
            const col = available.find(c => c.id === id);
            if (!col) return null;
            const on = localVisible.has(id);
            return (
              <div key={id} draggable
                onDragStart={() => { dragRef.current = id; }}
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  if (!dragRef.current || dragRef.current === id) return;
                  const arr = [...localOrder];
                  const fi = arr.indexOf(dragRef.current), ti = arr.indexOf(id);
                  if (fi < 0 || ti < 0) return;
                  arr.splice(fi, 1); arr.splice(ti, 0, dragRef.current);
                  setLocalOrder(arr); dragRef.current = null;
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-grab hover:bg-white/5 transition-colors"
              >
                <GripVertical size={13} className="text-slate-700 shrink-0" />
                <button onClick={() => toggle(id)} className="flex items-center gap-2 flex-1 text-left">
                  {on ? <Eye size={13} className="text-emerald-400 shrink-0" /> : <EyeOff size={13} className="text-slate-700 shrink-0" />}
                  <span className={`text-[11px] font-black uppercase tracking-widest ${on ? 'text-white' : 'text-slate-600'}`}>{col.label}</span>
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-white/8">
          <button onClick={() => onChange(localVisible, localOrder)}
            className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-black"
            style={{ backgroundColor: '#4ade80' }}>Apply</button>
          <button onClick={onClose}
            className="px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 bg-white/5">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Inline edit row modal ────────────────────────────────────────────────────

function EditPropModal({ prop, league, onClose, onSave, onDelete }: {
  prop: any; league: League;
  onClose: () => void;
  onSave:   (updated: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [data,    setData]    = useState({ ...prop });
  const [saving,  setSaving]  = useState(false);
  const [deleting,setDeleting]= useState(false);

  const set = (k: string, v: any) => setData((p: any) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(data); onClose(); }
    catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this prop?')) return;
    setDeleting(true);
    try { await onDelete(prop.id); onClose(); }
    catch (e: any) { toast.error(e.message); }
    finally { setDeleting(false); }
  };

  const INPUT = 'w-full bg-black/40 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white font-mono outline-none focus:border-white/20 transition-all';
  const LABEL = 'text-[9px] font-black uppercase tracking-widest text-slate-600 block mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Edit Prop</h3>
            <p className="text-[9px] text-slate-600 font-mono mt-0.5">{prop.id?.slice(-12)}</p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-white"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={LABEL}>Player</label>
              <input value={data.player ?? ''} onChange={e => set('player', e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Team</label>
              <input value={data.team ?? ''} onChange={e => set('team', e.target.value)} className={INPUT} /></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><label className={LABEL}>Prop</label>
              <input value={data.prop ?? ''} onChange={e => set('prop', e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Line</label>
              <input type="number" step="0.5" value={data.line ?? ''} onChange={e => set('line', parseFloat(e.target.value))} className={INPUT} /></div>
            <div><label className={LABEL}>Over/Under</label>
              <select value={data.overUnder ?? 'Over'} onChange={e => set('overUnder', e.target.value)}
                className={INPUT} style={{ backgroundColor: '#0a0a0a' }}>
                <option value="Over">Over</option>
                <option value="Under">Under</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className={LABEL}>Matchup</label>
              <input value={data.matchup ?? ''} onChange={e => set('matchup', e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Game Date</label>
              <input type="date" value={data.gameDate?.split('T')[0] ?? ''} onChange={e => set('gameDate', e.target.value)} className={INPUT} /></div>
          </div>

          {league === 'nfl' && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className={LABEL}>Week</label>
                <input type="number" value={data.week ?? ''} onChange={e => set('week', parseInt(e.target.value))} className={INPUT} /></div>
              <div><label className={LABEL}>Season</label>
                <input type="number" value={data.season ?? ''} onChange={e => set('season', parseInt(e.target.value))} className={INPUT} /></div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div><label className={LABEL}>Game Stat</label>
              <input type="number" step="0.5" value={data.gameStat ?? ''} onChange={e => set('gameStat', parseFloat(e.target.value))} className={INPUT} /></div>
            <div><label className={LABEL}>Result</label>
              <select value={data.actualResult ?? ''} onChange={e => set('actualResult', e.target.value || null)}
                className={INPUT} style={{ backgroundColor: '#0a0a0a' }}>
                <option value="">—</option>
                <option value="won">Hit</option>
                <option value="lost">Miss</option>
                <option value="push">Push</option>
              </select>
            </div>
            <div><label className={LABEL}>Best Odds</label>
              <input type="number" value={data.bestOdds ?? ''} onChange={e => set('bestOdds', parseInt(e.target.value))} className={INPUT} /></div>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={handleDelete} disabled={deleting}
            className="p-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50">
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
          <button onClick={onClose} className="px-4 py-3 rounded-xl text-[11px] font-black uppercase text-slate-500 bg-white/5 hover:bg-white/8 transition-all">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase text-black flex items-center justify-center gap-2 transition-all"
            style={{ backgroundColor: '#4ade80' }}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Manual prop create modal ─────────────────────────────────────────────────

function ManualPropModal({ league, season, onClose, onSaved }: {
  league: League; season: string;
  onClose: () => void; onSaved: () => void;
}) {
  const { addLeg } = useBetSlip();
  const [data,   setData]   = useState<any>({ league, season: parseInt(season), overUnder: 'Over', odds: -110 });
  const [saving, setSaving] = useState(false);
  const [addToSlip, setAddToSlip] = useState(false);

  const set = (k: string, v: any) => setData((p: any) => ({ ...p, [k]: v }));

  const INPUT = 'w-full bg-black/40 border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white font-mono outline-none focus:border-white/20 transition-all';
  const LABEL = 'text-[9px] font-black uppercase tracking-widest text-slate-600 block mb-1.5';

  const handleSave = async () => {
    if (!data.player || !data.prop) { toast.error('Player and prop are required'); return; }
    setSaving(true);
    try {
      const colName = league === 'nba' ? `nbaProps_${season}` : `allProps_${season}`;
      const res = await fetch('/api/all-props/save-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, collection: colName }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      if (addToSlip) {
        const propId = `${data.player}-${data.prop}-${data.line}-manual`.replace(/\s+/g, '-').toLowerCase();
        addLeg({
          id: propId, propId,
          player:   data.player ?? '',
          prop:     data.prop ?? '',
          line:     Number(data.line) || 0,
          selection: data.overUnder as 'Over' | 'Under',
          odds:     Number(data.odds) || -110,
          matchup:  data.matchup ?? '',
          team:     data.team ?? '',
          week:     data.week,
          season:   data.season,
          gameDate: data.gameDate ?? new Date().toISOString(),
          league,
          status:   'pending',
          source:   'manual',
        });
        toast.success('Prop saved and added to slip');
      } else {
        toast.success('Prop saved to collection');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h3 className="text-sm font-black uppercase tracking-widest text-white">Create Prop</h3>
          <button onClick={onClose} className="text-slate-600 hover:text-white"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={LABEL}>Player *</label>
              <input value={data.player ?? ''} onChange={e => set('player', e.target.value)} placeholder="LeBron James" className={INPUT} /></div>
            <div><label className={LABEL}>Team</label>
              <input value={data.team ?? ''} onChange={e => set('team', e.target.value)} placeholder="LAL" className={INPUT} /></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><label className={LABEL}>Prop *</label>
              <input value={data.prop ?? ''} onChange={e => set('prop', e.target.value)} placeholder="points" className={INPUT} /></div>
            <div><label className={LABEL}>Line</label>
              <input type="number" step="0.5" value={data.line ?? ''} onChange={e => set('line', parseFloat(e.target.value))} placeholder="24.5" className={INPUT} /></div>
            <div><label className={LABEL}>O/U</label>
              <select value={data.overUnder} onChange={e => set('overUnder', e.target.value)} className={INPUT} style={{ backgroundColor: '#0a0a0a' }}>
                <option value="Over">Over</option>
                <option value="Under">Under</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className={LABEL}>Matchup</label>
              <input value={data.matchup ?? ''} onChange={e => set('matchup', e.target.value)} placeholder="LAL @ GSW" className={INPUT} /></div>
            <div><label className={LABEL}>Game Date</label>
              <input type="date" value={data.gameDate ?? ''} onChange={e => set('gameDate', e.target.value)} className={INPUT} /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className={LABEL}>Odds</label>
              <input type="number" value={data.odds ?? ''} onChange={e => set('odds', parseInt(e.target.value))} placeholder="-110" className={INPUT} /></div>
            {league === 'nfl' && (
              <div><label className={LABEL}>Week</label>
                <input type="number" min={1} max={22} value={data.week ?? ''} onChange={e => set('week', parseInt(e.target.value))} className={INPUT} /></div>
            )}
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={addToSlip} onChange={e => setAddToSlip(e.target.checked)}
              className="w-4 h-4 rounded" />
            <span className="text-xs text-slate-400">Also add to bet slip</span>
          </label>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-3 rounded-xl text-[11px] font-black uppercase text-slate-500 bg-white/5">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase text-black flex items-center justify-center gap-2"
            style={{ backgroundColor: '#4ade80' }}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save Prop
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add to slip cell ─────────────────────────────────────────────────────────

function SlipButton({ prop, league }: { prop: any; league: League }) {
  const { addLeg, selections } = useBetSlip();
  const [ou, setOu] = useState<'Over' | 'Under' | ''>((prop.overUnder as any) || '');

  const id  = `hist-${prop.id}-${ou}`;
  const inSlip = (selections ?? []).some((s: any) => s.id === id);

  const add = () => {
    if (!ou) { toast.error('Select Over or Under'); return; }
    if (inSlip) { toast.info('Already in slip'); return; }
    addLeg({
      id, propId: id,
      player:   prop.player ?? '',
      prop:     prop.prop ?? '',
      line:     Number(prop.line) || 0,
      selection: ou,
      odds:     Number(prop.bestOdds ?? prop.odds) || -110,
      matchup:  prop.matchup ?? '',
      team:     prop.team ?? '',
      week:     prop.week,
      season:   prop.season,
      gameDate: prop.gameDate ?? new Date().toISOString(),
      league,
      status:   'pending',
      source:   'historical-props',
    });
    toast.success(`${prop.player} ${ou} ${prop.line} added`);
  };

  return (
    <div className="flex flex-col gap-1 min-w-[90px]">
      <div className="flex rounded-lg overflow-hidden border border-white/8 text-[9px]">
        {(['Over', 'Under'] as const).map(s => (
          <button key={s} onClick={() => setOu(prev => prev === s ? '' : s)}
            className="flex-1 py-1 font-black uppercase transition-all"
            style={ou === s
              ? { backgroundColor: s === 'Over' ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)', color: s === 'Over' ? '#4ade80' : '#f87171' }
              : { color: '#475569' }}>
            {s[0]}
          </button>
        ))}
      </div>
      <button onClick={add} disabled={!ou || inSlip}
        className="flex items-center justify-center gap-1 py-1 rounded-lg text-[9px] font-black uppercase transition-all disabled:opacity-40"
        style={inSlip
          ? { backgroundColor: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }
          : { backgroundColor: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
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
  const [showPicker,  setShowPicker]  = useState(false);
  const [editProp,    setEditProp]    = useState<any | null>(null);
  const [showManual,  setShowManual]  = useState(false);

  const theme = THEME[league];

  const defaultState = useCallback((l: League) => {
    const cols = ALL_COLS.filter(c => c.leagues.includes(l) && c.default);
    return { visible: new Set(cols.map(c => c.id)), order: cols.map(c => c.id) };
  }, []);

  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => defaultState('nfl').visible);
  const [colOrder,   setColOrder]   = useState<string[]>(() => defaultState('nfl').order);

  useEffect(() => {
    const s = defaultState(league);
    setVisibleIds(s.visible); setColOrder(s.order);
  }, [league, defaultState]);

  const activeCols = useMemo(() =>
    colOrder.filter(id => visibleIds.has(id)).map(id => ALL_COLS.find(c => c.id === id)).filter(Boolean) as ColDef[],
    [colOrder, visibleIds]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchProps = useCallback(async (resetPage = false) => {
    setLoading(true);
    const p = resetPage ? 0 : page;
    if (resetPage) setPage(0);

    const today = new Date().toISOString().split('T')[0];
    const params = new URLSearchParams({
      league, season,
      offset: String(p * PAGE_SIZE),
      limit:  String(PAGE_SIZE),
      before: today, // never show future games
    });
    if (league === 'nfl' && week !== 'all') params.set('week', week);
    if (search.trim()) params.set('search', search.trim());

    try {
      const res  = await fetch(`/api/all-props?${params}`);
      const data = await res.json();
      const arr  = Array.isArray(data) ? data.filter((r: any) => r.player && r.prop) : [];

      // Client-side dedup by player+prop+line+ou+date
      const seen = new Set<string>();
      const deduped = arr.filter((r: any) => {
        const k = `${r.player}|${r.prop}|${r.line}|${r.overUnder}|${r.gameDate}`;
        if (seen.has(k)) return false;
        seen.add(k); return true;
      });

      setProps(deduped);
      setTotal(parseInt(res.headers.get('X-Total-Count') ?? String(deduped.length), 10));
    } catch { toast.error('Failed to load props'); }
    setLoading(false);
  }, [league, season, week, search, page]);

  useEffect(() => { fetchProps(true); }, [league, season, week]);

  // ── Sort ───────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    const col = ALL_COLS.find(c => c.id === sortKey);
    if (!col) return props;
    return [...props].sort((a, b) => {
      const av = a[col.field] ?? '';
      const bv = b[col.field] ?? '';
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

  // ── Edit / delete handlers ──────────────────────────────────────────────────
  const handleSaveProp = async (updated: any) => {
    const colName = league === 'nba' ? `nbaProps_${season}` : `allProps_${season}`;
    const res = await fetch(`/api/all-props/${updated.id}?collection=${colName}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
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
            <span style={{ color: theme.accent }}>{theme.icon} {theme.label}</span>{' '}
            <span className="text-white">Historical Props</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mt-0.5">
            {loading ? 'Loading...' : `${total} props · season ${season}${league === 'nfl' && week !== 'all' ? ` · wk ${week}` : ''}`}
          </p>
        </div>

        <div className="flex bg-[#111] border border-white/8 rounded-xl p-1 gap-1 self-start sm:self-auto">
          {(['nfl', 'nba'] as League[]).map(l => {
            const t = THEME[l]; const active = league === l;
            return (
              <button key={l} onClick={() => { setLeague(l); setPage(0); }}
                className="px-5 py-2 rounded-lg text-xs font-black transition-all"
                style={active ? { backgroundColor: t.accentBg, color: t.accent, border: `1px solid ${t.accentBorder}` } : { color: '#475569', border: '1px solid transparent' }}>
                {t.icon} {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchProps(true)}
            placeholder="Player, team, prop..."
            className="bg-[#111] border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none w-52 placeholder:text-slate-700 text-white"
            onFocus={e => e.currentTarget.style.borderColor = theme.accentBorder}
            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'} />
        </div>

        <Select value={season} onChange={v => { setSeason(v); setPage(0); }} label="Season"
          accent={theme.accent} options={SEASONS.map(s => ({ value: s, label: s }))} />

        {league === 'nfl' && (
          <Select value={week} onChange={v => { setWeek(v); setPage(0); }} label="Week"
            accent={theme.accent} options={NFL_WEEKS.map(w => ({ value: w, label: w === 'all' ? 'All' : `WK ${w}` }))} />
        )}

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setShowManual(true)}
            className="flex items-center gap-2 px-3 py-2.5 bg-[#111] border border-white/8 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">
            <Plus size={11} /> Create
          </button>

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

      <p className="text-[9px] font-black uppercase tracking-widest text-slate-700">
        Enrich: season avg · hit % · opp rank · confidence · kelly · EV
        <span className="text-slate-800"> · game results filled by post-game after games complete</span>
      </p>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#0a0a0a' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                {activeCols.map(col => <SortTh key={col.id} col={col} />)}
                {/* Fixed action columns */}
                <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-slate-600">Slip</th>
                <th className="px-3 py-3 w-14" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={activeCols.length + 2} className="px-4 py-20 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-600">
                    <RefreshCw size={13} className="animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Loading props...</span>
                  </div>
                </td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={activeCols.length + 2} className="px-4 py-20 text-center text-[10px] font-black uppercase tracking-widest text-slate-700">
                  No props found{search ? ` matching "${search}"` : ''}
                </td></tr>
              ) : sorted.map((prop, i) => (
                <tr key={prop.id ?? i} className="border-t border-white/4 transition-colors group"
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = theme.accentBg)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  {activeCols.map(col => (
                    <td key={col.id} className="px-4 py-3.5">
                      {col.render(prop[col.field], prop, theme)}
                    </td>
                  ))}
                  {/* Add to slip */}
                  <td className="px-3 py-3.5">
                    <SlipButton prop={prop} league={league} />
                  </td>
                  {/* Edit/delete */}
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditProp(prop)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-white hover:bg-white/8 transition-all">
                        <Edit3 size={11} />
                      </button>
                      <button onClick={() => handleDeleteProp(prop.id)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
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
                className="flex items-center gap-1 px-3 py-2 bg-[#111] border border-white/8 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:text-white disabled:opacity-30">
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
                className="flex items-center gap-1 px-3 py-2 bg-[#111] border border-white/8 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:text-white disabled:opacity-30">
                Next <ChevronRight size={11} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showPicker && (
        <ColPicker league={league} visibleIds={visibleIds} order={colOrder}
          onClose={() => setShowPicker(false)}
          onChange={(v, o) => { setVisibleIds(v); setColOrder(o); setShowPicker(false); }} />
      )}

      {editProp && (
        <EditPropModal prop={editProp} league={league}
          onClose={() => setEditProp(null)}
          onSave={handleSaveProp}
          onDelete={handleDeleteProp} />
      )}

      {showManual && (
        <ManualPropModal league={league} season={season}
          onClose={() => setShowManual(false)}
          onSaved={() => fetchProps(true)} />
      )}
    </div>
  );
}