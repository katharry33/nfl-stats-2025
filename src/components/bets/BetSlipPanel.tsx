'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { X, Trash2, ArrowRight, Zap } from 'lucide-react';
import { useActiveBonuses } from '@/hooks/use-active-bonuses';
import type { Bonus, BetLeg } from '@/lib/types';

function oddsToDecimal(odds: number): number {
  if (odds === 0) return 1;
  if (odds > 0)   return (odds / 100) + 1;
  return (100 / Math.abs(odds)) + 1;
}

function calculateCombinedOdds(selections: BetLeg[]): number {
  const valid = selections.filter(l => l.odds != null);
  if (!valid.length) return 0;
  const total = valid.reduce((acc, l) => acc * oddsToDecimal(l.odds!), 1);
  if (total === 1) return 0;
  if (total >= 2)  return (total - 1) * 100;
  return -100 / (total - 1);
}

interface BetSlipPanelProps {
  selections: BetLeg[];
  onRemove:   (id: string) => void;
  onClear:    () => void;
  week:       number;
}

export function BetSlipPanel({ selections = [], onRemove, onClear, week }: BetSlipPanelProps) {
  const router = useRouter();
  const { eligible } = useActiveBonuses(selections);
  const [selectedBonus, setSelectedBonus] = useState<Bonus | null>(null);
  const [stake, setStake] = useState<number>(10);
  const isEmpty = selections.length === 0;

  useEffect(() => {
    if (selections.length === 0) setSelectedBonus(null);
  }, [selections.length]);

  const isOverLimit     = selectedBonus && stake > selectedBonus.maxWager;
  const totalOdds       = calculateCombinedOdds(selections);
  const decimalOdds     = selections.length === 0 ? 1 : oddsToDecimal(totalOdds);
  const potentialProfit = stake * (decimalOdds - 1);
  const boostAmount     = selectedBonus ? potentialProfit * (selectedBonus.boost / 100) : 0;
  const finalProfit     = potentialProfit + boostAmount;
  const totalPayout     = stake + finalProfit;

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
          <button onClick={onClear}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-loss transition-colors font-medium">
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
              <div key={leg.id}
                className="px-4 py-3 flex items-start justify-between gap-2 group hover:bg-secondary/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {/* Use player field — 'market' doesn't exist on BetLeg */}
                    {(leg as any).player ?? (leg as any).label ?? '—'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {(leg as any).prop ?? (leg as any).market ?? ''}
                  </p>
                  {leg.odds != null && (
                    <p className={`text-[11px] font-medium mt-0.5 tabular-nums ${
                      leg.odds > 0 ? 'text-profit' : 'text-muted-foreground'
                    }`}>
                      {leg.odds > 0 ? '+' : ''}{leg.odds}
                    </p>
                  )}
                </div>
                <button onClick={() => onRemove(leg.id)}
                  className="mt-0.5 text-muted-foreground hover:text-loss transition-colors shrink-0"
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

          {/* Stake */}
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground font-medium">Stake</label>
            <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 border border-border">
              <span className="text-sm text-muted-foreground">$</span>
              <input type="number" value={stake}
                onChange={e => setStake(parseFloat(e.target.value) || 0)}
                className="flex-1 bg-transparent text-sm font-semibold text-foreground text-right focus:outline-none tabular-nums" />
            </div>
            {isOverLimit && (
              <p className="text-right text-[10px] text-loss font-medium">
                Exceeds ${selectedBonus.maxWager} max limit
              </p>
            )}
          </div>

          {/* Boosts */}
          {eligible.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-profit">Available Boosts</p>
              {eligible.map((bonus: Bonus) => (
                <button key={bonus.id}
                  onClick={() => setSelectedBonus(selectedBonus?.id === bonus.id ? null : bonus)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all ${
                    selectedBonus?.id === bonus.id
                      ? 'bg-primary/8 border-primary/25 text-primary'
                      : 'bg-secondary border-border hover:border-primary/25 text-foreground'
                  }`}>
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-xs font-semibold">{bonus.name}</span>
                  </div>
                  <span className="text-[11px] font-bold text-profit">+{bonus.boost}%</span>
                </button>
              ))}
            </div>
          )}

          {/* Payout summary */}
          <div className="space-y-2 pt-3 border-t border-border">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Base profit</span>
              <span className="tabular-nums">${potentialProfit.toFixed(2)}</span>
            </div>
            {selectedBonus && (
              <div className="flex justify-between text-xs text-profit">
                <span>{selectedBonus.boost}% boost</span>
                <span className="tabular-nums">+${boostAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-end pt-1">
              <span className="text-sm font-semibold text-foreground">Total payout</span>
              <span className={`text-xl font-bold tabular-nums ${selectedBonus ? 'text-profit' : 'text-foreground'}`}>
                ${totalPayout.toFixed(2)}
              </span>
            </div>
          </div>

          {/* CTA */}
          <button onClick={() => router.push('/parlay-studio')}
            className="w-full bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all text-primary-foreground font-semibold text-sm py-3 rounded-lg flex items-center justify-center gap-2">
            Go to Parlay Studio
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}