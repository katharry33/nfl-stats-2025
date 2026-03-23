'use client';

import React, { useState, useMemo } from 'react';
import { usePropsQuery } from '@/hooks/use-props-query';
import PropsTable from '@/components/bets/PropsTable'; 
import NBAIngestTools from '@/lib/enrichment/nba/NBAIngestTools';
import { RefreshCw, LayoutPanelLeft, Search, Activity } from 'lucide-react';

export default function BetBuilderPage() {
  const [search, setSearch] = useState('');
  const [season] = useState('2025'); 
  
  // Use today's date for the live slate (2026-03-23)
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isLoading, 
    refetch 
  } = usePropsQuery({ 
    league: 'nba', 
    season, 
    search,
    date: today,
    collection: 'nbaProps_2025' 
  });

  const allProps = useMemo(() => {
    return data?.pages.flatMap((page) => page.docs) ?? [];
  }, [data]);

  return (
    <div className="min-h-screen bg-[#080808] p-6 space-y-6 text-white font-sans">
      {/* 🚀 HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-center p-8 rounded-[32px] bg-[#141414] border border-white/5 shadow-2xl gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
            <LayoutPanelLeft className="text-indigo-400" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">
              NBA <span className="text-indigo-500">Builder</span>
            </h1>
            <div className="flex items-center gap-2">
              <Activity size={10} className="text-emerald-500 animate-pulse" />
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest italic">
                Live Slate: {today}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto">
          {/* PLAYER SEARCH */}
          <div className="relative flex-1 lg:min-w-[280px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
            <input 
              type="text" 
              placeholder="Search Player or Matchup..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold focus:border-indigo-500/50 outline-none transition-all placeholder:text-zinc-700"
            />
          </div>

          <button 
            onClick={() => refetch()} 
            className="p-3.5 bg-zinc-900 border border-white/5 rounded-2xl hover:bg-zinc-800 transition-all active:scale-95 text-zinc-400 hover:text-white"
            title="Refresh Slate"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin text-indigo-500' : ''} />
          </button>
          
          <NBAIngestTools onComplete={() => refetch()} />
        </div>
      </div>

      {/* 📊 TABLE SECTION */}
      <div className="bg-[#141414]/80 rounded-[28px] border border-white/5 overflow-hidden min-h-[500px]">
        <PropsTable 
          props={allProps} 
          league="nba" 
          isLoading={isLoading}
          mode="builder"
          hasMore={hasNextPage}
          onLoadMore={fetchNextPage}
        />
      </div>

      {/* 🛠 FOOTER STATUS */}
      <div className="flex justify-between items-center px-8 py-4 bg-zinc-950/50 rounded-2xl border border-white/5">
        <div className="flex gap-8">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-tighter">Active Nodes</span>
            <span className="text-xs font-mono font-bold text-white">{allProps.length}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-zinc-600 uppercase tracking-tighter">Database</span>
            <span className="text-xs font-mono font-bold text-indigo-400">NBAPROPS_2025</span>
          </div>
        </div>
        <div className="hidden md:block text-[9px] font-black text-zinc-800 uppercase tracking-[0.3em]">
          Gridiron Guru Predictive Engine v3.0
        </div>
      </div>
    </div>
  );
}