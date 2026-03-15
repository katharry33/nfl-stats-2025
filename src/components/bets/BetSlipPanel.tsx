'use client';
// src/components/bets/BetSlipPanel.tsx

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { X, Trash2, ArrowRight, Zap } from 'lucide-react';
import { useActiveBonuses } from '@/hooks/use-active-bonuses';
import type { Bonus, BetLeg } from '@/lib/types';

interface BetSlipPanelProps {
  selections: BetLeg[];
  onRemove:   (id: string) => void;
  onClear:    () => void;
  week:       number;
}

// Helper to convert American odds to a decimal multiplier
function oddsToDecimal(odds: number): number {
  if (odds === 0) return 1; // A push, no change in odds.
  if (odds > 0) return (odds / 100) + 1;
  return (100 / Math.abs(odds)) + 1;
}

// Helper to calculate combined parlay odds from a list of selections
function calculateCombinedOdds(selections: BetLeg[]): number {
  if (selections.length === 0) {
    return 0;
  }

  const validSelections = selections.filter(leg => leg.odds != null);
  if (validSelections.length === 0) {
      return 0;
  }

  const totalDecimal = validSelections.reduce((acc, leg) => acc * oddsToDecimal(leg.odds!), 1);

  if (totalDecimal === 1) return 0; // Even money or no valid legs
  if (totalDecimal >= 2) return (totalDecimal - 1) * 100;
  return -100 / (totalDecimal - 1);
}

export function BetSlipPanel({ selections = [], onRemove, onClear, week }: BetSlipPanelProps) {
  const router  = useRouter();
  const { eligible } = useActiveBonuses(selections);
  const [selectedBonus, setSelectedBonus] = useState<Bonus | null>(null);
  const [stake, setStake] = useState<number>(10);
  const isEmpty = selections.length === 0;

  useEffect(() => {
    if (selections.length === 0) setSelectedBonus(null);
  }, [selections.length]);

  // Check if stake exceeds the bonus max wager limit
  const isOverLimit = selectedBonus && stake > selectedBonus.maxWager;

  // Parlay Calculations
  const totalOdds = calculateCombinedOdds(selections);
  const decimalOdds = selections.length === 0 ? 1 : oddsToDecimal(totalOdds);
  const potentialProfit = stake * (decimalOdds - 1);

  // Apply Bonus Boost
  const boostAmount = selectedBonus ? (potentialProfit * (selectedBonus.boost / 100)) : 0;
  const finalProfit = potentialProfit + boostAmount;
  const totalPayout = stake + finalProfit;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0e] border-l border-white/5">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Bet Slip</h2>
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">
            {selections.length} {selections.length === 1 ? 'leg' : 'legs'} selected
          </p>
        </div>
        {!isEmpty && (
          <button onClick={onClear}
            className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-red-400 transition-colors uppercase font-bold tracking-widest">
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Legs */}
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
            {selections.map(leg => (
                <div key={leg.id} className="px-4 py-3.5 group hover:bg-white/[0.02] transition-colors">
                  {/* ... leg display ... */}
                </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary + CTA */}
      {!isEmpty && (
        <div className="border-t border-white/5 p-4 space-y-4">
          
          {/* Stake Input */}
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Risk</p>
              <input 
                type="number"
                value={stake}
                onChange={e => setStake(parseFloat(e.target.value) || 0)}
                className="w-full bg-white/5 rounded-md px-2 py-1 text-white font-bold text-sm tabular-nums text-right"
              />
            </div>
            {isOverLimit && (
              <p className="text-right text-[9px] text-red-400 font-black uppercase mt-1">
                ⚠️ Stake exceeds ${selectedBonus.maxWager} max limit
              </p>
            )}
          </div>

          {/* Available Boosts */}
          {eligible.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black text-emerald-400 uppercase">Available Boosts</p>
              {eligible.map((bonus: Bonus) => ( 
                <button 
                  key={bonus.id}
                  onClick={() => setSelectedBonus(selectedBonus?.id === bonus.id ? null : bonus)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                    selectedBonus?.id === bonus.id 
                      ? 'bg-[#FFD700]/10 border-[#FFD700]/50 shadow-[0_0_15px_rgba(255,215,0,0.1)]' 
                      : 'bg-white/5 border-white/5 hover:border-white/10'
                  }`}>
                  <div className="flex items-center gap-2">
                    <Zap className={`h-3.5 w-3.5 ${selectedBonus?.id === bonus.id ? 'text-[#FFD700]' : 'text-zinc-500'}`} />
                    <span className="text-xs font-bold uppercase">{bonus.name}</span>
                  </div>
                  <span className="text-[10px] font-black text-[#FFD700]">+{bonus.boost}%</span>
                </button>
              ))}
            </div>
          )}

          {/* Payout Summary */}
          <div className="pt-4 mt-4 border-t border-white/5 space-y-2">
            <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase">
              <span>Base Profit</span>
              <span>${potentialProfit.toFixed(2)}</span>
            </div>
            
            {selectedBonus && (
              <div className="flex justify-between text-[10px] text-emerald-400 font-bold uppercase">
                <span>{selectedBonus.boost}% Boost</span>
                <span>+${boostAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between items-end pt-2">
              <span className="text-xs font-black uppercase text-white">Total Payout</span>
              <span className={`text-xl font-mono font-black ${selectedBonus ? 'text-[#FFD700]' : 'text-white'}`}>
                ${totalPayout.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={() => router.push('/parlay-studio')}
            className="w-full bg-[#FFD700] hover:bg-[#FFE033] active:scale-[0.98] transition-all text-black font-black uppercase tracking-[0.15em] text-xs py-3.5 rounded-xl flex items-center justify-center gap-2">
            Go to Parlay Studio
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
