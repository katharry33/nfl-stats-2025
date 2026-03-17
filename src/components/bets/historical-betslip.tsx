'use client';
import { Bet } from '@/lib/types';
import { toDecimaloDecimal } from '@/lib/utils/odds';

interface HistoricalBetSlipProps {
  bet: Bet;
}

export function HistoricalBetSlip({ bet }: HistoricalBetSlipProps) {
  const legs = bet.legs || [];
  const isParlay = legs.length > 1;
  const status = bet.status.toLowerCase();

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
    <div key={leg.id || leg.propId} className={`relative flex items-center justify-between py-2.5 ${!isFirst && 'border-t border-white/5'}`}>
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gold-500" />
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
        <span className={`text-xs font-bold tabular-nums ${Number(leg.odds) > 0 ? 'text-profit' : 'text-muted-foreground'}`}>
          {Number(leg.odds) > 0 ? '+' : ''}{leg.odds}
        </span>
      </div>
    </div>
  );

  const totalStake = bet.stake || (bet as any).wager || 0;
  const finalOdds = oddsToDecimal(bet.odds.toString());
  const payout = totalStake * finalOdds;
  const profit = payout - totalStake;

  return (
    <div className="bg-card-secondary/50 rounded-lg border border-white/5">
      <div className="p-3">
        {isParlay ? legs.map((leg, i) => renderLeg(leg, i === 0)) : renderLeg(bet, true)}
      </div>

      <div className="flex justify-between items-center bg-card-secondary p-3 border-t border-white/5 rounded-b-lg">
        <div>
          <p className="text-xs font-semibold">Stake: ${totalStake.toFixed(2)}</p>
          <p className={`text-xs font-semibold ${getStatusColor()}`}>
            {status.toUpperCase()}: {profit >= 0 ? '+' : '-'}${Math.abs(profit).toFixed(2)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-foreground">${payout.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">@{bet.odds > 0 ? '+' : ''}{bet.odds}</p>
        </div>
      </div>
    </div>
  );
}
