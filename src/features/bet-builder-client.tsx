'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useBetSlip } from '@/hooks/useBetSlip';
import { useAllProps, NormalizedProp } from '@/hooks/useAllProps';
import { PropsTable } from '@/components/bets/PropsTable';
import { EnrichModal } from '@/components/bets/EnrichModal';
import { SyncPropsButton } from '@/components/bets/SyncPropsButton';
import { BetBuilderUpload } from '@/components/bet-builder/bet-builder-upload';
import {
  RefreshCw, Zap, ChevronLeft, ChevronRight, Database, AlertTriangle, Clock, Activity
} from 'lucide-react';
import { toast } from 'sonner';

const THEME = {
  nba: { accent: '#f97316', icon: '🏀', label: 'NBA' },
  nfl: { accent: '#22c55e', icon: '🏈', label: 'NFL' },
};

export default function BetBuilderClient({
  initialDate,
  season = 2025,
  league = 'nba',
}: { initialDate?: string; season?: number; league?: 'nfl' | 'nba' }) {
  const router = useRouter();
  
  // 1. Standardize Date to NY Time (Matches our Ingest/Repair logic)
  const activeDate = useMemo(() => {
    if (initialDate) return initialDate;
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); 
  }, [initialDate]);

  // 2. Fetch Data
  const {
    props: allProps = [],
    loading, error, refresh,
  } = useAllProps({ 
    league, 
    date: activeDate, 
    season: String(season),
    limit: 250 // Higher limit for busy NBA slates
  });

  const { selections, addLeg } = useBetSlip();
  const [showEnrich, setShowEnrich] = useState(false);

  // 3. Health & Freshness Logic
  const lastUpdated = useMemo(() => {
    if (!allProps || allProps.length === 0) return null;
    const timestamps = allProps
      .map(p => new Date(p.updatedAt || p.enrichedAt || 0).getTime())
      .filter(t => t > 0);
    
    if (timestamps.length === 0) return null;
    const latest = Math.max(...timestamps);
    return new Date(latest).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [allProps]);

  const healthStats = useMemo(() => {
    const nanLines = allProps.filter(p => isNaN(Number(p.line)) || p.line === null).length;
    const enrichedCount = allProps.filter(p => p.confidenceScore != null).length;
    return { nanLines, enrichedCount };
  }, [allProps]);

  // 4. Filtering & Sorting
  const filteredProps = useMemo(() => {
    let result = [...allProps];
    // Auto-hide NaN rows to prevent table crashes
    result = result.filter(p => !isNaN(Number(p.line)) && p.line !== null);
    
    // Default sort by highest Edge %
    result.sort((a, b) => (b.bestEdgePct || 0) - (a.bestEdgePct || 0));
    return result;
  }, [allProps]);

  const slipIds = useMemo(() => 
    new Set((selections ?? []).map((s: any) => String(s.propId || s.id))), 
  [selections]);

  // 5. Handlers
  const handleDateChange = (offset: number) => {
    const d = new Date(activeDate + 'T12:00:00Z');
    d.setDate(d.getDate() + offset);
    const newDate = d.toISOString().split('T')[0];
    router.push(`/bet-builder?league=${league}&date=${newDate}&season=${season}`);
  };

  const handleAddToSlip = useCallback((prop: NormalizedProp) => {
    const propId = String(prop.id);
    if (slipIds.has(propId)) { 
      toast.error(`${prop.player} already in slip`); 
      return; 
    }
    
    addLeg({
      id: propId,
      propId,
      player: prop.player ?? 'Unknown',
      prop: prop.prop ?? 'Prop',
      line: prop.line ?? 0,
      selection: (prop.overUnder as any) || 'Over',
      season: prop.season ?? season,
      gameDate: prop.gameDate ?? activeDate,
      odds: prop.bestOdds ?? -110,
      league,
    });
    toast.success(`${prop.player} added to slip`);
  }, [addLeg, slipIds, league, season, activeDate]);

  const theme = THEME[league] || THEME.nba;

  return (
    <div className="space-y-4 p-4 max-w-[1600px] mx-auto min-h-screen pb-20">
      
      {/* 🛠️ DATA HEALTH & STATUS STRIP */}
      <div className="bg-black/40 border border-white/5 p-2 px-4 rounded-xl flex flex-wrap items-center justify-between text-[10px] font-mono gap-4">
        <div className="flex gap-6 items-center">
           <div className="flex items-center gap-2">
             <Activity size={12} className={loading ? 'text-orange-400 animate-pulse' : 'text-emerald-500'}/>
             <span className="text-slate-500 font-black uppercase tracking-tighter">Status:</span>
             <span className={loading ? 'text-orange-400' : 'text-emerald-400'}>
               {loading ? 'FETCHING_DATA' : 'CONNECTED_DB'}
             </span>
           </div>
           
           <div className="flex items-center gap-2 text-blue-400 border-l border-white/10 pl-4">
             <Database size={12}/> <span>{activeDate}</span>
           </div>

           {lastUpdated && (
             <div className="flex items-center gap-2 text-slate-400 border-l border-white/10 pl-4">
               <Clock size={12}/> <span>LAST_SYNC: {lastUpdated}</span>
             </div>
           )}

           <div className="flex items-center gap-2 text-purple-400 border-l border-white/10 pl-4">
             <Zap size={12}/> <span>{healthStats.enrichedCount} EDGES_CALCULATED</span>
           </div>
        </div>
        
        {healthStats.nanLines > 0 && (
          <div className="flex items-center gap-2 text-red-400 bg-red-400/10 px-3 py-1 rounded border border-red-400/20 animate-pulse">
            <AlertTriangle size={12}/>
            <span>CRITICAL: {healthStats.nanLines} NaN ROWS DETECTED. RUN /api/nba/repair</span>
          </div>
        )}
      </div>

      {/* MAIN COMMAND HEADER */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center border border-white/10 text-3xl bg-white/5 shadow-inner">
            {theme.icon}
          </div>
          <div>
            <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none" style={{ color: theme.accent }}>
              {theme.label} ANALYTICS
            </h2>
            <div className="flex items-center gap-2 mt-2 bg-black/40 rounded-xl p-1.5 px-3 border border-white/5 w-fit">
              <button onClick={() => handleDateChange(-1)} className="p-1 hover:bg-white/10 rounded transition-colors text-slate-500 hover:text-white">
                <ChevronLeft size={16}/>
              </button>
              <span className="font-mono text-white text-xs font-bold tracking-[0.2em] px-3">{activeDate}</span>
              <button onClick={() => handleDateChange(1)} className="p-1 hover:bg-white/10 rounded transition-colors text-slate-500 hover:text-white">
                <ChevronRight size={16}/>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* CSV IMPORT */}
          <BetBuilderUpload onUploadComplete={() => refresh()} />
          
          <div className="h-10 w-[1px] bg-white/10 mx-2 hidden md:block" />

          {/* ODDS API SYNC */}
          <SyncPropsButton league={league} date={activeDate} onComplete={() => refresh()} />
          
          {/* STATS ENRICHMENT */}
          <button 
            onClick={() => setShowEnrich(true)} 
            className="group flex items-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-500/20 border border-indigo-400/30"
          >
            <Zap size={14} className="group-hover:scale-110 transition-transform" fill="currentColor" /> 
            Enrich Slate
          </button>
          
          {/* REFRESH */}
          <button 
            onClick={() => { refresh(); toast.success("View Refreshed"); }} 
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all active:scale-95"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin text-orange-400' : 'text-slate-400'} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex items-center gap-3 font-mono">
           <Database size={16}/> ERROR_FETCHING_FIRESTORE: {error}
        </div>
      )}

      {/* THE DATA TABLE */}
      <div className="bg-slate-900 rounded-3xl border border-white/10 overflow-hidden shadow-2xl relative">
        {loading && (
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="animate-spin text-indigo-500" size={32} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Loading Market Data...</span>
                </div>
            </div>
        )}
        <PropsTable 
          props={filteredProps} 
          league={league} 
          isLoading={false} // Managed by our overlay
          onAddToBetSlip={handleAddToSlip} 
          slipIds={slipIds} 
        />
      </div>

      {/* ENRICHMENT MODAL OVERLAY */}
      {showEnrich && (
        <EnrichModal 
          isOpen={showEnrich} 
          onClose={() => setShowEnrich(false)} 
          onComplete={() => {
            refresh();
            toast.success("Enrichment engine finished.");
          }} 
          league={league as 'nba' | 'nfl'} 
          defaultDate={activeDate} 
          defaultSeason={season} 
          defaultCollection="all"
        />
      )}
    </div>
  );
}