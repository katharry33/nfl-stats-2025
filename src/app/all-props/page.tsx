'use client';

import { useState, useMemo, useCallback } from 'react';
import { useBetSlip } from '@/hooks/useBetSlip';
import { useAllProps, NormalizedProp } from '@/hooks/useAllProps';
import { PropsTable } from '@/components/bets/PropsTable';
import { EnrichModal } from '@/components/bets/EnrichModal';
import { ManualEntryModal } from '@/components/bets/manual-entry-modal';
import { RefreshCw, Plus, Zap } from 'lucide-react';
import { toast } from 'sonner';

const SEASON_OPTIONS = [
  { label: 'All',     value: 'all'  },
  { label: '2024–25', value: '2024' },
  { label: '2025–26', value: '2025' },
];

export default function AllPropsPage() {
  const [weekFilter,   setWeekFilter]   = useState('');
  const [seasonFilter, setSeasonFilter] = useState('all');

  // Pass filters to the hook so the API is queried correctly
  const { props, loading, hasMore, loadMore, refresh, deleteProp } = useAllProps({
    week:   weekFilter   ? parseInt(weekFilter)   : undefined,
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
      style: { background: '#0f1115', border: '1px solid rgba(255,215,0,0.2)', color: '#FFD700' },
    });
  }, [addLeg, slipIds]);

  return (
    <main className="min-h-screen bg-[#060606] text-white p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white italic uppercase">Historical Props</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {loading && props.length === 0
                ? 'Loading…'
                : `${props.length.toLocaleString()} props shown`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Week filter */}
            <input
              type="number" min={1} max={22} placeholder="Week #" value={weekFilter}
              onChange={e => setWeekFilter(e.target.value)}
              className="w-20 py-2 px-3 bg-black/40 border border-white/[0.08] text-white text-xs font-mono rounded-xl outline-none focus:ring-1 focus:ring-[#FFD700]/30"
            />

            {/* Season toggle */}
            <div className="flex rounded-xl overflow-hidden border border-white/[0.08]">
              {SEASON_OPTIONS.map(s => (
                <button key={s.value} onClick={() => setSeasonFilter(s.value)}
                  className={`px-2.5 py-2 text-[9px] font-black uppercase whitespace-nowrap transition-colors ${
                    seasonFilter === s.value ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-black/40 text-zinc-600 hover:text-zinc-400'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Enrich */}
            <button onClick={() => setShowEnrich(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-xs font-black uppercase transition-colors">
              <Zap className="h-3.5 w-3.5" /> Enrich
            </button>

            {/* Manual */}
            <button onClick={() => setShowManual(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] text-zinc-500 hover:text-white text-xs font-black uppercase transition-colors">
              <Plus className="h-3.5 w-3.5" /> Manual
            </button>

            {/* Refresh */}
            <button onClick={() => refresh()} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] text-zinc-500 hover:text-white text-xs font-black uppercase transition-colors disabled:opacity-40">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {/* Go to slip */}
            {(selections ?? []).length > 0 && isInitialized && (
              <a href="/parlay-studio"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FFD700] text-black text-xs font-black uppercase hover:bg-[#e6c200] transition-colors">
                Slip ({selections.length}) →
              </a>
            )}
          </div>
        </div>

        {/* Table */}
        <PropsTable
          props={props}
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
              className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl border border-white/10 transition-all disabled:opacity-50"
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
          onAddLeg={addLeg}
        />
      )}

      <EnrichModal
        isOpen={showEnrich}
        onClose={() => setShowEnrich(false)}
        onComplete={() => refresh()}
        defaultWeek={weekFilter ? parseInt(weekFilter) : undefined}
        defaultSeason={seasonFilter !== 'all' ? parseInt(seasonFilter) : 2025}
        defaultCollection="all"
      />
    </main>
  );
}