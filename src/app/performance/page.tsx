'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Bet } from '@/lib/types';
import { PageHeader } from '@/components/layout/page-header';
import { KpiCard } from '@/features/tracker/kpi-card';
import { useFirestore } from '@/lib/firebase/provider';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { BadgeDollarSign, Landmark, TrendingUp, TrendingDown, Loader2, Search, History } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

// Helper to calculate payout based on odds (decimal or American)
const getPayout = (stake: number, odds: string | number): number => {
  const numOdds = Number(odds);
  if (numOdds > 0) return stake * (numOdds / 100);
  if (numOdds < 0) return stake / (Math.abs(numOdds) / 100);
  return stake;
};

// Bulletproof helper to safely convert a flexible timestamp to a Date object.
const ensureDate = (ts: any): Date => {
  if (!ts) return new Date();
  // Firestore Timestamp
  if (ts && typeof ts.toDate === 'function') {
    return ts.toDate();
  }
  // ISO string or number
  try {
    const d = new Date(ts);
    if (!isNaN(d.getTime())) return d;
  } catch (e) {
    // ignore
  }
  return new Date();
};

const BetCard = ({ bet }: { bet: Bet }) => {
    const payout = useMemo(() => {
        if (bet.status !== 'won') return 0;
        return getPayout(Number(bet.stake), bet.odds) + Number(bet.stake);
    }, [bet.status, bet.stake, bet.odds]);

    const statusConfig: { [key: string]: { className: string; text: string } } = {
      won: { className: 'bg-green-600 hover:bg-green-700', text: 'Won' },
      lost: { className: 'bg-red-600 hover:bg-red-700', text: 'Lost' },
      pending: { className: 'bg-amber-600 hover:bg-amber-700', text: 'Pending' },
      push: { className: 'bg-slate-500 hover:bg-slate-600', text: 'Push' },
      void: { className: 'bg-slate-500 hover:bg-slate-600', text: 'Void' },
    };
    
    const { className, text } = statusConfig[bet.status] || statusConfig.pending;
    const createdAtDate = ensureDate(bet.createdAt);

    return (
        <Card className="bg-slate-900 border-slate-800 text-white shadow-lg hover:border-slate-700 transition-colors">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            {bet.betType} 
                            {bet.isLive && <Badge className='bg-red-500 text-white'>Live</Badge>}
                        </CardTitle>
                        <CardDescription className="text-slate-400">
                           {format(createdAtDate, 'PPP p')} 
                        </CardDescription>
                    </div>
                    <Badge className={className}>{text}</Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center mb-6 p-3 bg-slate-950 rounded-lg">
                    <div>
                        <Label className="text-xs text-slate-400">Stake</Label>
                        <p className="font-semibold text-lg">${Number(bet.stake).toFixed(2)}</p>
                    </div>
                    <div>
                        <Label className="text-xs text-slate-400">Odds</Label>
                        <p className="font-semibold text-lg">{bet.odds > 0 ? `+${bet.odds}` : bet.odds}</p>
                    </div>
                    <div>
                        <Label className="text-xs text-slate-400">Payout</Label>
                        <p className={`font-semibold text-lg ${bet.status === 'won' ? 'text-green-400' : 'text-slate-500'}`}>
                            ${payout.toFixed(2)}
                        </p>
                    </div>
                </div>
                <div className='space-y-2'>
                    <h4 className="font-semibold text-slate-300 mb-2">Legs</h4>
                    {bet.legs?.map((leg, index) => (
                        <div key={index} className="p-3 bg-slate-800 rounded-md text-sm border border-slate-700">
                            <div className='flex justify-between items-center'>
                                <p className='font-bold text-slate-100'>{leg.player}: <span className='font-normal'>{leg.prop} {leg.selection} {leg.line}</span></p>
                                <Badge variant={leg.status === 'won' ? 'default' : 'outline'} className={
                                    leg.status === 'won' ? 'bg-green-500/20 text-green-300 border-green-500/30' : 
                                    leg.status === 'lost' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'border-slate-600'
                                }>{leg.status}</Badge>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{leg.matchup}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export default function PerformancePage() {
  const firestore = useFirestore();
  const [bets, setBets] = useState<Bet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!firestore) return;

    const q = query(collection(firestore, 'bettingLog'), orderBy('createdAt', 'desc'));
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

  const filteredBets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return bets;

    return bets.filter(bet => {
      const mainInfo = `${bet.id} ${bet.status} ${bet.betType}`.toLowerCase();
      if (mainInfo.includes(q)) return true;

      return bet.legs?.some((leg: any) => {
        const playerName = (leg.player || leg.playerteam || "").toLowerCase();
        const propName = (leg.prop || "").toLowerCase();
        const matchup = (leg.matchup || "").toLowerCase();
        
        return playerName.includes(q) || propName.includes(q) || matchup.includes(q);
      });
    });
  }, [bets, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <PageHeader title="Performance Tracker" description="Analyze your betting ROI and search your bet history." />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard 
          title="Total Wagered" 
          value={`$${stats.totalWagered.toFixed(2)}`} 
          icon={BadgeDollarSign}
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

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5"/>Search Bet History</CardTitle>
        </CardHeader>
        <CardContent>
            <Input
                placeholder="Search by player, prop, team, status, or bet ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xl bg-slate-950 border-slate-700"
            />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredBets.length > 0 ? (
            filteredBets.map(bet => (
                <BetCard key={bet.id} bet={bet} />
            ))
        ) : (
            <div className="text-center py-16 text-slate-500">
                <History className="h-12 w-12 mx-auto mb-4 text-slate-600"/>
                <h3 className="text-lg font-semibold">No Bets Found</h3>
                <p>Your search returned no results. Try another query or add some bets!</p>
            </div>
        )}
      </div>
    </div>
  );
}