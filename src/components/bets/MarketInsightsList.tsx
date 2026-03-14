"use client";

import React from 'react';
import { Target, TrendingUp, AlertCircle, ChevronRight, BarChart3 } from 'lucide-react';

interface Insight {
  player: string;
  prop: string;
  hitRate: number;
  won: number;
  total: number;
  avgLine: number;
}

export function MarketInsightsList({ data, isLoading }: { data: Insight[], isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 w-full animate-pulse bg-white/5 border border-white/5 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-12 border border-dashed border-white/10 rounded-3xl text-center">
        <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-500 font-bold uppercase text-xs tracking-widest">No Patterns Detected Yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {data.map((insight, idx) => {
        const isHighConfidence = insight.hitRate >= 70 && insight.total >= 4;
        
        return (
          <div 
            key={`${insight.player}-${idx}`}
            className="relative overflow-hidden group p-5 bg-[#0f1115] border border-white/[0.06] rounded-2xl hover:border-[#FFD700]/40 transition-all cursor-pointer"
          >
            {/* High Confidence Glow */}
            {isHighConfidence && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/5 blur-3xl rounded-full -mr-16 -mt-16" />
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              {/* Player Info */}
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center border ${
                  isHighConfidence ? 'bg-[#FFD700]/10 border-[#FFD700]/20' : 'bg-white/5 border-white/10'
                }`}>
                  <BarChart3 className={`h-6 w-6 ${isHighConfidence ? 'text-[#FFD700]' : 'text-zinc-500'}`} />
                </div>
                <div>
                  <h3 className="text-white font-black italic uppercase tracking-tighter text-lg leading-none">
                    {insight.player}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#FFD700]">
                      {insight.prop}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-500 text-[10px] font-bold uppercase">
                      Avg Line: {insight.avgLine}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="flex items-center gap-8 md:gap-12">
                <div className="text-center">
                  <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1">Hit Rate</p>
                  <p className={`text-xl font-black italic leading-none ${
                    insight.hitRate >= 60 ? 'text-emerald-400' : 'text-white'
                  }`}>
                    {insight.hitRate.toFixed(0)}%
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1">Record</p>
                  <p className="text-xl font-black italic text-white leading-none">
                    {insight.won}<span className="text-zinc-600 text-sm mx-0.5">/</span>{insight.total}
                  </p>
                </div>

                <div className="hidden sm:block">
                  <div className={`px-3 py-1.5 rounded-lg border font-black text-[10px] uppercase italic tracking-widest ${
                    isHighConfidence 
                      ? 'bg-[#FFD700] text-black border-[#FFD700]' 
                      : 'bg-white/5 text-zinc-400 border-white/10'
                  }`}>
                    {isHighConfidence ? 'Elite Trend' : 'Standard'}
                  </div>
                </div>
                
                <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-white transition-colors" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}