'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { usePropsQuery } from '@/hooks/use-props-query';
import { FlexibleDataTable } from '@/components/data-table/flexible-data-table';
import { ColumnController } from '@/components/bet-builder/column-controller';
import { getVaultColumns } from '@/lib/columns/prop-columns'; 
import { PostGameModal } from '@/components/modals/PostGameModal';
import { Search, Database, Trophy, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SortingState, VisibilityState, Table, ColumnOrderState } from '@tanstack/react-table';
import { NormalizedProp } from '@/lib/types';
import { Button } from '@/components/ui/button';

const INITIAL_COLUMN_VISIBILITY: VisibilityState = {
  scalingFactor: false,
  yardsScore: false,
  rankScore: false,
  totalScore: false,
  opponentAvgVsStat: false,
  impliedProb: false,
  kellyPct: false,
};

const INITIAL_COLUMN_ORDER: ColumnOrderState = ['time_period', 'player', 'matchup', 'prop', 'line_ou', 'playerAvg', 'oppRank', 'ev', 'conf', 'actual', 'diff', 'result'];

export default function HistoricalVaultPage() {
  const [league, setLeague] = useState<'nba' | 'nfl'>('nba');
  const [search, setSearch] = useState('');
  const [season, setSeason] = useState('2025'); // Default for NBA
  const [week, setWeek] = useState('All');
  const [date, setDate] = useState('2026-03-23'); // Default to a specific date

  // Table States
  const [tableInstance, setTableInstance] = useState<Table<NormalizedProp> | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(INITIAL_COLUMN_ORDER);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(INITIAL_COLUMN_VISIBILITY);

  const [isEnriching, setIsEnriching] = useState(false);
  const [isPostGameOpen, setIsPostGameOpen] = useState(false);

  useEffect(() => {
    // When league changes, reset table state for a clean slate
    setColumnOrder(INITIAL_COLUMN_ORDER);
    setColumnVisibility(INITIAL_COLUMN_VISIBILITY);
  }, [league]);

  const handleLeagueChange = (l: 'nba' | 'nfl') => {
    setLeague(l);
    // Auto-switch season to match your database availability
    if (l === 'nfl') {
      setSeason('2024'); // Match 'allProps'
      setWeek('All');
    } else {
      setSeason('2025'); // Match 'nbaProps_2025'
      setDate('2026-03-23');    // Default NBA to a specific date
    }
  };

  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    refetch 
  } = usePropsQuery({ 
    league, 
    season: Number(season),
    date: (league === 'nba' && date !== 'All') ? date : undefined,
    week: (league === 'nfl' && week !== 'All') ? Number(week) : undefined,
  });

  const allProps = useMemo(() => {
    const docs = data?.pages.flatMap((page: any) => page.docs) ?? [];
    if (!search) return docs;
    return docs.filter(p => 
      p.player.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);
  const columns = useMemo(() => getVaultColumns(league), [league]);

  const handleEnrich = async () => {
    setIsEnriching(true);
    const toastId = toast.loading(`Enriching ${league.toUpperCase()} Data...`);
    try {
      const res = await fetch(`/api/${league}/backfill`, {
        method: 'POST',
        body: JSON.stringify({ 
          date: (league === 'nba' && date !== 'All') ? date : undefined, 
          week: league === 'nfl' && week !== 'All' ? Number(week) : undefined,
          season 
        }),
      });
      if (res.ok) {
        toast.success("Averages and Ranks Synchronized", { id: toastId });
        refetch();
      }
    } catch (e) {
      toast.error("Enrichment failed. Check server logs.", { id: toastId });
    } finally {
      setIsEnriching(false);
    }
  };

  const SELECT_STYLE = "bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-300 outline-none focus:border-indigo-500/50 transition-all cursor-pointer hover:bg-zinc-800 appearance-none min-w-[120px]";

  return (
    <div className="min-h-screen bg-[#080808] text-white p-6 space-y-6">
      
      <div className="bg-[#141414] border border-white/5 rounded-[40px] p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl border-t-white/10">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
            <Database className="text-indigo-400" size={28} />
          </div>
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">
              Historical <span className="text-indigo-500 text-glow">Vault</span>
            </h1>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mt-2 italic">
              Archived Data & Intelligence
            </p>
          </div>
        </div>

        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
          {['nba', 'nfl'].map((l) => (
            <button 
              key={l}
              onClick={() => handleLeagueChange(l as any)}
              className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                league === l 
                ? 'bg-white text-black shadow-[0_0_25px_rgba(255,255,255,0.1)]' 
                : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#141414] border border-white/5 rounded-[24px] p-4 flex flex-wrap items-center justify-between gap-4">
         <div className="flex items-center gap-6 px-4">
            <button 
              onClick={handleEnrich} 
              disabled={isEnriching}
              className="flex items-center gap-3 group transition-all disabled:opacity-50"
            >
              <div className="p-2.5 bg-indigo-500/10 rounded-xl group-hover:bg-indigo-500/20 transition-colors">
                {isEnriching ? <Loader2 size={16} className="animate-spin text-indigo-400" /> : <Sparkles size={16} className="text-indigo-400" />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">
                Enrich Analytics
              </span>
            </button>
            <div className="h-6 w-px bg-white/5 hidden md:block" />
            <div className="hidden md:flex items-center gap-2">
                <Trophy size={14} className="text-amber-500/50" />
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                  Viewing: {league === 'nba' ? (date === 'All' ? 'Full Season' : date) : (week === 'All' ? 'Full Season' : `Week ${week}`)}
                </span>
            </div>
         </div>
         <button 
           onClick={() => setIsPostGameOpen(true)}
           className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
         >
           Grade Slate
         </button>
      </div>

      <div className="bg-[#141414] border border-white/5 rounded-t-[32px] p-5 flex flex-col lg:flex-row items-center gap-4 bg-linear-to-b from-[#1a1a1a] to-[#141414]">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
          <input 
            className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-12 text-[12px] font-medium outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-700"
            placeholder="Search by player name or matchup..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <select 
            value={season} 
            onChange={(e) => setSeason(e.target.value)} 
            className={SELECT_STYLE}
          >
            {league === 'nfl' ? (
              <option value="2024">2024-25 (AllProps)</option>
            ) : (
              <option value="2025">2025-26 (NBA 2025)</option>
            )}
          </select>

          {league === 'nfl' ? (
            <select value={week} onChange={(e) => setWeek(e.target.value)} className={SELECT_STYLE}>
              <option value="All">Full Season</option>
              {Array.from({ length: 22 }, (_, i) => (i + 1).toString()).map(w => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
          ) : (
            <select value={date === 'All' ? 'All' : 'Custom'} 
                    onChange={(e) => {
                      if (e.target.value === 'All') {
                        setDate('All');
                      } else {
                        setDate(new Date().toISOString().split('T')[0]);
                      }
                    }}
                    className={SELECT_STYLE}>
              <option value="All">Full Season</option>
              <option value="Custom">Custom Date</option>
            </select>
          )}

          {league === 'nba' && date !== 'All' && (
            <div className="relative">
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className={SELECT_STYLE} 
              />
            </div>
          )}

          {tableInstance && (
            <div className="ml-2 border-l border-white/5 pl-4">
              <ColumnController table={tableInstance} />
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
        <FlexibleDataTable 
          tableId={`vault-${league}`}
          columns={columns}
          data={allProps}
          isLoading={isLoading}
          onTableInstance={(instance) => setTableInstance(instance as any)}
          state={{ 
            columnVisibility, 
            sorting,
            columnOrder
          }}
          onColumnVisibilityChange={setColumnVisibility}
          onSortingChange={setSorting}
          onColumnOrderChange={setColumnOrder}
        />

        {hasNextPage && (
          <div className="p-8 flex justify-center border-t border-white/5 bg-zinc-900/10">
            <Button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] px-10 py-4 rounded-2xl border border-indigo-500/20 transition-all"
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="animate-spin mr-3" size={14} />
                  Accessing more records...
                </>
              ) : (
                'Load More Historical Data'
              )}
            </Button>
          </div>
        )}
        
        {!hasNextPage && allProps.length > 0 && (
          <div className="p-6 text-center text-zinc-600 text-[9px] font-black uppercase tracking-widest opacity-50">
            End of Vault Archive
          </div>
        )}
      </div>

      <PostGameModal 
        isOpen={isPostGameOpen}
        onClose={() => setIsPostGameOpen(false)} 
        gameDate={date ?? ""}
        week={league === 'nfl' ? (week === 'All' ? undefined : Number(week)) : undefined}
        league={league}
      />
    </div>
  );
}
