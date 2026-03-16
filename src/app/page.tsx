'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Wallet as WalletIcon, TrendingUp, Target, Hammer, 
  Layers, Zap, ArrowRight, ChevronRight, Activity,
  DollarSign, Trophy, Calendar, Fingerprint, Map
} from 'lucide-react';

// Hooks (Assuming you've created use-performance and use-bankroll)
import { useBankroll } from '@/hooks/use-bankroll';
import { usePerformance } from '@/hooks/use-performance';
import { PnLTrendChart } from '@/components/dashboard/PnLTrendChart';

const FIELD = 'text-[10px] uppercase font-black text-zinc-600 tracking-[0.2em]';

export default function DashboardPage() {
  const { total: bankroll, bonusBalance, loading: walletLoading } = useBankroll();
  const { stats, loading: perfLoading } = usePerformance();

  if (walletLoading || perfLoading) {
    return (
      <div className="min-h-screen bg-[#060606] flex items-center justify-center">
        <div className="animate-pulse text-[#FFD700] font-black uppercase tracking-widest text-xs">
          Booting Systems...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060606] text-white p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">Command Center</h1>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">Operational Overview • 2026 Season</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="px-4 py-2 bg-[#0f1115] border border-white/[0.06] rounded-xl flex flex-col items-end">
                <span className="text-[8px] font-black text-zinc-600 uppercase">Live Bankroll</span>
                <span className="text-sm font-black font-mono text-emerald-400">${bankroll?.toLocaleString()}</span>
             </div>
          </div>
        </div>

        {/* ── TIER 1: FINANCIAL & PERFORMANCE PULSE ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Bankroll Portal */}
          <div className="lg:col-span-2 bg-[#0f1115] border border-white/[0.06] rounded-[2.5rem] p-8 relative overflow-hidden group">
            <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className={FIELD}>Available Bankroll</p>
                <h2 className="text-4xl font-black font-mono text-white">${bankroll.toFixed(2)}</h2>
              </div>
              <Link href="/wallet" className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
                Manage Funds <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            </div>
            {/* Ambient Background Glow */}
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#FFD700]/5 rounded-full blur-[100px]" />
          </div>

          {/* Efficiency KPI */}
          <div className="bg-[#0f1115] border border-white/[0.06] rounded-[2.5rem] p-8 flex flex-col justify-between">
            <div className="space-y-1">
              <Trophy className="h-6 w-6 text-[#FFD700] mb-4" />
              <p className={FIELD}>Strike Rate</p>
              <p className="text-5xl font-black font-mono tracking-tighter">{stats.winRate.toFixed(1)}%</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                <span>Accuracy</span>
                <span>{stats.winCount} / {stats.settledCount} Wins</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${stats.winRate}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── TIER 2: TOOLKIT PORTALS ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActionCard 
            href="/bet-builder" 
            title="Bet Builder" 
            desc="Model single leg outcomes" 
            icon={Hammer} 
            color="bg-blue-500" 
          />
          <ActionCard 
            href="/parlay-studio" 
            title="Parlay Studio" 
            desc="Correlate props & markets" 
            icon={Layers} 
            color="bg-[#FFD700]" 
          />
          <ActionCard 
            href="/sweet-spots" 
            title="Sweet Spot Engine" 
            desc="Market inefficiency scanner" 
            icon={Zap} 
            color="bg-purple-500" 
          />
        </div>

        {/* ── TIER 3: MOMENTUM & DATA ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sparkline Chart Card */}
          <PnLTrendChart data={stats.chartData} />

          {/* Admin / Setup Section */}
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700 ml-4">Data Management</p>
            <div className="grid grid-cols-2 gap-4">
              <AdminButton href="/admin/schedule" label="Schedule" icon={Calendar} />
              <AdminButton href="/admin/pfr-ids" label="PFR IDs" icon={Fingerprint} />
              <AdminButton href="/admin/mapping" label="Team Map" icon={Map} />
              <AdminButton href="/bonuses" label="Promos" icon={Trophy} highlight />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── COMPONENTS ──

function ActionCard({ href, title, desc, icon: Icon, color }: any) {
  return (
    <Link href={href} className="group bg-[#0f1115] border border-white/[0.06] rounded-[2rem] p-6 hover:border-white/20 transition-all relative overflow-hidden">
      <div className={`w-12 h-12 rounded-2xl ${color} text-black flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-500`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-black uppercase italic tracking-tight">{title}</h3>
      <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">{desc}</p>
      <ArrowRight className="absolute bottom-6 right-6 h-4 w-4 text-zinc-800 group-hover:text-white group-hover:translate-x-1 transition-all" />
    </Link>
  );
}

function AdminButton({ href, label, icon: Icon, highlight = false }: any) {
  return (
    <Link href={href} className={`
      flex items-center gap-3 px-5 py-5 rounded-2xl border transition-all group
      ${highlight 
        ? 'bg-[#FFD700]/5 border-[#FFD700]/10 text-[#FFD700] hover:bg-[#FFD700]/10' 
        : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.05]'
      }
    `}>
      <Icon className={`h-4 w-4 ${highlight ? 'text-[#FFD700]' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </Link>
  );
}