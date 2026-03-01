'use client';

import React from 'react';
import { Trash2, ArrowRight, Layers, X } from 'lucide-react';
import { useBetSlip } from '@/context/betslip-context';
import { useRouter } from 'next/navigation';

export function HistoricalBetSlip() {
  const { selections, removeLeg, clearSlip } = useBetSlip();
  const router = useRouter();

  return (
    <div className="bg-[#0f1115] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#FFD700]" />
          <span className="text-sm font-black uppercase tracking-widest text-white">Bet Slip</span>
          {selections.length > 0 && (
            <span className="text-[10px] font-black bg-[#FFD700] text-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {selections.length}
            </span>
          )}
        </div>
        {selections.length > 0 && (
          <button onClick={clearSlip}
            className="text-[10px] font-black text-zinc-600 hover:text-red-400 uppercase tracking-wider transition-colors">
            Clear all
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        {selections.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-3">
            <div className="h-12 w-12 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-center">
              <Layers className="h-5 w-5 text-zinc-700" />
            </div>
            <p className="text-xs text-zinc-600 text-center max-w-[160px]">
              Add props to build your parlay
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-0.5">
            {selections.map((leg: any) => {
              const uniqueKey = leg.propId || leg.id || `${leg.player}-${leg.prop}-${leg.line}`;
              const odds = Number(leg.odds);
              return (
                <div key={uniqueKey}
                  className="group flex items-start gap-2 p-3 bg-black/40 border border-white/[0.06]
                    rounded-2xl hover:border-[#FFD700]/20 transition-colors">

                  {/* Gold accent bar for historical props */}
                  {leg.source === 'historical-props' && (
                    <div className="w-0.5 h-full bg-[#FFD700]/40 rounded-full shrink-0 self-stretch" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-white uppercase italic tracking-tight truncate">
                      {leg.player}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {leg.selection && (
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase
                          ${leg.selection.toLowerCase() === 'over'
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-orange-500/10 text-orange-400'}`}>
                          {leg.selection}
                        </span>
                      )}
                      <p className="text-[10px] text-zinc-500 font-mono">
                        {leg.prop} · {leg.line}
                      </p>
                    </div>
                    <p className="text-[10px] font-mono text-[#FFD700]/60 mt-1">
                      {odds > 0 ? '+' : ''}{odds || '—'}
                    </p>
                  </div>

                  <button
                    onClick={() => removeLeg(leg.propId || leg.id || '')}
                    className="shrink-0 p-1.5 text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-500/10"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {selections.length > 0 && (
        <div className="px-4 pb-4 pt-2 border-t border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-600 font-bold uppercase tracking-wider">Total Legs</span>
            <span className="font-black text-[#FFD700] bg-[#FFD700]/10 px-2 py-0.5 rounded-lg font-mono">
              {selections.length}
            </span>
          </div>
          <button
            onClick={() => router.push('/parlay-studio')}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#FFD700] hover:bg-[#e6c200]
              text-black font-black italic uppercase text-sm rounded-2xl transition-colors"
          >
            Parlay Studio
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}