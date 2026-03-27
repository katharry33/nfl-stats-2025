'use client';

import React, { useState, useEffect } from 'react';
import { PropsTableContainer } from '@/components/PropsTableContainer';
import PropFilterBar from '@/components/PropFilterBar';
import {
  ToggleLeft,
  ToggleRight,
  PlusCircle,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { DataInspectorModal } from '@/components/DataInspectorModal';
import { AddPropModal } from '@/components/AddPropModal';

export default function HistoricalPropsPage() {
  const [league, setLeague] = useState<'nba' | 'nfl'>('nfl');
  const [season, setSeason] = useState<number>(2024);

  const [date, setDate] = useState<string>(''); // NBA only
  const [week, setWeek] = useState<number | null>(null); // NFL only

  const [search, setSearch] = useState('');
  const [propFilter, setPropFilter] = useState('all');
  const [view, setView] = useState<'table' | 'card'>('table');

  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorData, setInspectorData] = useState<any>(null);

  const [addOpen, setAddOpen] = useState(false);

  // Auto-load most recent week/date
  useEffect(() => {
    async function loadDefaults() {
      if (league === 'nfl') {
        const res = await fetch(`/api/props?league=nfl&season=${season}`);
        const json = await res.json();
        const weeks = json.props.map((p: any) => p.week).filter(Boolean);
        const maxWeek = weeks.length ? Math.max(...weeks) : null;
        setWeek(maxWeek);
        setDate('');
      } else {
        const res = await fetch(`/api/props?league=nba&season=${season}`);
        const json = await res.json();
        const dates = json.props.map((p: any) => p.gameDate).filter(Boolean);
        const maxDate = dates.length ? dates.sort().pop() : '';
        setDate(maxDate);
        setWeek(null);
      }
    }

    loadDefaults();
  }, [league, season]);

  const openInspector = (p: any) => {
    setInspectorData(p);
    setInspectorOpen(true);
  };

  return (
    <div className="p-6 space-y-6">

      {/* ===========================
          HEADER
      =========================== */}
      <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 space-y-4">

        {/* League + Season */}
        <div className="flex flex-wrap items-center justify-between gap-4">

          {/* League Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLeague('nfl')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                league === 'nfl'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              NFL
            </button>

            <button
              onClick={() => setLeague('nba')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                league === 'nba'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              NBA
            </button>
          </div>

          {/* Season Selector */}
          <select
            value={season}
            onChange={(e) => setSeason(Number(e.target.value))}
            className="bg-zinc-800 text-zinc-300 text-xs px-3 py-2 rounded-lg border border-white/10"
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </select>
        </div>

        {/* Week / Date + Search + View Toggle + Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">

          {/* Week or Date */}
          <div className="flex items-center gap-2">
            {league === 'nfl' && (
              <select
                value={week ?? ''}
                onChange={(e) => setWeek(Number(e.target.value))}
                className="bg-zinc-800 text-zinc-300 text-xs px-3 py-2 rounded-lg border border-white/10"
              >
                <option value="">Select Week</option>
                {Array.from({ length: 22 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Week {i + 1}
                  </option>
                ))}
              </select>
            )}

            {league === 'nba' && (
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-zinc-800 text-zinc-300 text-xs px-3 py-2 rounded-lg border border-white/10"
              />
            )}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search players or matchups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-zinc-800 text-zinc-300 text-xs px-3 py-2 rounded-lg border border-white/10"
          />

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('table')}
              className={`p-2 rounded-lg ${
                view === 'table'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              <ToggleLeft size={16} />
            </button>

            <button
              onClick={() => setView('card')}
              className={`p-2 rounded-lg ${
                view === 'card'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              <ToggleRight size={16} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1 bg-green-600 text-white text-xs px-3 py-2 rounded-lg hover:bg-green-500"
            >
              <PlusCircle size={14} /> Add Prop
            </button>

            <button
              className="flex items-center gap-1 bg-purple-600 text-white text-xs px-3 py-2 rounded-lg hover:bg-purple-500"
            >
              <Sparkles size={14} /> Enrich
            </button>

            <button
              className="flex items-center gap-1 bg-blue-600 text-white text-xs px-3 py-2 rounded-lg hover:bg-blue-500"
            >
              <CheckCircle2 size={14} /> Grade
            </button>
          </div>
        </div>
      </div>

      {/* ===========================
          PROP FILTER BAR
      =========================== */}
      <PropFilterBar onFilterChange={setPropFilter} />

      {/* ===========================
          MAIN TABLE
      =========================== */}
      <PropsTableContainer
        league={league}
        season={season}
        date={date}
        week={week}
        search={search}
        propFilter={propFilter}
        view={view}
        onViewData={openInspector}
      />

      <DataInspectorModal
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        data={inspectorData}
      />

      <AddPropModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        league={league}
        season={season}
      />
    </div>
  );
}
