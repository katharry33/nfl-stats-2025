'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Table as TableIcon, LayoutGrid, Plus, Edit3, Trash2, ArrowUpDown, Loader2, 
  Search, RefreshCw, AlertCircle 
} from 'lucide-react'; 
import { FlexibleDataTable } from '@/components/data-table/flexible-data-table';
import { ColumnToggle } from '@/components/bet-builder/ColumnToggle'; 
import { usePropsQuery } from '@/hooks/use-props-query';
import NBAArchiveGrader from '@/components/historical-props/NBAArchiveGrader';

/**
 * PROPS TABLE COMPONENT
 * Handles the display logic for both Builder and Archive modes
 */
export function PropsTable({
  props, league, isLoading, onAddToBetSlip, onEditProp, onDeleteProp, slipIds = new Set(), 
  onOpenManual, hasMore, onLoadMore, currentSeason, onSeasonChange, mode = 'archive'
}: any) {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [tableInstance, setTableInstance] = useState<any>(null);

  const VIS_KEY = `${mode}-vis-${league}`;
  const ORD_KEY = `${mode}-ord-${league}`;
  const [columnVisibility, setColumnVisibility] = useState({});
  const [columnOrder, setColumnOrder] = useState<string[]>([]);

  // Persistence logic for column layouts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem(VIS_KEY);
      const o = localStorage.getItem(ORD_KEY);
      if (v) setColumnVisibility(JSON.parse(v));
      if (o) setColumnOrder(JSON.parse(o));
    }
  }, [league, VIS_KEY, ORD_KEY]);

  const columns = useMemo(() => {
    const fields = [
      'player', 'prop', 'line', 'overUnder', 'odds', 'matchup', 'gameDate',
      'bestEdgePct', 'confidenceScore', 'expectedValue', 'impliedOdds', 'modelProb',
      'playerAvg', 'seasonHitPct', 'opponentRank', 'opponentAvgVsStat',
      'totalScore', 'scoreDiff', 'winProbability', 'projWinPct', 'avgWinProb', 
      'impliedProb', 'kellyPct', 'gameStat', 'actualResult'
    ];
    
    return [
      ...fields.map(f => ({
        id: f,
        accessorKey: f,
        header: ({ column }: any) => (
          <button 
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} 
            className="flex items-center gap-2 hover:text-indigo-400 transition-colors group py-1"
          >
            <span className="text-[10px] font-black tracking-widest whitespace-nowrap">
              {f.replace(/([A-Z])/g, ' $1').toUpperCase().trim()}
            </span>
            <ArrowUpDown size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ),
        cell: (info: any) => {
          const row = info.row.original;
          const val = row[f] ?? row[f + ' '] ?? row[f.toLowerCase()] ?? row[f.charAt(0).toUpperCase() + f.slice(1)];
          
          if (val === null || val === undefined) return <span className="text-zinc-800">-</span>;

          if (f.toLowerCase().includes('pct') || f.toLowerCase().includes('prob')) {
            const num = parseFloat(val);
            const displayVal = num <= 1 && num >= -1 && !f.includes('Edge') ? num * 100 : num;
            const color = displayVal > 50 ? 'text-emerald-400' : displayVal < 45 ? 'text-rose-400' : 'text-zinc-300';
            return <span className={`font-mono font-bold ${color}`}>{displayVal.toFixed(1)}%</span>;
          }

          if (f === 'odds' || f === 'impliedOdds') {
            const num = parseInt(val);
            return <span className="font-mono text-indigo-300">{num > 0 ? `+${num}` : num}</span>;
          }

          if (f === 'gameDate' || f === 'date') {
            const d = val?.seconds ? new Date(val.seconds * 1000) : new Date(val);
            return <span className="text-zinc-500 font-mono text-[10px]">{d.toLocaleDateString()}</span>;
          }

          if (f === 'actualResult') {
            const isWin = val?.toLowerCase() === 'won' || val?.toLowerCase() === 'hit';
            return (
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${isWin ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {val}
              </span>
            );
          }

          return <span className="text-zinc-200 font-medium">{String(val)}</span>;
        }
      })),
      {
        id: 'actions',
        header: () => <span className="text-[10px] font-black tracking-widest text-zinc-600">MANAGE</span>,
        enableHiding: false,
        cell: (info: any) => {
          const row = info.row.original;
          const isAdded = slipIds.has(String(row.id));
          return (
            <div className="flex items-center justify-end gap-2 pr-4 min-w-[150px]">
              {mode === 'builder' && (
                <button 
                  onClick={() => onAddToBetSlip(row)}
                  disabled={isAdded}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all shadow-md active:scale-95 ${
                    isAdded ? 'bg-zinc-800 text-zinc-600 cursor-default' : 'bg-white text-black hover:bg-indigo-500 hover:text-white'
                  }`}
                >
                  {isAdded ? 'In Slip' : '+ Slip'}
                </button>
              )}
              <button onClick={() => onEditProp?.(row)} className="p-2 text-zinc-600 hover:text-white transition-colors"><Edit3 size={14} /></button>
              <button onClick={() => onDeleteProp?.(row)} className="p-2 text-zinc-600 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
            </div>
          );
        }
      }
    ];
  }, [league, slipIds, onAddToBetSlip, onEditProp, onDeleteProp, mode]);

  return (
    <div className="w-full flex flex-col">
      <div className="flex items-center justify-between p-5 bg-zinc-900/40 border-b border-white/5 backdrop-blur-md">
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
          <button onClick={() => setViewMode('table')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-zinc-800 text-indigo-400 shadow-inner' : 'text-zinc-600'}`}><TableIcon size={16} /></button>
          <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-zinc-800 text-indigo-400 shadow-inner' : 'text-zinc-600'}`}><LayoutGrid size={16} /></button>
        </div>

        <div className="flex items-center gap-4">
          <select value={currentSeason} onChange={(e) => onSeasonChange(e.target.value)} className="bg-zinc-900 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl px-5 py-3 text-white outline-none cursor-pointer hover:border-white/20 transition-all appearance-none pr-10">
            <option value="24-25">24-25 Season</option>
            <option value="25-26">25-26 Season</option>
          </select>

          {tableInstance && <ColumnToggle table={tableInstance} />}

          <button onClick={onOpenManual} className="bg-zinc-100 text-black px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-white active:scale-95 transition-all shadow-2xl shadow-black/50">
            <Plus size={16} /> Manual Entry
          </button>
        </div>
      </div>

      <div className="relative">
        <FlexibleDataTable 
          data={props} 
          columns={columns} 
          isLoading={isLoading} 
          tableId={`${mode}-v10-${league}`} 
          state={{ columnVisibility, columnOrder }}
          onColumnVisibilityChange={(v: any) => {
            const next = typeof v === 'function' ? v(columnVisibility) : v;
            setColumnVisibility(next);
            localStorage.setItem(VIS_KEY, JSON.stringify(next));
          }}
          onColumnOrderChange={(o: any) => {
            const next = typeof o === 'function' ? o(columnOrder) : o;
            setColumnOrder(next);
            localStorage.setItem(ORD_KEY, JSON.stringify(next));
          }}
          onTableInstance={setTableInstance}
        />

        {hasMore && (
          <div className="p-12 flex justify-center border-t border-white/5">
            <button onClick={onLoadMore} disabled={isLoading} className="group flex items-center gap-5 text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 hover:text-white transition-all disabled:opacity-50">
              <div className="h-px w-10 bg-zinc-800 group-hover:bg-indigo-500/50 transition-all" />
              {isLoading ? <Loader2 className="animate-spin h-4 w-4 text-indigo-500" /> : 'Request More Vault Records'}
              <div className="h-px w-10 bg-zinc-800 group-hover:bg-indigo-500/50 transition-all" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * MAIN PAGE COMPONENT
 * The default export for /props
 */
export default function HistoricalArchivePage() {
  const [league, setLeague] = useState<'nba' | 'nfl'>('nba');
  const [search, setSearch] = useState('');
  const [season, setSeason] = useState('25-26');
  const [week, setWeek] = useState<string>(''); 
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]); 

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } = usePropsQuery({ 
    league, season, search,
    week: league === 'nfl' ? week : undefined,
    date: league === 'nba' ? date : undefined,
    collection: league === 'nba' ? 'nbaProps_2025' : 'allProps'
  });

  const allProps = useMemo(() => {
    return data?.pages.flatMap((page) => page.docs) ?? [];
  }, [data]);

  return (
    <div className="min-h-screen bg-[#080808] p-6 space-y-6 text-white">
      <div className="flex justify-between items-center p-8 rounded-[32px] bg-[#141414] border border-white/5">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Historical <span className="text-indigo-500">Vault</span></h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/5">
            <button onClick={() => setLeague('nba')} className={`px-7 py-2.5 rounded-xl text-[10px] font-black uppercase ${league === 'nba' ? 'bg-[#f97316]' : 'text-zinc-500'}`}>NBA</button>
            <button onClick={() => setLeague('nfl')} className={`px-7 py-2.5 rounded-xl text-[10px] font-black uppercase ${league === 'nfl' ? 'bg-[#22c55e]' : 'text-zinc-500'}`}>NFL</button>
          </div>
          <button onClick={() => refetch()} className="p-3.5 bg-zinc-900 border border-white/5 rounded-2xl">
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {league === 'nba' && <NBAArchiveGrader date={date} onComplete={() => refetch()} />}

      <div className="bg-[#141414]/80 rounded-[28px] border border-white/5 min-h-[400px]">
        {allProps.length > 0 ? (
          <PropsTable 
            props={allProps} league={league} isLoading={isLoading}
            currentSeason={season} onSeasonChange={setSeason}
            hasMore={hasNextPage} onLoadMore={fetchNextPage} mode="archive"
          />
        ) : !isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 space-y-4">
            <AlertCircle className="text-zinc-700" size={48} />
            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">No data for this filter</p>
          </div>
        ) : (
          <div className="flex items-center justify-center py-40"><RefreshCw className="animate-spin text-zinc-700" /></div>
        )}
      </div>
    </div>
  );
}