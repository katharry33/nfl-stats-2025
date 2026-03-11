'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useBetSlip } from '@/hooks/useBetSlip';
import { useAllProps, NormalizedProp } from '@/hooks/useAllProps';
import { PropsTable } from '@/components/bets/PropsTable';
import { EnrichModal } from '@/components/bets/EnrichModal';
import { ManualEntryModal } from '@/components/bets/manual-entry-modal';
import { RefreshCw, Plus, Zap, Loader2, Database } from 'lucide-react';
import { toast } from 'sonner';

interface BetBuilderClientProps {
  initialWeek?: number;
  season?: number;
}

export default function BetBuilderClient({ initialWeek, season = 2025 }: BetBuilderClientProps) {
  // 1. Hook Integration
  const { 
    props: allProps, 
    loading, 
    error, 
    hasMore, 
    loadMore, 
    refresh 
  } = useAllProps({ week: initialWeek, season });
  
  const { selections, addLeg, isInitialized } = useBetSlip({ week: initialWeek, season });

  // 2. State for Modals & Filters
  const [showManual, setShowManual] = useState(false);
  const [showEnrich, setShowEnrich] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('All');

  // 3. Dynamic propTypes Generation (replaces the missing hook property)
  const propTypes = useMemo(() => {
    const types = new Set(allProps.map(p => p.prop).filter(Boolean));
    return ['All', ...Array.from(types)].sort();
  }, [allProps]);

  // 4. Client-side Filter Logic
  const filteredProps = useMemo(() => {
    if (selectedType === 'All') return allProps;
    return allProps.filter(p => p.prop === selectedType);
  }, [allProps, selectedType]);

  const slipIds = useMemo(
    () => new Set((selections ?? []).map((s: any) => String(s.propId ?? s.id))),
    [selections]
  );

  // 5. Handlers
  const handleAddToSlip = useCallback((prop: NormalizedProp) => {
    const propId = String(prop.id);
    if (slipIds.has(propId)) {
      toast.error(`${prop.player} already in slip`);
      return;
    }
    
    addLeg({
      id: propId,
      propId,
      player: prop.player ?? 'Unknown',
      prop: prop.prop ?? 'Prop',
      line: prop.line ?? 0,
      selection: (prop.overUnder as 'Over' | 'Under') || 'Over',
      odds: prop.bestOdds ?? prop.odds ?? -110,
      matchup: prop.matchup ?? '',
      team: prop.team ?? '',
      week: prop.week,
      season: prop.season,
      gameDate: prop.gameDate ?? new Date().toISOString(),
    });

    toast.success(`${prop.player} added to slip`);
  }, [addLeg, slipIds]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.02] border border-white/[0.05] p-6 rounded-3xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[#FFD700]/10 flex items-center justify-center border border-[#FFD700]/20">
            <Database className="h-6 w-6 text-[#FFD700]" />
          </div>
          <div>
            <h2 className="text-xl font-black italic tracking-tighter uppercase">Prop Builder</h2>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">
              {loading ? 'Syncing...' : `${allProps.length} Total Props Available`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Prop Type Filter */}
          <select 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-black border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-zinc-400 outline-none focus:border-[#FFD700]/50 transition-all"
          >
            {propTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <button 
            onClick={() => setShowEnrich(true)}
            className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all"
            title="Enrich Data"
          >
            <Zap className="h-4 w-4" />
          </button>

          <button 
            onClick={() => setShowManual(true)}
            className="p-2.5 bg-white/5 text-zinc-400 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
            title="Manual Entry"
          >
            <Plus className="h-4 w-4" />
          </button>

          <button 
            onClick={() => refresh()}
            disabled={loading}
            className="p-2.5 bg-white/5 text-zinc-400 border border-white/10 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => refresh()} className="font-black underline uppercase text-[10px]">Retry</button>
        </div>
      )}

      {/* Main Table */}
      <div className="min-h-[400px]">
        <PropsTable 
          props={filteredProps}
          isLoading={loading && allProps.length === 0}
          onAddToBetSlip={handleAddToSlip}
          slipIds={slipIds}
        />
      </div>

      {/* Pagination Footer */}
      {hasMore && (
        <div className="flex justify-center pt-4 pb-12">
          <button
            onClick={() => loadMore()}
            disabled={loading}
            className="flex items-center gap-3 px-10 py-4 bg-zinc-900 border border-white/10 rounded-2xl hover:border-[#FFD700]/40 transition-all group"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#FFD700]" />
            ) : (
              <Database className="h-4 w-4 text-zinc-600 group-hover:text-[#FFD700] transition-colors" />
            )}
            <span className="text-xs font-black uppercase tracking-widest text-zinc-400 group-hover:text-white">
              {loading ? 'Fetching more...' : 'Load 1,000 More Props'}
            </span>
          </button>
        </div>
      )}

      {/* Modals */}
      {showManual && (
        <ManualEntryModal
          isOpen={showManual}
          onClose={() => setShowManual(false)}
          onAddLeg={addLeg}
        />
      )}

      <EnrichModal
        isOpen={showEnrich}
        onClose={() => setShowEnrich(false)}
        onComplete={() => { refresh(); setShowEnrich(false); }}
        defaultWeek={initialWeek}
        defaultSeason={season}
        defaultCollection="all"
      />
    </div>
  );
}
