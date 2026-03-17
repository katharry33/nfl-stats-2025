'use client';

import React, { useState, useMemo } from 'react';
import { useWallet, WalletProvider } from '@/context/WalletContext';
import { calculateRecommendation } from '@/lib/math/kelly';
import { Loader2, TrendingUp, Wallet as WalletIcon } from 'lucide-react';

// Main dashboard content
function WalletDashboard() {
  const { bankroll, bonusBalance, loading } = useWallet();
  const [selectedOdds, setSelectedOdds] = useState('-110');
  const [estimatedHitRate, setEstimatedHitRate] = useState(55);

  const recommendation = useMemo(() => {
    return calculateRecommendation(
      estimatedHitRate, 
      selectedOdds, 
      bankroll // Use the live bankroll from the hook
    );
  }, [estimatedHitRate, selectedOdds, bankroll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#FFD700]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="bg-card p-6 rounded-3xl border border-border">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          <p className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em]">
            Available Bankroll
          </p>
        </div>
        <h2 className="text-4xl font-black tracking-tighter text-emerald-400 font-mono">
          ${bankroll.toFixed(2)}
        </h2>
      </div>

      {/* Smart Stake Calculator */}
      <div className="bg-[#FFD700]/10 p-6 rounded-3xl border border-[#FFD700]/20">
        <p className="text-xs font-black uppercase text-[#FFD700] mb-4">
          Smart Stake (1/4 Kelly)
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase ml-2">Odds</label>
            <input 
              type="text" 
              value={selectedOdds}
              onChange={(e) => setSelectedOdds(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-center" 
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase ml-2">Est. Win %</label>
            <input 
              type="number" 
              value={estimatedHitRate}
              onChange={(e) => setEstimatedHitRate(Number(e.target.value))}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-center" 
            />
          </div>
        </div>
        <p className="text-2xl font-black text-foreground text-center">
          ${(recommendation.recommendedWager / 4).toFixed(2)}
        </p>
        <p className="text-center text-xs text-zinc-500 font-mono mt-1">
          Kelly Fraction: {(recommendation.kellyFraction * 100).toFixed(2)}%
        </p>
      </div>
    </div>
  );
}

// The main export for the page, wrapped in the provider
export default function WalletPage() {
  return (
    <WalletProvider>
       <div className="min-h-screen bg-background p-6">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-xl flex items-center justify-center">
              <WalletIcon className="h-5 w-5 text-[#FFD700]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground italic uppercase tracking-tighter">My Wallet</h1>
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Smart Staking</p>
            </div>
          </div>
          <WalletDashboard />
        </div>
      </div>
    </WalletProvider>
  );
}
