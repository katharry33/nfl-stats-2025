'use client';

import React, { useState, useMemo } from 'react';
import { usePropsQuery } from '@/hooks/use-props-query'; // Infinite Loading Hook
import { useBetSlip } from '@/context/betslip-context';
import { PropsTable } from '@/components/bets/PropsTable';
import { EditBetModal } from '@/components/modals/edit-bet-modal';
import { ManualEntryModal } from '@/components/modals/manual-entry-modal';
import { Search, Database, LayoutGrid, Table as TableIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function HistoricalArchivePage() {
  // 1. Unified State for Archive Filters
  const [league, setLeague] = useState<'nba' | 'nfl'>('nba');
  const [season, setSeason] = useState(2025);
  const [search, setSearch] = useState('');

  // 2. Data Fetching via TanStack (handles infinite scroll)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    refetch
  } = usePropsQuery({ league, season, search });

  // 3. BetSlip Integration
  const { addToSlip, slip } = useBetSlip();
  const slipIds = useMemo(() => 
    new Set(slip?.legs?.map((l: any) => String(l.propId || l.id)) || []), 
  [slip]);

  // 4. Modal States
  const [editingProp, setEditingProp] = useState<any | null>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);

  // 5. Flatten the infinite pages for the Table
  const allProps = useMemo(() => 
    data?.pages.flatMap((page) => page.docs) ?? [], 
  [data]);

  // --- Handlers (Preserving your exact functionality) ---

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/all-props/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Prop removed from archive');
      refetch(); 
    } catch (err) {
      toast.error('Could not delete prop');
    }
  };

  const handleUpdate = async (updatedData: any) => {
    try {
      const params = new URLSearchParams({
        league: league, 
        season: String(season)
      });

      const res = await fetch(`/api/all-props/${updatedData.id}?${params}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });

      if (!res.ok) throw new Error('Update failed');
      
      toast.success('Archive Record Updated');
      setEditingProp(null);
      refetch(); 
    } catch (err) {
      toast.error('Failed to save changes to archive');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c12] p-6 space-y-6">
      
      {/* --- RECONSTRUCTED HEADER & TOGGLES --- */}
      <div className="flex flex-col xl:flex-row justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-white/5 shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
             <h1 className="text-xl font-black italic uppercase tracking-tighter text-white">
               Archive <span className="text-indigo-500">Vault</span>
             </h1>
             <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-1">
               <Database size={10}/> <span>COLLECTION: allProps</span>
             </div>
          </div>
          
          {/* LEAGUE SWITCHER */}
          <div className="flex bg-black/40 p-1 rounded-2xl border border-white/10 ml-4">
            <button 
              onClick={() => setLeague('nba')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                league === 'nba' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              NBA 🏀
            </button>
            <button 
              onClick={() => setLeague('nfl')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                league === 'nfl' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              NFL 🏈
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* SEARCH BAR */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text"
              placeholder="Search archive..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-black/40 border border-white/5 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold outline-none focus:border-indigo-500/50 transition-all w-48 md:w-64"
            />
          </div>

          <select 
            value={season}
            onChange={(e) => setSeason(Number(e.target.value))}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] font-black text-slate-300 outline-none"
          >
            <option value={2025}>2025 SEASON</option>
            <option value={2024}>2024 SEASON</option>
          </select>

          <button 
            onClick={() => setIsManualOpen(true)}
            className="px-6 py-2.5 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            Manual Entry
          </button>
        </div>
      </div>

      {/* --- MAIN DATA TABLE --- */}
      <div className="bg-slate-900 rounded-3xl border border-white/5 overflow-hidden relative shadow-2xl min-h-[600px]">
        <PropsTable 
          props={allProps}
          league={league}
          isLoading={isLoading}
          slipIds={slipIds}
          onAddToBetSlip={addToSlip}
          onEditProp={setEditingProp}
          onDeleteProp={handleDelete}
          onOpenManual={() => setIsManualOpen(true)}
          hasMore={hasNextPage}
          onLoadMore={() => fetchNextPage()}
        />

        {isLoading && allProps.length === 0 && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center">
            <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Accessing Historical Records...</span>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      <ManualEntryModal 
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)} 
        onAddLeg={(leg) => {
          addToSlip(leg);
          refetch(); 
        }}
      />

      {editingProp && (
        <EditBetModal 
          mode="archive"
          bet={editingProp} 
          isOpen={!!editingProp} 
          onClose={() => setEditingProp(null)}
          onSave={handleUpdate}
        />
      )}
    </div>
  );
}