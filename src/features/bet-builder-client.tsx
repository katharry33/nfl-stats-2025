'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { usePropsQuery } from '@/hooks/usePropsQuery';
import { getCurrentNFLWeek } from '@/lib/nfl/getCurrentWeek';
import { getCurrentNflSeason } from '@/lib/season';
import { RefreshCcw, Radio, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { PropsTable } from '@/components/bets/PropsTable';
import { PropData } from '@/lib/types';
import { toast } from 'sonner';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayLocal(): string {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BetBuilderClient() {
  const [league, setLeague] = useState<'nba' | 'nfl'>('nba');

  // NBA: always today's date (live slate)
  // User can nudge the date for same-day late games vs early games if needed
  const [selectedDate, setSelectedDate] = useState<string>(getTodayLocal);

  const nflSeason = useMemo(() => getCurrentNflSeason(), []);
  const nflWeek = useMemo(() => getCurrentNFLWeek(nflSeason), [nflSeason]);

  const { data, loading, refetch, error, loadMore, hasMore } = usePropsQuery({
    league,
    season: 2025,
    date: league === 'nba' ? selectedDate : undefined,
    week: league === 'nfl' ? nflWeek : undefined,
  });

  const lastSync = useMemo(() => {
    if (!data || data.length === 0) return null;
    const times = data
      .map((d) => new Date(d.updatedAt || 0).getTime())
      .filter((t) => !isNaN(t) && t > 0);
    return times.length > 0 ? new Date(Math.max(...times)) : null;
  }, [data]);

  const handleAddLeg = useCallback((p: PropData) => {
    toast.success(`${p.player} — ${p.prop} ${p.line} added to slip`);
    // Wire to your BetSlipContext here
  }, []);

  const handleLeagueChange = useCallback((l: 'nba' | 'nfl') => {
    setLeague(l);
    // Reset NBA date back to today when switching
    if (l === 'nba') setSelectedDate(getTodayLocal());
  }, []);

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center bg-[#121214] p-8 rounded-[32px] border border-white/5 shadow-2xl">
        <div className="flex items-center gap-6">
          {/* Live pulse */}
          <div className="relative flex items-center justify-center flex-shrink-0">
            <Radio className="text-indigo-500 animate-pulse z-10" size={28} />
            <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-30 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black italic uppercase tracking-tighter">
                Bet <span className="text-indigo-500">Builder</span>
              </h1>
              <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-black px-2 py-0.5 rounded border border-indigo-500/20 uppercase">
                Live
              </span>
            </div>

            <div className="flex items-center gap-4 mt-1">
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">
                {league.toUpperCase()} Protocol •{' '}
                {league === 'nba' ? selectedDate : `Week ${nflWeek}`}
              </p>
              {lastSync && (
                <div className="flex items-center gap-1.5 text-emerald-500/60 text-[10px] font-bold uppercase tracking-widest">
                  <Clock size={12} className="text-emerald-500/80" />
                  Synced {format(lastSync, 'HH:mm:ss')}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          {/* NBA date nudge — useful for multi-timezone slates */}
          {league === 'nba' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50"
            />
          )}

          <button
            onClick={() => refetch()}
            disabled={loading}
            className="group flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-indigo-500/10 border border-white/10 hover:border-indigo-500/30 rounded-2xl text-zinc-400 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCcw
              size={16}
              className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}
            />
            <span className="text-[10px] font-black uppercase tracking-widest">Refresh Slate</span>
          </button>

          <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
            {(['nba', 'nfl'] as const).map((l) => (
              <button
                key={l}
                onClick={() => handleLeagueChange(l)}
                className={`px-8 py-3 rounded-xl text-xs font-black uppercase transition-all ${
                  league === l ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-white'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
          <p className="text-red-400 font-bold text-sm">Data fetch error:</p>
          <p className="text-red-500 text-xs mt-1 font-mono">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#121214]/60 rounded-[32px] border border-white/5 overflow-hidden min-h-[600px] backdrop-blur-sm">
        <PropsTable
          data={data}
          isLoading={loading}
          onAddLeg={handleAddLeg}
          onLoadMore={loadMore}
          hasMore={hasMore}
          variant="bet-builder"
        />
      </div>
    </div>
  );
}