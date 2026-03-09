'use client';
// src/features/bet-builder-client.tsx

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAllProps, NormalizedProp } from '@/hooks/useAllProps';
import { useBetSlip } from '@/hooks/useBetSlip';
import { PropsTable } from '@/components/bets/PropsTable';
import { BetSlipPanel } from '@/components/bets/BetSlipPanel';
import { EnrichModal } from '@/components/bets/EnrichModal';
import { RefreshCw, LayoutGrid, Table2, SlidersHorizontal, Zap } from 'lucide-react';
import { BetLeg } from '@/lib/types';

type ViewMode = 'cards' | 'table';

const PROP_TYPE_OPTIONS = [
  'Passing Yards', 'Rushing Yards', 'Receiving Yards',
  'Receptions', 'Passing TDs', 'Anytime TD',
  'Pass Attempts', 'Pass Completions',
];

export function BetBuilderClient({ initialWeek, season = 2025 }: { initialWeek: number; season?: number }) {
  const { allProps: rawProps, loading: isLoading, error, propTypes, fetchProps, deleteProp } = useAllProps(initialWeek);
  const { selections, addLeg, removeLeg, clear } = useBetSlip(initialWeek, season);

  const [viewMode,     setViewMode]     = useState<ViewMode>('table');
  const [filters,      setFilters]      = useState({ search: '', propType: '', team: '' });
  const [showFilters,  setShowFilters]  = useState(false);
  const [showEnrich,   setShowEnrich]   = useState(false);

  const safeSelections = selections ?? [];

  const filteredProps = useMemo(() => {
    let list: NormalizedProp[] = rawProps ?? [];
    const search = filters.search.trim().toLowerCase();
    if (search) {
      list = list.filter(p =>
        (p.player ?? '').toLowerCase().includes(search) ||
        (p.prop ?? '').toLowerCase().includes(search) ||
        (p.matchup ?? '').toLowerCase().includes(search)
      );
    }
    if (filters.propType) {
      list = list.filter(p => (p.prop ?? '').toLowerCase() === filters.propType.toLowerCase());
    }
    if (filters.team) {
      list = list.filter(p => (p.team ?? '').toLowerCase() === filters.team.toLowerCase());
    }
    return list.filter((p): p is NormalizedProp & { id: string } => !!p.id);
  }, [rawProps, filters]);

  const teamOptions = useMemo(() =>
    Array.from(new Set((rawProps ?? []).map(p => p.team).filter(Boolean))).sort() as string[]
  , [rawProps]);

  useEffect(() => { fetchProps(); }, [fetchProps]);

  const slipIds = useMemo(
    () => new Set<string>(safeSelections.map((s: any) => String(s.id))),
    [safeSelections]
  );

  const handleAddLeg = useCallback((prop: NormalizedProp, userSelection?: 'Over' | 'Under') => {
    addLeg({
      id: String(prop.id),
      player: prop.player,
      prop: prop.prop,
      line: prop.line,
      team: prop.team ?? '', 
      matchup: prop.matchup ?? '', 
      selection: userSelection ?? (prop.overUnder as 'Over' | 'Under') ?? 'Over',
      odds: prop.odds ?? -110,
      gameDate: prop.gameDate ?? new Date().toISOString(),
      status: 'pending',
    });
  }, [addLeg, initialWeek, season]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#060606] text-white">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
              Market <span className="text-[#FFD700]">Builder</span>
            </h1>
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] mt-1">
              NFL Week {initialWeek}
              <span className="text-zinc-800 mx-2">|</span>
              {isLoading ? 'Loading...' : `${filteredProps.length} props`}
              {safeSelections.length > 0 && (
                <span className="ml-2 text-[#FFD700]">· {safeSelections.length} in slip</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              className="bg-zinc-900 border border-white/5 rounded-xl px-4 py-2 text-xs w-52 placeholder:text-zinc-700 focus:outline-none focus:border-[#FFD700]/30"
              placeholder="Search players, props..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            />

            <button onClick={() => setShowFilters(v => !v)}
              className={`p-2 rounded-xl border transition-all ${showFilters
                ? 'bg-[#FFD700]/10 border-[#FFD700]/30 text-[#FFD700]'
                : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-white'}`}>
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {/* Enrich button */}
            <button onClick={() => setShowEnrich(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-xs font-black uppercase transition-colors">
              <Zap className="w-3.5 h-3.5" /> Enrich Stats
            </button>

            <div className="flex bg-zinc-900 border border-white/5 rounded-xl p-1 gap-1">
              <button onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-[#FFD700] text-black' : 'text-zinc-500 hover:text-white'}`}>
                <Table2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-[#FFD700] text-black' : 'text-zinc-500 hover:text-white'}`}>
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

            <button onClick={() => fetchProps(true)}
              className="p-2 bg-zinc-900 border border-white/5 rounded-xl text-zinc-500 hover:text-white transition-colors">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div className="flex items-center gap-3 px-6 py-3 border-b border-white/5 bg-black/20 shrink-0">
            <select value={filters.propType} onChange={e => setFilters(f => ({ ...f, propType: e.target.value }))}
              className="bg-zinc-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-[#FFD700]/30">
              <option value="">All Prop Types</option>
              {(propTypes.length > 0 ? propTypes : PROP_TYPE_OPTIONS).map(pt => (
                <option key={pt} value={pt}>{pt}</option>
              ))}
            </select>

            <select value={filters.team} onChange={e => setFilters(f => ({ ...f, team: e.target.value }))}
              className="bg-zinc-900 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-[#FFD700]/30">
              <option value="">All Teams</option>
              {teamOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            {(filters.propType || filters.team) && (
              <button onClick={() => setFilters(f => ({ ...f, propType: '', team: '' }))}
                className="text-[10px] text-zinc-600 hover:text-white uppercase font-bold tracking-widest transition-colors">
                Clear filters
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="mx-6 mt-4 text-red-500 text-xs uppercase font-bold tracking-widest bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <PropsTable
            props={filteredProps}
            isLoading={isLoading}
            onAddToBetSlip={handleAddLeg}
            onDelete={deleteProp}
            slipIds={slipIds}
          />
        </div>
      </div>

      {/* Bet Slip sidebar */}
      <div className="w-96 shrink-0 border-l border-white/5 overflow-hidden">
        <BetSlipPanel
          selections={safeSelections}
          onRemove={removeLeg}
          onClear={clear}
          week={initialWeek}
        />
      </div>

      {/* Enrich modal */}
      <EnrichModal
        isOpen={showEnrich}
        onClose={() => setShowEnrich(false)}
        onComplete={() => { fetchProps(true); setShowEnrich(false); }}
        defaultWeek={initialWeek}
        defaultSeason={season}
        defaultCollection="weekly"
      />
    </div>
  );
}
