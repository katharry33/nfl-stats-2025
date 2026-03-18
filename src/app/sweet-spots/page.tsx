'use client';

import React from 'react';
import { Target } from 'lucide-react';
import { SweetSpotPanel } from '@/components/bets/SweetSpotPanel';

export default function SweetSpotsPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#EDEDED] p-4 md:p-8 relative overflow-hidden">
      {/* Ambient Background Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-8">
          <div className="flex items-center gap-4">
            <div className="bg-[#111111] p-3 rounded-2xl border border-white/5 shadow-xl">
              <Target className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                Sweet<span className="text-cyan-400">Spots</span>
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 mt-1">
                Real-Time Inefficiency Engine
              </p>
            </div>
          </div>
          
          {/* Status Indicator */}
          <div className="flex items-center gap-3 px-4 py-2 bg-[#111111] border border-white/5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Live Scoping</span>
          </div>
        </div>

        <SweetSpotPanel />
      </div>
    </main>
  );
}
