'use client';

// src/components/bets/betting-stats.tsx

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Target, Clock } from 'lucide-react';

interface StatsProps {
  bets: any[]; // already normalized + grouped bets
}

export function BettingStats({ bets }: StatsProps) {
  const stats = useMemo(() => {
    let netProfit  = 0;
    let totalWon   = 0;
    let totalLost  = 0;
    let totalPush  = 0;
    let pending    = 0;
    let totalStake = 0;

    bets.forEach(bet => {
      const stake   = Number(bet.stake ?? bet.wager ?? 0);
      const status  = (bet.status ?? '').toLowerCase();
      const odds    = Number(bet.odds ?? bet.legs?.[0]?.odds ?? -110);
      const boostPct = typeof bet.boostPct === 'number' ? bet.boostPct : 0;

      // Base profit multiplier from American odds
      const decOdds = odds > 0 ? odds / 100 : 100 / Math.abs(odds);
      const boostedProfit = stake * decOdds * (1 + boostPct / 100);

      switch (status) {
        case 'won': {
          // Prefer stored payout (DK bets have payout field), else calculate
          const paid = Number(bet.payout ?? 0) > 0 ? Number(bet.payout) : boostedProfit;
          netProfit += paid;
          totalStake += stake;
          totalWon++;
          break;
        }
        case 'lost': {
          netProfit -= stake;
          totalStake += stake;
          totalLost++;
          break;
        }
        case 'cashed out': {
          const co = Number(bet.cashedOutAmount ?? 0);
          netProfit += co - stake;
          totalStake += stake;
          totalWon++; // count as resolved
          break;
        }
        case 'void':
          // stake returned — no effect on P&L
          break;
        case 'pending':
        default:
          pending++;
          break;
      }
    });

    const resolved = totalWon + totalLost + totalPush;
    const winRate  = resolved > 0 ? (totalWon / resolved) * 100 : 0;
    const roi      = totalStake > 0 ? (netProfit / totalStake) * 100 : 0;
    const pendingStake = bets
      .filter(b => (b.status ?? '').toLowerCase() === 'pending')
      .reduce((s, b) => s + Number(b.stake ?? b.wager ?? 0), 0);

    return { netProfit, winRate, roi, pending, pendingStake, resolved, totalWon, totalLost };
  }, [bets]);

  const cards = [
    {
      label: 'Net Profit',
      value: `${stats.netProfit >= 0 ? '+' : ''}$${stats.netProfit.toFixed(2)}`,
      icon: stats.netProfit >= 0 ? TrendingUp : TrendingDown,
      color: stats.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400',
      sub: `${stats.resolved} resolved bets`,
    },
    {
      label: 'Win Rate',
      value: `${stats.winRate.toFixed(1)}%`,
      icon: Target,
      color: stats.winRate >= 50 ? 'text-blue-400' : 'text-slate-300',
      sub: `${stats.totalWon}W – ${stats.totalLost}L`,
    },
    {
      label: 'ROI',
      value: `${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(1)}%`,
      icon: TrendingUp,
      color: stats.roi >= 0 ? 'text-emerald-400' : 'text-red-400',
      sub: 'Return on invested stake',
    },
    {
      label: 'Pending',
      value: stats.pending.toString(),
      icon: Clock,
      color: 'text-amber-400',
      sub: stats.pendingStake > 0 ? `$${stats.pendingStake.toFixed(2)} at risk` : 'No stake at risk',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, color, sub }) => (
        <div key={label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{label}</p>
            <Icon className={`h-4 w-4 ${color} opacity-60`} />
          </div>
          <p className={`text-2xl font-black font-mono ${color}`}>{value}</p>
          <p className="text-xs text-slate-600 mt-1">{sub}</p>
        </div>
      ))}
    </div>
  );
}