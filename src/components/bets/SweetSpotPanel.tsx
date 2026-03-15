'use client';
// src/components/bets/SweetSpotPanel.tsx
//
// Full sweet spot analysis panel.
// Can be used as a standalone page or embedded in a modal.

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { Target, Zap, TrendingUp, Shield, Percent, Users } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BucketStat {
  label:   string;
  hitRate: number | null;
  total:   number;
  won:     number;
  min?:    number;
  max?:    number;
}
interface PlayerPattern {
  player:  string;
  total:   number;
  won:     number;
  hitRate: number | null;
  props:   string[];
}
interface SweetSpotsData {
  meta:          { totalLegs: number; wonLegs: number; overallHitRate: number };
  sweetSpots:    Record<string, BucketStat | null>;
  dimensions:    {
    scoreDiff:  BucketStat[];
    confidence: BucketStat[];
    rank:       BucketStat[];
    edge:       BucketStat[];
    kelly:      BucketStat[];
    legCount:   (BucketStat & { count: number })[];
    propType:   (BucketStat & { prop: string })[];
    overUnder:  (BucketStat & { dir: string })[];
  };
  playerPatterns: PlayerPattern[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GOLD = '#FFD700';
const OVERALL_LINE_COLOR = 'rgba(255,255,255,0.15)';

function hitColor(rate: number, baseline: number) {
  const delta = rate - baseline;
  if (delta >= 15) return '#10b981';
  if (delta >= 5)  return GOLD;
  if (delta >= 0)  return '#f97316';
  return '#ef4444';
}

function SectionLabel({ children, icon: Icon }: { children: React.ReactNode; icon?: any }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {Icon && <Icon className="h-3.5 w-3.5 text-zinc-600" />}
      <div className="h-px flex-1 bg-white/[0.06]" />
      <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600 px-2">{children}</span>
      <div className="h-px flex-1 bg-white/[0.06]" />
    </div>
  );
}

function SweetSpotCallout({ bucket, label }: { bucket: BucketStat | null; label: string }) {
  if (!bucket) return (
    <div className="bg-black/20 border border-white/[0.04] rounded-xl p-3 text-center">
      <p className="text-[8px] font-black uppercase text-zinc-700 tracking-widest">{label}</p>
      <p className="text-[10px] text-zinc-700 font-mono mt-1">Not enough data</p>
    </div>
  );
  return (
    <div className="bg-[#FFD700]/[0.04] border border-[#FFD700]/20 rounded-xl p-3">
      <p className="text-[8px] font-black uppercase text-zinc-600 tracking-widest mb-1">{label}</p>
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-white">{bucket.label}</p>
        <span className="text-sm font-black font-mono text-[#FFD700]">
          {bucket.hitRate?.toFixed(0)}%
        </span>
      </div>
      <p className="text-[8px] text-zinc-600 font-mono mt-0.5">{bucket.won}/{bucket.total} hits</p>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, baseline }: any) => {
  if (!active || !payload?.length) return null;
  const rate = payload[0].value as number;
  return (
    <div className="bg-[#0a0c0f] border border-white/10 rounded-xl px-3 py-2 shadow-2xl">
      <p className="text-[9px] font-black uppercase text-zinc-500 mb-0.5">{label}</p>
      <p className="text-xs font-mono font-bold" style={{ color: hitColor(rate, baseline) }}>
        {rate.toFixed(1)}% hit rate
      </p>
      <p className="text-[8px] text-zinc-600 font-mono">
        {payload[0].payload.won}/{payload[0].payload.total} legs
      </p>
    </div>
  );
};

function DimensionChart({
  data, baseline, title, icon: Icon,
}: {
  data:     BucketStat[];
  baseline: number;
  title:    string;
  icon?:    any;
}) {
  const chartData = data.filter(b => b.hitRate != null);
  if (!chartData.length) return (
    <div className="bg-[#0f1115] border border-white/[0.06] rounded-2xl p-5">
      <SectionLabel icon={Icon}>{title}</SectionLabel>
      <p className="text-center text-zinc-700 text-xs py-8 font-mono">Not enough data</p>
    </div>
  );

  return (
    <div className="bg-[#0f1115] border border-white/[0.06] rounded-2xl p-5">
      <SectionLabel icon={Icon}>{title}</SectionLabel>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} margin={{ left: -20, right: 4 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
          <XAxis dataKey="label" tick={{ fill: '#52525b', fontSize: 8, fontWeight: 700 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#52525b', fontSize: 8, fontFamily: 'monospace' }} axisLine={false} tickLine={false}
            tickFormatter={v => `${v}%`} domain={[0, 100]} />
          <ReferenceLine y={baseline} stroke={OVERALL_LINE_COLOR} strokeDasharray="4 4" label={{ value: `avg ${baseline.toFixed(0)}%`, position: 'right', fill: '#52525b', fontSize: 8 }} />
          <Tooltip content={<CustomTooltip baseline={baseline} />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
          <Bar dataKey="hitRate" radius={[3, 3, 0, 0]}>
            {chartData.map((b, i) => (
              <Cell key={i} fill={hitColor(b.hitRate!, baseline)} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function SweetSpotPanel() {
  const [data,    setData]    = useState<SweetSpotsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sweet-spots')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-[#FFD700]/30 border-t-[#FFD700] animate-spin" />
        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Analyzing your patterns…</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="py-12 text-center text-zinc-600 text-sm">No data available</div>
  );

  const { meta, sweetSpots, dimensions, playerPatterns } = data;
  const baseline = meta.overallHitRate;

  return (
    <div className="space-y-8">

      {/* ── Hero stat ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-[#0f1115] border border-[#FFD700]/20 rounded-2xl relative overflow-hidden">
        <div className="absolute -right-4 -top-4 opacity-[0.04]">
          <Target className="h-32 w-32 text-[#FFD700]" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-[#FFD700] animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Your Personal Sweet Spot Engine</span>
          </div>
          <p className="text-zinc-400 text-xs font-mono max-w-lg">
            Based on <span className="text-white font-bold">{meta.wonLegs}</span> winning legs out of{' '}
            <span className="text-white font-bold">{meta.totalLegs}</span> total.{' '}
            Your overall hit rate is{' '}
            <span className="text-[#FFD700] font-bold">{baseline.toFixed(1)}%</span>.
            Green bars beat your average — those are your sweet spots.
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Overall Hit Rate</p>
          <p className="text-3xl font-black font-mono text-[#FFD700]">{baseline.toFixed(1)}%</p>
        </div>
      </div>

      {/* ── Sweet spot callouts ── */}
      <div>
        <SectionLabel icon={Target}>Your Sweet Spots At a Glance</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SweetSpotCallout bucket={sweetSpots.scoreDiff    as any} label="Score Diff"    />
          <SweetSpotCallout bucket={sweetSpots.confidence   as any} label="Confidence"   />
          <SweetSpotCallout bucket={sweetSpots.opponentRank as any} label="Opp Rank"     />
          <SweetSpotCallout bucket={sweetSpots.edge         as any} label="Edge %"       />
          <SweetSpotCallout bucket={sweetSpots.kelly        as any} label="Kelly %"      />
          <SweetSpotCallout bucket={sweetSpots.legCount     as any} label="Parlay Size"  />
          <SweetSpotCallout bucket={sweetSpots.propType     as any} label="Best Prop"    />
          <SweetSpotCallout bucket={sweetSpots.overUnder    as any} label="Over/Under"   />
        </div>
      </div>

      {/* ── Dimension charts ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DimensionChart data={dimensions.scoreDiff}  baseline={baseline} title="Score Diff (Avg − Line)" icon={TrendingUp} />
        <DimensionChart data={dimensions.confidence} baseline={baseline} title="Confidence Score"         icon={Percent}   />
        <DimensionChart data={dimensions.rank}       baseline={baseline} title="Opponent Defense Rank"    icon={Shield}    />
        <DimensionChart data={dimensions.edge}       baseline={baseline} title="Edge %"                   icon={Zap}       />
      </div>

      {/* ── Leg count + Over/Under ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Parlay size */}
        <div className="bg-[#0f1115] border border-white/[0.06] rounded-2xl p-5">
          <SectionLabel>Parlay Size Hit Rate</SectionLabel>
          <div className="space-y-3">
            {dimensions.legCount.map(b => (
              <div key={b.label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-300 uppercase">{b.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-mono text-zinc-600">{b.won}/{b.total}</span>
                    <span className="text-xs font-black font-mono" style={{ color: hitColor(b.hitRate ?? 0, baseline) }}>
                      {b.hitRate?.toFixed(0) ?? '—'}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${b.hitRate ?? 0}%`,
                    background: hitColor(b.hitRate ?? 0, baseline),
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Over vs Under */}
        <div className="bg-[#0f1115] border border-white/[0.06] rounded-2xl p-5">
          <SectionLabel>Over vs Under</SectionLabel>
          <div className="grid grid-cols-2 gap-4 mt-6">
            {dimensions.overUnder.map(d => (
              <div key={d.dir} className={`p-4 rounded-xl border ${
                d.hitRate != null && d.hitRate > baseline
                  ? 'border-[#FFD700]/30 bg-[#FFD700]/[0.04]'
                  : 'border-white/[0.04] bg-black/20'
              }`}>
                <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${
                  d.dir === 'over' ? 'text-blue-400' : 'text-orange-400'
                }`}>{d.dir}</p>
                <p className="text-2xl font-black font-mono text-white">{d.hitRate?.toFixed(0) ?? '—'}%</p>
                <p className="text-[9px] text-zinc-600 font-mono mt-0.5">{d.won}/{d.total} hits</p>
                {d.hitRate != null && d.hitRate > baseline && (
                  <p className="text-[8px] text-[#FFD700] font-black uppercase mt-2">↑ Sweet Spot</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Prop type breakdown ── */}
      <div className="bg-[#0f1115] border border-white/[0.06] rounded-2xl p-5">
        <SectionLabel>Hit Rate by Prop Type (Your Bets)</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {dimensions.propType.map(p => (
            <div key={p.prop} className={`flex items-center justify-between p-3 rounded-xl border ${
              (p.hitRate ?? 0) > baseline
                ? 'border-[#FFD700]/20 bg-[#FFD700]/[0.03]'
                : 'border-white/[0.04] bg-black/10'
            }`}>
              <div>
                <p className="text-[10px] font-bold text-zinc-300 uppercase">{p.prop}</p>
                <p className="text-[8px] text-zinc-600 font-mono">{p.won}/{p.total} hits</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black font-mono" style={{ color: hitColor(p.hitRate ?? 0, baseline) }}>
                  {p.hitRate?.toFixed(0) ?? '—'}%
                </p>
                {(p.hitRate ?? 0) > baseline && (
                  <p className="text-[8px] text-[#FFD700] font-black uppercase">sweet spot</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Player patterns ── */}
      <div className="bg-[#0f1115] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="p-5 pb-3">
          <SectionLabel icon={Users}>Your Most Reliable Players</SectionLabel>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-black/40 border-b border-white/[0.06]">
              <tr>
                <th className="px-4 py-2 text-left text-[8px] font-black uppercase tracking-widest text-zinc-600">Player</th>
                <th className="px-4 py-2 text-center text-[8px] font-black uppercase tracking-widest text-zinc-600">Hit Rate</th>
                <th className="px-4 py-2 text-center text-[8px] font-black uppercase tracking-widest text-zinc-600">Record</th>
                <th className="px-4 py-2 text-left text-[8px] font-black uppercase tracking-widest text-zinc-600">Props You've Bet</th>
                <th className="px-4 py-2 text-center text-[8px] font-black uppercase tracking-widest text-zinc-600">Signal</th>
              </tr>
            </thead>
            <tbody>
              {playerPatterns.map((p, i) => {
                const isSweet = (p.hitRate ?? 0) > baseline;
                return (
                  <tr key={p.player} className={`border-t border-white/[0.04] ${i % 2 === 0 ? 'bg-black/10' : ''} ${isSweet ? 'bg-[#FFD700]/[0.02]' : ''}`}>
                    <td className="px-4 py-2.5">
                      <p className="text-xs font-black italic uppercase text-white">{p.player}</p>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-xs font-black font-mono" style={{ color: hitColor(p.hitRate ?? 0, baseline) }}>
                        {p.hitRate?.toFixed(0) ?? '—'}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-[10px] font-mono text-zinc-500">{p.won}/{p.total}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {p.props.slice(0, 3).map(pr => (
                          <span key={pr} className="text-[8px] text-zinc-600 bg-white/[0.04] px-1.5 py-0.5 rounded uppercase font-bold">
                            {pr}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {isSweet ? (
                        <span className="text-[8px] font-black text-[#FFD700] uppercase flex items-center justify-center gap-1">
                          🎯 Lock
                        </span>
                      ) : (
                        <span className="text-[8px] text-zinc-700 font-mono">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}