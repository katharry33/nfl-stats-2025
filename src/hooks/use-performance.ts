'use client';

import { useState, useEffect, useMemo } from 'react';
import { toDecimal } from '@/lib/utils/odds';

export function usePerformance() {
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch data from your API
  useEffect(() => {
    let isMounted = true;
    
    fetch('/api/performance')
      .then((r) => r.json())
      .then((json) => {
        if (isMounted) {
          setBets(Array.isArray(json) ? json : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Performance API Error:", err);
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  const stats = useMemo(() => {
    // 2. Filter settled bets (Exclude pending/void/push from ROI/WinRate)
    const settled = bets.filter(
      (b) => !['pending', 'void', 'push'].includes((b.status || '').toLowerCase())
    );
    
    const wins = settled.filter((b) => 
      ['won', 'win'].includes((b.status || '').toLowerCase())
    );

    // 3. Profit Calculation Logic (Handles Stake, Odds, and Boosts)
    const calcProfit = (bet: any) => {
      if (bet.isBonusBet) return 0; // Bonus bets usually don't return stake
      
      const stake = Number(bet.stake || bet.wager) || 0;
      const status = (bet.status || '').toLowerCase();
      
      if (['won', 'win'].includes(status)) {
        const odds = Number(bet.odds) || 0;
        // Parse boost (e.g., "10%" -> 0.10)
        const boostStr = String(bet.boost || '0').replace('%', '');
        const boost = parseFloat(boostStr) / 100;
        
        // Formula: (Stake * Decimal Odds * BoostMultiplier) - Stake
        return stake * toDecimal(odds) * (1 + boost) - stake;
      }
      
      if (['lost', 'loss'].includes(status)) {
        return -stake;
      }
      
      return 0; // Pushes/Voids = $0 profit
    };

    const totalProfit = settled.reduce((a, b) => a + calcProfit(b), 0);
    const totalWagered = settled.reduce((a, b) => a + (Number(b.stake || b.wager) || 0), 0);
    const winRate = settled.length ? (wins.length / settled.length) * 100 : 0;
    const roi = totalWagered ? (totalProfit / totalWagered) * 100 : 0;

    // 4. Cumulative Chart Data Generation
    // We sort by date to ensure the "Momentum" line moves forward correctly
    const sortedBets = [...bets].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateA - dateB;
    });

    let runningTotal = 0;
    const dailyTotals: Record<string, number> = {};

    sortedBets.forEach((b) => {
      // Basic validation for dates
      const dateObj = new Date(b.createdAt);
      if (isNaN(dateObj.getTime())) return;

      const key = dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
      
      // Update the running total with this specific bet's outcome
      runningTotal += calcProfit(b);
      
      // Store the snapshot for that day
      dailyTotals[key] = runningTotal;
    });

    // Convert the map into the format Recharts/Sparkline expects
    const chartData = Object.entries(dailyTotals).map(([name, cumulative]) => ({
      name,
      profit: cumulative // We label it 'profit' so the PnLSparkline can find the value
    }));

    return {
      totalProfit,
      totalWagered,
      winRate,
      roi,
      chartData,
      settledCount: settled.length,
      winCount: wins.length,
      totalBets: bets.length, // Total number of bets (including pending)
      rawBets: bets
    };
  }, [bets]);

  return { 
    stats, 
    loading, 
    refresh: () => setLoading(true) 
  };
}