'use client';

import { useMemo } from 'react';
import { Bet } from '@/lib/types';
import { DollarSign, Percent, TrendingUp, TrendingDown, Minus, Target, Hash } from 'lucide-react';
import { toDecimal } from '@/lib/utils/odds';

function StatCard({ title, value, sub, icon: Icon, color, format = 'number' }: {
  title: string; value: number | null; sub?: string; icon: any;
  color: string; format?: 'money' | 'percent' | 'number';
}) {
  const display = useMemo(() => {
    if (value === null || value === undefined || isNaN(value as number)) return '—';
    const n = value as number;
    if (format === 'money')   return `${n < 0 ? '-' : ''}$${Math.abs(n).toFixed(2)}`;
    if (format === 'percent') return `${n.toFixed(1)}%`;
    return n.toLocaleString();
  }, [value, format]);

  return (
    <div className="bg-[#0f1115] border border-white/5 rounded-2xl p-5 flex items-start gap-4 hover:border-white/10 transition-colors">
      <div className={`p-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl mt-0.5 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">{title}</p>
        <p className={`text-2xl font-black font-mono tracking-tight mt-0.5 ${color}`}>{display}</p>
        {sub && <p className="text-[10px] text-zinc-600 font-mono mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function calcBetProfit(bet: Bet): number {
  const stake = Number(bet.stake) || 0;
  const odds  = Number(bet.odds)  || 0;
  const boost = Number((bet as any).boost || 0);
  const isBonusBet = Boolean((bet as any).isBonusBet);
  const status = (bet.status ?? '').toLowerCase();

  if (!['won', 'win', 'cashed'].includes(status) && !['lost', 'loss'].includes(status)) return 0;

  if (status === 'lost' || status === 'loss') {
    return isBonusBet ? 0 : -stake;
  }

  // Won
  const dec = toDecimal(odds);
  const boostMult = 1 + boost / 100;
  const payout = stake * dec * boostMult;
  return isBonusBet ? payout - stake : payout - stake;
}

export function BettingStats({ bets }: { bets: Bet[] }) {
  const stats = useMemo(() => {
    const settled = bets.filter(b => {
      const s = (b.status ?? '').toLowerCase();
      return s !== 'pending' && s !== 'void' && s !== 'push';
    });

    const won  = settled.filter(b => ['won', 'win', 'cashed'].includes((b.status ?? '').toLowerCase()));
    const lost = settled.filter(b => ['lost', 'loss'].includes((b.status ?? '').toLowerCase()));
    const pending = bets.filter(b => (b.status ?? '').toLowerCase() === 'pending');

    const totalWagered = settled.reduce((sum, b) => sum + (Number(b.stake) || 0), 0);
    const netProfit    = settled.reduce((sum, b) => sum + calcBetProfit(b), 0);
    const winLossCount = won.length + lost.length;
    const winRate      = winLossCount > 0 ? (won.length / winLossCount) * 100 : 0;
    const roi          = totalWagered > 0 ? (netProfit / totalWagered) * 100 : 0;

    const pendingStake = pending.reduce((sum, b) => sum + (Number(b.stake) || 0), 0);

    return {
      totalWagered, netProfit, winRate, roi,
      wonCount: won.length, lostCount: lost.length,
      pendingCount: pending.length, pendingStake,
      settledCount: settled.length,
    };
  }, [bets]);

  const profitColor = stats.netProfit > 0 ? 'text-emerald-400' : stats.netProfit < 0 ? 'text-red-400' : 'text-zinc-400';
  const roiColor    = stats.roi > 0       ? 'text-emerald-400' : stats.roi < 0       ? 'text-red-400' : 'text-zinc-400';
  const ProfitIcon  = stats.netProfit > 0 ? TrendingUp : stats.netProfit < 0 ? TrendingDown : Minus;
  const RoiIcon     = stats.roi > 0       ? TrendingUp : stats.roi < 0       ? TrendingDown : Minus;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      <StatCard
        title="Net Profit"
        value={stats.netProfit}
        sub={`${stats.settledCount} settled`}
        icon={ProfitIcon}
        color={profitColor}
        format="money"
      />
      <StatCard
        title="Win Rate"
        value={stats.winRate}
        sub={`${stats.wonCount}W – ${stats.lostCount}L`}
        icon={Percent}
        color="text-[#FFD700]"
        format="percent"
      />
      <StatCard
        title="ROI"
        value={stats.roi}
        sub={`on $${stats.totalWagered.toFixed(0)} wagered`}
        icon={RoiIcon}
        color={roiColor}
        format="percent"
      />
      <StatCard
        title="Total Wagered"
        value={stats.totalWagered}
        icon={DollarSign}
        color="text-[#FFD700]/70"
        format="money"
      />
      <StatCard
        title="Pending"
        value={stats.pendingCount}
        sub={`$${stats.pendingStake.toFixed(2)} at risk`}
        icon={Hash}
        color="text-zinc-400"
        format="number"
      />
      <StatCard
        title="Avg Odds"
        value={
          stats.settledCount > 0
            ? bets
                .filter(b => !['pending','void','push'].includes((b.status ?? '').toLowerCase()))
                .reduce((s, b) => s + (Number(b.odds) || 0), 0) / stats.settledCount
            : null
        }
        icon={Target}
        color="text-zinc-400"
        format="number"
      />
    </div>
  );
}