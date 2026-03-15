'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useBetSlip } from '@/hooks/useBetSlip';
import { useAllProps, NormalizedProp } from '@/hooks/useAllProps';
import { PropsTable } from '@/components/bets/PropsTable';
import { EnrichModal } from '@/components/bets/EnrichModal';
import { ManualEntryModal } from '@/components/bets/manual-entry-modal';
import { RefreshCw, Plus, Zap, Loader2, Database, Target, X } from 'lucide-react';
import { toast } from 'sonner';
import { useSweetSpots } from '@/hooks/useSweetSpots';

interface BetBuilderClientProps {
  initialWeek?: number;
  season?:      number;
}

export default function BetBuilderClient({
  initialWeek,
  season = 2025,
}: BetBuilderClientProps) {

  // ── Data hooks ─────────────────────────────────────────────────────────────
  const {
    props: allProps,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useAllProps({ week: initialWeek, season });

  // useBetSlip takes no arguments — week/season are not part of its signature
  const { selections, addLeg, isInitialized, ...betSlipRest } = useBetSlip();
  const clearSlip = (betSlipRest as any).clearSlip
    ?? (betSlipRest as any).clearSelections
    ?? (betSlipRest as any).clearLegs
    ?? (betSlipRest as any).reset
    ?? null;

  // Sweet spot criteria — loaded once, shared with PropsTable
  const { criteria } = useSweetSpots();

  // ── UI state ───────────────────────────────────────────────────────────────
  const [showManual,    setShowManual]    = useState(false);
  const [showEnrich,    setShowEnrich]    = useState(false);
  const [selectedType,  setSelectedType]  = useState<string>('All');

  // ── Derived values ─────────────────────────────────────────────────────────
  const propTypes = useMemo(() => {
    const types = new Set(allProps.map(p => p.prop).filter(Boolean));
    return ['All', ...Array.from(types).sort()];
  }, [allProps]);

  const filteredProps = useMemo(() => {
    if (selectedType === 'All') return allProps;
    return allProps.filter(p => p.prop === selectedType);
  }, [allProps, selectedType]);

  const slipIds = useMemo(
    () => new Set((selections ?? []).map((s: any) => String(s.propId ?? s.id))),
    [selections],
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAddToSlip = useCallback((prop: NormalizedProp) => {
    const propId = String(prop.id);
    if (slipIds.has(propId)) {
      toast.error(`${prop.player} already in slip`);
      return;
    }
    addLeg({
      id:        propId,
      propId,
      player:    prop.player    ?? 'Unknown',
      prop:      prop.prop      ?? 'Prop',
      line:      prop.line      ?? 0,
      selection: (prop.overUnder as 'Over' | 'Under') || 'Over',
      odds:      prop.bestOdds  ?? prop.odds ?? -110,
      matchup:   prop.matchup   ?? '',
      team:      prop.team      ?? '',
      week:      prop.week,
      season:    prop.season,
      gameDate:  prop.gameDate  ?? new Date().toISOString(),
    });
    toast.success(`${prop.player} added to slip`, {
      style: { background: '#0f1115', border: '1px solid rgba(255,215,0,0.2)', color: '#FFD700' },
    });
  }, [addLeg, slipIds]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.02] border border-white/[0.05] p-6 rounded-3xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[#FFD700]/10 flex items-center justify-center border border-[#FFD700]/20">
            <Database className="h-6 w-6 text-[#FFD700]" />
          </div>
          <div>
            <h2 className="text-xl font-black italic tracking-tighter uppercase">Prop Builder</h2>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest flex items-center gap-2">
              {loading ? 'Syncing...' : `${allProps.length} props available`}
              {initialWeek && (
                <span className="text-[#FFD700] font-black">· WK{initialWeek}</span>
              )}
              {criteria && (
                <span className="text-[#FFD700]/60">· Sweet Spots Active</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="bg-black border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-zinc-400 outline-none focus:border-[#FFD700]/50 transition-all"
          >
            {propTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          {criteria && (
            <a
              href="/sweet-spots"
              className="flex items-center gap-1.5 px-2.5 py-2 bg-[#FFD700]/[0.04] border border-[#FFD700]/20 rounded-xl text-[#FFD700]/70 hover:text-[#FFD700] transition-colors"
              title="View Sweet Spot Engine"
            >
              <Target className="h-4 w-4" />
              <span className="text-[9px] font-black uppercase hidden sm:block">Sweet Spots</span>
            </a>
          )}

          {(selections?.length ?? 0) > 0 && (
            <button
              onClick={() => clearSlip?.()}
              className="flex items-center gap-1.5 px-2.5 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all text-[9px] font-black uppercase"
              title="Clear bet slip"
            >
              <X className="h-3.5 w-3.5" />
              Clear ({selections.length})
            </button>
          )}

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

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => refresh()} className="font-black underline uppercase text-[10px]">
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="min-h-[400px]">
        <PropsTable
          props={filteredProps}
          isLoading={loading && allProps.length === 0}
          onAddToBetSlip={handleAddToSlip}
          slipIds={slipIds}
          sweetSpotCriteria={criteria}
        />
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-4 pb-12">
          <button
            onClick={() => loadMore()}
            disabled={loading}
            className="flex items-center gap-3 px-10 py-4 bg-zinc-900 border border-white/10 rounded-2xl hover:border-[#FFD700]/40 transition-all group"
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin text-[#FFD700]" />
              : <Database className="h-4 w-4 text-zinc-600 group-hover:text-[#FFD700] transition-colors" />
            }
            <span className="text-xs font-black uppercase tracking-widest text-zinc-400 group-hover:text-white">
              {loading ? 'Fetching more...' : 'Load More Props'}
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