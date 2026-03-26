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

const SEASON_OPTIONS = [
  { label: '2024–25', value: '2024' },
  { label: '2025–26', value: '2025' },
];

export default function HistoricalVaultPage() {
  const [league, setLeague] = useState<'nba' | 'nfl'>('nba');
  const [search, setSearch] = useState('');
  const [season, setSeason] = useState('2025');
  const [week, setWeek] = useState('All');
  const [date, setDate] = useState('2026-03-23');

  // Table States
  const [tableInstance, setTableInstance] = useState<Table<NormalizedProp> | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(INITIAL_COLUMN_ORDER);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(INITIAL_COLUMN_VISIBILITY);

  const [isEnriching, setIsEnriching] = useState(false);
  const [isPostGameOpen, setIsPostGameOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedDate, setSelectedDate] = useState('');

  const [enrichStatus, setEnrichStatus] = useState<{
    total: number;
    processed: number;
    error?: string;
  }>({ total: 0, processed: 0 });

  useEffect(() => {
    // When league changes, reset table state for a clean slate
    setColumnOrder(INITIAL_COLUMN_ORDER);
    setColumnVisibility(INITIAL_COLUMN_VISIBILITY);
  }, [league]);

  const handleLeagueChange = (l: 'nba' | 'nfl') => {
    setLeague(l);
    if (l === 'nfl') {
      setSeason('2024');
      setWeek('All');
    } else {
      setSeason('2025');
      setDate('2026-03-23');
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
    season: season,
    date: date,
    week: week,
    search: search,
  });

  const allProps = useMemo(() => {
    const docs = data?.pages.flatMap((page: any) => page.docs ?? []) ?? [];
    if (!search) return docs;
    const searchLower = search.toLowerCase();
    return docs.filter(p => 
      p.player?.toLowerCase().includes(searchLower) || 
      p.matchup?.toLowerCase().includes(searchLower) ||
      p.team?.toLowerCase().includes(searchLower)
    );
  }, [data, search]);
  const columns = useMemo(() => getVaultColumns(league), [league]);

  const runEnrichment = async (date: string) => {
    setIsEnriching(true);
    setEnrichStatus({ total: 0, processed: 0, error: undefined });
    setProgress(0);
    setSelectedDate(date === 'All' ? 'Full Season' : date);
    const toastId = toast.loading("Starting enrichment process...");

    let remaining = 1; 
    let totalProcessed = 0;
    let lastProcessedCount = -1;

    try {
      while (remaining > 0) {
        const res = await fetch('/api/nba/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'refine_existing', date, league: 'nba', season: 2025 })
        });
        
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Failed to enrich");
        
        // CIRCUIT BREAKER
        if (data.updated === 0 && totalProcessed === lastProcessedCount) {
           console.error("Stopping: No progress made in this batch.");
           break;
        }
        
        lastProcessedCount = totalProcessed;
        remaining = data.remaining;
        totalProcessed += data.updated;

        setEnrichStatus({ 
          total: data.totalCount || 489, // Pass the total once from backend if possible
          processed: totalProcessed 
        });
        
        if (remaining === 0) break;
      }
    } catch (err: any) {
      console.error(err);
      setEnrichStatus(prev => ({ ...prev, error: "Missing Firestore Index. Check logs." }));
      toast.error(err.message || "Missing Firestore Index. Check logs.", { id: toastId });
    } finally {
      setIsEnriching(false);
      refetch();
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
              onClick={() => runEnrichment(date)} 
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
            {SEASON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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
      
      {isEnriching || enrichStatus.error ? (
        <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase text-zinc-400">
              {enrichStatus.error ? "Enrichment Halted" : `Enriching: ${enrichStatus.processed} / ${enrichStatus.total} Props`}
            </span>
            <span className="text-[10px] font-black text-indigo-400">
              {progress}%
            </span>
          </div>

          {/* The Progress Bar */}
          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ${enrichStatus.error ? 'bg-red-500' : 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]'}`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {enrichStatus.error && (
            <p className="mt-2 text-[9px] text-red-400 font-medium">
              ⚠️ {enrichStatus.error} — Paste the URL from your terminal into a browser to create the required index.
            </p>
          )}
        </div>
      ) : null}

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
