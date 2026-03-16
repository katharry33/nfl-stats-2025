'use client';

import { useState, useEffect, useMemo } from 'react';
import { toDecimal } from '@/lib/utils/odds';

export function usePerformance() {
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/performance')
      .then((r) => r.json())
      .then((json) => {
        setBets(Array.isArray(json) ? json : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    // 1. Filter settled bets
    const settled = bets.filter(
      (b) => !['pending', 'void', 'push'].includes((b.status || '').toLowerCase())
    );
    const wins = settled.filter((b) => ['won', 'win'].includes((b.status || '').toLowerCase()));

    // 2. Calculate Profit logic (re-used from your page)
    const calcProfit = (bet: any) => {
      if (bet.isBonusBet) return 0;
      const stake = Number(bet.stake || bet.wager) || 0;
      const status = (bet.status || '').toLowerCase();
      if (['won', 'win'].includes(status)) {
        const odds = Number(bet.odds) || 0;
        const boost = parseFloat(String(bet.boost || '0').replace('%', '')) / 100;
        return stake * toDecimal(odds) * (1 + boost) - stake;
      }
      if (['lost', 'loss'].includes(status)) return -stake;
      return 0;
    };

    const totalProfit = settled.reduce((a, b) => a + calcProfit(b), 0);
    const totalWagered = settled.reduce((a, b) => a + (Number(b.stake || b.wager) || 0), 0);
    const winRate = settled.length ? (wins.length / settled.length) * 100 : 0;
    const roi = totalWagered ? (totalProfit / totalWagered) * 100 : 0;

    // 3. Chart Data Generation (for the Dashboard & Lab)
    const groups: Record<string, number> = {};
    [...bets]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .forEach((b) => {
        const d = new Date(b.createdAt);
        const key = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
        groups[key] = (groups[key] || 0) + calcProfit(b);
      });

    const chartData = Object.entries(groups).map(([name, profit]) => ({ name, profit }));

    return {
      totalProfit,
      totalWagered,
      winRate,
      roi,
      chartData,
      settledCount: settled.length,
      winCount: wins.length,
      rawBets: bets
    };
  }, [bets]);

  return { stats, loading, refresh: () => setLoading(true) };
}