"use client";

import { usePerformance } from "@/hooks/use-performance";
import { useAuth } from "@/lib/firebase/provider";
import { PageLoader } from "@/components/ui/LoadingSpinner";
import { PnLTrendChart } from "@/components/dashboard/PnLTrendChart";
import { WalletCard } from "@/components/dashboard/WalletCard"; // We'll create this below
import { KpiCard } from "@/components/ui/kpi-card";
import { 
  TrendingUp, 
  Target, 
  Zap, 
  History, 
  ArrowUpRight, 
  Wallet, 
  LayoutDashboard 
} from "lucide-react";

import Link from "next/link";

export default function DashboardPage() {
  const { stats, loading } = usePerformance();
  const authData = useAuth() || { user: null, loading: true };
  const { user, loading: authLoading } = authData;

  if (loading || authLoading) return <PageLoader />;

  return (
    <main className="min-h-screen bg-[#0a0c0f] text-white p-6 md:p-10 space-y-8">
      {/* --- HEADER & WALLET --- */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-10">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">
            Command <span className="text-cyan-400">Center</span>
          </h1>
          <p className="text-zinc-500 font-medium tracking-wide">
            Welcome back, {user?.displayName?.split(' ')[0] || 'Operator'}.
          </p>
        </div>
        
        {/* Integrated Wallet Component */}
        <WalletCard balance={stats.totalProfit} />
      </div>

      {/* --- HERO SECTION: PERFORMANCE TREND --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           <PnLTrendChart data={stats.chartData} />
        </div>
        
        {/* Quick Stats Sidebar */}
        <div className="grid grid-cols-1 gap-4">
          <StatMiniCard 
            label="Win Rate" 
            value={`${stats.winRate.toFixed(1)}%`} 
            icon={Target}
            color="text-cyan-400"
          />
          <StatMiniCard 
            label="ROI" 
            value={`${stats.roi.toFixed(1)}%`} 
            icon={TrendingUp}
            color="text-emerald-400"
          />
          <Link href="/betting-log" className="group bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/10 transition-all flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-zinc-800 rounded-2xl group-hover:scale-110 transition-transform">
                <History className="h-6 w-6 text-zinc-400" />
              </div>
              <div>
                <p className="text-xs font-black uppercase text-zinc-500">View History</p>
                <p className="text-xl font-bold">{stats.totalBets} Total Bets</p>
              </div>
            </div>
            <ArrowUpRight className="h-5 w-5 text-zinc-600 group-hover:text-white transition-colors" />
          </Link>
        </div>
      </div>

      {/* --- ACTION TILES --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         {/* These link to your other pages */}
         <ActionTile title="Build Slip" href="/bet-builder" icon={Zap} desc="Find high-edge props" />
         <ActionTile title="Weekly Slate" href="/insights" icon={History} desc="Model-driven insights" />
         <ActionTile title="The Lab" href="/my-performance" icon={TrendingUp} desc="Deep analytics" />
         <ActionTile title="Sweet Spots" href="/sweet-spots" icon={Target} desc="DNA thresholds" />
      </div>
    </main>
  );
}

function StatMiniCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-[#111418] border border-white/5 rounded-3xl p-6 flex items-center gap-4">
      <div className={`p-3 bg-zinc-900 rounded-2xl ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
        <p className="text-2xl font-black italic tracking-tighter">{value}</p>
      </div>
    </div>
  );
}

function ActionTile({ title, href, icon: Icon, desc }: any) {
  return (
    <Link href={href} className="bg-zinc-900/50 border border-white/5 p-6 rounded-[2rem] hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all group">
      <Icon className="h-6 w-6 mb-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
      <h3 className="font-bold text-lg mb-1">{title}</h3>
      <p className="text-xs text-zinc-500 font-medium">{desc}</p>
    </Link>
  );
}