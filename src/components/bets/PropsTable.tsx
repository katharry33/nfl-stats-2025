'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronUp, ChevronDown, ChevronRight, Trash2, Plus,
  Loader2, Settings2, Check, Search, X, ChevronsUpDown, Target
} from 'lucide-react';
import type { NormalizedProp } from '@/hooks/useAllProps';

// ─── Column definitions ───────────────────────────────────────────────────────
interface ColDef { id: string; label: string; default: boolean; }

const ALL_COLUMNS: ColDef[] = [
  { id: 'week',        label: 'Wk/Date',      default: true  },
  { id: 'player',      label: 'Player',       default: true  },
  { id: 'matchup',     label: 'Matchup',      default: true  },
  { id: 'propLine',    label: 'Prop / Line',  default: true  },
  { id: 'playerAvg',   label: 'Player Avg',    default: false },
  { id: 'scoreDiff',   label: 'Score Diff',    default: true  },
  { id: 'oppRank',     label: 'Opp Rank',      default: false },
  { id: 'hitPct',      label: 'Hit %',         default: true  },
  { id: 'edge',        label: 'Edge / EV',     default: true  },
  { id: 'conf',        label: 'Confidence',    default: true  },
  { id: 'odds',        label: 'Odds',          default: false },
  { id: 'gameStat',    label: 'Game Stat',     default: true  }, // Far Right
  { id: 'result',      label: 'Result',        default: true  }, // Far Right
];

const DEFAULT_COLS = new Set(ALL_COLUMNS.filter(c => c.default).map(c => c.id));

type SortKey = 'week' | 'player' | 'matchup' | 'propLine' | 'playerAvg' | 'scoreDiff' |
               'oppRank' | 'hitPct' | 'edge' | 'conf' | 'odds' | 'gameStat' | 'result';
type SortDir = 'asc' | 'desc';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function n(v: any): number { return v == null || isNaN(Number(v)) ? -Infinity : Number(v); }

function fmtNum(v: any, dp = 1): string {
  const x = Number(v);
  return v == null || isNaN(x) ? '—' : x.toFixed(dp);
}
function fmtPct(v: any, dp = 0): string {
  if (v == null) return '—';
  const x = Number(v);
  const pct = x <= 1.5 ? x * 100 : x;
  return pct.toFixed(dp) + '%';
}
function fmtOdds(v: any): string {
  const x = Number(v);
  if (!x || !isFinite(x)) return '—';
  return x > 0 ? `+${x}` : `${x}`;
}

// ─── Sweet Spot Logic ────────────────────────────────────────────────────────
function getSweetSpotData(p: NormalizedProp) {
  const ev = n(p.bestEdgePct ?? p.expectedValue);
  const conf = n(p.confidenceScore);
  const rank = n(p.opponentRank);
  const diff = n(p.scoreDiff);
  const isOver = p.overUnder?.toLowerCase() === 'over';

  // Core stats check
  const hasValue = ev > 0.08; 
  const hasConfidence = conf > 0.60;
  const isEliteMatchup = rank > 22;

  // Score Diff logic: 
  // If Over: We want trail script (Diff < 0) or close (Diff between -3 and 3)
  // If Under: We want lead script (Diff > 4) 
  const volumeCheck = isOver ? (diff <= 3) : (diff >= 4);

  const active = hasValue && hasConfidence && isEliteMatchup && volumeCheck;
  
  const why = [
    hasValue && "High EV (+8%)",
    hasConfidence && "60%+ Conf",
    isEliteMatchup && "Top Tier Matchup",
    volumeCheck && (isOver ? "Trailing/Close Script" : "Lead/Clock Script")
  ].filter(Boolean).join(" • ");

  return { active, why };
}

// ─── Data Extraction ─────────────────────────────────────────────────────────
function getGameStat(p: any): number | null {
  const raw = p.gameStat ?? p.gamestats ?? p['Game Stats'] ?? p.gameStats ?? null;
  return raw != null && !isNaN(Number(raw)) ? Number(raw) : null;
}

function getActualResult(p: any): string | null {
  return p.actualResult ?? p.actualStats ?? p.result ?? null;
}

function getHit(p: any): boolean | null {
  const stat = getGameStat(p);
  const line = p.line ?? p.Line;
  const ou = (p.overUnder ?? '').toString().toLowerCase();
  if (stat === null || line === null || !ou) return null;
  return ou === 'over' ? stat > Number(line) : stat < Number(line);
}

