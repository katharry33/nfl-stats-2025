'use client';

import React, { useState } from 'react';
import { PropsTableContainer } from '@/components/PropsTableContainer';
import PropFilterBar from '@/components/PropFilterBar';
import { ToggleLeft, ToggleRight } from 'lucide-react';

export default function HistoricalPropsPage() {
  // NFL-first defaults
  const [league, setLeague] = useState<'nba' | 'nfl'>('nfl');
  const [season, setSeason] = useState<number>(2024); // legacy NFL
  const [date, setDate] = useState<string>(''); // always visible
  const [search, setSearch] = useState<string>('');
  const [propFilter, setPropFilter] = useState<string>('all');
  const [view, setView] = useState<'table' | 'card'>('table');

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-black text-white tracking-tight uppercase">
          Historical Props Vault
        </h1>
        <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">
          NFL-first • Full archive • Analytics-ready
        </p>
      </div>

      {/* League + Season + Date + View Toggle */}
      <div className="flex flex-wrap items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-white/5">

        {/* League Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => { setLeague('nfl'); setSeason(2024); }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${
              league === 'nfl'
                ? 'bg-indigo-600 text-white'
                : 'bg-white/5 text-zinc-300'
            }`}
          >
            NFL
          </button>

          <button
            onClick={() => { setLeague('nba'); setSeason(2025); }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${
              league === 'nba'
                ? 'bg-indigo-600 text-white'
                : 'bg-white/5 text-zinc-300'
            }`}
          >
            NBA
          </button>
        </div>

        {/* Season Selector */}
        <select
          value={season}
          onChange={(e) => setSeason(Number(e.target.value))}
          className="px-3 py-2 bg-white/5 text-white text-xs rounded-xl border border-white/10"
        >
          {league === 'nfl' && (
            <>
              <option value={2024}>2024 (Legacy)</option>
              <option value={2026}>2026 (Future)</option>
            </>
          )}
          {league === 'nba' && (
            <>
              <option value={2025}>2025 Season</option>
            </>
          )}
        </select>

        {/* Date Picker (always visible) */}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 bg-white/5 text-white text-xs rounded-xl border border-white/10"
        />

        {/* Search */}
        <input
          placeholder="Search player or matchup"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 bg-white/5 text-white text-xs rounded-xl border border-white/10 flex-1"
        />

        {/* View Toggle */}
        <button
          onClick={() => setView(view === 'table' ? 'card' : 'table')}
          className="px-3 py-2 bg-white/5 text-white rounded-xl border border-white/10 flex items-center gap-2 text-xs font-black uppercase tracking-widest"
        >
          {view === 'table' ? (
            <>
              <ToggleRight size={14} /> Card View
            </>
          ) : (
            <>
              <ToggleLeft size={14} /> Table View
            </>
          )}
        </button>
      </div>

      {/* Prop Filter Bar */}
      <PropFilterBar onFilterChange={setPropFilter} />

      {/* Props Table/Card Container */}
      <PropsTableContainer
        initialSport={league}
        // These props are passed down to usePropsQuery inside the container
        // The container already handles search, sorting, pagination, etc.
      />
    </div>
  );
}
