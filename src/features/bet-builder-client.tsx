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

  const { selections, addLeg, isInitialized, ...betSlipRest } = useBetSlip();
  
  // Safe extraction of clear method
  const clearSlip = (betSlipRest as any).clearSlip
    ?? (betSlipRest as any).clearSelections
    ?? (betSlipRest as any).clearLegs
    ?? (betSlipRest as any).reset
    ?? null;

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
    
    // Updated Toast to Obsidian/Cyan
    toast.success(`${prop.player} added to slip`, {
      style: { 
        background: '#111111', 
        border: '1px solid rgba(34,211,238,0.2)', 
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '10px',
        textTransform: 'uppercase'
      },
    });
  }, [addLeg, slipIds]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Header - Industrial Slate Style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111111] border border-white/5 p-6 rounded-[2rem] shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
            <Database className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-black italic tracking-tighter uppercase text-white">Prop Builder</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
              {loading ? 'Syncing...' : `${allProps.length} nodes available`}
              {initialWeek && (
                <span className="text-cyan-400">· WK{initialWeek}</span>
              )}
              {criteria && (
                <span className="text-cyan-400/50">· Sweet Spot Engine Active</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Dropdown Styled for Dark Mode */}
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer"
          >
            {propTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          {criteria && (
            <a
              href="/sweet-spots"
              className="flex items-center gap-1.5 px-3 py-2 bg-cyan-500/5 border border-cyan-500/20 rounded-xl text-cyan-400/70 hover:text-cyan-400 transition-colors"
              title="View Sweet Spot Engine"
            >
              <Target className="h-4 w-4" />
              <span className="text-[9px] font-black uppercase hidden sm:block">Sweet Spots</span>
            </a>
          )}

          {(selections?.length ?? 0) > 0 && (
            <button
              onClick={() => clearSlip?.()}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all text-[9px] font-black uppercase"
            >
              <X className="h-3.5 w-3.5" />
              Clear ({selections.length})
            </button>
          )}

          {/* Action Buttons - Ghost Style */}
          <button
            onClick={() => setShowEnrich(true)}
            className="p-2.5 bg-cyan-500/5 text-cyan-400 border border-cyan-500/10 rounded-xl hover:bg-cyan-500/10 transition-all"
            title="Enrich Data"
          >
            <Zap className="h-4 w-4" />
          </button>

          <button
            onClick={() => setShowManual(true)}
            className="p-2.5 bg-white/5 text-slate-400 border border-white/5 rounded-xl hover:bg-white/10 transition-all"
            title="Manual Entry"
          >
            <Plus className="h-4 w-4" />
          </button>

          <button
            onClick={() => refresh()}
            disabled={loading}
            className="p-2.5 bg-white/5 text-slate-400 border border-white/5 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-black uppercase tracking-widest flex justify-between items-center">
          <div className="flex items-center gap-2">
            <X className="h-4 w-4" />
            <span>Connection Interrupted: {error}</span>
          </div>
          <button onClick={() => refresh()} className="underline hover:text-white transition-colors">
            Retry Sync
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="min-h-[400px] bg-[#111111]/30 rounded-[2rem] border border-white/5 overflow-hidden">
        <PropsTable
          props={filteredProps}
          isLoading={loading && allProps.length === 0}
          onAddToBetSlip={handleAddToSlip}
          slipIds={slipIds}
          sweetSpotCriteria={criteria}
        />
      </div>

      {/* Load More - Industrial Action Button */}
      {hasMore && (
        <div className="flex justify-center pt-8 pb-12">
          <button
            onClick={() => loadMore()}
            disabled={loading}
            className="flex items-center gap-3 px-12 py-5 bg-[#111111] border border-white/10 rounded-2xl hover:border-cyan-500/40 hover:bg-[#161616] transition-all group active:scale-95"
          >
            {loading
              ? <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
              : <Database className="h-5 w-5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
            }
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-white">
              {loading ? 'Accessing Ledger...' : 'Expand Data Pool'}
            </span>
          </button>
        </div>
      )}

      {/* Modals - These typically handle their own internal colors */}
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