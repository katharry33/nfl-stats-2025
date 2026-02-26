'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HistoricalBetSlip } from '@/components/bets/historical-betslip';
import { AddToBetslipButton } from '@/components/bets/add-to-betslip-button';
import { ManualEntryModal } from '@/components/bets/manual-entry-modal'; // Import the new modal
import { useBetSlip } from '@/context/betslip-context'; // Import the context
import { X, Search, Loader2, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Capitalize each word e.g. "rec yards" → "Rec Yards"
function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

function fmtDate(raw: string | null | undefined): string {
  if (!raw) return 'N/A';
  try {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? 'N/A'
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  } catch { return 'N/A'; }
}

export default function AllPropsPage() {
  const [allLegs,   setAllLegs]   = useState<any[]>([]);
  const [propTypes, setPropTypes] = useState<string[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [total,     setTotal]     = useState(0);

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const { addLeg } = useBetSlip();

  // Pending input state (not yet sent to API)
  const [playerInput,   setPlayerInput]   = useState('');
  const [propTypeInput, setPropTypeInput] = useState('all');
  const [weekInput,     setWeekInput]     = useState('all');
  const [seasonInput,   setSeasonInput]   = useState('2025');

  // Committed query — only changes on Search click or Enter
  const [query, setQuery] = useState({
    player: '', propType: 'all', week: 'all', season: '2025',
  });

  const playerRef = useRef<HTMLInputElement>(null);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchProps = useCallback(async (q: typeof query) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.season !== 'all')   params.set('season', q.season);
      if (q.week   !== 'all')   params.set('week',   q.week);
      if (q.propType !== 'all') params.set('prop',   q.propType);
      if (q.player)             params.set('player', q.player);

      const res  = await fetch(`/api/all-props?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      setAllLegs(data.props ?? []);
      setTotal(data.total  ?? 0);
      if (data.propTypes?.length) setPropTypes(data.propTypes);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load props');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchProps(query); }, []); // eslint-disable-line

  // ── Search / Clear ──────────────────────────────────────────────────────────

  const handleSearch = useCallback(() => {
    const q = {
      player:   playerInput.trim().toLowerCase(),
      propType: propTypeInput,
      week:     weekInput,
      season:   seasonInput,
    };
    setQuery(q);
    fetchProps(q);
  }, [playerInput, propTypeInput, weekInput, seasonInput, fetchProps]);

  const handleClear = useCallback(() => {
    setPlayerInput('');
    setPropTypeInput('all');
    setWeekInput('all');
    setSeasonInput('2025');
    const q = { player: '', propType: 'all', week: 'all', season: '2025' };
    setQuery(q);
    fetchProps(q);
    playerRef.current?.focus();
  }, [fetchProps]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const hasActiveFilters = query.player || query.propType !== 'all'
    || query.week !== 'all' || query.season !== 'all';

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 min-h-screen bg-slate-950 text-slate-200">
      <div className="lg:col-span-3 space-y-5">

        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Historical Props</h1>
            <p className="text-slate-500 text-sm mt-0.5">All data from allProps collection.</p>
          </div>
          <Button 
            onClick={() => setIsManualModalOpen(true)}
            variant="outline"
            className="bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300 gap-2"
          >
            <Activity className="h-4 w-4 text-blue-400" />
            Manual Entry
          </Button>
        </header>

        {/* ── Search bar ──────────────────────────────────────────────────────── */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">

            {/* Season */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Season</label>
              <select
                value={seasonInput}
                onChange={e => setSeasonInput(e.target.value)}
                onKeyDown={onKeyDown}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 w-36"
              >
                <option value="all">All Seasons</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>

            {/* Player search */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Player</label>
              <div className="relative">
                <input
                  ref={playerRef}
                  type="text"
                  placeholder="Search player…"
                  value={playerInput}
                  onChange={e => setPlayerInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  className="bg-slate-950 border border-slate-700 text-white text-sm rounded-lg pl-3 pr-9 py-2
                    outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                />
                {playerInput && (
                  <button
                    onClick={() => setPlayerInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Prop Type — populated from API response */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Prop Type</label>
              <select
                value={propTypeInput}
                onChange={e => setPropTypeInput(e.target.value)}
                onKeyDown={onKeyDown}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 w-44"
              >
                <option value="all">All Props</option>
                {propTypes.map(pt => (
                  <option key={pt} value={pt}>{titleCase(pt)}</option>
                ))}
              </select>
            </div>

            {/* Week */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Week</label>
              <select
                value={weekInput}
                onChange={e => setWeekInput(e.target.value)}
                onKeyDown={onKeyDown}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 w-32"
              >
                <option value="all">All Weeks</option>
                {Array.from({ length: 22 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>Week {i + 1}</option>
                ))}
              </select>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 self-end">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500
                  disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
                Search
              </button>
              {(playerInput || propTypeInput !== 'all' || weekInput !== 'all' || seasonInput !== 'all' || hasActiveFilters) && (
                <button
                  onClick={handleClear}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 border border-slate-700
                    hover:border-slate-500 text-slate-400 hover:text-white text-sm rounded-lg transition-colors"
                >
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-red-950/40 border border-red-800/50 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Count bar */}
        <div className="flex items-center justify-between bg-slate-900/50 px-4 py-3 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-sm text-slate-300">
              Displaying{' '}
              <span className="font-mono text-emerald-400 font-bold">{allLegs.length.toLocaleString()}</span>
              {total !== allLegs.length && (
                <>
                  <span className="text-slate-500 mx-2">of</span>
                  <span className="font-mono text-slate-200">{total.toLocaleString()}</span>
                </>
              )}{' '}
              records
            </p>
          </div>
          {query.season !== 'all' && (
            <span className="text-[10px] uppercase tracking-widest bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded">
              Season {query.season}
            </span>
          )}
        </div>

        {/* ── Table ─────────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-slate-600 text-xs uppercase font-mono tracking-wider">Loading props…</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/20 overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead className="bg-slate-900/80 text-[10px] uppercase font-black text-slate-500 tracking-widest border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Player</th>
                  <th className="px-6 py-4">Prop</th>
                  <th className="px-6 py-4">Line</th>
                  <th className="px-6 py-4">Matchup / Wk</th>
                  <th className="px-6 py-4">Game Date</th>
                  <th className="px-6 py-4">Result</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {allLegs.map((leg, i) => (
                  <tr key={leg.id || i} className="hover:bg-slate-800/30 transition-colors group">
                    {/* Player */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-200">{leg.player || '—'}</div>
                      {leg.team && (
                        <div className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">{leg.team}</div>
                      )}
                    </td>

                    {/* Prop — always title case */}
                    <td className="px-6 py-4">
                      <span className="text-xs font-semibold text-slate-300">
                        {titleCase(leg.prop || '—')}
                      </span>
                      {leg.overUnder && (
                        <span className={`ml-2 text-[10px] font-bold ${
                          leg.overUnder.toLowerCase() === 'over' ? 'text-blue-400' : 'text-orange-400'
                        }`}>
                          {leg.overUnder}
                        </span>
                      )}
                    </td>

                    {/* Line */}
                    <td className="px-6 py-4 font-mono text-sm text-emerald-400">
                      {leg.line ?? '—'}
                    </td>

                    {/* Matchup + Week */}
                    <td className="px-6 py-4">
                      <div className="text-[10px] text-slate-400 font-mono uppercase">{leg.matchup || '—'}</div>
                      {leg.week && (
                        <div className="text-[10px] text-slate-500 mt-0.5">Week {leg.week}</div>
                      )}
                    </td>

                    {/* Game Date */}
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {fmtDate(leg.gameDate)}
                    </td>

                    {/* Result */}
                    <td className="px-6 py-4">
                      {leg.actualResult ? (
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                          leg.actualResult.toLowerCase().includes('win')
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                            : leg.actualResult.toLowerCase().includes('loss') || leg.actualResult.toLowerCase().includes('lose')
                              ? 'bg-red-500/15 text-red-400 border-red-500/25'
                              : 'bg-slate-700/20 text-slate-500 border-slate-700/20'
                        }`}>
                          {leg.actualResult}
                        </span>
                      ) : (
                        <span className="text-slate-700 text-xs">—</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4 text-right">
                      <div className="w-24 ml-auto">
                        <AddToBetslipButton prop={leg} selection={leg.overUnder || 'Over'} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && allLegs.length === 0 && (
              <div className="p-10 text-center text-slate-500 text-sm italic">
                {hasActiveFilters
                  ? 'No props matched your filters.'
                  : 'No data found in the allProps collection.'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bet slip sidebar */}
      <div className="lg:col-span-1">
        <aside className="sticky top-20">
          <HistoricalBetSlip />
        </aside>
      </div>

      <ManualEntryModal 
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onAddLeg={(leg) => {
          addLeg(leg);
        }}
      />
    </div>
  );
}