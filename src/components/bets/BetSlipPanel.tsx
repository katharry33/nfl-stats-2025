'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, X, ChevronRight, Zap, Info } from 'lucide-react';
import { useBetSlip } from '@/context/betslip-context';
import { cn } from '@/lib/utils';

export function BetSlipPanel() {
  const { selections, removeLeg, clearSlip } = useBetSlip();
  const [isExpanded, setIsExpanded] = useState(true);
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !selections || selections.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 w-[380px] bg-[#0d0d0d] border border-white/10 rounded-[32px] shadow-2xl z-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
      
      {/* Slip Header */}
      <div className="p-5 flex items-center justify-between bg-white/3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-[#FFD700] flex items-center justify-center text-black font-black text-[10px] shadow-[0_0_20px_rgba(255,215,0,0.2)]">
            {selections.length}
          </div>
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Bet Slip</h2>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Custom Builder</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => clearSlip()}
            className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors rounded-lg"
            title="Clear All"
          >
            <Trash2 size={14} />
          </button>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-white/5 text-slate-500 rounded-lg transition-transform"
            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Selection List */}
      {isExpanded && (
        <div className="max-h-[400px] overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {selections.map((bet) => (
            <div 
              key={bet.id}
              className="group relative p-4 rounded-2xl bg-white/2 border border-white/5 hover:border-white/10 transition-all"
            >
              <button 
                onClick={() => removeLeg(bet.id)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-red-400 rounded-md transition-all"
              >
                <X size={12} />
              </button>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#FFD700]">
                  {bet.player} • {bet.league}
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <h3 className="text-xs font-bold text-white uppercase tracking-tight">
                    {bet.prop} <span className="text-slate-500 ml-1">({bet.line})</span>
                  </h3>
                  <span className="text-xs font-black text-emerald-400">
                    {bet.odds > 0 ? `+${bet.odds}` : bet.odds}
                  </span>
                </div>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter mt-1">
                  {bet.matchup}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer / Action */}
      <div className="p-5 bg-black/40 border-t border-white/5 space-y-4">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Est. Payout</span>
          <span className="text-sm font-black text-white italic">Calculating...</span>
        </div>

        <button className="w-full py-4 bg-[#FFD700] hover:bg-[#FFE44D] text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_8px_30px_rgba(255,215,0,0.15)] flex items-center justify-center gap-2 group transition-all active:scale-[0.98]">
          <Zap size={14} className="fill-black group-hover:animate-pulse" />
          Review & Lock Wagers
        </button>
      </div>
    </div>
  );
}
