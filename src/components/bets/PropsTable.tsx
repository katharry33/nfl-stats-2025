'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  ChevronUp, ChevronDown, Trash2, Plus, PlusCircle, Check,
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
  { id: 'pace',        label: 'Pace',        default: true  },
  { id: 'defRating',   label: 'Def Rtg',     default: true  },
  { id: 'odds',        label: 'Odds',        default: false },
];

const STORAGE_KEY = 'sweetspot_col_order_v3';
const DEFAULT_COL_ORDER = ALL_COLUMNS.filter(c => c.default).map(c => c.id);

// ─── Helpers & Accessors ──────────────────────────────────────────────────────
function n(v: any): number { return v == null || isNaN(Number(v)) ? -Infinity : Number(v); }
function fmtNum(v: any, dp = 1): string {
  const x = Number(v);
  return v == null || isNaN(x) ? '—' : x.toFixed(dp);
}
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

function getGameStat(prop: any): number | null {
  const raw = prop.gameStat ?? prop.gamestats ?? prop.gameStats ?? null;
  const x = Number(raw);
  return isNaN(x) || raw === null ? null : x;
}
function getHit(prop: any): boolean | null {
  const stat = getGameStat(prop);
  const line = prop.line;
  const ou = (prop.overUnder || '').toLowerCase();
  if (stat == null || line == null || !ou) return null;
  return ou === 'over' ? stat > line : ou === 'under' ? stat < line : null;
}
function getScoreDiff(prop: any): number | null {
  if (prop.playerAvg != null && prop.line != null) return Math.round((prop.playerAvg - prop.line) * 10) / 10;
  return prop.scoreDiff ?? null;
}

// ─── Color Classes ────────────────────────────────────────────────────────────
const scoreDiffCls = (d: number | null) => d && d > 0 ? 'text-[#22d3ee]' : 'text-red-400';
const oppRankCls = (r: number | null) => r && r <= 10 ? 'text-[#22d3ee]' : 'text-zinc-500';
const hitPctCls = (v: number | null) => v && v > 0.6 ? 'text-[#22d3ee]' : 'text-zinc-400';
const evCls = (v: number | null) => v && v > 0 ? 'text-emerald-400' : 'text-zinc-500';
const confCls = (v: number | null) => v && v > 0.7 ? 'text-[#22d3ee]' : 'text-zinc-400';

