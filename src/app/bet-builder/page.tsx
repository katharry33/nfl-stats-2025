'use client';

import React, { useState, useMemo } from 'react';
import { usePropsQuery } from '@/hooks/use-props-query';
import PropsTable from '@/components/bets/PropsTable'; 
import NBAIngestTools from '@/lib/enrichment/nba/NBAIngestTools';
import { ManualEntryModal } from '@/components/modals/manual-entry-modal';
import { EditBetModal } from '@/components/modals/edit-bet-modal';
import { RefreshCw, LayoutPanelLeft, Search, Activity } from 'lucide-react';
import { toast } from 'sonner';

export default function BetBuilderPage() {
  const [search, setSearch] = useState('');
  const [selectedProp, setSelectedProp] = useState<any>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [season] = useState(2025);
  
  // Hardcoded to match your current migration target
  const today = "2026-03-23"; 

  const { data, fetchNextPage, hasNextPage, isLoading, refetch } = usePropsQuery({ 
    league: 'nba',
    season: season.toString(), 
    search,
    date: today
  });

  const allProps = useMemo(() => {
    const rawDocs = data?.pages.flatMap((page) => page.docs) ?? [];
    if (!search) return rawDocs;
    return rawDocs.filter((p: any) => {
      const pName = (p.playerName || p.player || '').toLowerCase();
      const mUp = (p.matchup || '').toLowerCase();
      const sTerm = search.toLowerCase();
      return pName.includes(sTerm) || mUp.includes(sTerm);
    });
  }, [data, search]);

  const handleUpdateProp = async (updatedData: any) => {
    try {
      const res = await fetch('/api/props/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updatedData, collection: 'nbaProps_2025' }),
      });
      if (!res.ok) throw new Error('Update failed');
      toast.success("Prop updated successfully");
      refetch();
    } catch (err) {
      toast.error("Failed to update prop");
    }
  };

  const handleManualAdd = async (leg: any) => {
    // Logic to push manual entry to Firestore
    console.log("Adding Manual Leg:", leg);
    refetch();
  };

  return (
    <div className="min-h-screen bg-[#080808] p-6 space-y-6 text-white font-sans">
      {/* HEADER SECTION */}
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
          <div className="relative flex-1 lg:min-w-[280px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
            <input 
              type="text" 
              placeholder="Search Player..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-700"
            />
          </div>

          <button 
            onClick={() => refetch()} 
            className="p-3.5 bg-zinc-900 border border-white/5 rounded-2xl hover:bg-zinc-800 transition-all text-zinc-400 hover:text-white"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin text-indigo-500' : ''} />
          </button>
          
          <NBAIngestTools onComplete={() => refetch()} />
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-[#141414]/80 rounded-[28px] border border-white/5 overflow-hidden min-h-[500px]">
        <PropsTable 
          props={allProps} 
          league="nba" 
          isLoading={isLoading}
          mode="builder"
          hasMore={hasNextPage}
          onLoadMore={fetchNextPage}
          onRefresh={() => refetch()}
          onEdit={(prop: any) => setSelectedProp(prop)}
          onManualEntry={() => setIsManualOpen(true)}
          onDelete={(prop: any) => console.log('Delete Logic')}
        />
      </div>

      {/* MODALS */}
      <ManualEntryModal 
        isOpen={isManualOpen} 
        onClose={() => setIsManualOpen(false)} 
        activeLeague="nba"
        onAddLeg={handleManualAdd}
      />

      {selectedProp && (
        <EditBetModal 
          bet={selectedProp} 
          isOpen={!!selectedProp} 
          onClose={() => setSelectedProp(null)} 
          onSave={handleUpdateProp} 
          mode="active"
        />
      )}
    </div>
  );
}