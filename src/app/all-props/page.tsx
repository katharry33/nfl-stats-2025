'use client';

import { useState, useMemo, useCallback } from 'react';
import { useBetSlip } from '@/hooks/useBetSlip';
import { useAllProps, NormalizedProp } from '@/hooks/useAllProps';
import { PropsTable } from '@/components/bets/PropsTable';
import { EnrichModal } from '@/components/bets/EnrichModal';
import { ManualEntryModal } from '@/components/bets/manual-entry-modal';
import { RefreshCw, Plus, Zap, Trophy, Loader2, Dribbble as Basketball } from 'lucide-react';
import { toast } from 'sonner';

const LEAGUES = [
  { id: 'nfl', label: 'NFL', icon: Trophy, color: '#22d3ee' },
  { id: 'nba', label: 'NBA', icon: Basketball, color: '#fb923c' },
];

export default function AllPropsPage() {
  const [activeLeague, setActiveLeague] = useState<'nfl' | 'nba'>('nfl');
  const [activeSeason, setActiveSeason] = useState<number>(2025);
  const [weekFilter, setWeekFilter] = useState('');

  // Hook handles data fetching based on the active league
  const { props, loading, hasMore, loadMore, refresh, deleteProp } = useAllProps({
    league: activeLeague,
    season: activeSeason,
    week: weekFilter ? parseInt(weekFilter) : undefined,
  });

  const { selections, addLeg, isInitialized } = useBetSlip();
  const [showManual, setShowManual] = useState(false);
  const [showEnrich, setShowEnrich] = useState(false);

  const slipIds = useMemo(
    () => new Set((selections ?? []).map((s: any) => String(s.propId ?? s.id))),
    [selections]
  );

  const handleAddToSlip = useCallback((prop: NormalizedProp) => {
    const propId = String(prop.id);
    if (slipIds.has(propId)) {
      toast.error(`${prop.player} already in slip`);
      return;
    }
    
    addLeg({
      id: propId,
      propId,
      league: activeLeague, 
      player: prop.player ?? 'Unknown',
      prop: prop.prop ?? 'Prop',
      line: prop.line ?? 0,
      selection: (prop.overUnder as 'Over' | 'Under') || 'Over',
      odds: prop.bestOdds ?? prop.odds ?? -110,
      matchup: prop.matchup ?? '',
      team: prop.team ?? '',
      week: prop.week ?? undefined,
      season: prop.season ?? undefined,
      gameDate: prop.gameDate ?? new Date().toISOString(),
    });
    
    const activeColor = LEAGUES.find(l => l.id === activeLeague)?.color;

    toast.success(`${prop.player} added to slip`, {
      style: { 
        background: '#0f1115', 
        border: `1px solid ${activeColor}33`,
        color: activeColor 
      },
    });
  }, [addLeg, slipIds, activeLeague]);

  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-5">

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
               <h1 className="text-2xl font-black tracking-tight text-foreground italic uppercase">
                {activeLeague} <span style={{ color: LEAGUES.find(l => l.id === activeLeague)?.color }}>Historical</span> Props
              </h1>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
              {loading && props.length === 0
                ? 'Connecting to Engine...'
                : `${(props?.length || 0).toLocaleString()} Indexed ${activeLeague.toUpperCase()} Lines`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* League Switcher */}
            <div className="flex rounded-xl overflow-hidden border border-white/5 bg-black/40 p-1 backdrop-blur-md">
              {LEAGUES.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    setActiveLeague(l.id as 'nfl' | 'nba');
                    setWeekFilter(''); 
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                    activeLeague === l.id 
                      ? 'bg-white/10 text-white shadow-xl' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <l.icon className="h-3.5 w-3.5" style={{ color: activeLeague === l.id ? l.color : 'inherit' }} />
                  {l.label}
                </button>
              ))}
            </div>

            {/* Contextual Filter (Week for NFL, Game Day for NBA) */}
            <div className="relative">
              <input
                type="number" 
                placeholder={activeLeague === 'nfl' ? "WEEK" : "DAY"} 
                value={weekFilter}
                onChange={e => setWeekFilter(e.target.value)}
                className="w-20 py-2.5 px-3 bg-black/40 border border-white/5 text-white text-[10px] font-black rounded-xl outline-none focus:border-primary/50 transition-all text-center placeholder:text-zinc-700"
              />
            </div>

            {/* Season Selector */}
            <select 
              value={activeSeason} 
              onChange={(e) => setActiveSeason(Number(e.target.value))}
              className="bg-black/40 border border-white/5 text-white text-[10px] font-black rounded-xl outline-none focus:border-primary/50 transition-all px-3 py-2.5"
            >
              <option value={2025}>2025 Season</option>
              <option value={2024}>2024 Season</option>
            </select>

            <div className="h-8 w-[1px] bg-white/5 mx-1" />

            {/* Action Buttons */}
            <button 
              onClick={() => setShowEnrich(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-[10px] font-black uppercase transition-all group"
            >
              <Zap className="h-3.5 w-3.5 group-hover:fill-current" /> 
              Enrich
            </button>

            <button 
              onClick={() => refresh()} 
              disabled={loading}
              className="p-2.5 rounded-xl border border-white/5 text-zinc-500 hover:text-white transition-all disabled:opacity-20"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* The Data Table */}
        <div className="bg-card/30 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl">
          <PropsTable
            props={props}
            league={activeLeague}
            isLoading={loading && props.length === 0}
            onAddToBetSlip={handleAddToSlip}
            onDelete={deleteProp}
            slipIds={slipIds}
          />
        </div>

        {hasMore && (
          <div className="flex justify-center py-12">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/5 transition-all flex items-center gap-3"
            >
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              Load More Prop Data
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showManual && (
        <ManualEntryModal
          isOpen={showManual}
          onClose={() => setShowManual(false)}
          onAddLeg={(leg) => addLeg({ ...leg, league: activeLeague })}
        />
      )}

      <EnrichModal
        isOpen={showEnrich}
        onClose={() => setShowEnrich(false)}
        onComplete={() => refresh()}
        league={activeLeague}
        defaultWeek={weekFilter ? parseInt(weekFilter) : undefined}
        defaultSeason={activeSeason}
        defaultCollection={activeLeague === 'nba' ? 'nba_props' : 'nfl_props'}
      />
    </main>
  );
}
