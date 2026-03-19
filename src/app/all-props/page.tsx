'use client';

import { useState, useMemo, useCallback } from 'react';
import { useBetSlip } from '@/hooks/useBetSlip';
import { useAllProps, NormalizedProp } from '@/hooks/useAllProps';
import { PropsTable } from '@/components/bets/PropsTable';
import { EnrichModal } from '@/components/bets/EnrichModal';
import { ManualEntryModal } from '@/components/bets/manual-entry-modal';
import { RefreshCw, Plus, Zap, Trophy, Basketball } from 'lucide-react';
import { toast } from 'sonner';

const SEASON_OPTIONS = [
  { label: 'All',     value: 'all'  },
  { label: '2024–25', value: '2024' },
  { label: '2025–26', value: '2025' },
];

const LEAGUES = [
  { id: 'nfl', label: 'NFL', icon: Trophy },
  { id: 'nba', label: 'NBA', icon: Zap }, // Using Zap or a Basketball icon if available
];

export default function AllPropsPage() {
  const [league, setLeague] = useState<'nfl' | 'nba'>('nfl');
  const [weekFilter, setWeekFilter] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('all');

  // Pass 'league' to the hook so the API knows which collection to query
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
      league:    league, // Ensure league carries over to the bet slip
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
    
    toast.success(`${prop.player} added to slip`, {
      style: { 
        background: '#0f1115', 
        border: `1px solid ${league === 'nba' ? 'rgba(249,115,22,0.2)' : 'rgba(34,211,238,0.2)'}`, 
        color: league === 'nba' ? '#fb923c' : '#22d3ee' 
      },
    });
  }, [addLeg, slipIds, league]);

  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
               <h1 className="text-2xl font-black tracking-tight text-foreground italic uppercase">
                {league} Historical Props
              </h1>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              {loading && props.length === 0
                ? 'Loading…'
                : `${props.length.toLocaleString()} ${league.toUpperCase()} props shown`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* League Switcher */}
            <div className="flex rounded-xl overflow-hidden border border-border bg-card p-1">
              {LEAGUES.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    setLeague(l.id as 'nfl' | 'nba');
                    setWeekFilter(''); // Reset week as it differs by sport
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                    league === l.id 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <l.icon className="h-3 w-3" />
                  {l.label}
                </button>
              ))}
            </div>

            {/* Week filter (Conditionally hide or label for NBA) */}
            <input
              type="number" 
              min={1} 
              max={league === 'nfl' ? 22 : 100} 
              placeholder={league === 'nfl' ? "Week #" : "Day #"} 
              value={weekFilter}
              onChange={e => setWeekFilter(e.target.value)}
              className="w-24 py-2 px-3 bg-card border border-border text-foreground text-xs font-mono rounded-xl outline-none focus:ring-1 focus:ring-primary/30"
            />

            {/* Season toggle */}
            <div className="flex rounded-xl overflow-hidden border border-border">
              {SEASON_OPTIONS.map(s => (
                <button key={s.value} onClick={() => setSeasonFilter(s.value)}
                  className={`px-2.5 py-2 text-[9px] font-black uppercase whitespace-nowrap transition-colors ${
                    seasonFilter === s.value ? 'bg-primary/20 text-primary' : 'bg-card text-muted-foreground hover:text-foreground'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Enrich Button (Passes current league context) */}
            <button onClick={() => setShowEnrich(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-xs font-black uppercase transition-colors">
              <Zap className="h-3.5 w-3.5" /> Enrich {league.toUpperCase()}
            </button>

            {/* Manual */}
            <button onClick={() => setShowManual(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground text-xs font-black uppercase transition-colors">
              <Plus className="h-3.5 w-3.5" /> Manual
            </button>

            {/* Refresh */}
            <button onClick={() => refresh()} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground text-xs font-black uppercase transition-colors disabled:opacity-40">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {/* Go to slip */}
            {(selections ?? []).length > 0 && isInitialized && (
              <a href="/parlay-studio"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase hover:bg-primary/90 transition-colors">
                Slip ({selections.length}) →
              </a>
            )}
          </div>
        </div>

        {/* Table - Needs to handle league-specific columns if needed */}
        <PropsTable
          props={props}
          league={league}
          isLoading={loading && props.length === 0}
          onAddToBetSlip={handleAddToSlip}
          onDelete={deleteProp}
          slipIds={slipIds}
        />

        {hasMore && (
          <div className="flex justify-center py-8">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-6 py-2 bg-card hover:bg-border text-foreground rounded-xl border border-border transition-all disabled:opacity-50"
            >
              {loading ? 'Loading More...' : 'Load More'}
            </button>
          </div>
        )}
      </div>

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
        defaultSeason={seasonFilter !== 'all' ? parseInt(seasonFilter) : 2025}
        defaultCollection={league === 'nba' ? 'nba_props' : 'nfl_props'}
      />
    </main>
  );
}