'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useBetSlip } from '@/context/betslip-context';
import { useAllProps, NormalizedProp } from '@/hooks/useAllProps';
import { PropsTable } from '@/components/bets/PropsTable';
import { BetSlipPanel } from '@/components/bets/BetSlipPanel';
import { EnrichModal } from '@/components/bets/EnrichModal';
import { ManualEntryModal } from '@/components/bets/manual-entry-modal';
import { RefreshCw, Plus, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const LEAGUES = [{ id: 'nfl', label: 'NFL' }, { id: 'nba', label: 'NBA' }] as const;
const PERSIST_KEY = 'sweetspot_allprops_filters_v2'; // bumped version clears stale cache

interface PersistedFilters {
  league: 'nfl' | 'nba';
  season: number;
  week:   string;
}

function loadFilters(): PersistedFilters {
  if (typeof window === 'undefined') return { league: 'nfl', season: 2025, week: '' };
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Default: NFL 2025, NO week filter — show all available data
  return { league: 'nfl', season: 2025, week: '' };
}

function saveFilters(f: PersistedFilters) {
  try { localStorage.setItem(PERSIST_KEY, JSON.stringify(f)); } catch {}
}

export default function AllPropsPage() {
  const initial = loadFilters();
  const [activeLeague, setActiveLeague] = useState<'nfl' | 'nba'>(initial.league);
  const [activeSeason, setActiveSeason] = useState<number>(initial.season);
  const [weekFilter,   setWeekFilter]   = useState<string>(initial.week);

  useEffect(() => {
    saveFilters({ league: activeLeague, season: activeSeason, week: weekFilter });
  }, [activeLeague, activeSeason, weekFilter]);

  const parsedWeek = weekFilter ? parseInt(weekFilter) : undefined;

  const { props, loading, hasMore, loadMore, refresh, deleteProp } = useAllProps({
    league: activeLeague,
    season: activeSeason,
    week:   parsedWeek,
  });

  const { selections, addLeg, removeLeg, clearSlip } = useBetSlip();
  const [showManual, setShowManual] = useState(false);
  const [showEnrich, setShowEnrich] = useState(false);

  const slipIds = useMemo(
    () => new Set((selections ?? []).map((s: any) => String(s.propId ?? s.id))),
    [selections],
  );

  const showSlip = (selections?.length ?? 0) > 0;

  const handleLeagueChange = (id: 'nfl' | 'nba') => {
    setActiveLeague(id);
    setWeekFilter(''); // reset week when switching league
  };

  const handleAddToSlip = useCallback((prop: NormalizedProp) => {
    const propId = String(prop.id);
    if (slipIds.has(propId)) { toast.error(`${prop.player} already in slip`); return; }
    addLeg({
      id: propId, propId, league: activeLeague,
      player:    prop.player   ?? 'Unknown',
      prop:      prop.prop     ?? 'Prop',
      line:      prop.line     ?? 0,
      selection: (prop.overUnder as 'Over' | 'Under') || 'Over',
      odds:      prop.bestOdds ?? prop.odds ?? -110,
      matchup:   prop.matchup  ?? '',
      team:      prop.team     ?? '',
      week:      prop.week     ?? undefined,
      season:    prop.season   ?? undefined,
      gameDate:  prop.gameDate ?? new Date().toISOString(),
    });
    toast.success(`${prop.player} added to slip`);
  }, [addLeg, slipIds, activeLeague]);

  const weekOptions = useMemo(() => {
    const max = activeLeague === 'nfl' ? 22 : 30;
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [activeLeague]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {activeLeague.toUpperCase()} Historical Props
              </h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {loading && props.length === 0
                  ? 'Loading…'
                  : `${props.length.toLocaleString()} props loaded`
                  + (weekFilter ? ` · Week ${weekFilter}` : ' · All weeks')
                  + ` · ${activeSeason}`}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* League */}
              <div className="flex rounded-lg overflow-hidden border border-border">
                {LEAGUES.map(l => (
                  <button key={l.id} onClick={() => handleLeagueChange(l.id)}
                    className={`px-4 py-2 text-xs font-semibold uppercase transition-colors ${
                      activeLeague === l.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-muted-foreground hover:text-foreground'
                    }`}>
                    {l.label}
                  </button>
                ))}
              </div>

              {/* Week dropdown — defaults to All Weeks */}
              <select value={weekFilter} onChange={e => setWeekFilter(e.target.value)}
                className="bg-card border border-border text-foreground text-xs rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary/30">
                <option value="">All Weeks</option>
                {weekOptions.map(w => (
                  <option key={w} value={String(w)}>
                    {activeLeague === 'nfl' ? `Week ${w}` : `Day ${w}`}
                  </option>
                ))}
              </select>

              {/* Season */}
              <select value={activeSeason} onChange={e => setActiveSeason(Number(e.target.value))}
                className="bg-card border border-border text-foreground text-xs rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary/30">
                <option value={2025}>2025–26</option>
                <option value={2024}>2024–25</option>
              </select>

              <div className="w-px h-6 bg-border" />

              <button onClick={() => setShowEnrich(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-edge/10 border border-edge/20 text-edge hover:bg-edge/15 text-xs font-medium transition-colors">
                <Zap className="h-3.5 w-3.5" /> Enrich
              </button>

              <button onClick={() => setShowManual(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground text-xs font-medium transition-colors">
                <Plus className="h-3.5 w-3.5" /> Manual
              </button>

              <button onClick={() => refresh()} disabled={loading}
                className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <PropsTable
              props={props}
              league={activeLeague}
              isLoading={loading && props.length === 0}
              onAddToBetSlip={handleAddToSlip}
              onDelete={deleteProp}
              slipIds={slipIds}
            />
          </div>

          {hasMore && !loading && (
            <div className="flex justify-center py-6">
              <button onClick={loadMore}
                className="px-6 py-2.5 bg-card border border-border hover:bg-secondary text-foreground text-xs font-semibold rounded-lg transition-colors">
                Load next 50
              </button>
            </div>
          )}

          {loading && props.length > 0 && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Bet Slip sidebar */}
        <div className={`hidden lg:flex flex-col border-l border-border transition-all duration-300 overflow-hidden ${showSlip ? 'w-72' : 'w-0 border-l-0'}`}>
          {showSlip && (
            <BetSlipPanel
              selections={selections ?? []}
              onRemove={removeLeg}
              onClear={clearSlip}
              week={parsedWeek || 0}
            />
          )}
        </div>
      </div>

      {showManual && (
        <ManualEntryModal
          isOpen={showManual}
          onClose={() => setShowManual(false)}
          onAddLeg={(leg: any) => addLeg({ ...leg, league: activeLeague })}
        />
      )}

      <EnrichModal
        isOpen={showEnrich}
        onClose={() => setShowEnrich(false)}
        onComplete={() => refresh()}
        league={activeLeague}
        defaultWeek={parsedWeek}
        defaultSeason={activeSeason}
        defaultCollection={activeLeague === 'nba' ? 'nba_props' : 'nfl_props'}
      />
    </main>
  );
}