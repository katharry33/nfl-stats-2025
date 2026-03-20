'use client';

import { useState, useMemo, useCallback } from 'react';
import { useBetSlip } from '@/hooks/useBetSlip';
import { useAllProps, NormalizedProp } from '@/hooks/useAllProps';
import { PropsTable } from '@/components/bets/PropsTable';
import { EnrichModal } from '@/components/bets/EnrichModal';
import { ManualEntryModal } from '@/components/bets/manual-entry-modal';
import { RefreshCw, Plus, Zap, Trophy, Loader2, Dribbble as Basketball } from 'lucide-react';
import { toast } from 'sonner';

const SEASON_OPTIONS = [
  { label: 'All',     value: 'all'  },
  { label: '2024–25', value: '2024' },
  { label: '2025–26', value: '2025' },
];

const LEAGUES = [
  { id: 'nfl', label: 'NFL', icon: Trophy, color: '#22d3ee' },
  { id: 'nba', label: 'NBA', icon: Basketball, color: '#fb923c' },
];

export default function AllPropsPage() {
  const [league, setLeague] = useState<'nfl' | 'nba'>('nfl');
  const [weekFilter, setWeekFilter] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('all');

  // Hook handles data fetching based on the active league
  const { props, loading, hasMore, loadMore, refresh, deleteProp } = useAllProps({
    league, 
    week:   weekFilter ? parseInt(weekFilter) : undefined,
    season: seasonFilter !== 'all' ? parseInt(seasonFilter) : undefined,
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
      id:        propId,
      propId,
      league:    league, 
      player:    prop.player    ?? 'Unknown',
      prop:      prop.prop      ?? 'Prop',
      line:      prop.line      ?? 0,
      selection: (prop.overUnder as 'Over' | 'Under') || 'Over',
      odds:      prop.bestOdds  ?? prop.odds ?? -110,
      matchup:   prop.matchup   ?? '',
      team:      prop.team      ?? '',
      week:      prop.week      ?? undefined,
      season:    prop.season    ?? undefined,
      gameDate:  prop.gameDate  ?? new Date().toISOString(),
    });
    
    const activeColor = LEAGUES.find(l => l.id === league)?.color;

    toast.success(`${prop.player} added to slip`, {
      style: { 
        background: '#0f1115', 
        border: `1px solid ${activeColor}33`, // 20% opacity hex
        color: activeColor 
      },
    });
  }, [addLeg, slipIds, league]);

  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-5">

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
               <h1 className="text-2xl font-black tracking-tight text-foreground italic uppercase">
                {league} <span style={{ color: LEAGUES.find(l => l.id === league)?.color }}>Historical</span> Props
              </h1>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
              {loading && props.length === 0
                ? 'Connecting to Engine...'
                // Use props?.length to safely check if it exists before calling toLocaleString()
: `${(props?.length || 0).toLocaleString()} Indexed ${league.toUpperCase()} Lines`}
                </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* League Switcher */}
            <div className="flex rounded-xl overflow-hidden border border-white/5 bg-black/40 p-1 backdrop-blur-md">
              {LEAGUES.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    setLeague(l.id as 'nfl' | 'nba');
                    setWeekFilter(''); 
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                    league === l.id 
                      ? 'bg-white/10 text-white shadow-xl' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <l.icon className="h-3.5 w-3.5" style={{ color: league === l.id ? l.color : 'inherit' }} />
                  {l.label}
                </button>
              ))}
            </div>

            {/* Contextual Filter (Week for NFL, Game Day for NBA) */}
            <div className="relative">
              <input
                type="number" 
                placeholder={league === 'nfl' ? "WEEK" : "DAY"} 
                value={weekFilter}
                onChange={e => setWeekFilter(e.target.value)}
                className="w-20 py-2.5 px-3 bg-black/40 border border-white/5 text-white text-[10px] font-black rounded-xl outline-none focus:border-primary/50 transition-all text-center placeholder:text-zinc-700"
              />
            </div>

            {/* Season Selector */}
            <div className="flex rounded-xl overflow-hidden border border-white/5 bg-black/20">
              {SEASON_OPTIONS.map(s => (
                <button 
                  key={s.value} 
                  onClick={() => setSeasonFilter(s.value)}
                  className={`px-3 py-2.5 text-[9px] font-black uppercase transition-colors ${
                    seasonFilter === s.value 
                    ? 'bg-white/5 text-primary' 
                    : 'text-zinc-600 hover:text-zinc-400'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>

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
            league={league}
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
          onAddLeg={(leg) => addLeg({ ...leg, league })}
        />
      )}

      <EnrichModal
        isOpen={showEnrich}
        onClose={() => setShowEnrich(false)}
        onComplete={() => refresh()}
        league={league}
        defaultWeek={weekFilter ? parseInt(weekFilter) : undefined}
        defaultSeason={seasonFilter === 'all' ? 2025 : parseInt(seasonFilter)}
        // Ensures the enrichment script targets the correct sport collection
        defaultCollection={league === 'nba' ? 'nba_props' : 'nfl_props'}
      />
    </main>
  );
}
