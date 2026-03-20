'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useBetSlip } from '@/hooks/useBetSlip';
// Ensure these are exported as named exports in your hook file
import { useAllProps, NormalizedProp } from '@/hooks/useAllProps';
import { PropsTable } from '@/components/bets/PropsTable';
import { EnrichModal } from '@/components/bets/EnrichModal';
import { ManualEntryModal } from '@/components/bets/manual-entry-modal';
import { RefreshCw, Plus, Zap, Loader2, Database, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface BetBuilderClientProps {
  initialDate?: string;
  season?:      number;
  league?:      'nfl' | 'nba' | 'ncaab';
}

export default function BetBuilderClient({
  initialDate,
  season = 2025, 
  league = 'nba',
}: BetBuilderClientProps) {
  const router = useRouter();
  
  const activeDate = useMemo(() => {
    if (initialDate) return initialDate;
    return new Date().toISOString().split('T')[0];
  }, [initialDate]);

  const {
    props: allProps = [],
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useAllProps({ 
    league, 
    date: activeDate, 
    season: String(season) // Ensure season is passed as string to match hook expectation
  });

  const { selections, addLeg, ...betSlipRest } = useBetSlip();
  
  // Dynamic check for clearSlip function name in hook
  const clearSlip = (betSlipRest as any).clearSlip
    ?? (betSlipRest as any).clearSelections
    ?? (betSlipRest as any).clearLegs
    ?? (betSlipRest as any).reset
    ?? null;

  const [showManual,    setShowManual]    = useState(false);
  const [showEnrich,    setShowEnrich]    = useState(false);
  const [selectedType,  setSelectedType]  = useState<string>('All');

  // FIX: Added Type for parameter 'p'
  const propTypes = useMemo(() => {
    const types = new Set(allProps.map((p: NormalizedProp) => p.prop).filter(Boolean));
    return ['All', ...Array.from(types).sort()];
  }, [allProps]);

  // FIX: Added Type for parameter 'p'
  const filteredProps = useMemo(() => {
    if (selectedType === 'All') return allProps;
    return allProps.filter((p: NormalizedProp) => p.prop === selectedType);
  }, [allProps, selectedType]);

  const slipIds = useMemo(
    () => new Set((selections ?? []).map((s: any) => String(s.propId ?? s.id))),
    [selections],
  );

  const handleDateChange = (offset: number) => {
    const date = new Date(activeDate + 'T12:00:00Z');
    date.setDate(date.getDate() + offset);
    const newDateStr = date.toISOString().split('T')[0];
    router.push(`/bet-builder?league=${league}&date=${newDateStr}&season=${season}`);
  };

  const handleAddToSlip = useCallback((prop: NormalizedProp) => {
    const propId = String(prop.id);
    if (slipIds.has(propId)) {
      toast.error(`${prop.player} already in slip`);
      return;
    }
    addLeg({
      id:          propId,
      propId,
      player:      prop.player    ?? 'Unknown',
      prop:        prop.prop      ?? 'Prop',
      line:        prop.line      ?? 0,
      selection: (prop.overUnder as 'Over' | 'Under') || 'Over',
      // @ts-ignore - bestOdds might be dynamic from enrichment
      odds:        prop.bestOdds  ?? -110,
      matchup:     prop.matchup   ?? '',
      team:        prop.team      ?? '',
      week:        (prop as any).week,
      season:      prop.season,
      gameDate:    prop.gameDate  ?? new Date().toISOString(),
    });
    
    toast.success(`${prop.player} added to slip`);
  }, [addLeg, slipIds]);

  const firstProp = allProps[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111111] border border-white/5 p-6 rounded-[2rem] shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
            <Database className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-black italic tracking-tighter uppercase text-white">Prop Builder</h2>
            <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
              {loading ? 'Syncing...' : `${allProps.length} nodes available`}
              
              <span className="text-cyan-400 flex items-center gap-1.5 ml-2">
                <button onClick={() => handleDateChange(-1)} className="p-0.5 rounded-md hover:bg-white/10 transition-colors">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono">· {activeDate}</span>
                <button onClick={() => handleDateChange(1)} className="p-0.5 rounded-md hover:bg-white/10 transition-colors">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-8 h-8 rounded-xl bg-black border border-white/10 flex items-center justify-center font-black text-[9px] text-[#FFD700] italic shrink-0">
            {(firstProp?.league || league).slice(0, 3).toUpperCase()}
          </div>

          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 outline-none focus:border-cyan-500/50 transition-all appearance-none cursor-pointer min-w-[120px]"
          >
            {/* FIX: Ensure key and value are strings, not objects */}
            {propTypes.map((type: string) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          {(selections?.length ?? 0) > 0 && (
            <button
              onClick={() => clearSlip?.()}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all text-[9px] font-black uppercase"
            >
              <X className="h-3.5 w-3.5" />
              Clear ({selections.length})
            </button>
          )}

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

      <div className="min-h-[400px] bg-[#111111]/30 rounded-[2rem] border border-white/5 overflow-hidden">
        <PropsTable
          props={filteredProps}
          league={league}
          isLoading={loading && allProps.length === 0}
          onAddToBetSlip={handleAddToSlip}
          slipIds={slipIds}
        />
      </div>

      {hasMore && (
        <div className="flex justify-center pt-8 pb-12">
          <button
            onClick={() => loadMore()}
            disabled={loading}
            className="flex items-center gap-3 px-12 py-5 bg-[#111111] border border-white/10 rounded-2xl hover:border-cyan-500/40 hover:bg-[#161616] transition-all group"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Database className="h-5 w-5" />}
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
              {loading ? 'Accessing Ledger...' : 'Expand Data Pool'}
            </span>
          </button>
        </div>
      )}

      {showManual && (
        <ManualEntryModal isOpen={showManual} onClose={() => setShowManual(false)} onAddLeg={addLeg} />
      )}

      {showEnrich && (
        <EnrichModal
          isOpen={showEnrich}
          onClose={() => setShowEnrich(false)}
          onComplete={() => { refresh(); setShowEnrich(false); }}
          league={league as 'nba' | 'nfl'}
          // @ts-ignore - Field naming alignment
          defaultDate={activeDate}
          defaultSeason={season}
          defaultCollection="all"
        />
      )}
    </div>
  );
}