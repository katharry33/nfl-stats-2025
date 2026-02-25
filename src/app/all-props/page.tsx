'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, ChevronDown, Loader2, X, Check, ShoppingCart, AlertCircle, RefreshCw } from 'lucide-react';
import { useBetSlip } from '@/context/betslip-context';
import { ManualEntryModal } from '@/components/bets/manual-entry-modal';
import { HistoricalBetSlip } from '@/components/bets/historical-betslip';

// ── Static filter options ─────────────────────────────────────────────────────

const PROP_TYPES = [
  'Passing Yards',
  'Pass Attempts',
  'Pass TDs',
  'Completions',
  'Interceptions',
  'Rush Yards',
  'Rush Attempts',
  'Receptions',
  'Receiving Yards',
  'Rush TDs',
  'Rec TDs',
  'Pass + Rush Yards',
  'Rush + Rec Yards',
];

const WEEKS = Array.from({ length: 22 }, (_, i) => i + 1);

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtLine(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—';
  return n.toFixed(1);
}

function fmtDate(raw: string | null | undefined): string {
  if (!raw) return '—';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  } catch { return '—'; }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AllPropsPage() {
  const { addLeg, selections } = useBetSlip();

  // Data state
  const [legs,        setLegs]        = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(false);
  const [nextCursor,  setNextCursor]  = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);

  // Pending input state (not yet submitted)
  const [playerInput, setPlayerInput] = useState('');
  const [weekInput,   setWeekInput]   = useState('');
  const [propInput,   setPropInput]   = useState('');

  // Applied (submitted) filter state
  const [appliedPlayer, setAppliedPlayer] = useState('');
  const [appliedWeek,   setAppliedWeek]   = useState('');
  const [appliedProp,   setAppliedProp]   = useState('');

  const [manualOpen, setManualOpen] = useState(false);
  const [slipIds,    setSlipIds]    = useState<Set<string>>(new Set());

  const playerRef = useRef<HTMLInputElement>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchLegs = useCallback(async (opts: {
    append?: boolean;
    player?: string;
    week?: string;
    prop?: string;
    cursor?: string | null;
  } = {}) => {
    const {
      append = false,
      player = '',
      week   = '',
      prop   = '',
      cursor = null,
    } = opts;

    if (!append) { setLoading(true); setError(null); }
    else           setLoadingMore(true);

    try {
      const params = new URLSearchParams({ limit: '50' });
      if (player)                    params.set('player', player);
      if (week && week !== 'all')    params.set('week',   week);
      if (prop  && prop  !== 'all')  params.set('prop',   prop);
      if (cursor)                    params.set('cursor', cursor);

      const res  = await fetch(`/api/all-props?${params}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      console.log('📊 all-props debug:', data.debug);

      const incoming: any[] = Array.isArray(data.props) ? data.props : [];
      setLegs(prev => append ? [...prev, ...incoming] : incoming);
      setHasMore(data.hasMore    ?? false);
      setNextCursor(data.nextCursor ?? null);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load props');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load — no filters
  useEffect(() => {
    fetchLegs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Search actions ────────────────────────────────────────────────────────

  const applySearch = useCallback(() => {
    setLegs([]);
    setNextCursor(null);
    setHasMore(false);
    setAppliedPlayer(playerInput);
    setAppliedWeek(weekInput);
    setAppliedProp(propInput);
    fetchLegs({ player: playerInput, week: weekInput, prop: propInput, cursor: null });
  }, [playerInput, weekInput, propInput, fetchLegs]);

  const clearFilters = useCallback(() => {
    setPlayerInput('');
    setWeekInput('');
    setPropInput('');
    setAppliedPlayer('');
    setAppliedWeek('');
    setAppliedProp('');
    setLegs([]);
    setNextCursor(null);
    fetchLegs({ player: '', week: '', prop: '', cursor: null });
    setTimeout(() => playerRef.current?.focus(), 50);
  }, [fetchLegs]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') applySearch();
  };

  // ── Bet slip ──────────────────────────────────────────────────────────────

  const toggleSlip = useCallback((leg: any) => {
    const inSlip = slipIds.has(leg.id);
    setSlipIds(prev => {
      const next = new Set(prev);
      inSlip ? next.delete(leg.id) : next.add(leg.id);
      return next;
    });
    if (!inSlip) {
      addLeg({
        id:       leg.id,
        player:   leg.player,
        team:     leg.team    ?? '',
        prop:     leg.prop,
        line:     leg.line,
        selection:'Over',
        odds:     leg.odds    ?? -110,
        matchup:  leg.matchup,
        week:     leg.week    ?? undefined,
        gameDate: leg.gameDate ?? '',
        status:   'pending',
      });
    }
  }, [slipIds, addLeg]);

  const hasFilters     = playerInput || weekInput || propInput;
  const filtersApplied = appliedPlayer || appliedWeek || appliedProp;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 pt-8 pb-20 space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Historical Props</h1>
              <p className="text-sm text-slate-500 mt-1">
                {loading
                  ? 'Loading…'
                  : `${legs.length.toLocaleString()} legs loaded`}
                {slipIds.size > 0 && (
                  <span className="ml-3 inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <ShoppingCart className="h-3 w-3" />
                    {slipIds.size} in bet slip
                  </span>
                )}
              </p>
            </div>

            <button
              onClick={() => setManualOpen(true)}
              className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-sm transition-colors shadow-lg shadow-emerald-900/30"
            >
              <Plus className="h-4 w-4" />
              Manual Entry
            </button>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-950/40 border border-red-800/50 rounded-xl text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
              <button
                onClick={() => fetchLegs()}
                className="ml-auto flex items-center gap-1 text-xs underline hover:no-underline"
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          )}

          {/* ── Filter bar */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap gap-3 items-end">

              {/* Player */}
              <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Player
                </label>
                <input
                  ref={playerRef}
                  type="text"
                  placeholder="e.g. Patrick Mahomes"
                  value={playerInput}
                  onChange={e => setPlayerInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Week */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Week
                </label>
                <div className="relative">
                  <select
                    value={weekInput}
                    onChange={e => setWeekInput(e.target.value)}
                    className="appearance-none bg-slate-950 border border-slate-700 text-white rounded-lg pl-3 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer h-[38px]"
                  >
                    <option value="">All Weeks</option>
                    {WEEKS.map(w => (
                      <option key={w} value={String(w)}>Week {w}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                </div>
              </div>

              {/* Prop Type */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Prop Type
                </label>
                <div className="relative">
                  <select
                    value={propInput}
                    onChange={e => setPropInput(e.target.value)}
                    className="appearance-none bg-slate-950 border border-slate-700 text-white rounded-lg pl-3 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer h-[38px] max-w-[190px]"
                  >
                    <option value="">All Prop Types</option>
                    {PROP_TYPES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                </div>
              </div>

              {/* Search + Clear */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-transparent uppercase select-none">&nbsp;</label>
                <div className="flex gap-2">
                  <button
                    onClick={applySearch}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm transition-colors h-[38px]"
                  >
                    <Search className="h-4 w-4" />
                    Search
                  </button>

                  {(hasFilters || filtersApplied) && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 rounded-lg text-xs font-bold transition-colors h-[38px]"
                    >
                      <X className="h-3.5 w-3.5" />
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Applied filter chips */}
            {filtersApplied && (
              <div className="flex flex-wrap gap-2 pt-0.5">
                {appliedPlayer && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-900/30 border border-emerald-700/40 rounded-full text-emerald-300 text-[10px] font-semibold">
                    Player: {appliedPlayer}
                  </span>
                )}
                {appliedWeek && appliedWeek !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-900/30 border border-blue-700/40 rounded-full text-blue-300 text-[10px] font-semibold">
                    Week {appliedWeek}
                  </span>
                )}
                {appliedProp && appliedProp !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-900/30 border border-purple-700/40 rounded-full text-purple-300 text-[10px] font-semibold">
                    {appliedProp}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Table */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-slate-900/80 border-b border-slate-800">
                <tr>
                  {/* Add to slip */}
                  <th className="w-12 px-4 py-3" />
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Player</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Prop</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Line</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Matchup</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Game Date</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Week</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mx-auto mb-2" />
                      <p className="text-slate-600 text-xs">Loading props…</p>
                    </td>
                  </tr>
                ) : legs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-24 text-center">
                      <p className="text-slate-600 text-sm">
                        {filtersApplied ? 'No props matched your search.' : 'No props found.'}
                      </p>
                      {filtersApplied && (
                        <button onClick={clearFilters} className="mt-2 text-xs text-emerald-500 hover:underline">
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  legs.map((leg, i) => {
                    const inSlip = slipIds.has(leg.id);
                    return (
                      <tr
                        key={leg.id ?? i}
                        className={`transition-colors hover:bg-slate-800/20 ${inSlip ? 'bg-emerald-950/20' : ''}`}
                      >
                        {/* Bet slip toggle */}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleSlip(leg)}
                            title={inSlip ? 'Remove from bet slip' : 'Add to bet slip'}
                            className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto transition-all border ${
                              inSlip
                                ? 'bg-emerald-600 border-emerald-500 text-white'
                                : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-emerald-500 hover:text-emerald-400'
                            }`}
                          >
                            {inSlip ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                          </button>
                        </td>

                        {/* Player */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-100 text-sm leading-tight">
                            {leg.player || '—'}
                          </div>
                          {leg.team && (
                            <div className="text-[10px] text-slate-600 uppercase font-mono mt-0.5">
                              {leg.team}
                            </div>
                          )}
                        </td>

                        {/* Prop */}
                        <td className="px-4 py-3 text-xs text-slate-400 capitalize">
                          {leg.prop || '—'}
                        </td>

                        {/* Line */}
                        <td className="px-4 py-3 font-mono font-bold text-white text-sm">
                          {fmtLine(leg.line)}
                        </td>

                        {/* Matchup */}
                        <td className="px-4 py-3 text-[11px] font-mono text-slate-500 uppercase">
                          {leg.matchup || '—'}
                        </td>

                        {/* Game Date */}
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {fmtDate(leg.gameDate)}
                        </td>

                        {/* Week */}
                        <td className="px-4 py-3 text-xs font-mono text-slate-400">
                          {leg.week
                            ? `WK ${leg.week}`
                            : <span className="text-slate-700">—</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Load More */}
          <div className="flex flex-col items-center gap-2 pt-2 pb-4">
            {hasMore ? (
              <button
                onClick={() => fetchLegs({
                  append: true,
                  player: appliedPlayer,
                  week:   appliedWeek,
                  prop:   appliedProp,
                  cursor: nextCursor,
                })}
                disabled={loadingMore}
                className="px-8 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-colors flex items-center gap-2 border border-slate-700"
              >
                {loadingMore
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading…</>
                  : <><ChevronDown className="h-4 w-4" /> Load More Props</>
                }
              </button>
            ) : !loading && legs.length > 0 ? (
              <p className="text-slate-700 text-xs">
                All {legs.length.toLocaleString()} props loaded
              </p>
            ) : null}
          </div>

        </div>
      </div>

      {/* Bet Slip sidebar */}
      {selections.length > 0 && <HistoricalBetSlip />}

      {/* Manual Entry modal */}
      <ManualEntryModal
        isOpen={manualOpen}
        onClose={() => setManualOpen(false)}
        onAddLeg={addLeg}
      />
    </div>
  );
}