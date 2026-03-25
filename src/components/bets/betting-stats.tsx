'use client';

import React from 'react';
import { useWallet } from '@/context/WalletContext';
import { TrendingUp, Award, Target, Hash } from 'lucide-react';
import type { Bet } from '@/lib/types';

// Changed to Named Export to match your import: import { BettingStats } from ...
export function BettingStats({ bets = [] }: { bets?: Bet[] }) {
  const { bankroll, bonusBalance } = useWallet();

  // Robust stat calculation
  const totalBets = bets.length;
  const wins = bets.filter(b => 
    b.status?.toLowerCase() === 'win' || 
    b.actualResult?.toLowerCase() === 'hit' ||
    b.actualResult?.toLowerCase() === 'won'
  ).length;
  
  const winRate = totalBets > 0 ? ((wins / totalBets) * 100).toFixed(1) : '0.0';

  const stats = [
    { 
      label: 'Bankroll', 
      value: `$${bankroll.toLocaleString()}`, 
      icon: TrendingUp, 
      color: 'text-indigo-400' 
    },
    { 
      label: 'Bonus', 
      value: `$${bonusBalance.toLocaleString()}`, 
      icon: Award, 
      color: 'text-amber-500' 
    },
    { 
      label: 'Win Rate', 
      value: `${winRate}%`, 
      icon: Target, 
      color: 'text-emerald-400' 
    },
    { 
      label: 'Total Logs', 
      value: totalBets.toString(), 
      icon: Hash, 
      color: 'text-sky-400' 
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div 
          key={stat.label} 
          className="bg-[#141414] border border-white/5 p-4 rounded-2xl flex items-center gap-4 transition-all hover:border-indigo-500/20 group"
        >
          <div className={`p-2.5 rounded-xl bg-white/5 ${stat.color} group-hover:scale-110 transition-transform`}>
            <stat.icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 leading-none mb-1.5">
              {stat.label}
            </p>
            <p className="text-xl font-black font-mono leading-none tabular-nums text-white">
              {stat.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}