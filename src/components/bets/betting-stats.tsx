'use client';

import { useMemo } from 'react';
import { Bet } from "@/lib/types";
import { getBetPayout } from '@/lib/utils/payout';
import { TrendingUp, TrendingDown, Target, Wallet } from "lucide-react";

export function BettingStats({ bets }: { bets: Bet[] }) {

  const stats = useMemo(() => {
    return bets.reduce((acc, bet) => {
      const stake = Number(bet.stake || 0);
      
      if (bet.status === 'pending') {
        acc.pendingStake += stake;
        return acc;
      }
      
      // Only include settled bets with a stake for profit/loss calculations
      if (stake === 0) {
        return acc;
      }
      
      const payout = getBetPayout(bet);

      switch (payout.type) {
        case 'won':
          acc.totalProfit += payout.amount;
          acc.wins += 1;
          acc.totalStaked += stake;
          break;
        case 'lost':
          acc.totalProfit -= stake;
          acc.losses += 1;
          acc.totalStaked += stake;
          break;
        case 'cashout':
          acc.totalProfit += (payout.amount - stake);
          acc.totalStaked += stake;
          if (payout.amount > stake) acc.wins += 1;
          else if (payout.amount < stake) acc.losses += 1;
          else acc.voids += 1;
          break;
        case 'void':
          acc.voids += 1;
          break;
        default:
          break;
      }
      
      return acc;
    }, { totalProfit: 0, wins: 0, losses: 0, voids: 0, totalStaked: 0, pendingStake: 0 });
  }, [bets]);

  const winRate = (stats.wins + stats.losses) > 0 
    ? (stats.wins / (stats.wins + stats.losses)) * 100 
    : 0;

  const roi = stats.totalStaked > 0 
    ? (stats.totalProfit / stats.totalStaked) * 100 
    : 0;

  const cards = [
    { label: "Net Profit", value: `$${stats.totalProfit.toFixed(2)}`, icon: stats.totalProfit >= 0 ? TrendingUp : TrendingDown, color: stats.totalProfit >= 0 ? "text-emerald-500" : "text-red-500" },
    { label: "Win Rate", value: `${winRate.toFixed(1)}%`, icon: Target, color: "text-blue-500" },
    { label: "ROI", value: `${roi.toFixed(1)}%`, icon: Wallet, color: "text-yellow-500" },
    { label: "Pending", value: `$${stats.pendingStake.toFixed(2)}`, icon: Wallet, color: "text-slate-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <card.icon className={`h-4 w-4 ${card.color}`} />
            <span className="text-[10px] uppercase font-bold text-slate-500">{card.label}</span>
          </div>
          <p className={`text-xl font-mono font-bold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
