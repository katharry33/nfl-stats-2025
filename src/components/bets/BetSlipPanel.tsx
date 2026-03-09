'use client';
// src/components/bets/BetSlipPanel.tsx

import { useRouter } from 'next/navigation';
import { X, Trash2, ArrowRight, Zap } from 'lucide-react';
import type { NormalizedProp } from '@/hooks/useAllProps';

interface BetSlipPanelProps {
  legs: NormalizedProp[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

function impliedProbFromOdds(odds: number | null | undefined): number | null {
  if (odds == null) return null;
  if (odds < 0) return (-odds) / (-odds + 100);
  return 100 / (odds + 100);
}

function confidenceBadge(score: number | null | undefined) {
  if (score == null) return null;
  if (score >= 80) return { label: 'ELITE', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
  if (score >= 60) return { label: 'STRONG', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' };
  if (score >= 40) return { label: 'MOD', cls: 'bg-zinc-700 text-zinc-300 border-zinc-600' };
  return { label: 'WEAK', cls: 'bg-red-500/10 text-red-400 border-red-500/20' };
}

export function BetSlipPanel({ legs, onRemove, onClear }: BetSlipPanelProps) {
  const router = useRouter();
  const isEmpty = legs.length === 0;

  // Approximate combined implied prob (multiply individual probs)
  const combinedImplied = legs.reduce((acc, leg) => {
    const p = impliedProbFromOdds(leg.bestOdds ?? leg.odds ?? null);
    return p != null ? acc * p : acc;
  }, 1);

  const avgEdge = legs.length > 0
    ? legs.reduce((s, l) => s + (l.bestEdgePct ?? 0), 0) / legs.length
    : 0;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0e] border-l border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">
            Bet Slip
          </h2>
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">
            {legs.length} {legs.length === 1 ? 'leg' : 'legs'} selected
          </p>
        </div>
        {!isEmpty && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-red-400 transition-colors uppercase font-bold tracking-widest"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Legs list */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
              <Zap className="w-5 h-5 text-zinc-700" />
            </div>
            <p className="text-[11px] text-zinc-600 uppercase font-bold tracking-widest leading-relaxed">
              Add props from the<br />table to build a parlay
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {legs.map(leg => {
              const badge = confidenceBadge(leg.confidenceScore);
              const isOver = (leg.overUnder ?? '').toLowerCase() === 'over';
              return (
                <div key={leg.id} className="px-4 py-3.5 group hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${
                          isOver ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                 : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {leg.overUnder || 'OVER'}
                        </span>
                        {badge && (
                          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${badge.cls}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-white truncate leading-none mb-0.5">
                        {leg.player}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate">
                        {leg.prop} <span className="text-zinc-700 mx-1">·</span> {leg.line}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        {leg.bestOdds != null && (
                          <span className="text-[10px] font-bold text-zinc-400">
                            {leg.bestOdds > 0 ? `+${leg.bestOdds}` : leg.bestOdds}
                          </span>
                        )}
                        {leg.bestEdgePct != null && (
                          <span className={`text-[10px] font-bold ${
                            leg.bestEdgePct > 0.1 ? 'text-emerald-400' :
                            leg.bestEdgePct > 0.05 ? 'text-yellow-400' : 'text-zinc-500'
                          }`}>
                            {(leg.bestEdgePct * 100).toFixed(1)}% edge
                          </span>
                        )}
                        {leg.team && (
                          <span className="text-[10px] text-zinc-700 uppercase font-bold">{leg.team}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => leg.id && onRemove(leg.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-red-400 text-zinc-600 mt-0.5 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary + CTA */}
      {!isEmpty && (
        <div className="border-t border-white/5 p-4 space-y-3">
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-1">Combined Prob</p>
              <p className="text-lg font-black text-white">
                {(combinedImplied * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mb-1">Avg Edge</p>
              <p className={`text-lg font-black ${avgEdge > 0.05 ? 'text-emerald-400' : avgEdge > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                {(avgEdge * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Go to Parlay Studio */}
          <button
            onClick={() => router.push('/parlay-studio')}
            className="w-full bg-[#FFD700] hover:bg-[#FFE033] active:scale-[0.98] transition-all text-black font-black uppercase tracking-[0.15em] text-xs py-3.5 rounded-xl flex items-center justify-center gap-2"
          >
            Go to Parlay Studio
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-[9px] text-zinc-700 uppercase tracking-widest">
            {legs.length}-leg parlay builder
          </p>
        </div>
      )}
    </div>
  );
}