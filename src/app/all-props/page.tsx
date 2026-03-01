'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HistoricalBetSlip } from '@/components/bets/historical-betslip';
import { AddToBetslipButton } from '@/components/bets/add-to-betslip-button';
import { ManualEntryModal } from '@/components/bets/manual-entry-modal';
import { useBetSlip } from '@/context/betslip-context';
import { X, Search, Loader2, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

// ─── PropCard ─────────────────────────────────────────────────────────────────
// Single card — shows player, matchup, week badge, prop type, line value
// One "Add to Slip" button (no over/under — just adds the prop)

function PropCard({ prop }: { prop: any }) {
  const player  = prop.player  ?? prop.Player  ?? '—';
  const team    = prop.team    ?? prop.Team    ?? '';
  const propLbl = prop.prop    ?? prop.Prop    ?? '—';
  const matchup = prop.matchup ?? prop.Matchup ?? '';
  const week    = prop.week    ?? prop.Week;
  const line    = prop.line    ?? prop.Line;

  return (
    <div className="bg-[#0f1115] border border-white/5 p-5 rounded-3xl shadow-2xl flex flex-col gap-3
      hover:border-[#FFD700]/20 transition-colors">

      {/* Top: player name + week badge */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-black text-base uppercase italic tracking-tighter leading-tight truncate">
            {player}
          </h3>
          {matchup && (
            <p className="text-[10px] text-[#FFD700] font-black uppercase tracking-[0.2em] mt-1">
              {matchup}
            </p>
          )}
        </div>
        {week && (
          <div className="bg-[#FFD700]/10 border border-[#FFD700]/20 px-2.5 py-1 rounded-lg shrink-0">
            <span className="text-[10px] font-black text-[#FFD700] uppercase">WK {week}</span>
          </div>
        )}
      </div>

      {/* Line display */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3 flex flex-col items-center">
        <span className="text-[9px] font-black uppercase text-zinc-600 tracking-[0.3em] mb-1">Line</span>
        <div className="text-3xl font-black text-white tabular-nums tracking-tighter">
          {line != null && line !== 0 ? Number(line).toFixed(1) : '—'}
        </div>
      </div>

      {/* Prop type + team */}
      <p className="text-[10px] text-center text-zinc-600 font-bold uppercase tracking-widest truncate">
        {[team, titleCase(propLbl)].filter(Boolean).join(' • ')}
      </p>

      {/* Single add button — no over/under choice */}
      <AddToBetslipButton prop={prop} selection={prop.overUnder || 'Over'} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AllPropsPage() {
  const [allLegs,   setAllLegs]   = useState<any[]>([]);
  const [propTypes, setPropTypes] = useState<string[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [total,     setTotal]     = useState(0);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const { addLeg } = useBetSlip();

  const [playerInput,   setPlayerInput]   = useState('');
  const [propTypeInput, setPropTypeInput] = useState('all');
  const [weekInput,     setWeekInput]     = useState('all');
  const [seasonInput,   setSeasonInput]   = useState('2025');
  const [query, setQuery] = useState({ player: '', propType: 'all', week: 'all', season: '2025' });
  const playerRef = useRef<HTMLInputElement>(null);

  const fetchProps = useCallback(async (q: typeof query) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.season !== 'all')   params.set('season',   q.season);
      if (q.week   !== 'all')   params.set('week',     q.week);
      if (q.propType !== 'all') params.set('prop',     q.propType);
      if (q.player)             params.set('player',   q.player);

      const res  = await fetch(`/api/all-props?${params}`);
      // Guard against HTML error pages (e.g. Next.js 500 returning <!DOCTYPE>)
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Server error (${res.status}) — check console for details`);
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setAllLegs(data.props ?? []);
      setTotal(data.total ?? 0);
      if (data.propTypes?.length) setPropTypes(data.propTypes);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load props');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProps(query); }, []); // eslint-disable-line

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
    setPlayerInput(''); setPropTypeInput('all'); setWeekInput('all'); setSeasonInput('2025');
    const q = { player: '', propType: 'all', week: 'all', season: '2025' };
    setQuery(q);
    fetchProps(q);
    playerRef.current?.focus();
  }, [fetchProps]);

  const hasActiveFilters = query.player || query.propType !== 'all' || query.week !== 'all';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 min-h-screen bg-[#060606] text-zinc-200">
      <div className="lg:col-span-3 space-y-5">

        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">
              Historical Props
            </h1>
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] mt-1">
              Market Analysis & Manual Entry
            </p>
          </div>
          <Button onClick={() => setIsManualModalOpen(true)}
            className="bg-[#FFD700] hover:bg-[#e6c200] text-black font-black italic uppercase gap-2">
            <Activity className="h-4 w-4" />
            Manual Entry
          </Button>
        </header>

        {/* Search bar */}
        <div className="bg-[#0f1115] border border-white/5 rounded-[2rem] p-5">
          <div className="flex flex-wrap items-end gap-3">

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-wider">Season</label>
              <select value={seasonInput} onChange={e => setSeasonInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="bg-black border border-white/10 text-zinc-300 text-sm rounded-xl px-3 py-2
                  outline-none focus:ring-1 focus:ring-[#FFD700]/50 w-36">
                <option value="all">All Seasons</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-wider">Player</label>
              <div className="relative">
                <input ref={playerRef} type="text" placeholder="Search player…"
                  value={playerInput}
                  onChange={e => setPlayerInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="bg-black border border-white/10 text-white text-sm rounded-xl pl-3 pr-9 py-2
                    outline-none focus:ring-1 focus:ring-[#FFD700]/50 w-full" />
                {playerInput && (
                  <button onClick={() => setPlayerInput('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-wider">Prop Type</label>
              <select value={propTypeInput} onChange={e => setPropTypeInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="bg-black border border-white/10 text-zinc-300 text-sm rounded-xl px-3 py-2
                  outline-none focus:ring-1 focus:ring-[#FFD700]/50 w-44">
                <option value="all">All Props</option>
                {propTypes.map(pt => (
                  <option key={pt} value={pt}>{titleCase(pt)}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-zinc-600 uppercase tracking-wider">Week</label>
              <select value={weekInput} onChange={e => setWeekInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="bg-black border border-white/10 text-zinc-300 text-sm rounded-xl px-3 py-2
                  outline-none focus:ring-1 focus:ring-[#FFD700]/50 w-32">
                <option value="all">All Weeks</option>
                {Array.from({ length: 22 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>Week {i + 1}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 self-end">
              <button onClick={handleSearch} disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#FFD700] hover:bg-[#e6c200]
                  disabled:opacity-50 text-black text-sm font-black italic uppercase rounded-xl transition-colors">
                <Search className="h-3.5 w-3.5" />
                Search
              </button>
              {(playerInput || propTypeInput !== 'all' || weekInput !== 'all' || hasActiveFilters) && (
                <button onClick={handleClear} disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 border border-white/10
                    hover:border-white/20 text-zinc-500 hover:text-white text-sm rounded-xl transition-colors">
                  <X className="h-3.5 w-3.5" /> Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-3 bg-red-950/40 border border-red-800/50 rounded-2xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Count */}
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-zinc-600 font-mono">
            <span className="text-[#FFD700] font-black">{allLegs.length.toLocaleString()}</span>
            {total !== allLegs.length && <> of <span className="text-zinc-400">{total.toLocaleString()}</span></>}
            {' '}props
          </p>
          {query.week !== 'all' && (
            <span className="text-[10px] uppercase tracking-widest bg-[#FFD700]/10 text-[#FFD700] px-2.5 py-1 rounded-lg font-black">
              Week {query.week}
            </span>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#FFD700]" />
            <p className="text-zinc-600 text-xs uppercase font-mono tracking-wider">Loading props…</p>
          </div>
        ) : allLegs.length === 0 ? (
          <div className="flex flex-col items-center py-20 border border-dashed border-white/5 rounded-3xl gap-2">
            <p className="text-zinc-500 text-sm font-bold italic">
              {hasActiveFilters ? 'No props matched your filters.' : 'No data found.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {allLegs.map((prop, i) => (
              <PropCard key={prop.id ?? i} prop={prop} />
            ))}
          </div>
        )}
      </div>

      {/* Bet slip sidebar */}
      <div className="lg:col-span-1">
        <aside className="sticky top-6">
          <HistoricalBetSlip />
        </aside>
      </div>

      <ManualEntryModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onAddLeg={leg => addLeg(leg)}
      />
    </div>
  );
}