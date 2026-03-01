'use client';

import { useMemo } from 'react';
import { Bet } from '@/lib/types';
import { DollarSign, Percent, TrendingUp, TrendingDown, Minus } from 'lucide-react';

function StatCard({ title, value, icon: Icon, color, format = 'number' }: {
  title: string; value: number | null; icon: any;
  color: string; format?: 'money' | 'percent' | 'number';
}) {
  const display = useMemo(() => {
    if (value === null || isNaN(value as number)) return '—';
    if (format === 'money')   return `$${(value as number).toFixed(2)}`;
    if (format === 'percent') return `${(value as number).toFixed(1)}%`;
    return (value as number).toLocaleString();
  }, [value, format]);

  return (
    <div className="bg-[#0f1115] border border-white/5 rounded-2xl p-5 flex items-start gap-4
      hover:border-white/10 transition-colors">
      <div className={`p-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl mt-0.5 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">{title}</p>
        <p className={`text-2xl font-black font-mono tracking-tight mt-0.5 ${color}`}>{display}</p>
      </div>
    </div>
  );
}

export function BettingStats({ bets }: { bets: Bet[] }) {
  const stats = useMemo(() => {
    const settled = bets.filter(b => {
      const s = (b.status ?? '').toLowerCase();
      return s !== 'pending' && s !== 'void' && s !== 'push';
    });

    const totalWagered = settled.reduce((sum, b) => sum + (b.stake ?? 0), 0);
    const won  = settled.filter(b => ['won', 'win', 'cashed'].includes((b.status ?? '').toLowerCase()));
    const lost = settled.filter(b => ['lost', 'loss'].includes((b.status ?? '').toLowerCase()));
    const netProfit = settled.reduce((sum, b) => sum + ((b as any).profit ?? 0), 0);
    const winLossCount = won.length + lost.length;
    const winRate = winLossCount > 0 ? (won.length / winLossCount) * 100 : 0;
    const roi = totalWagered > 0 ? (netProfit / totalWagered) * 100 : 0;

    return { totalWagered, netProfit, winRate, roi };
  }, [bets]);

  const profitColor = stats.netProfit > 0 ? 'text-emerald-400'
    : stats.netProfit < 0 ? 'text-red-400' : 'text-zinc-400';

  const roiColor = stats.roi > 0 ? 'text-emerald-400'
    : stats.roi < 0 ? 'text-red-400' : 'text-zinc-400';

  const ProfitIcon = stats.netProfit > 0 ? TrendingUp : stats.netProfit < 0 ? TrendingDown : Minus;
  const RoiIcon    = stats.roi > 0       ? TrendingUp : stats.roi < 0       ? TrendingDown : Minus;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard title="Net Profit"     value={stats.netProfit}    icon={ProfitIcon} color={profitColor}         format="money"   />
      <StatCard title="Win Rate"       value={stats.winRate}      icon={Percent}    color="text-[#FFD700]"      format="percent" />
      <StatCard title="ROI"            value={stats.roi}          icon={RoiIcon}    color={roiColor}            format="percent" />
      <StatCard title="Total Wagered"  value={stats.totalWagered} icon={DollarSign} color="text-[#FFD700]/70"   format="money"   />
    </div>
  );
}