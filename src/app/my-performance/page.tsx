'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell, ReferenceLine,
} from 'recharts';
import {
  DollarSign, Target, TrendingUp, Zap, Trophy,
  Calendar, BarChart2, Loader2,
} from 'lucide-react';
import { toDecimal } from '@/lib/utils/odds';

// ─── Types ────────────────────────────────────────────────────────────────────

type Timeframe = 'day' | 'week' | 'month';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GOLD = '#FFD700';

function calcProfit(bet: any): number {
  if (bet.isBonusBet) return 0;
  const stake  = Number(bet.stake || bet.wager) || 0;
  const status = (bet.status || '').toLowerCase();
  if (['won', 'win'].includes(status)) {
    const odds  = Number(bet.odds) || 0;
    const boost = parseFloat(String(bet.boost || '0').replace('%', '')) / 100;
    return (stake * toDecimal(odds) * (1 + boost)) - stake;
  }
  if (['lost', 'loss'].includes(status)) return -stake;
  if (status === 'cashed') return (Number(bet.cashOutAmount || bet.payout) || 0) - stake;
  return 0;
}

function normalizePropName(raw: string): string {
  const n = (raw || '').toLowerCase();
  if (n.includes('rush'))    return 'Rushing Yards';
  if (n.includes('rec yds') || n.includes('receiving')) return 'Receiving Yards';
  if (n.includes('pass yds') || n.includes('passing'))  return 'Passing Yards';
  if (n.includes('td') || n.includes('touchdown'))      return 'Anytime TD';
  if (n.includes('rec'))     return 'Receptions';
  return raw;
}

function hitColor(rate: number) {
  if (rate >= 65) return '#10b981';
  if (rate >= 55) return GOLD;
  if (rate >= 45) return '#f97316';
  return '#ef4444';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-px flex-1 bg-white/[0.06]" />
      <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600 px-2">{children}</span>
      <div className="h-px flex-1 bg-white/[0.06]" />
    </div>
  );
}

function StatBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min((value / max) * 100, 100)}%`, background: color }}
      />
    </div>
  );
}

function KpiCard({ title, value, color, icon: Icon, sub }: {
  title: string; value: string; color: string; icon: any; sub?: string;
}) {
  return (
    <div className="bg-[#0f1115] border border-white/[0.06] p-4 rounded-2xl">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-3 w-3 ${color}`} />
        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-600">{title}</span>
      </div>
      <p className={`text-xl font-black italic uppercase font-mono tracking-tight ${color}`}>{value}</p>
      {sub && <p className="text-[9px] text-zinc-600 mt-0.5 font-mono truncate">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value as number;
  return (
    <div className="bg-[#0a0c0f] border border-white/10 rounded-xl px-3 py-2 shadow-2xl">
      <p className="text-[9px] font-black uppercase text-zinc-500 mb-1">{label}</p>
      <p className="text-xs font-mono font-bold" style={{ color: hitColor(Math.max(0, val + 50)) }}>
        {val >= 0 ? '+' : ''}${val.toFixed(2)}
      </p>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const [bets,      setBets]      = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>('week');

  useEffect(() => {
    fetch('/api/performance')
      .then(r => r.json())
      .then(json => { setBets(Array.isArray(json) ? json : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // ── Core stats ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const settled   = bets.filter(b => !['pending', 'void', 'push'].includes((b.status || '').toLowerCase()));
    const wins      = settled.filter(b => ['won', 'win'].includes((b.status || '').toLowerCase()));
    const totalProfit  = settled.reduce((a, b) => a + calcProfit(b), 0);
    const totalWagered = settled.reduce((a, b) => a + (Number(b.stake || b.wager) || 0), 0);
    const winRate      = settled.length ? (wins.length / settled.length) * 100 : 0;
    const roi          = totalWagered ? (totalProfit / totalWagered) * 100 : 0;

    // Prop type accuracy from legs
    const propMap: Record<string, { wagered: number; profit: number; total: number; won: number }> = {};
    const playerMap: Record<string, { total: number; won: number }> = {};

    settled.forEach(bet => {
      const legs      = bet.legs ?? [];
      const isParlay  = legs.length > 1;
      const legWager  = (Number(bet.stake) || 0) / (legs.length || 1);
      const betProfit = calcProfit(bet);

      legs.forEach((l: any) => {
        const legStatus = (l.status || '').toLowerCase();
        const isWin     = ['won', 'win'].includes(legStatus);
        if (!['won', 'win', 'lost', 'loss'].includes(legStatus)) return;

        // Prop type
        const type = normalizePropName(l.prop || '');
        if (!propMap[type]) propMap[type] = { wagered: 0, profit: 0, total: 0, won: 0 };
        propMap[type].total++;
        propMap[type].wagered += legWager;
        propMap[type].profit  += isParlay ? betProfit / legs.length : betProfit;
        if (isWin) propMap[type].won++;

        // Player
        if (l.player) {
          if (!playerMap[l.player]) playerMap[l.player] = { total: 0, won: 0 };
          playerMap[l.player].total++;
          if (isWin) playerMap[l.player].won++;
        }
      });
    });

    const propAccuracy = Object.entries(propMap)
      .map(([type, d]) => ({
        type,
        winPct: d.total > 0 ? (d.won / d.total) * 100 : 0,
        total: d.total, won: d.won,
        roi: d.wagered > 0 ? (d.profit / d.wagered) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const playerStats = Object.entries(playerMap)
      .map(([name, d]) => ({
        name,
        winPct: d.total > 0 ? (d.won / d.total) * 100 : 0,
        total: d.total, won: d.won, lost: d.total - d.won,
      }));

    const snipers = playerStats.filter(p => p.total >= 3).sort((a, b) => b.winPct - a.winPct).slice(0, 5);
    const fade    = playerStats.filter(p => p.total >= 3).sort((a, b) => a.winPct - b.winPct).slice(0, 5);

    const topPayouts     = [...wins].sort((a, b) => calcProfit(b) - calcProfit(a)).slice(0, 4);
    const longestParlays = [...wins]
      .filter(b => (b.legs?.length ?? 0) > 1)
      .sort((a, b) => (b.legs?.length ?? 0) - (a.legs?.length ?? 0))
      .slice(0, 4);

    // Bet type ROI
    const typeMap: Record<string, { wagered: number; profit: number; count: number }> = {};
    settled.forEach(b => {
      const type = (b.betType || (b.legs?.length > 1 ? 'parlay' : 'straight')).toLowerCase();
      if (!typeMap[type]) typeMap[type] = { wagered: 0, profit: 0, count: 0 };
      typeMap[type].wagered += Number(b.stake || b.wager) || 0;
      typeMap[type].profit  += calcProfit(b);
      typeMap[type].count++;
    });
    const typeROI = Object.entries(typeMap)
      .map(([type, d]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        roi:    d.wagered > 0 ? (d.profit / d.wagered) * 100 : 0,
        volume: d.wagered,
        count:  d.count,
      }))
      .sort((a, b) => b.volume - a.volume);

    return { totalProfit, totalWagered, winRate, roi, propAccuracy, snipers, fade, topPayouts, longestParlays, typeROI, settled, wins };
  }, [bets]);

  // ── Straights simulation ───────────────────────────────────────────────────
  const simulation = useMemo(() => {
    let simulatedProfit = 0;
    let totalLegs = 0;
    bets.forEach(bet => {
      (bet.legs ?? []).forEach((l: any) => {
        const s = (l.status || '').toLowerCase();
        if (!['won', 'win', 'lost', 'loss'].includes(s)) return;
        totalLegs++;
        if (['won', 'win'].includes(s)) {
          simulatedProfit += 10 * toDecimal(Number(l.odds || -110)) - 10;
        } else {
          simulatedProfit -= 10;
        }
      });
    });
    return { simulatedProfit, totalLegs, actualProfit: stats.totalProfit };
  }, [bets, stats.totalProfit]);

  // ── Bankroll projection ────────────────────────────────────────────────────
  const projection = useMemo(() => {
    const DAYS = 30;
    const start = stats.totalWagered > 0 ? Math.max(stats.totalWagered / 30, 10) : 10;
    const avgProfitPerBet = stats.settled.length
      ? stats.totalProfit / stats.settled.length
      : 0;
    const avgBetsPerDay = bets.length > 0 ? bets.length / 30 : 1;
    let current = start;
    const data = [{ day: 0, balance: current }];
    for (let i = 1; i <= DAYS; i++) {
      current += avgBetsPerDay * avgProfitPerBet;
      data.push({ day: i, balance: Math.max(0, current) });
    }
    return data;
  }, [bets, stats]);

  // ── P&L trend chart ────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const groups: Record<string, number> = {};
    [...bets]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .forEach(b => {
        const d = new Date(b.createdAt);
        let key = '';
        if (timeframe === 'day') {
          key = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
        } else if (timeframe === 'month') {
          key = d.toLocaleString('default', { month: 'short' });
        } else {
          const start = new Date(d.getFullYear(), 0, 1);
          const week  = Math.ceil((((d.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
          key = `W${week}`;
        }
        groups[key] = (groups[key] || 0) + calcProfit(b);
      });
    return Object.entries(groups).map(([name, profit]) => ({ name, profit }));
  }, [bets, timeframe]);

  // ── Cumulative P&L ─────────────────────────────────────────────────────────
  const cumulativeData = useMemo(() => {
    let running = 0;
    return chartData.map(d => {
      running += d.profit;
      return { ...d, cumulative: running };
    });
  }, [chartData]);

  if (loading) return (
    <div className="min-h-screen bg-[#060606] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-[#FFD700]/30 border-t-[#FFD700] animate-spin" />
        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Loading bets…</p>
      </div>
    </div>
  );

  const endBalance = projection[projection.length - 1]?.balance ?? 0;

  return (
    <div className="min-h-screen bg-[#060606] text-white p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black italic uppercase tracking-tight">Performance Lab</h1>
            <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mt-1">
              {stats.settled.length} settled bets · leg-level accuracy & P&amp;L audit
            </p>
          </div>
          <div className="flex rounded-xl overflow-hidden border border-white/[0.08]">
            {(['day', 'week', 'month'] as Timeframe[]).map(t => (
              <button key={t} onClick={() => setTimeframe(t)}
                className={`px-3 py-1.5 text-[9px] font-black uppercase transition-colors ${
                  timeframe === t ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-black/40 text-zinc-600 hover:text-zinc-400'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard title="Net Profit"  value={`${stats.totalProfit >= 0 ? '+' : ''}$${stats.totalProfit.toFixed(2)}`}  color={stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'} icon={DollarSign} sub={`${stats.settled.length} settled bets`} />
          <KpiCard title="Hit Rate"    value={`${stats.winRate.toFixed(1)}%`}   color="text-[#FFD700]"  icon={Target}     sub={`${stats.wins.length} wins`} />
          <KpiCard title="ROI"         value={`${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(1)}%`}  color={stats.roi >= 0 ? 'text-emerald-400' : 'text-red-400'} icon={TrendingUp} sub="return on wagered" />
          <KpiCard title="Volume"      value={`$${stats.totalWagered.toFixed(0)}`} color="text-zinc-400" icon={Zap}         sub="total wagered" />
        </div>

        {/* ── P&L Trend + Cumulative ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#0f1115] border border-white/[0.06] rounded-2xl p-5">
            <SectionLabel>P&amp;L by {timeframe}</SectionLabel>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ left: -20, right: 8 }}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" tick={{ fill: '#52525b', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#52525b', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                <Bar dataKey="profit" radius={[3, 3, 0, 0]}>
                  {chartData.map((e, i) => <Cell key={i} fill={e.profit >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.7} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#0f1115] border border-white/[0.06] rounded-2xl p-5">
            <SectionLabel>Cumulative P&amp;L</SectionLabel>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={cumulativeData} margin={{ left: -20, right: 8 }}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" tick={{ fill: '#52525b', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#52525b', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="cumulative" stroke={GOLD} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: GOLD }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Prop type accuracy ── */}
        <div className="bg-[#0f1115] border border-white/[0.06] rounded-2xl p-5">
          <SectionLabel>Accuracy by Prop Type</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.propAccuracy.map(p => (
              <div key={p.type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-300 uppercase">{p.type}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-mono text-zinc-600">{p.won}/{p.total} hits</span>
                    <span className={`text-[10px] font-mono font-black ${p.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {p.roi >= 0 ? '+' : ''}{p.roi.toFixed(0)}% ROI
                    </span>
                    <span className="text-xs font-black font-mono" style={{ color: hitColor(p.winPct) }}>
                      {p.winPct.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <StatBar value={p.winPct} color={hitColor(p.winPct)} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Straights audit ── */}
        <div className="bg-[#0f1115] border border-[#FFD700]/10 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
            <Target className="h-28 w-28 text-[#FFD700]" />
          </div>
          <div className="relative">
            <SectionLabel>Straights Audit</SectionLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-[9px] font-black uppercase text-zinc-600 mb-2">Actual Performance</p>
                <p className={`text-3xl font-black font-mono ${stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit.toFixed(2)}
                </p>
                <p className="text-[9px] text-zinc-600 mt-1 font-mono uppercase">your actual parlay / single mix</p>
              </div>
              <div className="border-l border-white/[0.06] pl-8">
                <p className="text-[9px] font-black uppercase text-zinc-600 mb-2">Simulated $10 Straights</p>
                <p className={`text-3xl font-black font-mono ${simulation.simulatedProfit >= 0 ? 'text-[#FFD700]' : 'text-red-400'}`}>
                  {simulation.simulatedProfit >= 0 ? '+' : ''}${simulation.simulatedProfit.toFixed(2)}
                </p>
                <p className="text-[9px] text-zinc-600 mt-1 font-mono uppercase">
                  if all {simulation.totalLegs} legs were flat-staked straights
                </p>
              </div>
            </div>
            {simulation.simulatedProfit > stats.totalProfit && (
              <div className="mt-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                <p className="text-[9px] font-bold text-red-400 uppercase tracking-tight">
                  Strategy alert — you'd be up more as straight bets. Consider increasing single-leg volume.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Projection ── */}
        <div className="bg-[#0f1115] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <SectionLabel>30-Day Bankroll Projection</SectionLabel>
              <p className="text-[9px] text-zinc-600 font-mono -mt-2">extrapolated from current avg profit/bet × volume</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-zinc-600 font-black uppercase">Projected Day 30</p>
              <p className="text-xl font-black font-mono text-[#FFD700]">${endBalance.toFixed(2)}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={projection} margin={{ left: -20, right: 8 }}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="day" hide />
              <YAxis tick={{ fill: '#3f3f46', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} tickFormatter={v => `$${v}`} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                return (
                  <div className="bg-[#0a0c0f] border border-white/10 rounded-xl px-3 py-2 shadow-2xl">
                    <p className="text-[9px] text-zinc-500 font-mono">Day {payload[0].payload.day}</p>
                    <p className="text-xs font-mono font-bold text-[#FFD700]">${Number(payload[0].value).toFixed(2)}</p>
                  </div>
                );
              }} />
              <ReferenceLine y={projection[0]?.balance ?? 0} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="balance" stroke={GOLD} strokeWidth={2} dot={false}
                strokeDasharray={endBalance < (projection[0]?.balance ?? 0) ? '5 5' : '0'} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ── Bet type ROI ── */}
        <div className="bg-[#0f1115] border border-white/[0.06] rounded-2xl p-5">
          <SectionLabel>ROI by Bet Type</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.typeROI.map(t => (
              <div key={t.type} className="bg-black/20 border border-white/[0.04] p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-zinc-500 uppercase">{t.type}</span>
                  <span className={`text-xs font-mono font-bold ${t.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.roi >= 0 ? '+' : ''}{t.roi.toFixed(1)}%
                  </span>
                </div>
                <p className="text-lg font-black font-mono">${t.volume.toFixed(0)}</p>
                <StatBar value={Math.max(0, t.roi + 50)} max={100} color={t.roi >= 0 ? '#10b981' : '#ef4444'} />
                <p className="text-[9px] text-zinc-700 font-mono">{t.count} bets</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Snipers + Fade list ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0f1115] border border-emerald-500/10 rounded-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <SectionLabel>The Snipers</SectionLabel>
              <p className="text-[9px] text-zinc-600 font-mono -mt-2 mb-3">Players with the highest hit rate in your log (min 3 bets)</p>
            </div>
            {stats.snipers.length === 0
              ? <p className="px-5 pb-5 text-[10px] text-zinc-700 font-mono">Not enough data yet</p>
              : stats.snipers.map(p => (
                <div key={p.name} className="flex items-center justify-between px-5 py-3 border-t border-white/[0.03]">
                  <p className="text-xs font-black italic uppercase text-white">{p.name}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-zinc-600 font-mono">{p.won}/{p.total}</span>
                    <span className="text-sm font-black font-mono text-emerald-400">{p.winPct.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
          </div>

          <div className="bg-[#0f1115] border border-red-500/10 rounded-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <SectionLabel>Fade List</SectionLabel>
              <p className="text-[9px] text-zinc-600 font-mono -mt-2 mb-3">Avoid adding these to parlays — consistent leg killers</p>
            </div>
            {stats.fade.length === 0
              ? <p className="px-5 pb-5 text-[10px] text-zinc-700 font-mono">Not enough data yet</p>
              : stats.fade.map(p => (
                <div key={p.name} className="flex items-center justify-between px-5 py-3 border-t border-white/[0.03]">
                  <p className="text-xs font-black italic uppercase text-zinc-300">{p.name}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-zinc-600 font-mono">{p.won}/{p.total}</span>
                    <span className="text-sm font-black font-mono text-red-400">{p.winPct.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* ── Hall of fame ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0f1115] border border-white/[0.06] rounded-2xl p-5">
            <SectionLabel>Highest Payouts</SectionLabel>
            {stats.topPayouts.length === 0
              ? <p className="text-[10px] text-zinc-700 font-mono">No wins yet</p>
              : stats.topPayouts.map((b, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/[0.03] last:border-0">
                  <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[200px]">
                    {b.description || b.player || (b.legs?.length > 1 ? `${b.legs.length}-Leg Parlay` : 'Single')}
                  </span>
                  <span className="text-xs font-black font-mono text-emerald-400">+${calcProfit(b).toFixed(2)}</span>
                </div>
              ))}
          </div>
          <div className="bg-[#0f1115] border border-white/[0.06] rounded-2xl p-5">
            <SectionLabel>Biggest Parlay Hits</SectionLabel>
            {stats.longestParlays.length === 0
              ? <p className="text-[10px] text-zinc-700 font-mono">No parlay wins yet</p>
              : stats.longestParlays.map((b, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/[0.03] last:border-0">
                  <span className="text-[10px] font-mono text-zinc-500">{b.legs?.length ?? 0} Leg Winner</span>
                  <span className="text-xs font-black font-mono text-[#FFD700]">
                    {b.odds > 0 ? `+${b.odds}` : b.odds} · +${calcProfit(b).toFixed(2)}
                  </span>
                </div>
              ))}
          </div>
        </div>

      </div>
    </div>
  );
}