// ─── Main Component ───────────────────────────────────────────────────────────
export function PropsTable({
  props = [], league, isLoading, onAddToBetSlip, slipIds = new Set(), onDelete,
  showSweetSpots, sweetSpotCriteria,
}: any) {
  const [colOrder, setColOrder] = useState<string[]>(DEFAULT_COL_ORDER);
  const [sortKey, setSortKey] = useState<any>('conf');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const safeProps = Array.isArray(props) ? props : [];

  const handleSort = (key: any) => {
    if (key === sortKey) setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filtered = useMemo(() => {
    return safeProps.filter(p => 
      (p.player || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.team || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [safeProps, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (bv > av ? 1 : -1);
    });
  }, [filtered, sortKey, sortDir]);

  if (isLoading && safeProps.length === 0) {
    return <div className="p-20 text-center animate-pulse text-zinc-500 font-black italic">LOADING PROPS...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-black/20 p-2 rounded-2xl border border-white/5">
        <Search className="h-4 w-4 text-zinc-600 ml-2" />
        <input 
          value={search} 
          onChange={e => setSearch(e.target.value)}
          placeholder="Search player, team..." 
          className="bg-transparent outline-none text-xs font-mono text-white w-full"
        />
      </div>

      <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-[#0f1115]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-black/40 border-b border-white/[0.06]">
              <tr>
                <th className="px-3 py-3 w-4" />
                {colOrder.map(id => {
                  const label = ALL_COLUMNS.find(c => c.id === id)?.label || id;
                  if ((id === 'pace' || id === 'defRating') && league !== 'nba') return null;
                  return (
                    <th key={id} onClick={() => handleSort(id)} className="px-3 py-3 text-left cursor-pointer group">
                      <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400">
                        {label} {sortKey === id && (sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
                      </div>
                    </th>
                  );
                })}
                <th className="px-3 py-3 text-right" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((prop, idx) => {
                const id = String(prop.id || idx);
                const isExpanded = expandedId === id;
                const inSlip = slipIds.has(id);
                const gameStat = getGameStat(prop);
                const hit = getHit(prop);
                const scoreDiffVal = getScoreDiff(prop);

                return (
                  <React.Fragment key={id}>
                    <tr 
                      onClick={() => setExpandedId(isExpanded ? null : id)}
                      className={`border-t border-white/[0.04] cursor-pointer transition-colors hover:bg-white/[0.02] ${isExpanded ? 'bg-white/[0.03]' : ''}`}
                    >
                      <td className="px-3 py-4 text-zinc-700"><ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90 text-[#22d3ee]' : ''}`} /></td>
                      
                      {colOrder.map(colId => {
                        const isNBA = prop.league === 'nba';
                        switch (colId) {
                          case 'week': return <td key={colId} className="px-3 py-4 text-zinc-500 text-xs font-mono uppercase">{prop.week ? `WK${prop.week}` : '—'}</td>;
                          case 'player': return (
                            <td key={colId} className="px-3 py-4">
                              <div className="flex flex-col"><span className="text-zinc-100 text-xs font-bold leading-none">{prop.player}</span><span className="text-zinc-600 text-[9px] font-black uppercase mt-1">{prop.team}</span></div>
                            </td>
                          );
                          case 'matchup': return <td key={colId} className="px-3 py-4 text-zinc-500 text-[10px] font-mono uppercase">{prop.matchup}</td>;
                          case 'propLine': return (
                            <td key={colId} className="px-3 py-4">
                              <div className="flex flex-col text-center"><span className="text-zinc-500 text-[9px] font-black uppercase">{prop.prop}</span><span className="text-[#22d3ee] text-xs font-mono font-bold">{prop.overUnder} {prop.line}</span></div>
                            </td>
                          );
                          case 'gameStat': return <td key={colId} className="px-3 py-4 text-center text-zinc-300 text-xs font-mono font-bold">{gameStat ?? '—'}</td>;
                          case 'result': return (
                            <td key={colId} className="px-3 py-4 text-center">
                              {hit !== null ? <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${hit ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{hit ? 'WON' : 'LOST'}</span> : <span className="text-zinc-700 text-[9px] font-black italic">PENDING</span>}
                            </td>
                          );
                          case 'scoreDiff': return <td key={colId} className={`px-3 py-4 text-center text-xs font-mono font-bold ${scoreDiffCls(scoreDiffVal)}`}>{scoreDiffVal ? (scoreDiffVal > 0 ? `+${scoreDiffVal}` : scoreDiffVal) : '—'}</td>;
                          case 'hitPct': return <td key={colId} className={`px-3 py-4 text-center text-xs font-mono font-bold ${hitPctCls(prop.seasonHitPct)}`}>{fmtPct(prop.seasonHitPct)}</td>;
                          case 'conf': return <td key={colId} className={`px-3 py-4 text-center text-xs font-mono font-bold ${confCls(prop.confidenceScore)}`}>{fmtPct(prop.confidenceScore)}</td>;
                          case 'pace': return league === 'nba' ? <td key={colId} className="px-3 py-4 text-center text-zinc-500 text-xs font-mono">{isNBA ? fmtNum(prop.pace) : '—'}</td> : null;
                          case 'defRating': return league === 'nba' ? <td key={colId} className="px-3 py-4 text-center text-zinc-500 text-xs font-mono">{isNBA ? fmtNum(prop.defRating) : '—'}</td> : null;
                          case 'edge': return <td key={colId} className={`px-3 py-4 text-center text-xs font-mono font-bold ${evCls(prop.bestEdgePct)}`}>{fmtPct(prop.bestEdgePct)}</td>;
                          case 'odds': return <td key={colId} className="px-3 py-4 text-center text-[#818cf8] text-xs font-mono font-bold">{fmtOdds(prop.odds)}</td>;
                          default: return null;
                        }
                      })}

                      <td className="px-3 py-4 text-right" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => onAddToBetSlip(prop)}
                          className={`p-2 rounded-xl transition-all ${inSlip ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10'}`}
                        >
                          {inSlip ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={colOrder.length + 2} className="bg-black/40 border-t border-white/5 p-6">
                          {(() => {
                            const isNBA = prop.league === 'nba';
                            
                            return (
                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {[
                                  ['Implied Prob', fmtPct(prop.impliedProb)],
                                  ['Proj Win %', fmtPct(prop.projWinPct)],
                                  ['Kelly %', fmtPct(prop.kellyPct, 1)],
                                  ['Season Avg', fmtNum(prop.playerAvg)],
                                  ['Opp Rank', `#${prop.opponentRank || '—'}`],
                                  ['Opp vs Stat', fmtNum(prop.opponentAvgVsStat)],
                                  // These were causing the errors
                                  ['NBA Pace', isNBA ? fmtNum(prop.pace) : 'N/A'],
                                  ['Def Rating', isNBA ? fmtNum(prop.defRating) : 'N/A'],
                                  ['Best Odds', fmtOdds(prop.bestOdds)],
                                  ['Best Book', prop.bestBook || '—']
                                ].map(([label, val]) => (
                                  <div key={label} className="bg-white/5 p-3 rounded-xl border border-white/5">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-1">{label}</p>
                                    <p className="text-xs font-mono font-bold text-zinc-300">{val}</p>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
);