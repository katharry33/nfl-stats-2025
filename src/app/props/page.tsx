'use client';

import React, { useState, useMemo } from 'react';
import { usePropsQuery } from '@/hooks/use-props-query';
import { FlexibleDataTable } from '@/components/tables/FlexibleDataTable';
import { ColumnController } from '@/components/tables/ColumnController';
import { PostGameModal } from '@/components/modals/PostGameModal';
import { 
  Search, Calendar, ChevronDown, Filter, 
  RefreshCw, Database, Trophy, Hash 
} from 'lucide-react';

export default function HistoricalVaultPage() {
  const [league, setLeague] = useState<'nba' | 'nfl'>('nba');
  const [search, setSearch] = useState('');
  const [season, setSeason] = useState('2025');
  const [week, setWeek] = useState('All'); // NFL Specific
  const [date, setDate] = useState('2026-03-23'); // NBA Specific
  const [isPostGameOpen, setIsPostGameOpen] = useState(false);
  const [tableInstance, setTableInstance] = useState<any>(null);

  // Constants for dropdowns
  const seasons = ['2023', '2024', '2025'].sort((a, b) => b.localeCompare(a));
  const nflWeeks = ['All', ...Array.from({ length: 22 }, (_, i) => (i + 1).toString())];

  const { data, isLoading, refetch } = usePropsQuery({ 
    league, 
    season: Number(season),
    date: league === 'nba' ? date : undefined,
    week: league === 'nfl' && week !== 'All' ? Number(week) : undefined,
    collection: league === 'nba' ? 'nbaProps_2025' : 'allProps'
  });

  const allProps = useMemo(() => data?.pages.flatMap((page) => page.docs) ?? [], [data]);

  // Define Columns inside useMemo to prevent re-renders
  const columns = useMemo(() => [
    { id: 'player', header: 'Player', accessorKey: 'playerName' },
    { id: 'matchup', header: 'Matchup', accessorKey: 'matchup' },
    { id: 'propType', header: 'Prop Type', accessorKey: 'propType' },
    { id: 'line', header: 'Line', accessorKey: 'line' },
    { id: 'actual', header: 'Actual', accessorKey: 'actualValue' },
    { id: 'result', header: 'Result', accessorKey: 'actualResult' },
    { id: 'odds', header: 'Odds', accessorKey: 'odds' },
  ], []);

  const SELECT_STYLE = "bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer";

  return (
    <div className="min-h-screen bg-[#080808] text-white p-6 space-y-4">
      
      {/* ─── HEADER BLOCK (Matches image_b86803.png) ─── */}
      <div className="bg-[#141414] border border-white/5 rounded-[32px] p-8 flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
            <Database className="text-indigo-400" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">
              Historical <span className="text-indigo-500">Vault</span>
            </h1>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
              Archive Engine V3.0 | Date: {date}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
            <button 
              onClick={() => setLeague('nba')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${league === 'nba' ? 'bg-orange-500 text-white shadow-lg' : 'text-zinc-500'}`}
            >
              NBA
            </button>
            <button 
              onClick={() => setLeague('nfl')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${league === 'nfl' ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-500'}`}
            >
              NFL
            </button>
          </div>
          <button onClick={() => refetch()} className="p-3 bg-zinc-900 rounded-2xl border border-white/5 text-zinc-500 hover:text-white transition-all">
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ─── SCORING CONTROL BAR (Matches image_b944eb.jpg) ─── */}
      <div className="bg-[#141414] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
         <div className="flex items-center gap-3 px-4">
            <Trophy size={16} className="text-indigo-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Post-Game Scoring</span>
            <div className="h-4 w-[1px] bg-white/5 mx-2" />
            <span className="text-[10px] font-bold text-zinc-600 uppercase">Target: {league === 'nba' ? date : `Week ${week}`}</span>
         </div>
         <button 
           onClick={() => setIsPostGameOpen(true)}
           className="bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/10"
         >
           Grade Slate
         </button>
      </div>

      {/* ─── FILTER BAR ─── */}
      <div className="bg-[#141414] border border-white/5 rounded-t-[24px] p-4 flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={14} />
          <input 
            type="text"
            placeholder="Search player, team, prop..."
            className="w-full bg-zinc-900/50 border border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-[11px] font-medium text-white focus:border-indigo-500/50 outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Season Dropdown */}
        <div className="relative">
          <select value={season} onChange={(e) => setSeason(e.target.value)} className={SELECT_STYLE}>
            {seasons.map(s => <option key={s} value={s}>Season {s}</option>)}
          </select>
        </div>

        {/* Conditional Week/Date Dropdown */}
        {league === 'nfl' ? (
          <div className="relative">
            <select value={week} onChange={(e) => setWeek(e.target.value)} className={SELECT_STYLE}>
              {nflWeeks.map(w => <option key={w} value={w}>{w === 'All' ? 'All Weeks' : `Week ${w}`}</option>)}
            </select>
          </div>
        ) : (
          <div className="relative">
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className={`${SELECT_STYLE} block`} 
            />
          </div>
        )}

        {/* Table Controls */}
        <div className="flex items-center gap-2 ml-auto">
          {tableInstance && <ColumnController table={tableInstance} />}
          <button onClick={() => refetch()} className="px-4 py-2 bg-zinc-800/50 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all">
            Refresh
          </button>
        </div>
      </div>

      {/* ─── THE TABLE ─── */}
      <FlexibleDataTable 
        tableId="historical-vault"
        columns={columns}
        data={allProps}
        isLoading={isLoading}
        onTableInstance={(instance) => setTableInstance(instance)}
      />

      <PostGameModal 
        isOpen={isPostGameOpen} 
        onClose={() => setIsPostGameOpen(false)} 
        gameDate={date} 
      />
    </div>
  );
}