// ─── Components ─────────────────────────────────────────────────────────────
export function PropsTable({ props = [], isLoading, onAddToBetSlip, slipIds = new Set(), onDelete }: any) {
  const [visible, setVisible] = useState<Set<string>>(DEFAULT_COLS);
  const [sortKey, setSortKey] = useState<SortKey>('conf');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleCol = (id: string) =>
    setVisible(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filtered = useMemo(() => {
    let list = props;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p: any) => (p.player ?? '').toLowerCase().includes(q) || (p.team ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [props, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a: any, b: any) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (bv > av ? 1 : -1);
    });
  }, [filtered, sortKey, sortDir]);

  if (isLoading && props.length === 0) return <div className="py-20 text-center text-zinc-600 italic">Loading Guru Data...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#FFD700]/50"
            placeholder="Search players..."
          />
        </div>
        <div className="flex gap-2">
           <ColumnPicker visible={visible} onChange={toggleCol} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-[#0a0c0f]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-black/40 border-b border-white/[0.06]">
              <tr>
                <th className="px-4 py-3 w-8"><input type="checkbox" className="accent-[#FFD700]" /></th>
                {ALL_COLUMNS.filter(c => visible.has(c.id)).map(col => (
                  <th key={col.id} onClick={() => handleSort(col.id as SortKey)} className="px-3 py-3 cursor-pointer group">
                    <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter text-zinc-500 group-hover:text-zinc-300 ${col.id === 'player' ? '' : 'justify-center'}`}>
                      {col.label}
                      {sortKey === col.id ? (sortDir === 'desc' ? <ChevronDown className="h-3 w-3 text-[#FFD700]"/> : <ChevronUp className="h-3 w-3 text-[#FFD700]"/>) : <ChevronsUpDown className="h-3 w-3 opacity-20" />}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((prop, idx) => {
                const id = prop.id || `idx-${idx}`;
                const { active: isSweet, why } = getSweetSpotData(prop);
                const hit = getHit(prop);

                return (
                  <tr key={id} className={`border-t border-white/[0.03] hover:bg-white/[0.02] transition-colors ${isSweet ? 'bg-[#FFD700]/[0.02]' : ''}`}>
                    <td className="px-4 py-4"><input type="checkbox" className="accent-[#FFD700]" /></td>
                    
                    {visible.has('week') && <td className="px-3 py-4 text-xs font-mono text-zinc-500">WK{prop.week}</td>}
                    
                    {visible.has('player') && (
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-xs font-black uppercase italic">{prop.player}</span>
                          {isSweet && (
                            <div title={why} className="cursor-help p-1 bg-[#FFD700]/10 rounded-full border border-[#FFD700]/20">
                              <Target className="h-3 w-3 text-[#FFD700]" />
                            </div>
                          )}
                        </div>
                      </td>
                    )}

                    {visible.has('matchup') && <td className="px-3 py-4 text-xs text-zinc-400">{prop.matchup}</td>}
                    
                    {visible.has('propLine') && (
                      <td className="px-3 py-4 text-center">
                        <p className="text-[10px] text-zinc-500 uppercase">{prop.prop}</p>
                        <p className="text-xs font-bold text-white">{prop.line} <span className={prop.overUnder?.toLowerCase() === 'over' ? 'text-blue-400' : 'text-orange-400'}>{prop.overUnder?.charAt(0)}</span></p>
                      </td>
                    )}

                    {visible.has('playerAvg') && <td className="px-3 py-4 text-center text-xs font-mono">{fmtNum(prop.playerAvg)}</td>}
                    
                    {visible.has('scoreDiff') && (
                      <td className="px-3 py-4 text-center">
                        <span className={`text-xs font-bold ${n(prop.scoreDiff) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {n(prop.scoreDiff) > 0 ? '+' : ''}{fmtNum(prop.scoreDiff)}
                        </span>
                      </td>
                    )}

                    {visible.has('oppRank') && <td className="px-3 py-4 text-center text-xs font-bold text-zinc-300">#{prop.opponentRank}</td>}
                    {visible.has('hitPct') && <td className="px-3 py-4 text-center text-xs font-mono">{fmtPct(prop.seasonHitPct)}</td>}
                    {visible.has('edge') && <td className="px-3 py-4 text-center text-xs font-bold text-emerald-400">+{fmtPct(prop.bestEdgePct, 1)}</td>}
                    {visible.has('conf') && <td className="px-3 py-4 text-center text-xs font-black text-[#FFD700]">{fmtPct(prop.confidenceScore)}</td>}
                    {visible.has('odds') && <td className="px-3 py-4 text-center text-xs text-zinc-500">{fmtOdds(prop.odds)}</td>}

                    {/* MOVED TO FAR RIGHT */}
                    {visible.has('gameStat') && (
                      <td className="px-3 py-4 text-center">
                        <span className={`font-mono text-xs font-bold ${hit === true ? 'text-emerald-400' : hit === false ? 'text-red-400' : 'text-zinc-500'}`}>
                          {fmtNum(getGameStat(prop))}
                        </span>
                      </td>
                    )}

                    {visible.has('result') && (
                      <td className="px-3 py-4 text-center">
                        {hit !== null ? (
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${hit ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-red-400 bg-red-400/10 border-red-400/20'}`}>
                            {hit ? 'HIT' : 'MISS'}
                          </span>
                        ) : <span className="text-zinc-700 text-[9px]">—</span>}
                      </td>
                    )}

                    <td className="px-4 py-4">
                      <button onClick={() => onAddToBetSlip(prop)} className="p-1.5 bg-[#FFD700] rounded-lg text-black hover:scale-110 transition-transform">
                        <Plus className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ColumnPicker({ visible, onChange }: any) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-zinc-400 hover:text-white">
        <Settings2 className="h-4 w-4" /> Columns
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-[#1a1d23] border border-white/10 rounded-2xl p-2 z-50 shadow-2xl">
          {ALL_COLUMNS.map(c => (
            <button key={c.id} onClick={() => onChange(c.id)} className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 rounded-xl transition-colors">
              <span className="text-xs font-medium text-zinc-300">{c.label}</span>
              {visible.has(c.id) && <Check className="h-3 w-3 text-[#FFD700]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}