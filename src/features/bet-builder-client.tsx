'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePropsQuery } from '@/hooks/use-props-query';
import { useBetSlip } from '@/context/betslip-context';
// Updated import to match your standard path
import PropsTable from "@/components/bets/PropsTable";
import { EnrichModal } from '@/components/bets/EnrichModal';
import { SyncPropsButton } from '@/components/bets/SyncPropsButton';
import { BetBuilderUpload } from '@/components/bet-builder/bet-builder-upload';
import { NormalizedProp } from '@/lib/types';
import { 
  RefreshCw, 
  Zap, 
  ChevronLeft, 
  ChevronRight, 
  Database, 
  Activity, 
  Search 
} from 'lucide-react';
import { toast } from 'sonner';

const THEME = {
  nba: { accent: '#f97316', icon: '🏀', label: 'NBA' },
  nfl: { accent: '#22c55e', icon: '🏈', label: 'NFL' },
};

interface BetBuilderProps {
  initialDate?: string;
  season?: number;
  league?: 'nfl' | 'nba';
}

export default function BetBuilderClient({
  initialDate,
  season = 2025,
  league = 'nba',
}: BetBuilderProps) {
  const router = useRouter();

  const activeDate = useMemo(() => {
    if (initialDate) return initialDate;
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  }, [initialDate]);

  const [filters, setFilters] = useState({
    week: 'all',
    propType: 'all',
    search: '',
    league,
    date: activeDate
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch
  } = usePropsQuery(filters);

  const { selections, addLeg } = useBetSlip();
  const [showEnrich, setShowEnrich] = useState(false);

  // FIX: Explicitly typed 'page' to solve implicit any
  const allProps = useMemo(() => 
    data?.pages.flatMap((page: any) => page.docs) ?? [], 
  [data]);

  const slipIds = useMemo(() => 
    new Set(selections.map((s: any) => String(s.propId || s.id))), 
  [selections]);

  const handleDateChange = (offset: number) => {
    const d = new Date(activeDate + 'T12:00:00Z');
    d.setDate(d.getDate() + offset);
    const newDate = d.toISOString().split('T')[0];
    
    setFilters(prev => ({ ...prev, date: newDate }));
    router.push(`/bet-builder?league=${league}&date=${newDate}&season=${season}`);
  };

  // FIX: Explicitly typed 'prop'
  const handleAddToSlip = useCallback((prop: NormalizedProp) => {
    const propId = String(prop.id);
    if (slipIds.has(propId)) return toast.error(`${prop.player} already in slip`);
    
    addLeg({
      ...prop,
      id: propId,
      propId: propId,
      selection: prop.overUnder || 'Over',
      odds: prop.bestOdds || -110,
      status: 'pending'
    });
    toast.success(`${prop.player} added!`);
  }, [addLeg, slipIds]);

  const theme = THEME[league] || THEME.nba;

  return (
    <div className="space-y-4 p-4 max-w-[1600px] mx-auto min-h-screen pb-20">
      
      <div className="bg-black/40 border border-white/5 p-2 px-4 rounded-xl flex items-center justify-between text-[10px] font-mono tracking-tighter">
        <div className="flex gap-6 items-center">
           <div className="flex items-center gap-2">
             <Activity size={12} className={isLoading ? 'text-orange-400 animate-pulse' : 'text-emerald-500'}/>
             <span className={isLoading ? 'text-orange-400' : 'text-emerald-400'}>
               {isLoading ? 'SYNCING_FIRESTORE' : 'STREAM_ACTIVE'}
             </span>
           </div>
           <div className="flex items-center gap-2 text-blue-400 border-l border-white/10 pl-4">
             <Database size={12}/> <span>INDEX: {league.toUpperCase()}_PROPS_{season}</span>
           </div>
        </div>
        <div className="hidden md:block text-slate-500">
          LOADED_NODES: {allProps.length}
        </div>
      </div>

      <div className="flex flex-col xl:flex-row justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center border border-white/10 text-3xl bg-white/5 shadow-inner">
            {theme.icon}
          </div>
          <div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter" style={{ color: theme.accent }}>
              {theme.label} ANALYTICS
            </h2>
            <div className="flex items-center gap-2 mt-2 bg-black/40 rounded-xl p-1 px-3 border border-white/5">
              <button onClick={() => handleDateChange(-1)} className="hover:text-white transition-colors"><ChevronLeft size={16}/></button>
              <span className="font-mono text-xs font-bold w-24 text-center">{activeDate}</span>
              <button onClick={() => handleDateChange(1)} className="hover:text-white transition-colors"><ChevronRight size={16}/></button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={14} />
            <input 
              type="text"
              placeholder="Filter players..."
              className="bg-black/40 border border-white/5 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold outline-none focus:border-indigo-500/50 transition-all w-48 md:w-64"
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          <BetBuilderUpload onUploadComplete={() => refetch()} />
          <SyncPropsButton league={league} date={activeDate} onComplete={() => refetch()} />
          <button 
            onClick={() => setShowEnrich(true)} 
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase bg-indigo-600 text-white shadow-lg hover:bg-indigo-500 transition-all"
          >
            <Zap size={14} fill="currentColor" /> Enrich
          </button>
          <button 
            onClick={() => refetch()} 
            className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
          >
            <RefreshCw size={20} className={isLoading ? 'animate-spin text-indigo-400' : ''}/>
          </button>
        </div>
      </div>

      {isError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 font-mono text-xs flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
          CRITICAL_FETCH_ERROR: CHECK NETWORK OR FIRESTORE INDEXES
        </div>
      )}

      <div className="bg-slate-900 rounded-3xl border border-white/10 overflow-hidden relative shadow-2xl min-h-[600px]">
        <PropsTable 
          props={allProps} 
          league={league} 
          isLoading={isLoading} 
          onAddToBetSlip={handleAddToSlip} 
          onEditProp={(p: NormalizedProp) => console.log("Edit:", p)}
          slipIds={slipIds} 
          hasMore={hasNextPage}
          onLoadMore={() => fetchNextPage()}
        />

        {isLoading && allProps.length === 0 && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-4">
            <RefreshCw className="animate-spin text-indigo-500" size={40} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 animate-pulse">Initializing Data Stream</span>
          </div>
        )}

        {isFetchingNextPage && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-indigo-600 rounded-full shadow-2xl z-40 flex items-center gap-2 border border-white/20">
            <RefreshCw size={12} className="animate-spin" />
            <span className="text-[9px] font-black uppercase tracking-widest">Fetching Next Page</span>
          </div>
        )}
      </div>

      {showEnrich && (
        <EnrichModal 
          isOpen={showEnrich} 
          onClose={() => setShowEnrich(false)} 
          onComplete={() => { refetch(); toast.success("Market Analytics Refreshed"); }} 
          league={league as any} 
          defaultDate={activeDate} 
          defaultSeason={season} 
        />
      )}
    </div>
  );
}