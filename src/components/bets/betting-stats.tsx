'use client';

import React from 'react';
import { useWallet } from '@/context/WalletContext';
import { TrendingUp, Award, Target } from 'lucide-react';

export function BettingStats() {
  const { bankroll, bonusBalance } = useWallet();

  const stats = [
    { label: 'Bankroll', value: `$${bankroll.toLocaleString()}`, icon: TrendingUp, color: 'text-primary' },
    { label: 'Bonus', value: `$${bonusBalance.toLocaleString()}`, icon: Award, color: 'text-yellow-500' },
    { label: 'Efficiency', value: 'High', icon: Target, color: 'text-green-500' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-card border border-border p-4 rounded-2xl flex items-center gap-4">
          <div className={`p-3 rounded-xl bg-secondary ${stat.color}`}>
            <stat.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </p>
            <p className="text-xl font-black font-mono">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}