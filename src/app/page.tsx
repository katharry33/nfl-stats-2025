"use client";

import { usePerformance } from "@/hooks/use-performance";
import { useAuth } from "@/lib/firebase/provider";
import { WalletCard } from "@/components/dashboard/WalletCard";
import { PnLTrendChart } from "@/components/dashboard/PnLTrendChart";
import { Zap, Target, History, TrendingUp } from "lucide-react";
import { KpiTile } from "@/components/dashboard/KpiTile";

interface Player {
  id: string;
  player?: string;     // NFL schema
  playerName?: string; // NBA schema
  pfrid?: string;      // NFL schema
  bdlId?: string;      // NBA schema
  team: string;
}

export default function DashboardPage() {
  const { stats, loading } = usePerformance();
  const { user } = useAuth();

  return (
    <div className="space-y-10">
      {/* Header: Identity & Wealth */}
      <div className="flex justify-between items-end border-b border-white/5 pb-10">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-glow">
            Command <span className="text-primary">Center</span>
          </h1>
          <p className="text-zinc-500 font-medium tracking-wide italic">
            Operator: {user?.displayName || 'Authorized User'}
          </p>
        </div>
        <WalletCard balance={stats?.totalProfit ?? 0} />
      </div>

      {/* Main Intel: Charts & KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card/20 border border-white/5 rounded-[3rem] p-8">
           <PnLTrendChart data={stats?.chartData ?? []} />
        </div>
        <div className="space-y-4">
        <KpiTile label="Win Rate" value={`${stats?.winRate ?? 0}%`} icon={Target} color="text-primary" />            <KpiTile label="ROI" value={`${stats?.roi ?? 0}%`} icon={TrendingUp} color="text-profit" />
        </div>
      </div>
    </div>
  );
}