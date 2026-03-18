'use client';
import { Bet } from '@/lib/types';
import { toDecimal } from '@/lib/utils/odds';

interface HistoricalBetSlipProps {
  bet: Bet;
}

export function HistoricalBetSlip({ bet }: HistoricalBetSlipProps) {
  // FIX: Safeguard against missing arrays
  const legs = bet.legs || [];
  const status = bet.status?.toLowerCase() || 'pending';

  const getStatusColor = () => {
    switch (status) {
      case 'won':
      case 'cashed':
        return 'text-emerald-400';
      case 'lost':
        return 'text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const renderLeg = (leg: any, isFirst: boolean) => (
    <div key={leg.propId || Math.random()} className={`relative flex items-center justify-between py-2.5 ${!isFirst && 'border-t border-white/5'}`}>
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
      <div className="pl-3">
        <p className="text-xs font-semibold text-foreground">{leg.player ?? leg.label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{leg.prop ?? leg.market}</p>
      </div>
      <div className="flex items-center gap-2">
        {leg.isBonusBet && (
          <span className="text-[8px] bg-purple-500/20 text-purple-400 px-1 rounded uppercase font-black ml-auto">
            Bonus
          </span>
        )}
        <span className={`text-xs font-bold tabular-nums ${Number(leg.odds) > 0 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
          {Number(leg.odds) > 0 ? '+' : ''}{leg.odds}
        </span>
      </div>
    </div>
  );

  // FIX: Force numeric conversion for stake and odds to prevent TS errors
  const totalStake = Number(bet.stake) || 0;
  const finalOdds = toDecimal((bet.odds || 0).toString());
  const payout = totalStake * finalOdds;
  const profit = payout - totalStake;

  return (
    <div className="bg-card-secondary/50 rounded-lg border border-white/5 overflow-hidden">
      <div className="p-3">
        {legs.map((leg, i) => renderLeg(leg, i === 0))}
      </div>

      <div className="flex justify-between items-center bg-card-secondary p-3 border-t border-white/5 rounded-b-lg">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Stake</p>
          <p className="text-sm font-bold">${totalStake.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className={`text-xs font-black italic uppercase tracking-tighter ${getStatusColor()}`}>
            {status}: {profit >= 0 ? '+' : '-'}${Math.abs(profit).toFixed(2)}
          </p>
          <p className="text-sm font-black text-foreground">${payout.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground font-mono">@{bet.odds > 0 ? '+' : ''}{bet.odds}</p>
        </div>
      </div>
    </div>
  );
}