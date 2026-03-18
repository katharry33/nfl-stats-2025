'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { X, Trash2, ArrowRight, Zap, Loader2 } from 'lucide-react';
import { useActiveBonuses } from '@/hooks/use-active-bonuses';
import { useBetSlip } from '@/context/betslip-context';
import { useAuth } from '@/lib/firebase/provider';
import { toDecimal } from '@/lib/utils/odds';
import type { Bonus } from '@/lib/types';

interface BetSlipPanelProps {
  week: number;
}

export function BetSlipPanel({ week }: BetSlipPanelProps) {
  const router = useRouter();
  const { user } = useAuth();
  const {
    selections,
    removeLeg,
    clearSlip,
    totalParlayOdds,
    kelly,
  } = useBetSlip();

  const { eligible } = useActiveBonuses(selections);
  const [selectedBonus, setSelectedBonus] = useState<Bonus | null>(null);
  const [stake, setStake] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const isEmpty = selections.length === 0;

  useEffect(() => {
    if (kelly.recommendedStake > 0) {
      setStake(parseFloat(kelly.recommendedStake.toFixed(2)));
    }
  }, [kelly.recommendedStake]);

  useEffect(() => {
    if (isEmpty) {
      setSelectedBonus(null);
      setStake(10);
    }
  }, [isEmpty]);

  const handlePlaceBet = async () => {
    if (!user) return;

    if (typeof window !== 'undefined' && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }

    setLoading(true);
    try {
      const res = await fetch('/api/place-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selections,
          stake,
          totalOdds: totalParlayOdds,
          expectedValue: kelly.expectedValue,
          uid: user.uid,
          ...(selectedBonus && {
            bonusId: selectedBonus.id,
            bonusBoost: selectedBonus.boost,
          }),
        }),
      });

      const data = await res.json();
      if (data.success) {
        clearSlip();
        if (window.navigator.vibrate) window.navigator.vibrate([30, 50, 30]);
      } else {
        throw new Error(data.message || "An unknown error occurred.");
      }
    } catch (err) {
      console.error("Bet Placement Failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const isOverLimit = selectedBonus && stake > selectedBonus.maxWager;
  // FIX: Ensure totalParlayOdds is cast to string safely
  const decimalOdds = isEmpty ? 1 : toDecimal((totalParlayOdds || 0).toString());
  const potentialProfit = stake * (decimalOdds - 1);
  const boostAmount = selectedBonus ? potentialProfit * (selectedBonus.boost / 100) : 0;
  const finalProfit = potentialProfit + boostAmount;
  const totalPayout = stake + finalProfit;

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Bet Slip</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {selections.length} {selections.length === 1 ? 'leg' : 'legs'} selected
          </p>
        </div>
        {!isEmpty && (
          <button onClick={clearSlip}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-red-400 transition-colors font-medium">
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Legs */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
            <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center">
              <Zap className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Add props from the table<br />to build a parlay
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {selections.map(leg => (
              <div key={(leg as any).id || (leg as any).propId}
                className="px-4 py-3 flex items-start justify-between gap-2 group hover:bg-secondary/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {(leg as any).player ?? (leg as any).label ?? '—'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {(leg as any).prop ?? (leg as any).market ?? ''}
                  </p>
                  {(leg as any).odds != null && (
                    <p className={`text-[11px] font-medium mt-0.5 tabular-nums ${
                      (leg as any).odds > 0 ? 'text-emerald-400' : 'text-muted-foreground'
                    }`}>
                      {(leg as any).odds > 0 ? '+' : ''}{(leg as any).odds}
                    </p>
                  )}
                </div>
                <button onClick={() => removeLeg((leg as any).id || (leg as any).propId)}
                  className="mt-0.5 text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                  aria-label="Remove leg">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary + CTA */}
      {!isEmpty && (
        <div className="border-t border-border p-4 space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[11px] text-muted-foreground font-medium">Stake</label>
              {kelly.recommendedStake > 0 && (
                <span className="text-[10px] font-mono text-primary/70 italic">Kelly Sug: ${kelly.recommendedStake.toFixed(2)}</span>
              )}
            </div>
            <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 border border-border focus-within:border-primary/50 transition-all">
              <span className="text-sm text-muted-foreground">$</span>
              <input 
                type="number" 
                inputMode="decimal" 
                value={stake}
                onChange={(e) => {
                  // 1. Get the value as a string
                  const val = e.target.value;
                  
                  // 2. Convert to number, but handle the empty string case 
                  // so the user can backspace without the input breaking
                  const numericVal = val === '' ? 0 : Number(val);
                  
                  // 3. Update state
                  setStake(numericVal);
                }}
                className="flex-1 bg-transparent text-sm font-semibold text-foreground text-right focus:outline-none tabular-nums" 
              />
            </div>
            {isOverLimit && (
              <p className="text-right text-[10px] text-red-400 font-medium italic">
                Exceeds ${selectedBonus.maxWager} max limit
              </p>
            )}
          </div>

          {/* Boosts */}
          {eligible.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-emerald-400">Available Boosts</p>
              {eligible.map((bonus: Bonus) => (
                <button key={bonus.id}
                  onClick={() => setSelectedBonus(selectedBonus?.id === bonus.id ? null : bonus)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all ${
                    selectedBonus?.id === bonus.id
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'bg-secondary border-border hover:border-primary/25 text-foreground'
                  }`}>
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-xs font-semibold">{bonus.name}</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400">+{bonus.boost}%</span>
                </button>
              ))}
            </div>
          )}

          {/* Payout summary */}
          <div className="space-y-2 pt-3 border-t border-border">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-black uppercase text-yellow-500 flex items-center gap-1 italic">
                <Zap className="w-3 h-3" /> Model Edge
              </span>
              <span className={`text-xs font-bold ${kelly.expectedValue > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {kelly.expectedValue.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Parlay Odds</span>
              <span className="font-bold tabular-nums">{(totalParlayOdds || 0) > 0 ? '+' : ''}{(totalParlayOdds || 0).toFixed(0)}</span>
            </div>
            {selectedBonus && (
              <div className="flex justify-between text-xs text-emerald-400 italic">
                <span>{selectedBonus.boost}% boost</span>
                <span className="tabular-nums">+${boostAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-end pt-1">
              <span className="text-sm font-semibold text-foreground">Total payout</span>
              <span className={`text-xl font-bold tabular-nums ${selectedBonus ? 'text-emerald-400' : 'text-foreground'}`}>
                ${totalPayout.toFixed(2)}
              </span>
            </div>
          </div>

          <button 
            onClick={handlePlaceBet}
            disabled={isEmpty || isOverLimit || loading || stake <= 0}
            className="w-full bg-[#FFD700] hover:bg-[#e6c200] active:scale-[0.98] 
                       disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed
                       text-black font-black uppercase py-4 rounded-2xl transition-all 
                       flex items-center justify-center gap-2 italic tracking-tighter shadow-lg"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Processing...
              </span>
            ) : (
              <>
                Place Secure Bet
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
