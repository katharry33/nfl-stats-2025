'use client';

import React from 'react';
import { useBetSlip } from '@/context/betslip-context';
import { Trash2, X, Layers, CheckCircle2, AlertCircle } from 'lucide-react';

export function HistoricalBetSlip() {
  const {
    selections,
    removeLeg,
    clearSlip,
    isSubmitting,
    submitHistoricalBets,
    setBetStatus,
  } = useBetSlip();

  if (selections.length === 0) {
    return (
      <div className="bg-[#0f1115] border border-dashed border-white/10 rounded-3xl p-6 text-center">
        <p className="text-sm font-bold text-zinc-500 italic">No Bets Selected</p>
        <p className="text-[10px] text-zinc-700 mt-1 uppercase tracking-widest">Add props from the main list</p>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (isSubmitting) return; 
    try {
      await submitHistoricalBets();
    } catch (err: any) {
      console.error("Submission failed:", err);
    }
  };

  return (
    <div className="bg-[#0f1115] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-lg font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
          <Layers className="h-5 w-5 text-[#FFD700]/60" />
          Bet Slip
        </h3>
        <button 
          onClick={clearSlip} 
          className="text-zinc-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5"
          title="Clear all selections"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="divide-y divide-white/10 max-h-[400px] overflow-y-auto">
        {selections.map((bet, i) => (
          <div key={`${bet.id}-${i}`} className="p-4 relative group hover:bg-white/[0.02] transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-tight truncate">{bet.player}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  <span className="text-zinc-400 font-medium">{bet.prop}</span>
                  <span className="mx-1">•</span>
                  <span className={bet.selection === 'Over' ? 'text-blue-400' : 'text-orange-400'}>
                    {bet.selection} {bet.line}
                  </span>
                </p>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => setBetStatus(bet.id, bet.status === 'won' ? 'lost' : 'won')}
                  className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all active:scale-95 flex items-center gap-1 ${
                    bet.status === 'won' 
                      ? 'bg-green-500/20 text-green-500 border border-green-500/20' 
                      : 'bg-red-500/20 text-red-500 border border-red-500/20'
                  }`}
                >
                  {bet.status === 'won' ? (
                    <><CheckCircle2 className="h-3 w-3" /> WIN</>
                  ) : (
                    <><AlertCircle className="h-3 w-3" /> LOSS</>
                  )}
                </button>
                
                <button 
                  onClick={() => removeLeg(bet.id)} 
                  className="text-zinc-700 hover:text-white transition-colors lg:opacity-0 group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-white/10 bg-white/[0.01]">
        <button 
          onClick={handleSubmit} 
          disabled={isSubmitting || selections.length === 0}
          className="w-full bg-[#FFD700] text-black font-black italic uppercase text-sm py-3.5 rounded-xl
            flex items-center justify-center gap-2 transition-all hover:bg-[#e6c200] active:scale-[0.98]
            disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            'Submit Historical Parley'
          )}
        </button>
      </div>
    </div>
  );
}