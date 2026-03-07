'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useBetSlip } from '@/context/betslip-context';
import { useAllProps } from '@/hooks/useAllProps';
import type { NormalizedProp } from '@/hooks/useAllProps';
import { PropsTable } from '@/components/props/props-table';
import { ManualEntryModal } from '@/components/bets/manual-entry-modal';
import { useDebounce } from '@/hooks/use-debounce';
import {
  Search, RefreshCw, Loader2, Plus, LayoutGrid, TableIcon,
  ChevronLeft, ChevronRight, X, Filter,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── PropCard (existing card view) ───────────────────────────────────────────
function PropCard({ prop, onAdd, inSlip }: {
  prop: NormalizedProp; onAdd: (p: NormalizedProp) => void; inSlip: boolean;
}) {
  const hasResult = prop.actualResult !== null && prop.actualResult !== '';
  const resultNum = hasResult ? parseFloat(String(prop.actualResult)) : null;
  const hit = resultNum != null && !isNaN(resultNum)
    ? prop.overUnder?.toLowerCase() === 'over' ? resultNum > prop.line : resultNum < prop.line
    : null;

  return (
    <div className={`bg-[#0f1115] border rounded-2xl p-4 flex flex-col gap-3 transition-colors hover:border-white/10
      ${inSlip ? 'border-[#FFD700]/30' : 'border-white/[0.06]'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-white font-black text-sm italic uppercase truncate">{prop.player}</p>
          <p className="text-zinc-500 text-[10px] font-mono">{prop.matchup || '—'}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {prop.week != null && (
            <span className="text-[9px] text-zinc-600 font-mono">WK{prop.week}</span>
          )}
          {prop.team && (
            <span className="text-[9px] text-[#FFD700] font-black uppercase bg-[#FFD700]/10 px-1.5 py-0.5 rounded">
              {prop.team}
            </span>
          )}
        </div>
      </div>

      {/* Prop + line */}
      <div className="flex items-center gap-2">
        <span className="text-zinc-500 text-xs">{prop.prop}</span>
        <span className="text-white font-mono font-bold text-sm">{prop.line}</span>
        <span className={`text-xs font-black uppercase ${
          prop.overUnder?.toLowerCase() === 'over' ? 'text-blue-400' : 'text-orange-400'
        }`}>{prop.overUnder || '—'}</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {prop.playerAvg != null && (
          <div className="bg-black/30 rounded-xl p-2 text-center">
            <p className="text-[8px] text-zinc-700 uppercase font-black">Avg</p>
            <p className="text-zinc-300 font-mono text-xs font-bold">{Number(prop.playerAvg).toFixed(1)}</p>
          </div>
        )}
        {prop.seasonHitPct != null && (
          <div className="bg-black/30 rounded-xl p-2 text-center">
            <p className="text-[8px] text-zinc-700 uppercase font-black">Hit%</p>
            <p className={`font-mono text-xs font-bold ${
              Number(prop.seasonHitPct) >= 60 ? 'text-emerald-400' :
              Number(prop.seasonHitPct) >= 50 ? 'text-[#FFD700]' : 'text-red-400'
            }`}>{Number(prop.seasonHitPct).toFixed(0)}%</p>
          </div>
        )}
        {prop.confidenceScore != null && (
          <div className="bg-black/30 rounded-xl p-2 text-center">
            <p className="text-[8px] text-zinc-700 uppercase font-black">Conf</p>
            <p className="text-zinc-300 font-mono text-xs font-bold">{Number(prop.confidenceScore).toFixed(1)}</p>
          </div>
        )}
      </div>

      {/* Result */}
      {hasResult && (
        <div className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold ${
          hit === true  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
          hit === false ? 'bg-red-500/10 border-red-500/20 text-red-400' :
          'bg-white/[0.03] border-white/[0.06] text-zinc-400'
        }`}>
          <span>Result</span>
          <span className="font-mono">{prop.actualResult}{hit != null ? (hit ? ' ✓' : ' ✗') : ''}</span>
        </div>
      )}

      {/* Add to slip */}
      <button
        onClick={() => onAdd(prop)}
        disabled={inSlip}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${
          inSlip
            ? 'bg-[#FFD700]/20 border border-[#FFD700]/30 text-[#FFD700]/60 cursor-not-allowed'
            : 'bg-[#FFD700] hover:bg-[#e6c200] text-black'
        }`}>
        <Plus className="h-3.5 w-3.5" />
        {inSlip ? 'In Slip' : 'Add to Slip'}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ViewMode = 'cards' | 'table';

const SEASON_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: '2024–25', value: '2024' },
  { label: '2025–26', value: '2025' },
];

export default function AllPropsPage() {
  const { allProps, propTypes, loading, error, cacheAge, fetchProps, deleteProp, totalCount } = useAllProps();
  const { selections, addLeg, isInitialized } = useBetSlip();

  const [view,          setView]          = useState<ViewMode>('cards');
  const [playerSearch,  setPlayerSearch]  = useState('');
  const [propFilter,    setPropFilter]    = useState('');
  const [weekFilter,    setWeekFilter]    = useState('');
  const [seasonFilter,  setSeasonFilter]  = useState('all');
  const [showManual,    setShowManual]    = useState(false);

  // Cards pagination
  const [cardPage, setCardPage] = useState(0);
  const CARDS_PER_PAGE = 48;

  const debouncedPlayer = useDebounce(playerSearch, 300);

  // Initial load — uses module-level cache if fresh
  const hasLoaded = useRef(false);
  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      fetchProps();
    }
  }, [fetchProps]);

  // Reset card page when filters change
  useEffect(() => { setCardPage(0); }, [debouncedPlayer, propFilter, weekFilter, seasonFilter]);

  // Client-side filtering on top of the server-returned set
  const filtered = useMemo(() => {
    let list = allProps;
    if (debouncedPlayer) {
      const lp = debouncedPlayer.toLowerCase();
      list = list.filter(p => p.player.toLowerCase().includes(lp));
    }
    if (propFilter) {
      list = list.filter(p => p.prop.toLowerCase().includes(propFilter.toLowerCase()));
    }
    if (weekFilter) {
      const wn = parseInt(weekFilter);
      if (!isNaN(wn)) list = list.filter(p => p.week === wn);
    }
    if (seasonFilter !== 'all') {
      const sn = parseInt(seasonFilter);
      list = list.filter(p => p.season === sn);
    }
    return list;
  }, [allProps, debouncedPlayer, propFilter, weekFilter, seasonFilter]);

  const cardPages  = Math.ceil(filtered.length / CARDS_PER_PAGE);
  const cardSlice  = filtered.slice(cardPage * CARDS_PER_PAGE, (cardPage + 1) * CARDS_PER_PAGE);

  const slipIds = useMemo(() => new Set(selections.map((s: any) => s.propId ?? s.id)), [selections]);

  const handleAddToSlip = useCallback((prop: NormalizedProp) => {
    const propId = `${prop.id}`;
    if (slipIds.has(propId)) {
      toast(`${prop.player} already in slip`);
      return;
    }
    addLeg({
      id:        propId,
      propId,
      player:    prop.player,
      prop:      prop.prop,
      line:      prop.line,
      selection: prop.overUnder || 'Over',
      odds:      -110,
      matchup:   prop.matchup,
      team:      prop.team,
      week:      prop.week ?? undefined,
      season:    prop.season ?? undefined,
      gameDate:  prop.gameDate ?? new Date().toISOString(),
      status:    'pending',
    });
    toast.success(`${prop.player} added to slip`, {
      style: { background: '#0f1115', border: '1px solid rgba(255,215,0,0.2)', color: '#FFD700' },
    });
  }, [addLeg, slipIds]);

  const activeFilterCount = [playerSearch, propFilter, weekFilter, seasonFilter !== 'all'].filter(Boolean).length;

  return (
    <main className="min-h-screen bg-[#060606] text-white p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-5">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white italic uppercase">Historical Props</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {loading
                ? 'Loading…'
                : `${filtered.length.toLocaleString()} of ${totalCount.toLocaleString()} props`}
              {cacheAge != null && !loading && (
                <span className="text-zinc-700 ml-2 text-[10px] font-mono">cache {cacheAge}s</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-xl overflow-hidden border border-white/[0.08]">
              <button onClick={() => setView('cards')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-black uppercase transition-colors ${
                  view === 'cards' ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-black/40 text-zinc-600 hover:text-zinc-400'
                }`}>
                <LayoutGrid className="h-3.5 w-3.5" />Cards
              </button>
              <button onClick={() => setView('table')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-black uppercase transition-colors border-l border-white/[0.08] ${
                  view === 'table' ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-black/40 text-zinc-600 hover:text-zinc-400'
                }`}>
                <TableIcon className="h-3.5 w-3.5" />Table
              </button>
            </div>

            <button onClick={() => setShowManual(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] text-zinc-500 hover:text-white text-xs font-black uppercase transition-colors">
              <Plus className="h-3.5 w-3.5" /> Manual
            </button>

            <button onClick={() => fetchProps(true)} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] text-zinc-500 hover:text-white text-xs font-black uppercase transition-colors disabled:opacity-40">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Filters (shared between both views) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
          {/* Player search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
            <input
              placeholder="Search player…"
              value={playerSearch}
              onChange={e => setPlayerSearch(e.target.value)}
              className="pl-9 pr-8 py-2 w-48 bg-black/40 border border-white/[0.08] text-white text-xs font-mono rounded-xl outline-none focus:ring-1 focus:ring-[#FFD700]/30 placeholder:text-zinc-700"
            />
            {playerSearch && (
              <button onClick={() => setPlayerSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Prop type */}
          <select
            value={propFilter}
            onChange={e => setPropFilter(e.target.value)}
            className="py-2 px-3 bg-black/40 border border-white/[0.08] text-zinc-300 text-xs font-mono rounded-xl outline-none focus:ring-1 focus:ring-[#FFD700]/30">
            <option value="">All Props</option>
            {propTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {/* Week */}
          <input
            type="number" min={1} max={22} placeholder="Week #" value={weekFilter}
            onChange={e => setWeekFilter(e.target.value)}
            className="w-20 py-2 px-3 bg-black/40 border border-white/[0.08] text-white text-xs font-mono rounded-xl outline-none focus:ring-1 focus:ring-[#FFD700]/30"
          />

          {/* Season */}
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

          {activeFilterCount > 0 && (
            <button onClick={() => { setPlayerSearch(''); setPropFilter(''); setWeekFilter(''); setSeasonFilter('all'); }}
              className="flex items-center gap-1 text-[9px] text-zinc-600 hover:text-white font-black uppercase transition-colors">
              <X className="h-3 w-3" /> Clear all
            </button>
          )}

          {/* Slip count */}
          {selections.length > 0 && (
            <a href="/parlay-studio"
              className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FFD700] text-black text-xs font-black uppercase hover:bg-[#e6c200] transition-colors">
              Slip ({selections.length}) →
            </a>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => fetchProps(true)} className="text-red-400 hover:text-red-300 font-black text-xs">Retry</button>
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-zinc-600">
            <Loader2 className="h-6 w-6 animate-spin mr-3" />
            <span className="text-sm font-black uppercase italic">Loading props…</span>
          </div>
        )}

        {/* ── Table view ── */}
        {!loading && view === 'table' && (
          <PropsTable
            props={filtered}
            loading={loading}
            onAddToSlip={handleAddToSlip}
            onDelete={deleteProp}
            slipIds={slipIds}
          />
        )}

        {/* ── Cards view ── */}
        {!loading && view === 'cards' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {cardSlice.map(prop => (
                <PropCard
                  key={prop.id}
                  prop={prop}
                  onAdd={handleAddToSlip}
                  inSlip={slipIds.has(prop.id)}
                />
              ))}
            </div>

            {cardSlice.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-700">
                <Filter className="h-10 w-10 mb-3" />
                <p className="text-sm font-black uppercase italic">No props match filters</p>
              </div>
            )}

            {/* Card pagination */}
            {cardPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <button onClick={() => setCardPage(p => Math.max(0, p - 1))} disabled={cardPage === 0}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl border border-white/[0.08] text-zinc-500 hover:text-white text-xs font-black uppercase disabled:opacity-30 transition-colors">
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                <span className="text-zinc-600 text-[10px] font-mono">
                  {cardPage * CARDS_PER_PAGE + 1}–{Math.min((cardPage + 1) * CARDS_PER_PAGE, filtered.length)} of {filtered.length.toLocaleString()}
                </span>
                <button onClick={() => setCardPage(p => Math.min(cardPages - 1, p + 1))} disabled={cardPage === cardPages - 1}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl border border-white/[0.08] text-zinc-500 hover:text-white text-xs font-black uppercase disabled:opacity-30 transition-colors">
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showManual && (
        <ManualEntryModal
          isOpen={showManual}
          onClose={() => setShowManual(false)}
          onAddLeg={addLeg}
        />
      )}
    </main>
  );
}