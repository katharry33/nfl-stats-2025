'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Percent, 
  Trophy, Target, Zap, Loader2, Calendar, ChevronRight 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line, Cell 
} from 'recharts';
import { toDecimal } from '@/lib/utils/odds';

// ─── Types & Helpers ─────────────────────────────────────────────────────────

type Timeframe = 'day' | 'week' | 'month';

function calcProfit(bet: any): number {
  if (bet.isBonusBet) return 0; // Exclude from ROI calculation
  const stake = Number(bet.stake || bet.wager) || 0;
  const status = (bet.status || '').toLowerCase();
  
  if (['won', 'win'].includes(status)) {
    const odds = Number(bet.odds) || 0;
    const boost = parseFloat(String(bet.boost || '0').replace('%', '')) / 100;
    return (stake * toDecimal(odds) * (1 + boost)) - stake;
  }
  if (['lost', 'loss'].includes(status)) return -stake;
  if (status === 'cashed') return (Number(bet.cashOutAmount || bet.payout) || 0) - stake;
  return 0;
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function KpiCard({ title, value, color, icon: Icon, sub }: any) {
  return (
    <div className="bg-[#0f1115] border border-white/[0.06] p-4 rounded-2xl">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-3 w-3 ${color}`} />
        <span className="text-[9px] uppercase font-black text-zinc-600 tracking-widest">{title}</span>
      </div>
      <p className={`text-xl font-black font-mono tracking-tight ${color}`}>{value}</p>
      {sub && <p className="text-[9px] text-zinc-600 mt-1 font-mono truncate">{sub}</p>}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function PerformancePage() {
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>('week');

  useEffect(() => {
    fetch('/api/performance')
      .then(r => r.json())
      .then(json => { setBets(Array.isArray(json) ? json : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const settled = bets.filter(b => !['pending', 'void', 'push'].includes((b.status || '').toLowerCase()));
    
    // 1. Leg-Level Accuracy (The "Truth" Stats)
    const allLegs: any[] = [];
    settled.forEach(bet => {
      const legs = bet.legs || [{ player: bet.player, prop: bet.prop, actualResult: bet.status }];
      legs.forEach((l: any) => {
        if (!l.prop) return;
        allLegs.push({
          ...l,
          isWin: ['won', 'win'].includes((l.actualResult || bet.status || '').toLowerCase())
        });
      });
    });

    const propAccuracy = Object.entries(
      allLegs.reduce((acc, l) => {
        if (!acc[l.prop]) acc[l.prop] = { total: 0, won: 0 };
        acc[l.prop].total++;
        if (l.isWin) acc[l.prop].won++;
        return acc;
      }, {} as any)
    ).map(([type, d]: any) => ({
      type,
      winPct: (d.won / d.total) * 100,
      total: d.total
    })).sort((a, b) => b.total - a.total);

    // 2. Player Reliability (Min 3 Legs)
    const playerReliability = Object.entries(
      allLegs.reduce((acc, l) => {
        if (!l.player) return acc;
        if (!acc[l.player]) acc[l.player] = { total: 0, won: 0 };
        acc[l.player].total++;
        if (l.isWin) acc[l.player].won++;
        return acc;
      }, {} as any)
    )
      .filter(([, d]: any) => d.total >= 3)
      .map(([name, d]: any) => ({ name, winPct: (d.won / d.total) * 100, total: d.total }))
      .sort((a, b) => b.winPct - a.winPct || b.total - a.total)
      .slice(0, 6);

    // 3. Hall of Fame (Biggest Wins & Longest Parlays)
    const wins = settled.filter(b => ['won', 'win'].includes(b.status?.toLowerCase()));
    const topPayouts = [...wins].sort((a, b) => calcProfit(b) - calcProfit(a)).slice(0, 4);
    const longestParlays = [...wins]
      .filter(b => b.legs?.length > 1)
      .sort((a, b) => b.legs.length - a.legs.length)
      .slice(0, 4);

    // 4. Financials
    const totalProfit = settled.reduce((a, b) => a + calcProfit(b), 0);
    const totalWagered = settled.reduce((a, b) => a + (Number(b.stake || b.wager) || 0), 0);

    return { 
      totalProfit, totalWagered, 
      propAccuracy, playerReliability, 
      topPayouts, longestParlays,
      winRate: settled.length ? (wins.length / settled.length) * 100 : 0,
      roi: totalWagered ? (totalProfit / totalWagered) * 100 : 0
    };
  }, [bets]);

  // 5. Chart Data (Sortable by timeframe)
  const chartData = useMemo(() => {
    const groups: Record<string, number> = {};
    const sorted = [...bets].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    sorted.forEach(b => {
      const d = new Date(b.createdAt);
      let key = '';
      if (timeframe === 'day') key = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
      else if (timeframe === 'month') key = d.toLocaleString('default', { month: 'short' });
      else {
        const start = new Date(d.getFullYear(), 0, 1);
        const week = Math.ceil((((d.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
        key = `W${week}`;
      }
      groups[key] = (groups[key] || 0) + calcProfit(b);
    });

    return Object.entries(groups).map(([name, profit]) => ({ name, profit }));
  }, [bets, timeframe]);

  if (loading) return <div className="min-h-screen bg-[#060606] flex items-center justify-center"><Loader2 className="animate-spin text-[#FFD700]" /></div>;

  return (
    <div className="min-h-screen bg-[#060606] text-white p-6 max-w-7xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Performance Lab</h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">Leg-level accuracy & financial audit</p>
        </div>
        <div className="flex bg-[#0f1115] border border-white/5 rounded-lg p-1">
          {(['day', 'week', 'month'] as Timeframe[]).map(t => (
            <button 
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1 text-[10px] font-black uppercase rounded ${timeframe === t ? 'bg-[#FFD700] text-black' : 'text-zinc-500'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="Net Profit" value={`$${stats.totalProfit.toFixed(2)}`} color={stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'} icon={DollarSign} />
        <KpiCard title="Hit Rate" value={`${stats.winRate.toFixed(1)}%`} color="text-[#FFD700]" icon={Target} />
        <KpiCard title="ROI" value={`${stats.roi.toFixed(1)}%`} color={stats.roi >= 0 ? 'text-emerald-400' : 'text-red-400'} icon={TrendingUp} />
        <KpiCard title="Volume" value={`$${stats.totalWagered.toFixed(0)}`} color="text-zinc-400" icon={Zap} sub="Total real-money wager" />
      </div>

      {/* Main Chart */}
      <div className="bg-[#0f1115] border border-white/5 rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="h-4 w-4 text-zinc-500" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">P&L Trend ({timeframe})</h3>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#52525b', fontSize: 10, fontWeight: 700}} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#52525b', fontSize: 10, fontFamily: 'monospace'}} />
            <Tooltip cursor={{fill: 'transparent'}} content={({active, payload}) => {
              if (active && payload?.[0]) {
                const val = payload[0].value as number;
                return (
                  <div className="bg-black border border-white/10 p-2 rounded shadow-xl font-mono text-[10px]">
                    <span className={val >= 0 ? 'text-emerald-400' : 'text-red-400'}>${val.toFixed(2)}</span>
                  </div>
                );
              }
              return null;
            }} />
            <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.6} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Accuracy & Reliability */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Accuracy by Prop Type</h3>
          <div className="bg-[#0f1115] border border-white/5 rounded-2xl overflow-hidden">
            {stats.propAccuracy.map((p: any) => (
              <div key={p.type} className="flex items-center justify-between p-4 border-b border-white/[0.03] last:border-0">
                <div>
                  <p className="text-xs font-bold text-white uppercase">{p.type}</p>
                  <p className="text-[9px] text-zinc-500 font-mono">{p.total} legs tracked</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black font-mono ${p.winPct >= 60 ? 'text-emerald-400' : 'text-white'}`}>{p.winPct.toFixed(0)}%</p>
                  <div className="w-24 h-1 bg-white/5 rounded-full mt-1"><div className="h-full bg-[#FFD700] rounded-full" style={{width: `${p.winPct}%`}} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600">The Snipers (Most Reliable Players)</h3>
          <div className="bg-[#0f1115] border border-white/5 rounded-2xl overflow-hidden">
            {stats.playerReliability.map((p: any) => (
              <div key={p.name} className="flex items-center justify-between p-4 border-b border-white/[0.03] last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-[10px] font-black text-[#FFD700]">{p.name[0]}</div>
                  <div>
                    <p className="text-xs font-bold text-white uppercase">{p.name}</p>
                    <p className="text-[9px] text-zinc-500 font-mono">{p.total} legs</p>
                  </div>
                </div>
                <p className="text-sm font-black font-mono text-emerald-400">{p.winPct.toFixed(0)}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hall of Fame */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0f1115] border border-white/5 rounded-2xl p-5">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-4 flex items-center gap-2"><Trophy className="h-3 w-3" /> Highest Payouts</h3>
          {stats.topPayouts.map((b: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-2 group cursor-default">
              <span className="text-[10px] font-mono text-zinc-500 group-hover:text-[#FFD700] transition-colors">{b.description || b.player || 'Parlay'}</span>
              <span className="text-xs font-black text-emerald-400">+${calcProfit(b).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="bg-[#0f1115] border border-white/5 rounded-2xl p-5">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-4 flex items-center gap-2"><Zap className="h-3 w-3" /> Biggest Parlay Hits</h3>
          {stats.longestParlays.map((b: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-2">
              <span className="text-[10px] font-mono text-zinc-500">{b.legs?.length || 0} Leg Winner</span>
              <span className="text-xs font-black text-[#FFD700]">{b.odds > 0 ? `+${b.odds}` : b.odds}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}