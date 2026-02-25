
'use client';

import { adminDb } from "@/lib/firebase/admin";
import { BetResultsChart } from "@/components/performance/BetResultsChart";
import { RoiChart } from "@/components/performance/RoiChart";
import { KpiCard } from "@/components/performance/KpiCard";
import { TrendingUp, Target, Wallet, Activity } from "lucide-react";

export default async function PerformancePage() {
  // 1. Fetch data on the server
  const snapshot = await adminDb.collection("bettingLog")
    .orderBy("createdAt", "desc")
    .get();

  const bets = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    // Convert Firestore Timestamps to strings/numbers for the Client Components
    createdAt: doc.data().createdAt?.toDate()?.toISOString() || null,
  })) as any[];

  // 2. Simple aggregations for the KPI cards
  const totalStaked = bets.reduce((acc, b) => acc + (Number(b.stake) || 0), 0);
  const settledBets = bets.filter(b => b.status !== 'pending');
  const wins = settledBets.filter(b => b.status === 'won').length;
  const winRate = settledBets.length > 0 ? (wins / settledBets.length) * 100 : 0;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-black tracking-tighter uppercase italic">My Performance</h1>
        <p className="text-slate-500 text-sm uppercase font-bold">Studio Analytics & Profit Tracking</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard title="Total Staked" value={`$${totalStaked.toFixed(2)}`} />
        <KpiCard title="Win Rate" value={`${winRate.toFixed(1)}%`} change="+2.1%" changeType="positive" />
        <KpiCard title="Total Bets" value={bets.length.toString()} />
        <KpiCard title="Avg. Odds" value="+125" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BetResultsChart bets={settledBets} />
        <RoiChart bets={bets} />
      </div>
    </div>
  );
}
