'use client';
import { useMemo } from 'react';
import type { Bet } from '@/lib/types';
import { DollarSign, Percent, TrendingUp, TrendingDown, Minus, Target, Hash } from 'lucide-react';
import { toDecimal } from '@/lib/utils/odds';

function parseBoost(raw: any): number {
  if (!raw || raw === 'None' || raw === '') return 0;
  if (typeof raw === 'number') return raw;
  const n = parseFloat(String(raw).replace('%', ''));
  return isNaN(n) ? 0 : n;
}

// Only counts real parent bets. Rules:
//   1. Bonus bets → $0 (not real money)
//   2. Imported leg docs (ID contains '_leg_') → $0
//      These are DraftKings import artifacts where each parlay leg gets its own
//      doc with the FULL parlay odds. Counting them inflates profit by leg-count×.
//      Profit is tracked on the parent bet doc, not individual legs.
//   3. Won bets → use stored payout first, then odds (capped at ±10000)
//   4. Lost bets → -stake
//   5. Cashed → cashOutAmount - stake
function calcRealProfit(bet: any): number {
  if (Boolean(bet.isBonusBet)) return 0;

  // Skip imported leg documents — they duplicate the parent bet's P&L
  const id = String(bet.id ?? '');
  if (id.includes('_leg_')) return 0;

  const stake  = Number(bet.stake || bet.wager) || 0;
  const status = (bet.status ?? '').toLowerCase();

  if (status === 'lost' || status === 'loss') return -stake;

  if (status === 'cashed') {
    const cashOut = Number(bet.cashOutAmount ?? bet.payout) || 0;
    return cashOut - stake;
  }

  if (status === 'won' || status === 'win') {
    if (!stake) return 0;
    // Use stored payout when present — what the book actually paid
    const storedPayout = Number(bet.payout) || 0;
    if (storedPayout > 0) return storedPayout - stake;
    // Fall back to odds, capped at ±10000 to block corrupt migration values
    const rawOdds = Number(bet.odds) || 0;
    const odds    = Math.max(-10000, Math.min(10000, rawOdds));
    if (!odds) return 0;
    const boost = parseBoost(bet.boost);
    return stake * toDecimal(odds) * (1 + boost / 100) - stake;
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
    // Exclude imported leg docs from all financial calculations.
    // _leg_ docs are DraftKings import artifacts — each parlay leg gets its own
    // doc with the full parlay stake/odds, so counting them multiplies P&L by leg count.
    const isLegDoc = (b: any) => String(b.id ?? '').includes('_leg_');

    const realBets  = bets.filter(b => !Boolean((b as any).isBonusBet) && !isLegDoc(b));
    const bonusBets = bets.filter(b =>  Boolean((b as any).isBonusBet));

    const realSettled = realBets.filter(b => {
      const s = (b.status ?? '').toLowerCase();
      return s !== 'pending' && s !== 'void' && s !== 'push';
    });
    const realWon  = realSettled.filter(b => ['won','win','cashed'].includes((b.status ?? '').toLowerCase()));
    const realLost = realSettled.filter(b => ['lost','loss'].includes((b.status ?? '').toLowerCase()));
    const pending  = bets.filter(b => (b.status ?? '').toLowerCase() === 'pending');

    const totalWagered = realSettled.reduce((sum, b: any) =>
      sum + (Number(b.stake || b.wager) || 0), 0);

    const netProfit    = realSettled.reduce((sum, b) => sum + calcRealProfit(b), 0);
    const winLossCount = realWon.length + realLost.length;
    const winRate      = winLossCount > 0 ? (realWon.length / winLossCount) * 100 : 0;
    const roi          = totalWagered > 0 ? (netProfit / totalWagered) * 100 : 0;

    const pendingStake = pending.reduce((sum, b: any) => sum + (Number(b.stake || b.wager) || 0), 0);

    const oddsVals = realSettled.map(b => Number((b as any).odds)).filter(o => {
      // Exclude corrupted odds values from average
      return o !== 0 && isFinite(o) && Math.abs(o) <= 10000;
    });
    const avgOdds = oddsVals.length > 0
      ? Math.round(oddsVals.reduce((s, o) => s + o, 0) / oddsVals.length)
      : null;

    return {
      totalWagered, netProfit, winRate, roi,
      wonCount:     realWon.length,
      lostCount:    realLost.length,
      pendingCount: pending.length,
      pendingStake,
      settledCount: realSettled.length,
      bonusCount:   bonusBets.length,
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