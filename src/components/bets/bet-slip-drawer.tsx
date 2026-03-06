'use client';

import { useState } from 'react';
import { X, ChevronUp, Trash2, Zap, ArrowRight } from 'lucide-react';
// Assuming your context exports these - adjust names if they differ
import { useBetSlip } from "@/context/betslip-context"; 

export function BetSlipDrawer() {
    const { selections, removeLeg, clearSlip, totalOdds } = useBetSlip();
    const [isOpen, setIsOpen] = useState(false);

  const count = selections?.length || 0;

  // Don't even render the "tab" if the slip is empty
  if (count === 0) return null;

  return (
    <>
      {/* 1. The Floating "Tab" - Triggers the drawer */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-[#FFD700] text-black px-4 py-2.5 rounded-full font-black text-xs shadow-[0_0_20px_rgba(255,215,0,0.3)] flex items-center gap-2 animate-bounce-subtle lg:hidden"
        >
          <Zap className="h-3.5 w-3.5 fill-black" />
          VIEW SLIP ({count})
          <ChevronUp className="h-4 w-4" />
        </button>
      )}

      {/* 2. The Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 3. The Actual Drawer */}
      <div className={`
        fixed bottom-0 left-0 right-0 z-50 bg-[#0F1115] border-t border-white/10 rounded-t-[2rem] 
        transition-transform duration-300 ease-out pb-safe
        ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        lg:hidden
      `}>
        {/* Handle Bar */}
        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-3 mb-2" onClick={() => setIsOpen(false)} />

        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black italic tracking-tighter text-white">
              BET <span className="text-[#FFD700]">BUILDER</span>
            </h2>
            <button onClick={() => setIsOpen(false)} className="p-2 bg-white/5 rounded-full text-zinc-400">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Bet List */}
          <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1">
            {selections.map((bet: any) => (
              <div key={bet.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex justify-between items-start">
                <div>
                  <p className="text-[#FFD700] text-[10px] font-black uppercase tracking-widest mb-1">{bet.marketType}</p>
                  <p className="text-white font-bold text-sm leading-tight">{bet.playerName}</p>
                  <p className="text-zinc-500 text-xs font-medium">{bet.propLine} {bet.overUnder}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-white font-black text-sm">{bet.odds}</span>
                  <button onClick={() => removeLeg(bet.id)} className="text-zinc-700 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer / Summary */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Total Odds</p>
                <p className="text-2xl font-black text-white italic">{totalOdds || '+100'}</p>
              </div>
              <button onClick={clearSlip} className="text-[10px] text-zinc-600 font-black uppercase underline decoration-zinc-800">
                Clear All
              </button>
            </div>

            <button className="w-full bg-[#FFD700] hover:bg-[#FFE44D] text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-[0.98]">
              LOCK IN PICKS
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}