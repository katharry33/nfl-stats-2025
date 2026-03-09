'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Percent, 
  Trophy, Target, Zap, Loader2, Calendar, ChevronRight, UserX, UserCheck, BarChart2
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
    
    const normalize = (name: string) => {
      const n = (name || '').toLowerCase();
      if (n.includes('rushing') || n.includes('rush yds')) return 'Rushing Yards';
      if (n.includes('receiving') || n.includes('rec yds')) return 'Receiving Yards';
      if (n.includes('passing') || n.includes('pass yds')) return 'Passing Yards';
      if (n.includes('touchdown') || n.includes('td')) return 'Anytime TD';
      if (n.includes('receptions') || n.includes('rec')) return 'Receptions';
      return name; // Fallback
    };

    const allLegs: any[] = [];
    const propStats: Record<string, { wagered: number; profit: number; total: number; won: number }> = {};

    settled.forEach(bet => {
      const legs = bet.legs && bet.legs.length > 0 ? bet.legs : [{ ...bet, prop: bet.prop || bet.description, status: bet.status }];
      const isParlay = bet.legs && bet.legs.length > 0;

      const legWager = (Number(bet.stake) || 0) / (legs.length || 1);
      const totalBetProfit = calcProfit(bet);
      
      legs.forEach((l: any) => {
        const legStatus = (l.status || '').toLowerCase();
        const legProfit = totalBetProfit / (legs.length || 1);
        if (!['won', 'win', 'lost', 'loss'].includes(legStatus)) return;

        const type = normalize(l.prop);
        const isWin = ['won', 'win'].includes(legStatus);

        if (type) {
            if (!propStats[type]) propStats[type] = { wagered: 0, profit: 0, total: 0, won: 0 };
            propStats[type].total++;
            propStats[type].wagered += legWager;
            propStats[type].profit += isParlay ? legProfit : totalBetProfit; // single bet gets full profit
            if (isWin) propStats[type].won++;
        }

        if (l.player) {
           allLegs.push({ ...l, isWin });
        }
      });
    });

    const propAccuracy = Object.entries(propStats).map(([type, d]) => ({
      type,
      winPct: d.total > 0 ? (d.won / d.total) * 100 : 0,
      total: d.total,
      won: d.won,
      roi: d.wagered > 0 ? (d.profit / d.wagered) * 100 : 0,
    })).sort((a, b) => b.total - a.total);

    const playerStats = Object.entries(
      allLegs.reduce((acc, l) => {
        if (!l.player) return acc;
        if (!acc[l.player]) acc[l.player] = { total: 0, won: 0 };
        acc[l.player].total++;
        if (l.isWin) acc[l.player].won++;
        return acc;
      }, {} as any)
    ).map(([name, d]: any) => ({
      name,
      winPct: (d.total > 0 ? (d.won / d.total) * 100 : 0),
      total: d.total,
      won: d.won,
      lost: d.total - d.won
    }));

    const snipers = playerStats.filter(p => p.total >= 3).sort((a, b) => b.winPct - a.winPct).slice(0, 5);
    const fade = playerStats.filter(p => p.total >= 3).sort((a, b) => a.winPct - b.winPct).slice(0, 5);

    const wins = settled.filter(b => ['won', 'win'].includes(b.status?.toLowerCase()));
    const topPayouts = [...wins].sort((a, b) => calcProfit(b) - calcProfit(a)).slice(0, 4);
    const longestParlays = [...wins]
      .filter(b => b.legs?.length > 1)
      .sort((a, b) => (b.legs?.length || 0) - (a.legs?.length || 0))
      .slice(0, 4);

    const totalProfit = settled.reduce((a, b) => a + calcProfit(b), 0);
    const totalWagered = settled.reduce((a, b) => a + (Number(b.stake || b.wager) || 0), 0);

    const typeROI = Object.entries(
      settled.reduce((acc, b) => {
        const type = (b.betType || 'Straight').toLowerCase();
        if (!acc[type]) acc[type] = { wagered: 0, profit: 0, count: 0 };
        acc[type].wagered += Number(b.stake || b.wager) || 0;
        acc[type].profit += calcProfit(b);
        acc[type].count++;
        return acc;
      }, {} as any)
    ).map(([type, d]: any) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      roi: (d.wagered > 0 ? (d.profit / d.wagered) * 100 : 0),
      volume: d.wagered,
      count: d.count
    })).sort((a, b) => b.volume - a.volume);

    return { 
      totalProfit, totalWagered, 
      propAccuracy, snipers, fade,
      topPayouts, longestParlays, typeROI,
      winRate: settled.length ? (wins.length / settled.length) * 100 : 0,
      roi: totalWagered ? (totalProfit / totalWagered) * 100 : 0
    };
  }, [bets]);

  const simulation = useMemo(() => {
    let actualProfit = 0;
    let simulatedProfit = 0; // If every leg was a $10 straight bet
    let totalLegs = 0;

    bets.forEach(bet => {
      actualProfit += calcProfit(bet);
      
      const legs = bet.legs || [];
      legs.forEach((l: any) => {
        const legResult = (l.status || '').toLowerCase();
        const odds = Number(l.odds || -110); // Default to -110 if missing
        
        if (['won', 'win', 'lost', 'loss'].includes(legResult)) {
          totalLegs++;
          if (['won', 'win'].includes(legResult)) {
            // Calculate $10 straight bet profit
            const profit = 10 * toDecimal(odds) - 10;
            simulatedProfit += profit;
          } else {
            simulatedProfit -= 10;
          }
        }
      });
    });

    return { actualProfit, simulatedProfit, totalLegs };
  }, [bets]);

  const projection = useMemo(() => {
    const DAYS = 30;
    const STARTING_BANKROLL = 33; // From your recent sessions
    const avgBetsPerDay = bets.length > 0 ? bets.length / 30 : 2; 
    const winRate = stats.winRate / 100;
    
    // Estimate average profit per bet based on your history
    const settled = bets.filter(b => !['pending', 'void'].includes(b.status?.toLowerCase()));
    const avgProfitPerBet = settled.length 
      ? settled.reduce((a, b) => a + calcProfit(b), 0) / settled.length 
      : 0;

    let current = STARTING_BANKROLL;
    const data = [{ day: 0, balance: current }];

    for (let i = 1; i <= DAYS; i++) {
      // Add daily expected value based on your volume and hit rate
      current += (avgBetsPerDay * avgProfitPerBet);
      data.push({ day: i, balance: Math.max(0, current) });
    }

    return data;
  }, [bets, stats]);

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
  if (!projection || projection.length === 0 || !stats) return null;

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

      <div className="bg-[#0f1115] border border-white/5 rounded-3xl p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <TrendingUp className="h-3 w-3" /> 30-Day Bankroll Projection
            </h3>
            <p className="text-[9px] text-zinc-600 mt-1 uppercase font-bold">Based on current win rate & $33 starting balance</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 font-black uppercase">Projected End Balance</p>
            <p className="text-xl font-black font-mono text-[#FFD700]">
              ${projection[projection.length - 1].balance.toFixed(2)}
            </p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={projection}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
            <XAxis dataKey="day" hide />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#3f3f46', fontSize: 10, fontWeight: 700}} 
              domain={['auto', 'auto']}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload?.[0]) {
                  return (
                    <div className="bg-black border border-white/10 p-2 rounded shadow-xl font-mono text-[10px]">
                      Day {payload[0].payload.day}: ${Number(payload[0].value).toFixed(2)}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line 
              type="monotone" 
              dataKey="balance" 
              stroke="#FFD700" 
              strokeWidth={3} 
              dot={false}
              strokeDasharray={projection[projection.length - 1].balance < 33 ? "5 5" : "0"} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-[#0f1115] border border-[#FFD700]/10 rounded-3xl p-6 overflow-hidden relative">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Target className="h-32 w-32 text-[#FFD700]" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-4 w-4 text-[#FFD700]" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#FFD700]">The Straights Audit</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <p className="text-[10px] text-zinc-500 font-black uppercase mb-4">Actual Performance</p>
              <p className={`text-4xl font-black font-mono ${stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${stats.totalProfit.toFixed(2)}
              </p>
              <p className="text-[9px] text-zinc-600 mt-2 uppercase font-bold tracking-tighter">Based on your actual parlay/single mix</p>
            </div>

            <div className="border-l border-white/5 pl-12">
              <p className="text-[10px] text-zinc-500 font-black uppercase mb-4">Simulated $10 Straights</p>
              <p className={`text-4xl font-black font-mono ${simulation.simulatedProfit >= 0 ? 'text-[#FFD700]' : 'text-red-400'}`}>
                ${simulation.simulatedProfit.toFixed(2)}
              </p>
              <p className="text-[9px] text-zinc-600 mt-2 uppercase font-bold tracking-tighter">
                Profit if all {simulation.totalLegs} legs were flat-staked straights
              </p>
            </div>
          </div>

          {simulation.simulatedProfit > stats.totalProfit && (
            <div className="mt-8 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-tight">
                Strategy Alert: You are leaving money on the table by parlaying. Consider increasing straight-bet volume.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Accuracy & Reliability Grid */}
      <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Prop Accuracy</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.propAccuracy.map((p: any) => (
              <div key={p.type} className="bg-[#0f1115] border border-white/5 p-4 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{p.type}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black font-mono">{p.won}/{p.total}</span>
                    <span className="text-[9px] text-zinc-600 font-bold uppercase">Hits</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black font-mono ${p.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {p.roi >= 0 ? '+' : ''}{p.roi.toFixed(0)}% ROI
                  </p>
                  <p className="text-[9px] text-zinc-600 font-bold uppercase">{p.winPct.toFixed(0)}% Accuracy</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* The Snipers */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500/50">The Snipers</h3>
          <div className="bg-[#0f1115] border border-emerald-500/10 rounded-2xl overflow-hidden">
            {stats.snipers.map((p: any) => (
              <div key={p.name} className="flex items-center justify-between p-4 border-b border-white/[0.03] last:border-0">
                <p className="text-xs font-bold text-white uppercase italic">{p.name}</p>
                <div className="text-right">
                  <p className="text-sm font-black font-mono text-emerald-400">
                    {p.winPct.toFixed(0)}% <span className="text-[10px] text-zinc-500 ml-1">({p.won}/{p.total})</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* THE FADE LIST (New) */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-red-500/50">The Fade List (Parlay Killers)</h3>
          <div className="bg-[#0f1115] border border-red-500/10 rounded-2xl overflow-hidden">
            {stats.fade.map((p: any) => (
              <div key={p.name} className="flex items-center justify-between p-4 border-b border-white/[0.03] last:border-0">
                <div>
                  <p className="text-xs font-bold text-zinc-300 uppercase">{p.name}</p>
                  <p className="text-[9px] text-red-500/50 font-black uppercase tracking-tighter">Avoid adding to parlays</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black font-mono text-red-400">
                    {p.winPct.toFixed(0)}% <span className="text-[10px] text-zinc-500 ml-1">({p.won}/{p.total})</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="bg-[#0f1115] border border-white/5 rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart2 className="h-4 w-4 text-zinc-500" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">ROI by Bet Type</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(stats.typeROI || []).map((t: any) => (
            <div key={t.type} className="bg-black/20 border border-white/[0.03] p-4 rounded-xl">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-zinc-500 uppercase">{t.type}</span>
                <span className={`text-xs font-mono font-bold ${t.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {t.roi >= 0 ? '+' : ''}{t.roi.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-lg font-black font-mono">${t.volume.toFixed(0)}</span>
                <span className="text-[9px] text-zinc-600 uppercase font-bold">Total Volume</span>
              </div>
              <p className="text-[9px] text-zinc-700 mt-1 font-mono">{t.count} bets placed</p>
            </div>
          ))}
        </div>
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