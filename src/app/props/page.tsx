'use client';

import React, { useState, useMemo } from 'react';
import { usePropsQuery } from '@/hooks/use-props-query';
import { FlexibleDataTable } from '@/components/data-table/flexible-data-table';
import { ColumnController } from '@/components/bet-builder/column-controller';
import { getVaultColumns } from '@/lib/columns/prop-columns.tsx'; // Updated import
import { PostGameModal } from '@/components/modals/PostGameModal';
import { Search, Database, RefreshCw, Trophy, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SortingState, VisibilityState } from '@tanstack/react-table';

export default function HistoricalVaultPage() {
  const [league, setLeague] = useState<'nba' | 'nfl'>('nba');
  const [search, setSearch] = useState('');
  const [season, setSeason] = useState('2025');
  const [week, setWeek] = useState('All');
  const [date, setDate] = useState('2026-03-23');
  const [tableInstance, setTableInstance] = useState<any>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isPostGameOpen, setIsPostGameOpen] = useState(false);
  
  // Add types for state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const { data, isLoading, refetch } = usePropsQuery({ 
    league, 
    season: Number(season),
    date: league === 'nba' ? date : undefined,
    week: league === 'nfl' && week !== 'All' ? Number(week) : undefined,
    // Search is now handled by the query directly
    search,
  });

  // Data is now passed directly from the query
  const allProps = useMemo(() => data?.pages.flatMap((page) => page.docs) ?? [], [data]);

  // Columns are memoized from the external file
  const columns = useMemo(() => getVaultColumns(league), [league]);

  const handleEnrich = async () => {
    setIsEnriching(true);
    try {
      const res = await fetch(`/api/${league}/backfill`, {
        method: 'POST',
        body: JSON.stringify({ 
          date: league === 'nba' ? date : undefined, 
          week: league === 'nfl' ? week : undefined,
          season 
        }),
      });
      if (res.ok) {
        toast.success("Data enriched with latest averages and ranks");
        refetch();
      }
    } catch (e) {
      toast.error("Enrichment failed");
    } finally {
      setIsEnriching(false);
    }
  };

  const SELECT_STYLE = "bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 outline-none focus:border-indigo-500/50 transition-all cursor-pointer hover:bg-zinc-800";

  return (
    <div className="min-h-screen bg-[#080808] text-white p-6 space-y-4">
      
      <div className="bg-[#141414] border border-white/5 rounded-[32px] p-8 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
            <Database className="text-indigo-400" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">
              Historical <span className="text-indigo-500">Vault</span>
            </h1>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic leading-none">Viewing {league} Archive</p>
          </div>
        </div>

        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
          {['nba', 'nfl'].map((l) => (
            <button 
              key={l}
              onClick={() => setLeague(l as any)}
              className={`px-8 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${league === l ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#141414] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
         <div className="flex items-center gap-6 px-4">
            <button 
              onClick={handleEnrich} 
              disabled={isEnriching}
              className="flex items-center gap-2 group transition-all"
            >
              <div className="p-2 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20">
                {isEnriching ? <Loader2 size={14} className="animate-spin text-indigo-400" /> : <Sparkles size={14} className="text-indigo-400" />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white">Enrich Data</span>
            </button>
            <div className="h-4 w-[1px] bg-white/5" />
            <div className="flex items-center gap-2">
                <Trophy size={14} className="text-amber-500/50" />
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Target: {league === 'nba' ? date : `Week ${week}`}</span>
            </div>
         </div>
         <button 
           onClick={() => setIsPostGameOpen(true)}
           className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
         >
           Grade Slate
         </button>
      </div>

      <div className="bg-[#141414] border border-white/5 rounded-t-[24px] p-4 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
          <input 
            className="w-full bg-zinc-900/50 border border-white/5 rounded-xl py-2.5 pl-11 text-[11px] font-medium outline-none focus:border-white/10"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select 
          value={season} 
          onChange={(e) => setSeason(e.target.value)} 
          className={SELECT_STYLE}
        >
          {league === 'nfl' ? (
            <>
              <option value="2024">2024-2025</option>
              <option value="2025">2025-2026</option>
            </>
          ) : (
            <option value="2025">2025-2026</option>
          )}
        </select>

        {league === 'nfl' ? (
          <select value={week} onChange={(e) => setWeek(e.target.value)} className={SELECT_STYLE}>
            {['All', ...Array.from({ length: 22 }, (_, i) => (i + 1).toString())].map(w => <option key={w} value={w}>{w === 'All' ? 'All Weeks' : `Week ${w}`}</option>)}
          </select>
        ) : (
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={SELECT_STYLE} />
        )}

        {tableInstance && <ColumnController table={tableInstance} />}
      </div>

      <FlexibleDataTable 
        tableId={`vault-${league}`}
        columns={columns}
        data={allProps}
        isLoading={isLoading}
        onTableInstance={(instance) => setTableInstance(instance)}
        state={{ columnVisibility, sorting }}
        onColumnVisibilityChange={setColumnVisibility}
        onSortingChange={setSorting}
      />

      <PostGameModal 
        isOpen={isPostGameOpen}
        onClose={() => setIsPostGameOpen(false)} 
        gameDate={date} 
      />
    </div>
  );
}
