'use client';
import { useMemo } from 'react';
import type { Bet } from '@/lib/types';
import { DollarSign, Percent, TrendingUp, TrendingDown, Minus, Target, Hash } from 'lucide-react';
import { toDecimal } from '@/lib/utils/odds';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseBoost(raw: any): number {
  if (!raw || raw === 'None' || raw === '') return 0;
  if (typeof raw === 'number') return raw;
  const n = parseFloat(String(raw).replace('%', ''));
  return isNaN(n) ? 0 : n;
}

// Only counts real-money bets. Bonus bets are excluded entirely from profit/ROI
// because including their winnings in the numerator but not their "stake" in the
// denominator artificially inflates ROI. They show in a separate counter.
function calcRealProfit(bet: any): number {
  if (Boolean(bet.isBonusBet)) return 0; // excluded — not real money

  const stake  = Number(bet.stake || bet.wager) || 0;
  const odds   = Number(bet.odds) || 0;
  const boost  = parseBoost(bet.boost);
  const status = (bet.status ?? '').toLowerCase();

  if (status === 'lost' || status === 'loss') return -stake;

  if (status === 'cashed') {
    const cashOut = Number(bet.cashOutAmount ?? bet.payout) || 0;
    return cashOut - stake;
  }

  if (status === 'won' || status === 'win') {
    if (!odds || !stake) return 0;
    const payout = stake * toDecimal(odds) * (1 + boost / 100);
    return payout - stake;
  }

  return 0;
}

function fmtValue(value: number, format: 'money' | 'percent' | 'number'): string {
  if (!isFinite(value) || isNaN(value)) return '—';
  if (format === 'money') {
    const abs = Math.abs(value);
    const str = abs >= 10000 ? `$${(abs / 1000).toFixed(1)}k`
               : abs >= 1000  ? `$${abs.toFixed(0)}`
               : `$${abs.toFixed(2)}`;
    return value < 0 ? `-${str}` : str;
  }
  if (format === 'percent') return `${value.toFixed(1)}%`;
  return value.toLocaleString();
}

function StatCard({ title, value, sub, icon: Icon, color, format = 'number' }: {
  title: string; value: number | null; sub?: string; icon: any;
  color: string; format?: 'money' | 'percent' | 'number';
}) {
  const display = (value === null || value === undefined || isNaN(value as number))
    ? '—' : fmtValue(value as number, format);

  return (
    <div className="bg-[#0f1115] border border-white/5 rounded-2xl p-4 flex items-start gap-3
                    hover:border-white/10 transition-colors min-w-0 overflow-hidden">
      <div className={`p-2 bg-white/[0.04] border border-white/[0.06] rounded-xl shrink-0 mt-0.5 ${color}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.15em] truncate">{title}</p>
        <p className={`text-xl font-black font-mono tracking-tight mt-0.5 truncate ${color}`}>{display}</p>
        {sub && <p className="text-[9px] text-zinc-600 font-mono mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

export function BettingStats({ bets }: { bets: Bet[] }) {
  const stats = useMemo(() => {
    // Only real-money bets for performance stats
    const realBets = bets.filter(b => !Boolean((b as any).isBonusBet));
    const bonusBets = bets.filter(b => Boolean((b as any).isBonusBet));

    const realSettled = realBets.filter(b => {
      const s = (b.status ?? '').toLowerCase();
      return s !== 'pending' && s !== 'void' && s !== 'push';
    });
    const realWon  = realSettled.filter(b => ['won','win','cashed'].includes((b.status ?? '').toLowerCase()));
    const realLost = realSettled.filter(b => ['lost','loss'].includes((b.status ?? '').toLowerCase()));

    // All bets (including bonus) for pending count
    const pending = bets.filter(b => (b.status ?? '').toLowerCase() === 'pending');

    const totalWagered = realSettled.reduce((sum, b: any) =>
      sum + (Number(b.stake || b.wager) || 0), 0);

    const netProfit    = realSettled.reduce((sum, b) => sum + calcRealProfit(b), 0);
    const winLossCount = realWon.length + realLost.length;
    const winRate      = winLossCount > 0 ? (realWon.length / winLossCount) * 100 : 0;
    const roi          = totalWagered > 0 ? (netProfit / totalWagered) * 100 : 0;

    const pendingStake = pending.reduce((sum, b: any) => sum + (Number(b.stake || b.wager) || 0), 0);

    // Avg odds across real settled bets only
    const oddsVals = realSettled.map(b => Number(b.odds)).filter(o => o !== 0 && isFinite(o));
    const avgOdds  = oddsVals.length > 0
      ? Math.round(oddsVals.reduce((s, o) => s + o, 0) / oddsVals.length)
      : null;

    return {
      totalWagered, netProfit, winRate, roi,
      wonCount: realWon.length, lostCount: realLost.length,
      pendingCount: pending.length, pendingStake,
      settledCount: realSettled.length,
      bonusCount: bonusBets.length,
      avgOdds,
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
        sub={`${stats.settledCount} real-money settled`}
        icon={ProfitIcon} color={profitColor} format="money"
      />
      <StatCard
        title="Win Rate"
        value={stats.winRate}
        sub={`${stats.wonCount}W – ${stats.lostCount}L`}
        icon={Percent} color="text-[#FFD700]" format="percent"
      />
      <StatCard
        title="ROI"
        value={stats.roi}
        sub={`on $${stats.totalWagered.toFixed(0)} wagered`}
        icon={RoiIcon} color={roiColor} format="percent"
      />
      <StatCard
        title="Total Wagered"
        value={stats.totalWagered}
        sub="real money only"
        icon={DollarSign} color="text-[#FFD700]/70" format="money"
      />
      <StatCard
        title="Pending"
        value={stats.pendingCount}
        sub={`$${stats.pendingStake.toFixed(2)} at risk`}
        icon={Hash} color="text-zinc-400" format="number"
      />
      <StatCard
        title="Avg Odds"
        value={stats.avgOdds}
        sub="real bets only"
        icon={Target} color="text-zinc-400" format="number"
      />
    </div>
  );
}