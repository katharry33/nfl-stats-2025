'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { Target, Zap, TrendingUp, Shield, Percent, Users, Layers } from 'lucide-react';

// ─── Theme Constants ──────────────────────────────────────────────────────────
const CYAN = '#22d3ee';
const SLATE = '#475569';
const OVERALL_LINE_COLOR = 'rgba(34,211,238,0.2)';

function hitColor(rate: number, baseline: number) {
  const delta = rate - baseline;
  if (delta >= 10) return CYAN;      // Significant Sweet Spot
  if (delta >= 0)  return '#94a3b8';  // Above Average
  return '#ef4444';                  // Underperforming
}

// ─── Components ───────────────────────────────────────────────────────────────

function SectionLabel({ children, icon: Icon }: { children: React.ReactNode; icon?: any }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {Icon && <Icon className="h-3.5 w-3.5 text-slate-500" />}
      <div className="h-px flex-1 bg-white/[0.06]" />
      <span className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 px-2">{children}</span>
      <div className="h-px flex-1 bg-white/[0.06]" />
    </div>
  );
}

function SweetSpotCallout({ bucket, label, subLabel }: { bucket: any; label: string, subLabel?: string }) {
  if (!bucket) return (
    <div className="bg-[#111111] border border-white/[0.04] rounded-2xl p-4 opacity-50">
      <p className="text-[8px] font-black uppercase text-slate-600 tracking-widest">{label}</p>
      <p className="text-[10px] text-slate-700 font-mono mt-2 uppercase">Calibrating...</p>
    </div>
  );

  return (
    <div className="bg-[#111111] border border-white/5 rounded-2xl p-4 hover:border-cyan-500/30 transition-colors group">
      <div className="flex justify-between items-start mb-2">
        <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest group-hover:text-cyan-400 transition-colors">
          {label}
        </p>
        <span className="text-[10px] font-black font-mono text-cyan-400">
          {bucket.hitRate?.toFixed(0)}%
        </span>
      </div>
      <p className="text-xs font-black text-white uppercase truncate italic tracking-tighter">
        {bucket.label || bucket.prop || bucket.dir || 'N/A'}
      </p>
      <div className="flex justify-between items-center mt-2">
        <p className="text-[8px] text-slate-600 font-mono tracking-tighter uppercase font-bold">
          {bucket.won}/{bucket.total} Hits
        </p>
        {subLabel && <p className="text-[8px] text-slate-500 font-mono italic">{subLabel}</p>}
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function SweetSpotPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sweet-spots')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-4">
      <div className="h-10 w-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Scanning Historical Nodes...</p>
    </div>
  );

  if (!data) return <div className="py-20 text-center uppercase font-black text-slate-600 italic">Data Stream Offline</div>;

  const { meta, sweetSpots, dimensions, playerPatterns } = data;
  const baseline = meta.overallHitRate;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">

      {/* ── Hero Stat Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 p-8 bg-[#111111] border border-white/5 rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
           <div className="absolute -right-10 -top-10 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <Target className="h-64 w-64 text-cyan-400" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
                <p className="text-[9px] font-black uppercase text-cyan-400 tracking-widest">Efficiency Core</p>
              </div>
            </div>
            <h2 className="text-4xl md:text-5xl font-black italic uppercase text-white tracking-tighter leading-none mb-4">
              Your <span className="text-cyan-400">Sweet Spots</span> are active.
            </h2>
            <p className="text-slate-500 text-xs font-medium max-w-xl leading-relaxed">
              Analyzing <span className="text-white font-black">{meta.totalLegs}</span> total legs. 
              Your performance baseline is <span className="text-cyan-400 font-black">{baseline.toFixed(1)}%</span>. 
              The cards below isolate high-probability conditions where you outperform the market.
            </p>
          </div>
        </div>
        
        <div className="bg-cyan-500 p-8 rounded-[2.5rem] flex flex-col justify-between shadow-[0_0_40px_rgba(34,211,238,0.15)]">
          <p className="text-[10px] font-black uppercase text-black/60 tracking-widest">Global Hit Rate</p>
          <div>
            <p className="text-7xl font-black text-black tracking-tighter leading-none">{baseline.toFixed(0)}<span className="text-3xl">%</span></p>
            <p className="text-[10px] font-black uppercase text-black/40 mt-2 italic tracking-tighter">{meta.wonLegs} Wins / {meta.totalLegs} Events</p>
          </div>
        </div>
      </div>

      {/* ── Callout Grid ── */}
      <div className="space-y-4">
        <SectionLabel icon={Zap}>Optimized Conditions</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SweetSpotCallout bucket={sweetSpots.legCount} label="Parlay Size" subLabel="Highest Volume" />
          <SweetSpotCallout bucket={sweetSpots.propType} label="Best Prop Type" subLabel="Efficiency Leader" />
          <SweetSpotCallout bucket={sweetSpots.overUnder} label="Efficiency Peak" subLabel="Side Bias" />
          <SweetSpotCallout bucket={sweetSpots.opponentRank} label="Opp Defense" subLabel="Mismatches" />
          
          <SweetSpotCallout bucket={sweetSpots.confidence} label="Confidence Floor" />
          <SweetSpotCallout bucket={sweetSpots.scoreDiff} label="Score Variance" />
          <SweetSpotCallout bucket={sweetSpots.edge} label="Edge Threshold" />
          <SweetSpotCallout bucket={sweetSpots.kelly} label="Allocation Peak" />
        </div>
      </div>

      {/* ── Distribution Charts ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Opponent Rank Clarified */}
        <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8">
          <SectionLabel icon={Shield}>Opponent Defense Rank</SectionLabel>
          <div className="space-y-4 mt-6">
            {dimensions.rank.map((r: any) => {
              // Custom Labeling for Rank tiers
              let label = r.label;
              if (label === '25+') label = '25-32 (Weak Def)';
              if (label === '1-8')  label = '1-8 (Elite Def)';
              
              return (
                <div key={r.label} className="group">
                  <div className="flex justify-between mb-1.5 px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{label}</span>
                    <span className="text-[10px] font-black font-mono text-white">{r.hitRate?.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000" 
                      style={{ 
                        width: `${r.hitRate}%`, 
                        backgroundColor: hitColor(r.hitRate, baseline) 
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Edge % Handling Negatives */}
        <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] p-8">
          <SectionLabel icon={TrendingUp}>Edge % Impact</SectionLabel>
          <div className="space-y-4 mt-6">
            {dimensions.edge.map((e: any) => (
              <div key={e.label} className="group">
                <div className="flex justify-between mb-1.5 px-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter italic">
                    {e.label === 'Neg' ? 'Negative Edge (< 0%)' : `Edge: ${e.label}%`}
                  </span>
                  <span className="text-[10px] font-black font-mono text-white">{e.hitRate?.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000" 
                    style={{ 
                      width: `${e.hitRate}%`, 
                      backgroundColor: hitColor(e.hitRate, baseline) 
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Player Reliability ── */}
      <div className="bg-[#111111] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-8 pb-4">
          <SectionLabel icon={Users}>Node Reliability (Top Players)</SectionLabel>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] border-y border-white/5">
              <tr>
                <th className="px-8 py-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">Protocol / Player</th>
                <th className="px-8 py-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">Reliability %</th>
                <th className="px-8 py-4 text-[9px] font-black uppercase text-slate-500 tracking-widest text-center">Efficiency Record</th>
                <th className="px-8 py-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">Active Props</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {playerPatterns.slice(0, 10).map((p: any) => (
                <tr key={p.player} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-8 py-5">
                    <p className="text-sm font-black italic uppercase text-white tracking-tighter">{p.player}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs font-black font-mono" style={{ color: hitColor(p.hitRate, baseline) }}>
                      {p.hitRate?.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span className="text-[10px] font-black font-mono text-slate-500">{p.won} / {p.total}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex gap-2">
                      {p.props.slice(0, 2).map((pr: string) => (
                        <span key={pr} className="text-[8px] font-black uppercase tracking-tighter px-2 py-1 rounded bg-white/5 text-slate-400 border border-white/5">
                          {pr}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}