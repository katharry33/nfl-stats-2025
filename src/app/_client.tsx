'use client';

import React, { useMemo } from 'react';
import { useAuth } from '@/lib/firebase/provider';
import { useFirebaseBets } from '@/hooks/useBets';
import { usePerformance } from '@/hooks/use-performance';
import Link from 'next/link';
import {
  TrendingUp, Target, History, Zap, ArrowUpRight, ArrowDownRight,
  Minus, BarChart2, Trophy, AlertCircle, Clock, ChevronRight,
  Wallet,
} from 'lucide-react';
import { PnLTrendChart } from '@/components/dashboard/PnLTrendChart';

// ─── Formatters ───────────────────────────────────────────────────────────────

const fPct = (v?: number) => {
  if (v == null || isNaN(v)) return '0%';
  const rounded = Math.round(v);
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
};
const fInt = (v?: number) => {
  if (v == null || isNaN(v)) return '0';
  return Math.round(v).toLocaleString();
};
const fCurrency = (v?: number) => {
  if (v == null || isNaN(v)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
  accent: string; // tailwind color class e.g. 'text-indigo-400'
  bg: string;     // e.g. 'bg-indigo-500/10'
  border: string; // e.g. 'border-indigo-500/20'
  icon: React.ElementType;
  loading?: boolean;
}

function KpiCard({ label, value, sub, trend, accent, bg, border, icon: Icon, loading }: KpiCardProps) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-zinc-500';

  return (
    <div className={`relative overflow-hidden bg-[#121214] border ${border} rounded-[24px] p-6 flex flex-col gap-4 group hover:border-opacity-60 transition-all duration-300`}>
      {/* Background glow */}
      <div className={`absolute -top-6 -right-6 w-24 h-24 ${bg} rounded-full blur-2xl opacity-60 group-hover:opacity-90 transition-opacity`} />

      <div className="flex items-center justify-between relative">
        <div className={`p-2.5 rounded-xl ${bg} border ${border}`}>
          <Icon size={16} className={accent} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 ${trendColor} text-[10px] font-black uppercase`}>
            <TrendIcon size={12} />
          </div>
        )}
      </div>

      <div className="relative">
        {loading ? (
          <div className="h-8 w-24 bg-white/5 rounded-lg animate-pulse" />
        ) : (
          <div className="text-3xl font-black tracking-tight text-white">{value}</div>
        )}
        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-1">{label}</div>
        {sub && !loading && (
          <div className="text-[10px] text-zinc-600 mt-0.5 font-mono">{sub}</div>
        )}
      </div>
    </div>
  );
}

// ─── Quick Action ──────────────────────────────────────────────────────────────

function QuickAction({ href, label, description, accent, icon: Icon }: {
  href: string; label: string; description: string; accent: string; icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 p-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 rounded-2xl transition-all"
    >
      <div className={`p-2.5 rounded-xl bg-white/5 border border-white/8 flex-shrink-0`}>
        <Icon size={16} className={accent} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-black uppercase tracking-wider text-white">{label}</div>
        <div className="text-[10px] text-zinc-600 mt-0.5 truncate">{description}</div>
      </div>
      <ChevronRight size={14} className="text-zinc-700 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
    </Link>
  );
}

// ─── Recent Bets Table ─────────────────────────────────────────────────────────

function RecentBets({ bets, loading }: { bets: any[]; loading: boolean }) {
  const recent = useMemo(() => bets.filter((b) => !b.id?.includes('_leg_')).slice(0, 5), [bets]);

  return (
    <div className="bg-[#121214] border border-white/5 rounded-[24px] overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-zinc-500" />
          <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Recent Activity</span>
        </div>
        <Link
          href="/betting-log"
          className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
        >
          View All <ChevronRight size={10} />
        </Link>
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-white/3 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <AlertCircle size={28} className="text-zinc-700" />
          <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">No bets recorded yet</p>
          <Link
            href="/bet-builder"
            className="mt-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all"
          >
            Go to Bet Builder
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {recent.map((bet) => {
            const isWin  = bet.status === 'win'  || bet.status === 'Won';
            const isLoss = bet.status === 'loss' || bet.status === 'Lost';
            const isPush = bet.status === 'push';
            const statusColor = isWin ? 'text-emerald-400' : isLoss ? 'text-red-400' : isPush ? 'text-yellow-400' : 'text-zinc-500';
            const statusLabel = isWin ? 'W' : isLoss ? 'L' : isPush ? 'P' : '—';
            const profit = bet.profit ?? bet.netProfit ?? 0;

            return (
              <div key={bet.id} className="flex items-center gap-4 px-6 py-3 hover:bg-white/[0.02] transition-colors">
                {/* Status dot */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isWin ? 'bg-emerald-500' : isLoss ? 'bg-red-500' : isPush ? 'bg-yellow-500' : 'bg-zinc-700'}`} />

                {/* Player / prop */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">{bet.player || bet.description || 'Parlay'}</div>
                  <div className="text-[10px] text-zinc-600 truncate">{bet.prop || bet.legs?.length ? `${bet.legs?.length}-leg parlay` : ''}</div>
                </div>

                {/* League badge */}
                {bet.league && (
                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                    bet.league === 'nba' ? 'bg-orange-500/10 text-orange-400' : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {bet.league}
                  </span>
                )}

                {/* Profit */}
                <div className={`font-mono font-black text-xs flex-shrink-0 ${profit > 0 ? 'text-emerald-400' : profit < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                  {profit > 0 ? '+' : ''}{fCurrency(profit)}
                </div>

                {/* Status */}
                <div className={`text-[10px] font-black uppercase w-4 text-right ${statusColor}`}>{statusLabel}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardClient() {
  const { user } = useAuth();
  const { bets, loading: loadingBets } = useFirebaseBets(user?.uid);
  const { stats, loading: loadingStats } = usePerformance(bets, loadingBets);

  const loading = loadingBets || loadingStats;

  // Derive trend direction for ROI / win rate
  const roiTrend  = (stats?.roi  ?? 0) > 0 ? 'up' : (stats?.roi  ?? 0) < 0 ? 'down' : 'neutral';
  const winTrend  = (stats?.winRate ?? 0) > 50 ? 'up' : (stats?.winRate ?? 0) < 50 ? 'down' : 'neutral';
  const profitPos = (stats?.totalProfit ?? 0) >= 0;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* ── Greeting + Wallet ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">
            Welcome back
          </p>
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-white mt-0.5">
            {user?.displayName?.split(' ')[0] || 'Operator'}
          </h2>
        </div>

        {/* Wallet badge */}
        <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${profitPos ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
          <Wallet size={16} className={profitPos ? 'text-emerald-400' : 'text-red-400'} />
          <div>
            <div className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Net P&amp;L</div>
            <div className={`font-black text-sm font-mono ${profitPos ? 'text-emerald-400' : 'text-red-400'}`}>
              {fCurrency(stats?.totalProfit)}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Win Rate"
          value={loading ? '—' : `${Math.round(stats?.winRate ?? 0)}%`}
          sub={loading ? undefined : `${fInt(stats?.wins)} W / ${fInt(stats?.losses)} L`}
          trend={winTrend}
          accent="text-indigo-400"
          bg="bg-indigo-500/10"
          border="border-indigo-500/20"
          icon={Target}
          loading={loading}
        />
        <KpiCard
          label="ROI"
          value={loading ? '—' : fPct(stats?.roi)}
          trend={roiTrend}
          accent={roiTrend === 'up' ? 'text-emerald-400' : 'text-red-400'}
          bg={roiTrend === 'up' ? 'bg-emerald-500/10' : 'bg-red-500/10'}
          border={roiTrend === 'up' ? 'border-emerald-500/20' : 'border-red-500/20'}
          icon={TrendingUp}
          loading={loading}
        />
        <KpiCard
          label="Total Bets"
          value={loading ? '—' : fInt(stats?.totalBets)}
          sub={loading ? undefined : `${fInt(stats?.pendingBets ?? 0)} pending`}
          trend="neutral"
          accent="text-sky-400"
          bg="bg-sky-500/10"
          border="border-sky-500/20"
          icon={History}
          loading={loading}
        />
        <KpiCard
          label="Units Wagered"
          value={loading ? '—' : fCurrency(stats?.totalStaked)}
          trend="neutral"
          accent="text-amber-400"
          bg="bg-amber-500/10"
          border="border-amber-500/20"
          icon={Zap}
          loading={loading}
        />
      </div>

      {/* ── Chart + Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* P&L Chart — takes 2/3 */}
        <div className="lg:col-span-2 bg-[#121214] border border-white/5 rounded-[24px] overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5">
            <BarChart2 size={14} className="text-zinc-500" />
            <span className="text-xs font-black uppercase tracking-widest text-zinc-400">P&amp;L Trend</span>
          </div>
          <div className="p-4 h-56">
            <PnLTrendChart bets={bets} loading={loading} />
          </div>
        </div>

        {/* Quick Actions — takes 1/3 */}
        <div className="bg-[#121214] border border-white/5 rounded-[24px] overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5">
            <Zap size={14} className="text-zinc-500" />
            <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Quick Actions</span>
          </div>
          <div className="p-4 space-y-2">
            <QuickAction
              href="/bet-builder"
              label="Bet Builder"
              description="Analyze today's live slate"
              accent="text-indigo-400"
              icon={Zap}
            />
            <QuickAction
              href="/parlay-studio"
              label="Parlay Studio"
              description="Build & review parlays"
              accent="text-purple-400"
              icon={Trophy}
            />
            <QuickAction
              href="/historical-props"
              label="Historical Vault"
              description="Browse past prop data"
              accent="text-sky-400"
              icon={History}
            />
            <QuickAction
              href="/betting-log"
              label="Betting Log"
              description="Track your performance"
              accent="text-emerald-400"
              icon={BarChart2}
            />
          </div>
        </div>
      </div>

      {/* ── Recent Bets ── */}
      <RecentBets bets={bets} loading={loading} />
    </div>
  );
}