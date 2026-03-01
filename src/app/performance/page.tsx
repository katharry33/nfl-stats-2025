'use client';

import { Bet } from '@/lib/types';
import { TrendingUp, TrendingDown, Minus, Percent, DollarSign } from 'lucide-react';

function StatCard({ title, value, color = 'text-white', icon: Icon }: {
  title: string; value: string; color?: string; icon?: any;
}) {
  return (
    <div className="bg-[#0f1115] border border-white/[0.06] p-5 rounded-2xl flex items-start gap-4
      hover:border-white/10 transition-colors">
      {Icon && (
        <div className={`p-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl shrink-0 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div>
        <p className="text-[10px] uppercase font-black text-zinc-600 tracking-[0.2em]">{title}</p>
        <p className={`text-2xl font-black font-mono tracking-tight mt-0.5 ${color}`}>{value}</p>
      </div>
    </div>
  );
}

export default function PerformancePage({ bets }: { bets: Bet[] }) {
  const typedBets = (bets || []) as Bet[];

  const totalStaked = typedBets.reduce((acc, b) => acc + (Number(b.stake) || 0), 0);

  const totalProfit = typedBets.reduce((acc, b) => {
    if (b.status === 'cashed')
      return acc + ((Number((b as any).cashedAmount) || 0) - (Number(b.stake) || 0));
    return acc + (Number((b as any).profit) || 0);
  }, 0);

  const settledBets = typedBets.filter(b => b.status !== 'pending' && b.status !== 'void');
  const wonBets     = settledBets.filter(b => b.status === 'won');
  const winRate     = settledBets.length > 0 ? (wonBets.length / settledBets.length) * 100 : 0;
  const roi         = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;

  const profitColor = totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400';
  const roiColor    = roi >= 0 ? 'text-emerald-400' : 'text-red-400';
  const ProfitIcon  = totalProfit >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="min-h-screen bg-[#060606] p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">My Performance</h1>
        <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest mt-1">
          Season overview &amp; stats
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Total Staked"  value={`$${totalStaked.toFixed(2)}`}  color="text-[#FFD700]/80"  icon={DollarSign} />
        <StatCard title="Profit / Loss" value={`$${totalProfit.toFixed(2)}`}  color={profitColor}        icon={ProfitIcon} />
        <StatCard title="Win Rate"      value={`${winRate.toFixed(1)}%`}       color="text-[#FFD700]"     icon={Percent} />
        <StatCard title="ROI"           value={`${roi.toFixed(1)}%`}           color={roiColor}           icon={roi >= 0 ? TrendingUp : TrendingDown} />
      </div>

      {/* placeholder for charts / more content */}
    </div>
  );
}