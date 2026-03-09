'use client';
// src/components/bets/bet-builder-table.tsx

import React, { useState, useMemo } from 'react';
import { Plus, Minus, ChevronRight, ChevronDown, Settings2 } from 'lucide-react';
import { NFLProp } from '@/lib/types';

interface BetBuilderProp extends Omit<NFLProp, 'actualResult'> {
  id: string;
  actualResult?: string | any;
}

// ─── Column definitions ───────────────────────────────────────────────────────
interface ColDef {
  key: string;
  label: string;
  fmt?: (v: any) => string;
  color?: (v: any) => string;
}

const ALL_COLS: ColDef[] = [
  { key: 'week',              label: 'Week' },
  { key: 'gameDate',          label: 'Game Date' },
  { key: 'player',            label: 'Player' },
  { key: 'matchup',           label: 'Matchup' },
  { key: 'prop',              label: 'Prop' },
  { key: 'line',              label: 'Line',       fmt: v => v?.toFixed(1) ?? '—' },
  { key: 'playerAvg',         label: 'Avg',        fmt: v => v?.toFixed(1) ?? '—' },
  { key: 'opponentRank',      label: 'Opp Rank',   fmt: v => v != null ? `#${v}` : '—',
    color: v => v <= 8 ? 'text-red-400' : v <= 16 ? 'text-yellow-400' : 'text-emerald-400' },
  { key: 'opponentAvgVsStat', label: 'Opp Avg vs Stat', fmt: v => v?.toFixed(1) ?? '—' },
  { key: 'scoreDiff',         label: 'Score Diff', fmt: v => v?.toFixed(2) ?? '—',
    color: v => v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-zinc-400' },
  { key: 'overUnder',         label: 'Over/Under',
    color: v => v === 'Over' ? 'text-emerald-400 font-bold' : v === 'Under' ? 'text-red-400 font-bold' : '' },
  { key: 'seasonHitPct',      label: 'Hit %',      fmt: v => v != null ? `${(v*100).toFixed(1)}%` : '—',
    color: v => v >= 0.6 ? 'text-emerald-400' : v >= 0.5 ? 'text-yellow-400' : 'text-red-400' },
  { key: 'avgWinProb',        label: 'Avg Win Prob', fmt: v => v != null ? `${(v*100).toFixed(1)}%` : '—' },
  { key: 'bestEdgePct',       label: 'Edge %',     fmt: v => v != null ? `${(v*100).toFixed(1)}%` : '—',
    color: v => v > 0.1 ? 'text-emerald-400 font-bold' : v > 0.05 ? 'text-yellow-400' : v > 0 ? 'text-zinc-300' : 'text-red-400' },
  { key: 'expectedValue',     label: 'EV',         fmt: v => v?.toFixed(3) ?? '—',
    color: v => v > 0 ? 'text-emerald-400' : 'text-red-400' },
  { key: 'confidenceScore',   label: 'Confidence', fmt: v => v != null ? `${(v*100).toFixed(1)}%` : '—',
    color: v => v >= 0.7 ? 'text-emerald-400' : v >= 0.5 ? 'text-yellow-400' : 'text-zinc-400' },
  { key: 'gameTime',          label: 'Time' },
  { key: 'team',              label: 'Team' },
  { key: 'yardsScore',        label: 'Yds Score',  fmt: v => v?.toFixed(2) ?? '—' },
  { key: 'rankScore',         label: 'Rank Score', fmt: v => v?.toFixed(2) ?? '—' },
  { key: 'totalScore',        label: 'Total Score',fmt: v => v?.toFixed(2) ?? '—' },
  { key: 'scalingFactor',     label: 'Scale',      fmt: v => v?.toFixed(3) ?? '—' },
  { key: 'winProbability',    label: 'Win Prob',   fmt: v => v != null ? `${(v*100).toFixed(1)}%` : '—' },
  { key: 'projWinPct',        label: 'Proj Win%',  fmt: v => v != null ? `${(v*100).toFixed(1)}%` : '—' },
  { key: 'bestOdds',          label: 'Odds',       fmt: v => v != null ? (v > 0 ? `+${v}` : `${v}`) : '—' },
  { key: 'impliedProb',       label: 'Impl%',      fmt: v => v != null ? `${(v*100).toFixed(1)}%` : '—' },
  { key: 'kellyPct',          label: 'Kelly%',     fmt: v => v != null ? `${(v*100).toFixed(1)}%` : '—' },
  { key: 'valueIcon',         label: 'Value' },
  { key: 'gameStat',          label: 'Game Stat',  fmt: v => v?.toFixed(1) ?? '—' },
  { key: 'actualResult',      label: 'Result',
    color: v => v === 'won' ? 'text-emerald-400' : v === 'lost' ? 'text-red-400' : v === 'push' ? 'text-zinc-400' : 'text-zinc-600' },
];

const DEFAULT_COL_KEYS = [
  'week', 'gameDate', 'player', 'matchup', 'prop', 'line',
  'playerAvg', 'opponentRank', 'opponentAvgVsStat',
  'scoreDiff', 'overUnder', 'seasonHitPct',
  'avgWinProb', 'bestEdgePct', 'expectedValue', 'confidenceScore',
];

// ─── Column picker modal ───────────────────────────────────────────────────────
function ColumnPicker({
  visible, selected, onToggle, onClose,
}: {
  visible: Set<string>;
  selected: string[];
  onToggle: (key: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute top-10 right-0 z-50 w-72 bg-[#111] border border-white/10 rounded-2xl shadow-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Columns</p>
        <button onClick={onClose} className="text-[10px] text-zinc-600 hover:text-white uppercase font-bold">Done</button>
      </div>
      <div className="space-y-1 max-h-72 overflow-y-auto">
        {ALL_COLS.map(col => (
          <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
            <input
              type="checkbox"
              checked={visible.has(col.key)}
              onChange={() => onToggle(col.key)}
              className="accent-[#FFD700] w-3 h-3"
            />
            <span className="text-xs text-zinc-300">{col.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface BetBuilderTableProps {
  props: BetBuilderProp[];
  isLoading: boolean;
  isInBetSlip: (id: string) => boolean;
  onAddToBetSlip: (prop: any) => void;
  onRemoveFromBetSlip: (id: string) => void;
}

export default function BetBuilderTable({
  props, isLoading, isInBetSlip, onAddToBetSlip, onRemoveFromBetSlip,
}: BetBuilderTableProps) {
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());
  const [visibleCols, setVisibleCols]         = useState<Set<string>>(new Set(DEFAULT_COL_KEYS));
  const [showPicker, setShowPicker]           = useState(false);
  const [sortKey, setSortKey]                 = useState<string>('confidenceScore');
  const [sortDir, setSortDir]                 = useState<'asc' | 'desc'>('desc');

  const activeCols = useMemo(
    () => ALL_COLS.filter(c => visibleCols.has(c.key)),
    [visibleCols]
  );

  const toggleCol = (key: string) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const groupedProps = useMemo(() => {
    const sorted = [...props].sort((a, b) => {
      const av = (a as any)[sortKey];
      const bv = (b as any)[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted.reduce((acc, prop) => {
      const key = prop.player || 'Unknown Player';
      if (!acc[key]) acc[key] = [];
      acc[key].push(prop);
      return acc;
    }, {} as Record<string, BetBuilderProp[]>);
  }, [props, sortKey, sortDir]);

  const togglePlayer = (player: string) => {
    setExpandedPlayers(prev => {
      const next = new Set(prev);
      next.has(player) ? next.delete(player) : next.add(player);
      return next;
    });
  };

  if (isLoading) return (
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-white/5 rounded-2xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-1 pb-20">
      {/* Table header toolbar */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">
          {props.length} props · {Object.keys(groupedProps).length} players
        </p>
        <div className="relative">
          <button
            onClick={() => setShowPicker(v => !v)}
            className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all ${
              showPicker ? 'bg-[#FFD700]/10 border-[#FFD700]/30 text-[#FFD700]' : 'border-white/5 text-zinc-500 hover:text-white'
            }`}
          >
            <Settings2 className="w-3 h-3" />
            Columns ({visibleCols.size})
          </button>
          {showPicker && (
            <ColumnPicker
              visible={visibleCols}
              selected={DEFAULT_COL_KEYS}
              onToggle={toggleCol}
              onClose={() => setShowPicker(false)}
            />
          )}
        </div>
      </div>

      {/* Grouped rows */}
      {Object.entries(groupedProps).map(([playerName, playerProps]) => {
        const isExpanded = expandedPlayers.has(playerName);
        const first = playerProps[0];

        return (
          <div key={`group-${playerName}`} className="bg-[#0f1115] border border-white/5 rounded-2xl overflow-hidden">
            {/* Player header row */}
            <div
              onClick={() => togglePlayer(playerName)}
              className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-black border border-white/10 flex items-center justify-center font-black text-[9px] text-[#FFD700] italic shrink-0">
                  {(first?.team || 'NFL').slice(0, 3).toUpperCase()}
                </div>
                <div>
                  <span className="text-sm font-black italic uppercase tracking-tight text-white">
                    {playerName}
                  </span>
                  <span className="ml-2 text-[10px] text-zinc-600 font-bold uppercase">
                    {first?.matchup}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-zinc-700 uppercase font-bold">{playerProps.length} props</span>
                {isExpanded
                  ? <ChevronDown className="w-3.5 h-3.5 text-[#FFD700]" />
                  : <ChevronRight className="w-3.5 h-3.5 text-zinc-700" />}
              </div>
            </div>

            {/* Expanded table */}
            {isExpanded && (
              <div className="overflow-x-auto border-t border-white/5">
                <table className="w-full text-xs text-zinc-300 border-collapse">
                  <thead>
                    <tr className="bg-black/40">
                      {activeCols.map(col => (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          className={`px-3 py-2 text-left text-[9px] font-black uppercase tracking-widest whitespace-nowrap cursor-pointer select-none transition-colors ${
                            sortKey === col.key ? 'text-[#FFD700]' : 'text-zinc-700 hover:text-zinc-400'
                          }`}
                        >
                          {col.label}
                          {sortKey === col.key && (
                            <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                      ))}
                      <th className="px-3 py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {playerProps.map((prop, i) => {
                      const active = prop.id ? isInBetSlip(prop.id) : false;
                      return (
                        <tr
                          key={prop.id || i}
                          className={`border-t border-white/[0.03] transition-colors ${
                            active ? 'bg-[#FFD700]/5' : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          {activeCols.map(col => {
                            const raw = (prop as any)[col.key];
                            const display = col.fmt ? col.fmt(raw) : (raw ?? '—');
                            const colorClass = col.color ? col.color(raw) : '';
                            return (
                              <td key={col.key} className={`px-3 py-2.5 whitespace-nowrap ${colorClass}`}>
                                {String(display)}
                              </td>
                            );
                          })}
                          <td className="px-2 py-2.5">
                            <button
                              onClick={() => {
                                if (!prop.id) return;
                                active ? onRemoveFromBetSlip(prop.id) : onAddToBetSlip(prop);
                              }}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                                active
                                  ? 'bg-[#FFD700] text-black'
                                  : 'bg-zinc-800 text-zinc-400 hover:bg-[#FFD700] hover:text-black border border-white/10'
                              }`}
                            >
                              {active ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {props.length === 0 && (
        <div className="text-center py-16 text-zinc-700 text-xs uppercase font-bold tracking-widest">
          No props found
        </div>
      )}
    </div>
  );
}
