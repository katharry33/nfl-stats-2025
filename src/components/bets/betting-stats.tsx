"use client";

import { useMemo } from "react";
import { TrendingUp, Target, Wallet, BarChart3 } from "lucide-react";
import { KpiCard } from "@/features/tracker/kpi-card"; // Reusing your KpiCard
import { calculateNetProfit } from "@/lib/utils";
import type { Bet } from "@/lib/types";

interface BettingStatsProps {
  bets: Bet[];
}

export function BettingStats({ bets }: BettingStatsProps) {
  const stats = useMemo(() => {
    const betsArray = Array.isArray(bets) ? bets : [];
    const settledBets = betsArray.filter((b) => b.status !== "pending");
    
    let totalProfit = 0;
    let totalStaked = 0;
    let wins = 0;

    settledBets.forEach((bet) => {
      const stake = Number(bet.stake || (bet as any).wager || 0);
      totalStaked += stake;

      const status = bet.status?.toLowerCase();
      
      if (status === "won") {
        wins++;
        totalProfit += calculateNetProfit(stake, bet.odds);
      } else if (status === "lost") {
        totalProfit -= stake;
      } else if (status?.includes("cashed")) {
        const profit = Number(bet.payout || 0) - Number(bet.stake || 0);
        totalProfit += profit;
        if (profit > 0) wins++; // Count profitable cash-outs as wins
      }
    });

    const winRate = settledBets.length > 0 ? (wins / settledBets.length) * 100 : 0;
    const roi = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;

    return {
      totalProfit,
      totalStaked,
      winRate,
      roi,
      count: bets.length,
    };
  }, [bets]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        title="Total Profit"
        value={`$${stats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
        icon={Wallet}
        changeType={stats.totalProfit >= 0 ? "positive" : "negative"}
        className={stats.totalProfit >= 0 ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-rose-500"}
      />
      
      <KpiCard
        title="Win Rate"
        value={`${stats.winRate.toFixed(1)}%`}
        icon={Target}
        change={`${stats.count} Total Bets`}
      />

      <KpiCard
        title="Total Staked"
        value={`$${stats.totalStaked.toLocaleString()}`}
        icon={BarChart3}
      />

      <KpiCard
        title="Yield (ROI)"
        value={`${stats.roi.toFixed(1)}%`}
        icon={TrendingUp}
        changeType={stats.roi >= 0 ? "positive" : "negative"}
        change={stats.roi >= 0 ? "In the green" : "In the red"}
      />
    </div>
  );
}