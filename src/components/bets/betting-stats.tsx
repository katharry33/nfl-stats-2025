'use client';

import React from 'react';
import { useWallet } from '@/context/WalletContext';
import { TrendingUp, Award, Target } from 'lucide-react';
import type { Bet } from '@/lib/types';

export function BettingStats({ bets = [] }: { bets?: Bet[] }) {
  const { bankroll, bonusBalance } = useWallet();

  // Calculate actual stats
  const totalBets = bets.length;
  const wins = bets.filter(b => b.status === 'win').length;
  const winRate = totalBets > 0 ? ((wins / totalBets) * 100).toFixed(1) : '0';

  const stats = [
    { label: 'Bankroll', value: `$${bankroll.toLocaleString()}`, icon: TrendingUp, color: 'text-primary' },
    { label: 'Bonus', value: `$${bonusBalance.toLocaleString()}`, icon: Award, color: 'text-yellow-500' },
    { label: 'Win Rate', value: `${winRate}%`, icon: Target, color: 'text-green-500' },
    { label: 'Total Logs', value: totalBets.toString(), icon: Target, color: 'text-blue-500' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-card border border-border p-4 rounded-2xl flex items-center gap-4 transition-all hover:border-primary/20">
          <div className={`p-2.5 rounded-xl bg-secondary ${stat.color}`}>
            <stat.icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-1">
              {stat.label}
            </p>
            <p className="text-lg font-black font-mono leading-none">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
