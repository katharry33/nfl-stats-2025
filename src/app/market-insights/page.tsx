'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell, ReferenceLine,
} from 'recharts';
import { TrendingUp, Target, Zap, Search, ChevronUp, ChevronDown, Activity, Shield, BarChart2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InsightsData {
  meta:             { totalProps: number; scoredProps: number; overallHitRate: number; seasons: number[] };
  playerPatterns:   PlayerPattern[];
  propTypeSummary:  PropTypeStat[];
  confAccuracy:     BucketStat[];
  rankImpact:       BucketStat[];
  scoreDiffImpact:  BucketStat[];
  weeklyTrend:      WeekStat[];
  edgeAccuracy:     BucketStat[];
}
interface PlayerPattern { player: string; prop: string; hitRate: number; won: number; total: number; avgLine: number | null; avgConf: number | null; dominantOU: string | null; }
interface PropTypeStat   { prop: string; hitRate: number; total: number; won: number; overHitRate: number; overTotal: number; underHitRate: number; underTotal: number; }
interface BucketStat     { bucket: string; hitRate: number; total: number; won: number; }
interface WeekStat       { week: number; hitRate: number; total: number; won: number; season: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GOLD = '#FFD700';

function hitColor(rate: number) {
  if (rate >= 65) return '#10b981';
  if (rate >= 55) return GOLD;
  if (rate >= 45) return '#f97316';
  return '#ef4444';
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-px flex-1 bg-white/[0.06]" />
      <span className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground px-2">{children}</span>
      <div className="h-px flex-1 bg-white/[0.06]" />
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a0c0f] border border-white/10 rounded-xl px-3 py-2 shadow-2xl">
      <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs font-mono font-bold" style={{ color: p.color ?? GOLD }}>
          {typeof p.value === 'number' ? `${p.value.toFixed(1)}%` : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketInsightsPage() {
  const [data,    setData]    = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [season,  setSeason]  = useState<'all' | '2024' | '2025'>('all');
  const [search,  setSearch]  = useState('');
  const [propFilter, setPropFilter] = useState('');
  const [sortKey, setSortKey] = useState<'hitRate' | 'total'>('hitRate');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/insights?season=${season}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [season]);

  const filteredPlayers = useMemo(() => {
    if (!data) return [];
    let list = data.playerPatterns;
    if (search)     list = list.filter(p => p.player.toLowerCase().includes(search.toLowerCase()));
    if (propFilter) list = list.filter(p => p.prop === propFilter);
    return [...list].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }, [data, search, propFilter, sortKey, sortDir]);

  const propOptions = useMemo(() =>
    data ? [...new Set(data.playerPatterns.map(p => p.prop))].sort() : [],
    [data]);

  const toggleSort = (k: typeof sortKey) => {
    if (k === sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(k); setSortDir('desc'); }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-[#FFD700]/30 border-t-[#FFD700] animate-spin" />
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Analyzing patterns…</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">
      Failed to load insights
    </div>
  );

  const { meta, propTypeSummary, confAccuracy, rankImpact, scoreDiffImpact, weeklyTrend, edgeAccuracy } = data;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black italic uppercase tracking-tight">Market Insights</h1>
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mt-1">
              {meta.scoredProps.toLocaleString()} scored props · {meta.overallHitRate.toFixed(1)}% overall hit rate
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl overflow-hidden border border-border">
              {(['all', '2024', '2025'] as const).map(s => (
                <button key={s} onClick={() => setSeason(s)}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase transition-colors ${
                    season === s ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-black/40 text-muted-foreground hover:text-zinc-400'
                  }`}>
                  {s === 'all' ? 'All' : s === '2024' ? '2024–25' : '2025–26'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Overall Hit Rate', value: `${meta.overallHitRate.toFixed(1)}%`, sub: `${meta.scoredProps.toLocaleString()} scored`, icon: Target, color: hitColor(meta.overallHitRate) },
            { label: 'Props Tracked', value: meta.totalProps.toLocaleString(), sub: 'across all weeks', icon: BarChart2, color: '#60a5fa' },
            { label: 'Best Prop Type', value: propTypeSummary[0]?.prop ?? '—', sub: `${propTypeSummary[0]?.hitRate.toFixed(0)}% hit rate`, icon: TrendingUp, color: GOLD },
            { label: 'Model Accuracy', value: confAccuracy.find(c => c.bucket === '75+')
                ? `${confAccuracy.find(c => c.bucket === '75+')!.hitRate.toFixed(0)}%`
                : '—',
              sub: 'at 75%+ confidence', icon: Zap, color: '#10b981' },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-3 w-3" style={{ color }} />
                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
              </div>
              <p className="text-xl font-black italic uppercase truncate" style={{ color }}>{value}</p>
              <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Two-col charts row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Prop Type Breakdown */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <SectionLabel>Hit Rate by Prop Type</SectionLabel>
            <div className="space-y-3">
              {propTypeSummary.slice(0, 8).map(p => (
                <div key={p.prop} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-300 uppercase">{p.prop}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] text-muted-foreground font-mono">{p.total} games</span>
                      <span className="text-xs font-black font-mono" style={{ color: hitColor(p.hitRate) }}>
                        {p.hitRate.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <StatBar value={p.hitRate} color={hitColor(p.hitRate)} />
                  <div className="flex gap-4">
                    <span className="text-[8px] text-muted-foreground/70 font-mono">
                      Over {p.overHitRate.toFixed(0)}% ({p.overTotal})
                    </span>
                    <span className="text-[8px] text-muted-foreground/70 font-mono">
                      Under {p.underHitRate.toFixed(0)}% ({p.underTotal})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly trend */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <SectionLabel>Hit Rate by Week</SectionLabel>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={weeklyTrend} margin={{ left: -20, right: 8 }}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="week" tick={{ fill: '#52525b', fontSize: 9, fontWeight: 700 }}
                  axisLine={false} tickLine={false} label={{ value: 'Week', position: 'insideBottom', offset: -2, fill: '#52525b', fontSize: 9 }} />
                <YAxis tick={{ fill: '#52525b', fontSize: 9, fontFamily: 'monospace' }}
                  axisLine={false} tickLine={false} domain={[30, 80]}
                  tickFormatter={v => `${v}%`} />
                <ReferenceLine y={50} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="hitRate" stroke={GOLD} strokeWidth={2}
                  dot={false} activeDot={{ r: 4, fill: GOLD }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Model validation row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Confidence score accuracy */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <SectionLabel>Confidence Score vs Actual</SectionLabel>
            <p className="text-[9px] text-muted-foreground mb-4 font-mono">Does higher confidence = more hits?</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={confAccuracy} margin={{ left: -20, right: 4 }}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="bucket" tick={{ fill: '#52525b', fontSize: 8, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#52525b', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                <ReferenceLine y={50} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="hitRate" radius={[3, 3, 0, 0]}>
                  {confAccuracy.map((c, i) => <Cell key={i} fill={hitColor(c.hitRate)} fillOpacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Opponent rank impact */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <SectionLabel>Opponent Defense Rank</SectionLabel>
            <p className="text-[9px] text-muted-foreground mb-4 font-mono">Does weak defense = more overs?</p>
            <div className="space-y-4 mt-6">
              {rankImpact.map(r => (
                <div key={r.bucket} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase">{r.bucket}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] text-muted-foreground font-mono">{r.total}</span>
                      <span className="text-xs font-black font-mono" style={{ color: hitColor(r.hitRate) }}>
                        {r.hitRate.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <StatBar value={r.hitRate} color={hitColor(r.hitRate)} />
                </div>
              ))}
            </div>
          </div>

          {/* Edge accuracy */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <SectionLabel>Edge % vs Hit Rate</SectionLabel>
            <p className="text-[9px] text-muted-foreground mb-4 font-mono">Does positive edge predict results?</p>
            <div className="space-y-4 mt-6">
              {edgeAccuracy.map(e => (
                <div key={e.bucket} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase">{e.bucket}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] text-muted-foreground font-mono">{e.total}</span>
                      <span className="text-xs font-black font-mono" style={{ color: hitColor(e.hitRate) }}>
                        {e.hitRate.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <StatBar value={e.hitRate} color={hitColor(e.hitRate)} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Score diff impact ── */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <SectionLabel>Score Diff (Player Avg − Line) vs Hit Rate</SectionLabel>
          <p className="text-[9px] text-muted-foreground mb-4 font-mono">
            Positive = player averages above the line. Does a higher score diff predict a hit?
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={scoreDiffImpact} margin={{ left: -20, right: 8 }}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="bucket" tick={{ fill: '#52525b', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#52525b', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <ReferenceLine y={50} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
              <Tooltip content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = scoreDiffImpact.find(s => s.bucket === label);
                return (
                  <div className="bg-[#0a0c0f] border border-white/10 rounded-xl px-3 py-2 shadow-2xl">
                    <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">{label}</p>
                    <p className="text-xs font-mono font-bold" style={{ color: hitColor(payload[0].value as number) }}>
                      {(payload[0].value as number).toFixed(1)}% hit rate
                    </p>
                    <p className="text-[9px] text-muted-foreground font-mono">{d?.total} games</p>
                  </div>
                );
              }} />
              <Bar dataKey="hitRate" radius={[3, 3, 0, 0]}>
                {scoreDiffImpact.map((s, i) => <Cell key={i} fill={hitColor(s.hitRate)} fillOpacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Player patterns table ── */}
        <div className="space-y-3">
          <SectionLabel>Player Pattern Database</SectionLabel>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player…"
                className="pl-7 pr-3 py-1.5 w-40 bg-black/40 border border-border text-foreground text-xs font-mono rounded-xl outline-none focus:ring-1 focus:ring-[#FFD700]/30 placeholder:text-muted-foreground/70" />
            </div>
            <select value={propFilter} onChange={e => setPropFilter(e.target.value)}
              className="py-1.5 px-2.5 bg-black/40 border border-border text-zinc-300 text-xs font-mono rounded-xl outline-none focus:ring-1 focus:ring-[#FFD700]/30">
              <option value="">All Prop Types</option>
              {propOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <span className="text-muted-foreground/70 text-[10px] font-mono ml-auto">{filteredPlayers.length} patterns</span>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-black/40 border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">Player</th>
                    <th className="px-4 py-2.5 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground">Prop</th>
                    <th className="px-4 py-2.5 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-zinc-400"
                      onClick={() => toggleSort('hitRate')}>
                      <span className="flex items-center justify-center gap-1">
                        Hit %
                        {sortKey === 'hitRate'
                          ? sortDir === 'desc' ? <ChevronDown className="h-3 w-3 text-[#FFD700]" /> : <ChevronUp className="h-3 w-3 text-[#FFD700]" />
                          : null}
                      </span>
                    </th>
                    <th className="px-4 py-2.5 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-zinc-400"
                      onClick={() => toggleSort('total')}>
                      <span className="flex items-center justify-center gap-1">
                        Sample
                        {sortKey === 'total'
                          ? sortDir === 'desc' ? <ChevronDown className="h-3 w-3 text-[#FFD700]" /> : <ChevronUp className="h-3 w-3 text-[#FFD700]" />
                          : null}
                      </span>
                    </th>
                    <th className="px-4 py-2.5 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground">Avg Line</th>
                    <th className="px-4 py-2.5 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground">Direction</th>
                    <th className="px-4 py-2.5 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground">Avg Conf</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.slice(0, 50).map((p, i) => (
                    <tr key={`${p.player}|${p.prop}`}
                      className={`border-t border-border ${i % 2 === 0 ? 'bg-black/10' : ''} hover:bg-white/[0.02] transition-colors`}>
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-black italic uppercase text-foreground">{p.player}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[9px] text-muted-foreground uppercase font-bold">{p.prop}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs font-black font-mono" style={{ color: hitColor(p.hitRate) }}>
                            {p.hitRate.toFixed(0)}%
                          </span>
                          <div className="w-12">
                            <StatBar value={p.hitRate} color={hitColor(p.hitRate)} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="text-[10px] font-mono text-zinc-400">{p.won}/{p.total}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="text-[10px] font-mono text-zinc-400">
                          {p.avgLine != null ? p.avgLine.toFixed(1) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {p.dominantOU ? (
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                            p.dominantOU === 'Over'
                              ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                              : 'text-orange-400 bg-orange-500/10 border-orange-500/20'
                          }`}>
                            {p.dominantOU}
                          </span>
                        ) : <span className="text-muted-foreground/70 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {p.avgConf != null ? (
                          <span className="text-[10px] font-mono" style={{ color: hitColor(p.avgConf) }}>
                            {p.avgConf.toFixed(0)}%
                          </span>
                        ) : <span className="text-muted-foreground/70 text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                  {filteredPlayers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground/70 text-sm font-black uppercase italic">
                        No patterns match
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredPlayers.length > 50 && (
              <div className="px-4 py-3 border-t border-border bg-black/20 text-center text-muted-foreground text-[10px] font-mono">
                Showing 50 of {filteredPlayers.length} — use filters to narrow
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}