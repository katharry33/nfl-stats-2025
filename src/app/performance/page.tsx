'use client';

import React, { useState, useEffect, useMemo } from 'react';
// Correct relative imports
import { Bet, BetResult } from '../../lib/types';
import { PageHeader } from '../../components/layout/page-header';
import { KpiCard } from '../../features/tracker/kpi-card';
import { cn } from '../../lib/utils';
import { useFirestore } from '@/context/AuthContext';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
// Added missing icons
import { BadgeDollarSign, Landmark, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

// Helper to calculate payout based on odds (decimal or American)
const getPayout = (stake: number, odds: string | number): number => {
  const numOdds = Number(odds);
  if (numOdds > 0) return stake * (numOdds / 100);
  return stake * (100 / Math.abs(numOdds));
};

export default function PerformancePage() {
  const firestore = useFirestore();
  const [bets, setBets] = useState<Bet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore) return;

    const q = query(collection(firestore, 'bettingLog'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Bet));
      setBets(docs);
      setIsLoading(false);
    }, (err) => {
      console.error(err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore]);

  // Strictly typed calculations to clear "acc has any type" errors
  const stats = useMemo(() => {
    const totalWagered = bets.reduce((acc: number, bet: Bet) => acc + Number(bet.stake || 0), 0);
    
    const totalReturn = bets.reduce((acc: number, bet: Bet) => {
      if (bet.status === 'won') {
        const profit = getPayout(Number(bet.stake), bet.odds);
        return acc + Number(bet.stake) + profit;
      }
      if (bet.status === 'push' || bet.status === 'void') {
        return acc + Number(bet.stake);
      }
      return acc;
    }, 0);

    const netProfit = totalReturn - totalWagered;
    const roi = totalWagered > 0 ? (netProfit / totalWagered) * 100 : 0;

    return { totalWagered, netProfit, roi };
  }, [bets]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Performance Tracker" description="Analyze your betting ROI and bankroll growth." />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  <KpiCard 
    title="Total Wagered" 
    value={`$${stats.totalWagered.toFixed(2)}`} 
    icon={BadgeDollarSign} // Pass as reference, not <BadgeDollarSign />
  />
  <KpiCard 
    title="Net Profit" 
    value={`$${stats.netProfit.toFixed(2)}`} 
    icon={Landmark}
    change={stats.netProfit >= 0 ? "Profit" : "Loss"}
    changeType={stats.netProfit >= 0 ? "positive" : "negative"}
  />
  <KpiCard 
    title="ROI" 
    value={`${stats.roi.toFixed(1)}%`} 
    icon={stats.roi >= 0 ? TrendingUp : TrendingDown} 
    changeType={stats.roi >= 0 ? "positive" : "negative"}
  />
      </div>
    </div>
  );
}