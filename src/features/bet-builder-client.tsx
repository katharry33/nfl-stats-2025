'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useBetSlip } from '@/hooks/useBetSlip';
import { useAllProps, NormalizedProp } from '@/hooks/useAllProps';
import { PropsTable } from '@/components/bets/PropsTable';
import { EnrichModal } from '@/components/bets/EnrichModal';
import { ManualEntryModal } from '@/components/bets/manual-entry-modal';
import { SyncPropsButton } from '@/components/bets/SyncPropsButton';
import {
  RefreshCw, Plus, Zap, Loader2, Database,
  X, ChevronLeft, ChevronRight, Trophy, Filter,
} from 'lucide-react';
import { toast } from 'sonner';

const THEME = {
  nfl: { accent: '#22c55e', accentBg: 'rgba(34,197,94,0.08)', accentBorder: 'rgba(34,197,94,0.18)', label: 'NFL', icon: '🏈' },
  nba: { accent: '#f97316', accentBg: 'rgba(249,115,22,0.08)', accentBorder: 'rgba(249,115,22,0.18)', label: 'NBA', icon: '🏀' },
} as const;

// ... (Keep PostGameModal and StaleBanner as they were) ...

export default function BetBuilderClient({
  initialDate,
  season = 2025,
  league = 'nba',
}: { initialDate?: string; season?: number; league?: 'nfl' | 'nba' }) {
  const router = useRouter();

  // ✅ FIX: Use local-safe date instead of ISO to avoid timezone shifts
  const activeDate = useMemo(() => {
    if (initialDate) return initialDate;
    return new Date().toLocaleDateString('en-CA'); 
  }, [initialDate]);

  const {
    props: allProps = [],
    loading, error, hasMore, loadMore, refresh,
  } = useAllProps({ league, date: activeDate, season: String(season) });

  const { selections, addLeg } = useBetSlip();
  const [showManual, setShowManual] = useState(false);
  const [showEnrich, setShowEnrich] = useState(false);
  const [showPostGame, setShowPostGame] = useState(false);
  const [selectedType, setSelectedType] = useState('All');
  const [enrichedOnly, setEnrichedOnly] = useState(false);
  const [staleDate, setStaleDate] = useState<string | null>(null);

  const theme = THEME[league] ?? THEME.nba;

  const propTypes = useMemo(() => {
    const types = new Set(allProps.map((p: any) => p.prop).filter((v: any) => !!v));
    return ['All', ...Array.from(types).sort()];
  }, [allProps]);

  const filteredProps = useMemo(() => {
    let result = [...allProps]; // Create a copy to avoid mutating state
    
    if (enrichedOnly) result = result.filter((p) => p.confidenceScore != null);
    if (selectedType !== 'All') result = result.filter((p) => p.prop === selectedType);
  
    // 🔥 NEW: Sort by Edge Percentage if it exists
    result.sort((a, b) => (b.bestEdgePct || 0) - (a.bestEdgePct || 0));
  
    return result;
  }, [allProps, selectedType, enrichedOnly]);

  const slipIds = useMemo(() => new Set((selections ?? []).map((s: any) => String(s.propId ?? s.id))), [selections]);

  const handleDateChange = (offset: number) => {
    const d = new Date(activeDate + 'T12:00:00Z');
    d.setDate(d.getDate() + offset);
    const newDate = d.toISOString().split('T')[0];
    router.push(`/bet-builder?league=${league}&date=${newDate}&season=${season}`);
  };

  const handleAddToSlip = useCallback((prop: NormalizedProp) => {
    const propId = String(prop.id);
    if (slipIds.has(propId)) { toast.error(`${prop.player} already in slip`); return; }
    addLeg({
      id: propId, propId,
      player: prop.player ?? 'Unknown',
      prop: prop.prop ?? 'Prop',
      line: prop.line ?? 0,
      selection: (prop.overUnder as any) || 'Over',
      season: prop.season ?? season,
      gameDate: prop.gameDate ?? activeDate,
      odds: prop.bestOdds ?? -110,
      matchup: prop.matchup ?? '',
      team: prop.team ?? '',
      league,
    });
    toast.success(`${prop.player} added to slip`);
  }, [addLeg, slipIds, league, season, activeDate]);

  const yesterday = useMemo(() => {
    const d = new Date(activeDate + 'T12:00:00Z');
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, [activeDate]);

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center border text-2xl bg-white/5">{theme.icon}</div>
          <div>
            <h2 className="text-xl font-black italic tracking-tighter uppercase" style={{ color: theme.accent }}>{theme.label} Props</h2>
            <div className="text-slate-500 text-[10px] font-black uppercase flex items-center gap-2 mt-0.5">
              <button onClick={() => handleDateChange(-1)}><ChevronLeft size={12}/></button>
              <span className="font-mono text-white">{activeDate}</span>
              <button onClick={() => handleDateChange(1)}><ChevronRight size={12}/></button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* ✅ Connects to your fixed API */}
          <SyncPropsButton league={league} date={activeDate} onComplete={() => refresh()} />
          
          <button onClick={() => setShowEnrich(true)} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[9px] font-black uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Zap size={14} fill="currentColor" /> Enrich
          </button>
          
          <button onClick={() => setShowPostGame(true)} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[9px] font-black uppercase border border-white/10 text-slate-400">
            <Trophy size={14} /> Post-Game
          </button>

          <button onClick={() => refresh()} className="p-2.5 bg-white/5 rounded-xl">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <PropsTable props={filteredProps} league={league} isLoading={loading} onAddToBetSlip={handleAddToSlip} slipIds={slipIds} />

      {showEnrich && <EnrichModal isOpen={showEnrich} onClose={() => setShowEnrich(false)} onComplete={() => { refresh(); setShowEnrich(false); }} league={league} defaultDate={activeDate} defaultSeason={season} defaultCollection="all" />}
      {showPostGame && <PostGameModal date={yesterday} season={season} league={league} onClose={() => setShowPostGame(false)} onComplete={() => refresh()} />}
    </div>
  );
}
