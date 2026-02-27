'use client';

import { Bet } from '@/lib/types';

// ... (imports and component setup)

export default function PerformancePage({ bets }: { bets: Bet[] }) {
  // Ensure we treat the data as the correct type
  const typedBets = (bets || []) as Bet[];

  // 1. Total Staked Calculation
  const totalStaked = typedBets.reduce((acc: number, b: Bet) => {
    return acc + (Number(b.stake) || 0);
  }, 0);

  // 2. Total Profit Calculation
  const totalProfit = typedBets.reduce((acc: number, b: Bet) => {
    return acc + (Number(b.profit) || 0);
  }, 0);

  // 3. Win Rate Calculation
  const settledBets = typedBets.filter(b => b.status !== 'pending' && b.status !== 'void');
  const wonBets = settledBets.filter(b => b.status === 'won');
  const winRate = settledBets.length > 0 
    ? (wonBets.length / settledBets.length) * 100 
    : 0;

  // 4. ROI Calculation
  const roi = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Staked" value={`$${totalStaked.toFixed(2)}`} />
        <StatCard 
          title="Profit/Loss" 
          value={`$${totalProfit.toFixed(2)}`} 
          color={totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'} 
        />
        <StatCard title="Win Rate" value={`${winRate.toFixed(1)}%`} />
        <StatCard title="ROI" value={`${roi.toFixed(1)}%`} />
      </div>
      
      {/* ... rest of your UI */}
    </div>
  );
}

function StatCard({ title, value, color = 'text-white' }: any) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
      <p className="text-[10px] uppercase font-black text-slate-500 mb-1">{title}</p>
      <p className={`text-xl font-mono font-bold ${color}`}>{value}</p>
    </div>
  );
}
