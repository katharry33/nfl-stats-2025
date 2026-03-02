'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Percent,
  Trophy, Target, Users, BarChart2, Loader2, Zap
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell
} from 'recharts';

// ─── helpers ────────────────────────────────────────────────────────────────

function netProfit(bet: any): number {
  const stake = Number(bet.stake) || 0;
  const status = (bet.status || '').toLowerCase();
  if (status === 'won') {
    const odds = Number(bet.odds) || 0;
    if (odds > 0) return stake * (odds / 100);
    if (odds < 0) return stake * (100 / Math.abs(odds));
    return 0;
  }
  if (status === 'lost') return -stake;
  if (status === 'cashed') return (Number(bet.cashedAmount) || stake) - stake;
  return 0;
}

// ─── sub-components ─────────────────────────────────────────────────────────

function KpiCard({ title, value, color = 'text-white', icon: Icon, sub }: {
  title: string; value: string; color?: string; icon?: any; sub?: string;
}) {
  return (
    <div className="bg-[#0f1115] border border-white/[0.06] p-5 rounded-2xl flex items-start gap-4 hover:border-white/10 transition-colors">
      {Icon && (
        <div className={`p-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl shrink-0 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] uppercase font-black text-zinc-600 tracking-[0.2em]">{title}</p>
        <p className={`text-2xl font-black font-mono tracking-tight mt-0.5 ${color}`}>{value}</p>
        {sub && <p className="text-[10px] text-zinc-600 mt-0.5 font-mono truncate">{sub}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] uppercase font-black text-zinc-600 tracking-[0.2em] mb-3">
      {children}
    </h2>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="bg-[#0f1115] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono shadow-xl">
      <p className="text-zinc-500 mb-1">{label}</p>
      <p className={val >= 0 ? 'text-emerald-400' : 'text-red-400'}>
        {val >= 0 ? '+' : ''}${val.toFixed(2)}
      </p>
    </div>
  );
};

// ─── main page ───────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/performance')
      .then(r => r.json())
      .then(json => { setBets(Array.isArray(json) ? json : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // ── computed stats ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const settled = bets.filter(b => !['pending', 'void'].includes((b.status || '').toLowerCase()));
    const won     = settled.filter(b => b.status?.toLowerCase() === 'won');
    const lost    = settled.filter(b => b.status?.toLowerCase() === 'lost');

    const totalStaked  = bets.reduce((a, b) => a + (Number(b.stake) || 0), 0);
    const totalProfit  = bets.reduce((a, b) => a + netProfit(b), 0);
    const winRate      = settled.length > 0 ? (won.length / settled.length) * 100 : 0;
    const roi          = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;

    // biggest payout (won bets, gross payout = stake + profit)
    const biggestPayout = won.reduce((best: any, b) => {
      const payout = (Number(b.stake) || 0) + netProfit(b);
      return (!best || payout > best.payout) ? { bet: b, payout } : best;
    }, null);

    // biggest parlay hit
    const parlays       = won.filter(b => (b.betType || '').toLowerCase() === 'parlay');
    const biggestParlay = parlays.reduce((best: any, b) => {
      const payout = (Number(b.stake) || 0) + netProfit(b);
      return (!best || payout > best.payout) ? { bet: b, payout } : best;
    }, null);

    // bet type breakdown
    const typeMap: Record<string, { total: number; won: number }> = {};
    settled.forEach(b => {
      const t = (b.betType || 'Unknown').toLowerCase();
      if (!typeMap[t]) typeMap[t] = { total: 0, won: 0 };
      typeMap[t].total++;
      if (b.status?.toLowerCase() === 'won') typeMap[t].won++;
    });
    const betTypes = Object.entries(typeMap)
      .map(([type, d]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        total: d.total,
        winPct: d.total > 0 ? (d.won / d.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // most reliable players
    const playerMap: Record<string, { total: number; won: number }> = {};
    settled.forEach(b => {
      const players: string[] = [];
      if (b.player) players.push(b.player);
      if (Array.isArray(b.players)) players.push(...b.players);
      if (Array.isArray(b.legs)) b.legs.forEach((l: any) => l.player && players.push(l.player));
      players.forEach(p => {
        if (!playerMap[p]) playerMap[p] = { total: 0, won: 0 };
        playerMap[p].total++;
        if (b.status?.toLowerCase() === 'won') playerMap[p].won++;
      });
    });
    const reliablePlayers = Object.entries(playerMap)
      .filter(([, d]) => d.total >= 3)
      .map(([name, d]) => ({ name, total: d.total, winPct: (d.won / d.total) * 100 }))
      .sort((a, b) => b.winPct - a.winPct)
      .slice(0, 8);

    // monthly P&L
    const monthMap: Record<string, number> = {};
    const monthOrder: string[] = [];
    bets.forEach(b => {
      if (!b.createdAt) return;
      const d    = new Date(b.createdAt);
      const key  = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!(key in monthMap)) { monthMap[key] = 0; monthOrder.push(key); }
      monthMap[key] += netProfit(b);
    });
    const monthlyPnl = monthOrder.map(m => ({
      month: m,
      profit: parseFloat(monthMap[m].toFixed(2)),
    }));

    // cumulative P&L over bets (sorted oldest first)
    const sorted = [...bets].reverse();
    let running = 0;
    const cumulativePnl = sorted.map((b, i) => {
      running += netProfit(b);
      return { bet: i + 1, profit: parseFloat(running.toFixed(2)) };
    });

    return {
      totalStaked, totalProfit, winRate, roi,
      won: won.length, lost: lost.length, settled: settled.length,
      biggestPayout, biggestParlay,
      betTypes, reliablePlayers, monthlyPnl, cumulativePnl,
    };
  }, [bets]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060606] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FFD700]" />
      </div>
    );
  }

  const profitColor = stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400';
  const roiColor    = stats.roi >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="min-h-screen bg-[#060606] p-6 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">
          My Performance
        </h1>
        <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mt-1">
          Season overview &amp; stats · {bets.length} bets tracked
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          title="Total Staked"
          value={`$${stats.totalStaked.toFixed(2)}`}
          color="text-[#FFD700]/80"
          icon={DollarSign}
          sub={`${stats.settled} settled bets`}
        />
        <KpiCard
          title="Profit / Loss"
          value={`${stats.totalProfit >= 0 ? '+' : ''}$${stats.totalProfit.toFixed(2)}`}
          color={profitColor}
          icon={stats.totalProfit >= 0 ? TrendingUp : TrendingDown}
          sub={`${stats.won}W – ${stats.lost}L`}
        />
        <KpiCard
          title="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          color="text-[#FFD700]"
          icon={Percent}
          sub={`${stats.won} of ${stats.settled} settled`}
        />
        <KpiCard
          title="ROI"
          value={`${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(1)}%`}
          color={roiColor}
          icon={stats.roi >= 0 ? TrendingUp : TrendingDown}
          sub="return on investment"
        />
      </div>

      {/* Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Biggest Payout */}
        <div className="bg-[#0f1115] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-[#FFD700]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Biggest Payout
            </span>
          </div>
          {stats.biggestPayout ? (
            <div>
              <p className="text-2xl font-black font-mono text-emerald-400">
                +${stats.biggestPayout.payout.toFixed(2)}
              </p>
              <p className="text-xs text-zinc-500 mt-1 font-mono truncate">
                {stats.biggestPayout.bet.player || stats.biggestPayout.bet.description || 'Single bet'}
              </p>
            </div>
          ) : (
            <p className="text-zinc-700 text-sm">No wins yet</p>
          )}
        </div>

        {/* Biggest Parlay */}
        <div className="bg-[#0f1115] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-[#FFD700]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Biggest Parlay Hit
            </span>
          </div>
          {stats.biggestParlay ? (
            <div>
              <p className="text-2xl font-black font-mono text-emerald-400">
                +${stats.biggestParlay.payout.toFixed(2)}
              </p>
              <p className="text-xs text-zinc-500 mt-1 font-mono truncate">
                {stats.biggestParlay.bet.description || 'Parlay'}
              </p>
            </div>
          ) : (
            <p className="text-zinc-700 text-sm">No parlay wins yet</p>
          )}
        </div>
      </div>

      {/* Monthly P&L Chart */}
      {stats.monthlyPnl.length > 0 && (
        <div>
          <SectionTitle>Monthly Profit / Loss</SectionTitle>
          <div className="bg-[#0f1115] border border-white/[0.06] rounded-2xl p-5">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.monthlyPnl} barSize={32}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#52525b', fontSize: 10, fontWeight: 700 }}
                />
                <YAxis
                  tickFormatter={v => `$${v}`}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#52525b', fontSize: 10, fontFamily: 'monospace' }}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                  {stats.monthlyPnl.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.profit >= 0 ? 'rgba(52,211,153,0.8)' : 'rgba(248,113,113,0.8)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Cumulative P&L Line */}
      {stats.cumulativePnl.length > 1 && (
        <div>
          <SectionTitle>Cumulative Profit Over Time</SectionTitle>
          <div className="bg-[#0f1115] border border-white/[0.06] rounded-2xl p-5">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={stats.cumulativePnl}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="bet"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#52525b', fontSize: 10 }}
                  label={{ value: 'Bet #', position: 'insideBottomRight', fill: '#52525b', fontSize: 10 }}
                />
                <YAxis
                  tickFormatter={v => `$${v}`}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#52525b', fontSize: 10, fontFamily: 'monospace' }}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#FFD700"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#FFD700', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Two-column: Bet Type Breakdown + Reliable Players */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Bet Type Breakdown */}
        {stats.betTypes.length > 0 && (
          <div>
            <SectionTitle>Bet Types — Win % &amp; Volume</SectionTitle>
            <div className="bg-[#0f1115] border border-white/[0.06] rounded-2xl overflow-hidden">
              {stats.betTypes.map((t, i) => (
                <div
                  key={t.type}
                  className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="w-5 text-center">
                    <span className="text-[10px] font-black text-zinc-700 font-mono">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white uppercase tracking-tight">{t.type}</p>
                    <div className="mt-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#FFD700]/60"
                        style={{ width: `${t.winPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black font-mono text-[#FFD700]">
                      {t.winPct.toFixed(0)}%
                    </p>
                    <p className="text-[10px] text-zinc-600 font-mono">{t.total} bets</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Most Reliable Players */}
        {stats.reliablePlayers.length > 0 && (
          <div>
            <SectionTitle>Most Reliable Players (min. 3 bets)</SectionTitle>
            <div className="bg-[#0f1115] border border-white/[0.06] rounded-2xl overflow-hidden">
              {stats.reliablePlayers.map((p, i) => (
                <div
                  key={p.name}
                  className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="w-5 text-center">
                    {i === 0
                      ? <Trophy className="h-3.5 w-3.5 text-[#FFD700]" />
                      : <span className="text-[10px] font-black text-zinc-700 font-mono">{i + 1}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white italic uppercase tracking-tight truncate">
                      {p.name}
                    </p>
                    <div className="mt-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-400/60"
                        style={{ width: `${p.winPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black font-mono text-emerald-400">
                      {p.winPct.toFixed(0)}%
                    </p>
                    <p className="text-[10px] text-zinc-600 font-mono">{p.total} bets</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}