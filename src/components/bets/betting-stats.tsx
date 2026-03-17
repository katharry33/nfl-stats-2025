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

function calcRealProfit(bet: any): number {
  if (Boolean(bet.isBonusBet)) return 0;
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
    const storedPayout = Number(bet.payout) || 0;
    if (storedPayout > 0) return storedPayout - stake;
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

// ─── StatCard ─────────────────────────────────────────────────────────────────
// Teal-accented cards on white background

function StatCard({ title, value, sub, icon: Icon, variant = 'default', format = 'number' }: {
  title:   string;
  value:   number | null;
  sub?:    string;
  icon:    any;
  variant?: 'default' | 'profit' | 'loss' | 'muted';
  format?: 'money' | 'percent' | 'number';
}) {
  const display = (value === null || value === undefined || isNaN(value as number))
    ? '—' : fmtValue(value as number, format);

  const valueColor =
    variant === 'profit' ? 'text-profit' :
    variant === 'loss'   ? 'text-loss'   :
    variant === 'muted'  ? 'text-muted-foreground' :
                           'text-primary';

  const iconBg =
    variant === 'profit' ? 'bg-profit/10 text-profit' :
    variant === 'loss'   ? 'bg-loss/10 text-loss'     :
    variant === 'muted'  ? 'bg-muted text-muted-foreground' :
                           'bg-primary/10 text-primary';

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 hover:shadow-sm transition-shadow min-w-0 overflow-hidden">
      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${iconBg}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide truncate">{title}</p>
        <p className={`text-xl font-bold font-mono tracking-tight mt-0.5 truncate ${valueColor}`}>{display}</p>
        {sub && <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

export function BettingStats({ bets }: { bets: Bet[] }) {
  const stats = useMemo(() => {
    const isLegDoc  = (b: any) => String(b.id ?? '').includes('_leg_');
    const realBets  = bets.filter(b => !Boolean((b as any).isBonusBet) && !isLegDoc(b));
    const bonusBets = bets.filter(b =>  Boolean((b as any).isBonusBet));

    const realSettled = realBets.filter(b => {
      const s = (b.status ?? '').toLowerCase();
      return s !== 'pending' && s !== 'void' && s !== 'push';
    });
    const realWon  = realSettled.filter(b => ['won','win','cashed'].includes((b.status ?? '').toLowerCase()));
    const realLost = realSettled.filter(b => ['lost','loss'].includes((b.status ?? '').toLowerCase()));
    const pending  = bets.filter(b => (b.status ?? '').toLowerCase() === 'pending');

    const totalWagered = realSettled.reduce((sum, b: any) => sum + (Number(b.stake || b.wager) || 0), 0);
    const netProfit    = realSettled.reduce((sum, b) => sum + calcRealProfit(b), 0);
    const winLossCount = realWon.length + realLost.length;
    const winRate      = winLossCount > 0 ? (realWon.length / winLossCount) * 100 : 0;
    const roi          = totalWagered > 0 ? (netProfit / totalWagered) * 100 : 0;
    const pendingStake = pending.reduce((sum, b: any) => sum + (Number(b.stake || b.wager) || 0), 0);

    const oddsVals = realSettled.map(b => Number((b as any).odds))
      .filter(o => o !== 0 && isFinite(o) && Math.abs(o) <= 10000);
    const avgOdds = oddsVals.length > 0
      ? Math.round(oddsVals.reduce((s, o) => s + o, 0) / oddsVals.length) : null;

    return {
      totalWagered, netProfit, winRate, roi,
      wonCount: realWon.length, lostCount: realLost.length,
      pendingCount: pending.length, pendingStake,
      settledCount: realSettled.length,
      bonusCount: bonusBets.length, avgOdds,
    };
  }, [bets]);

  const ProfitIcon = stats.netProfit > 0 ? TrendingUp : stats.netProfit < 0 ? TrendingDown : Minus;
  const RoiIcon    = stats.roi > 0       ? TrendingUp : stats.roi < 0       ? TrendingDown : Minus;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      <StatCard
        title="Net Profit" value={stats.netProfit}
        sub={`${stats.settledCount} settled`}
        icon={ProfitIcon}
        variant={stats.netProfit >= 0 ? 'profit' : 'loss'}
        format="money"
      />
      <StatCard
        title="Win Rate" value={stats.winRate}
        sub={`${stats.wonCount}W – ${stats.lostCount}L`}
        icon={Percent} variant="default" format="percent"
      />
      <StatCard
        title="ROI" value={stats.roi}
        sub={`on $${stats.totalWagered.toFixed(0)} wagered`}
        icon={RoiIcon}
        variant={stats.roi >= 0 ? 'profit' : 'loss'}
        format="percent"
      />
      <StatCard
        title="Total Wagered" value={stats.totalWagered}
        sub="real money only"
        icon={DollarSign} variant="default" format="money"
      />
      <StatCard
        title="Pending" value={stats.pendingCount}
        sub={`$${stats.pendingStake.toFixed(2)} at risk`}
        icon={Hash} variant="muted" format="number"
      />
      <StatCard
        title="Avg Odds" value={stats.avgOdds}
        sub="real bets only"
        icon={Target} variant="muted" format="number"
      />
    </div>
  );
}