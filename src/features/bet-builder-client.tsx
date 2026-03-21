'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useBetSlip } from '@/hooks/useBetSlip';
import { useAllProps, NormalizedProp } from '@/hooks/useAllProps';
import { PropsTable } from '@/components/bets/PropsTable';
import { EnrichModal } from '@/components/bets/EnrichModal';
import { ManualEntryModal } from '@/components/bets/manual-entry-modal';
import {
  RefreshCw, Plus, Zap, Loader2, Database,
  X, ChevronLeft, ChevronRight, Trophy,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Sport theming ─────────────────────────────────────────────────────────────
const THEME = {
  nfl: {
    accent:       '#4ade80',
    accentBg:     'rgba(74,222,128,0.08)',
    accentBorder: 'rgba(74,222,128,0.15)',
    label:        'NFL',
    icon:         '🏈',
  },
  nba: {
    accent:       '#fb923c',
    accentBg:     'rgba(251,146,60,0.08)',
    accentBorder: 'rgba(251,146,60,0.15)',
    label:        'NBA',
    icon:         '🏀',
  },
} as const;

// ─── Post-game confirm modal ───────────────────────────────────────────────────

function PostGameModal({
  date,
  season,
  onClose,
  onComplete,
}: {
  date:       string;
  season:     number;
  onClose:    () => void;
  onComplete: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const toastId = toast.loading(`Grading ${date} results...`);
    try {
      const res  = await fetch('/api/nba/grade', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ date, season }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      toast.success(
        `${date}: ${data.migrated ?? 0} migrated · ${data.gradedFromDaily ?? 0} graded`,
        { id: toastId },
      );
      onComplete();
      onClose();
    } catch (err: any) {
      toast.error(`Post-game failed: ${err.message}`, { id: toastId });
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0f0f0f] border border-orange-500/20 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black italic uppercase tracking-tighter text-orange-400">
              🏆 Post-Game
            </h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mt-0.5">
              Grade results + migrate to history
            </p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-slate-400">
          This will fetch BDL box scores for{' '}
          <span className="font-bold text-white">{date}</span>, grade all pending props,
          and move them from <span className="font-mono text-orange-400">nbaPropsDaily</span>{' '}
          into the permanent <span className="font-mono text-orange-400">nbaProps</span> collection.
        </p>

        <ul className="text-[11px] text-slate-500 space-y-1 pl-2">
          <li>✅ Fills <span className="text-white">gameStat</span> + <span className="text-white">actualResult</span></li>
          <li>✅ Migrates daily → historical collection</li>
          <li>✅ Updates bettingLog leg statuses</li>
          <li>✅ Clears the daily collection for tomorrow</li>
        </ul>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-white/10 rounded-xl text-xs font-black uppercase text-slate-500 hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={run} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)' }}>
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Trophy size={13} />}
            {loading ? 'Grading...' : 'Run Post-Game'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stale warning banner ──────────────────────────────────────────────────────

function StaleBanner({
  staleDate,
  season,
  onGraded,
}: {
  staleDate: string;
  season:    number;
  onGraded:  () => void;
}) {
  const [loading, setLoading] = useState(false);

  const grade = async () => {
    setLoading(true);
    const toastId = toast.loading(`Grading ${staleDate}...`);
    try {
      const res  = await fetch('/api/nba/grade', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ date: staleDate, season }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      toast.success(`${staleDate} graded — ${data.migrated ?? 0} props migrated`, { id: toastId });
      onGraded();
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    }
    setLoading(false);
  };

  return (
    <div className="p-4 rounded-2xl border flex items-center justify-between gap-4"
      style={{ backgroundColor: 'rgba(251,146,60,0.06)', borderColor: 'rgba(251,146,60,0.2)' }}>
      <div className="flex items-center gap-3">
        <Trophy size={16} className="text-orange-400 shrink-0" />
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-orange-400">
            Post-game pending for {staleDate}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Yesterday's props need grading before today can be enriched.
          </p>
        </div>
      </div>
      <button onClick={grade} disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase shrink-0 transition-all disabled:opacity-50"
        style={{ backgroundColor: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)' }}>
        {loading ? <Loader2 size={11} className="animate-spin" /> : <Trophy size={11} />}
        Grade {staleDate}
      </button>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface BetBuilderClientProps {
  initialDate?: string;
  season?:      number;
  league?:      'nfl' | 'nba' | 'ncaab';
}

export default function BetBuilderClient({
  initialDate,
  season = 2025,
  league = 'nba',
}: BetBuilderClientProps) {
  const router = useRouter();

  const activeDate = useMemo(() => {
    if (initialDate) return initialDate;
    return new Date().toISOString().split('T')[0];
  }, [initialDate]);

  const {
    props: allProps = [],
    loading, error, hasMore, loadMore, refresh,
  } = useAllProps({ league, date: activeDate, season: String(season) });

  const { selections, addLeg, ...betSlipRest } = useBetSlip();
  const clearSlip = (betSlipRest as any).clearSlip
    ?? (betSlipRest as any).clearSelections
    ?? (betSlipRest as any).clearLegs
    ?? (betSlipRest as any).reset
    ?? null;

  const [showManual,    setShowManual]    = useState(false);
  const [showEnrich,    setShowEnrich]    = useState(false);
  const [showPostGame,  setShowPostGame]  = useState(false);
  const [selectedType,  setSelectedType]  = useState<string>('All');
  const [staleDate,     setStaleDate]     = useState<string | null>(null);

  const theme = THEME[league as 'nfl' | 'nba'] ?? THEME.nba;

  const propTypes = useMemo(() => {
    const types = new Set(allProps.map((p: NormalizedProp) => p.prop).filter(Boolean));
    return ['All', ...Array.from(types).sort()];
  }, [allProps]);

  const filteredProps = useMemo(() => {
    if (selectedType === 'All') return allProps;
    return allProps.filter((p: NormalizedProp) => p.prop === selectedType);
  }, [allProps, selectedType]);

  const slipIds = useMemo(
    () => new Set((selections ?? []).map((s: any) => String(s.propId ?? s.id))),
    [selections],
  );

  const handleDateChange = (offset: number) => {
    const date = new Date(activeDate + 'T12:00:00Z');
    date.setDate(date.getDate() + offset);
    router.push(`/bet-builder?league=${league}&date=${date.toISOString().split('T')[0]}&season=${season}`);
  };

  const handleAddToSlip = useCallback((prop: NormalizedProp) => {
    const propId = String(prop.id);
    if (slipIds.has(propId)) { toast.error(`${prop.player} already in slip`); return; }
    addLeg({
      id: propId, propId,
      player:   prop.player   ?? 'Unknown',
      prop:     prop.prop     ?? 'Prop',
      line:     prop.line     ?? 0,
      selection: ((prop as any).overUnder as 'Over' | 'Under') || 'Over',
      season:   (prop as any).season,
      gameDate: (prop as any).gameDate ?? new Date().toISOString(),
      // @ts-ignore
      odds:     prop.bestOdds ?? -110,
      matchup:  prop.matchup  ?? '',
      team:     prop.team     ?? '',
      week:     (prop as any).week,
      league,
      bdlId:    (prop as any).bdlId ?? null,
    });
    toast.success(`${prop.player} added to slip`);
  }, [addLeg, slipIds, league]);

  // Enrich — handles 409 stale check automatically
  const handleEnrichClick = async () => {
    if (league !== 'nba') { setShowEnrich(true); return; }

    // Quick pre-check for stale daily docs
    try {
      const res = await fetch(`/api/nba/enrich?date=${activeDate}&season=${season}&dryRun=true`);
      if (res.status === 409) {
        const data = await res.json();
        setStaleDate(data.staleDate ?? null);
        return; // show stale banner instead of enrich modal
      }
    } catch { /* ignore — open modal normally */ }

    setShowEnrich(true);
  };

  const yesterday = useMemo(() => {
    const d = new Date(activeDate + 'T12:00:00Z');
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, [activeDate]);

  const firstProp = allProps[0];

  return (
    <div className="space-y-4 animate-in fade-in duration-500">

      {/* ── Header card ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111111] border border-white/5 p-6 rounded-[2rem] shadow-xl"
        style={{ borderColor: `rgba(${league === 'nba' ? '251,146,60' : '74,222,128'},0.1)` }}>

        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center border text-2xl"
            style={{ backgroundColor: theme.accentBg, borderColor: theme.accentBorder }}>
            {theme.icon}
          </div>
          <div>
            <h2 className="text-xl font-black italic tracking-tighter uppercase"
              style={{ color: theme.accent }}>
              {theme.label} Prop Builder
            </h2>
            <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
              {loading ? 'Syncing...' : `${allProps.length} nodes available`}
              <span className="flex items-center gap-1.5 ml-2" style={{ color: theme.accent }}>
                <button onClick={() => handleDateChange(-1)} className="p-0.5 rounded-md hover:bg-white/10 transition-colors">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono">· {activeDate}</span>
                <button onClick={() => handleDateChange(1)} className="p-0.5 rounded-md hover:bg-white/10 transition-colors">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* League badge */}
          <div className="px-3 py-1.5 rounded-xl border font-black text-[9px] uppercase tracking-widest"
            style={{ backgroundColor: theme.accentBg, borderColor: theme.accentBorder, color: theme.accent }}>
            {(firstProp?.league || league).toUpperCase()}
          </div>

          {/* Prop type filter */}
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 outline-none appearance-none cursor-pointer min-w-[120px] transition-all"
          >
            {propTypes.map((type: string) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          {/* Clear slip */}
          {(selections?.length ?? 0) > 0 && (
            <button onClick={() => clearSlip?.()}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all text-[9px] font-black uppercase">
              <X className="h-3.5 w-3.5" />
              Clear ({selections.length})
            </button>
          )}

          {/* Post-game button — NBA only */}
          {league === 'nba' && (
            <button
              onClick={() => setShowPostGame(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border"
              style={{ backgroundColor: 'rgba(251,146,60,0.08)', color: '#fb923c', borderColor: 'rgba(251,146,60,0.2)' }}
              title="Grade last night's results">
              <Trophy className="h-3.5 w-3.5" />
              Post-Game
            </button>
          )}

          {/* Enrich */}
          <button
            onClick={handleEnrichClick}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border"
            style={{ backgroundColor: theme.accentBg, color: theme.accent, borderColor: theme.accentBorder }}
            title="Enrich props with analytics">
            <Zap className="h-3.5 w-3.5" />
            Enrich
          </button>

          {/* Manual entry */}
          <button onClick={() => setShowManual(true)}
            className="p-2.5 bg-white/5 text-slate-400 border border-white/5 rounded-xl hover:bg-white/10 transition-all"
            title="Manual Entry">
            <Plus className="h-4 w-4" />
          </button>

          {/* Refresh */}
          <button onClick={() => refresh()} disabled={loading}
            className="p-2.5 bg-white/5 text-slate-400 border border-white/5 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Stale daily warning ──────────────────────────────────────────────── */}
      {staleDate && league === 'nba' && (
        <StaleBanner
          staleDate={staleDate}
          season={season}
          onGraded={() => { setStaleDate(null); setShowEnrich(true); }}
        />
      )}

      {/* ── Error ────────────────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-black uppercase tracking-widest flex justify-between items-center">
          <div className="flex items-center gap-2">
            <X className="h-4 w-4" />
            <span>Connection Interrupted: {error}</span>
          </div>
          <button onClick={() => refresh()} className="underline hover:text-white transition-colors">
            Retry Sync
          </button>
        </div>
      )}

      {/* ── Props table ──────────────────────────────────────────────────────── */}
      <div className="min-h-[400px] bg-[#111111]/30 rounded-[2rem] border border-white/5 overflow-hidden">
        <PropsTable
          props={filteredProps}
          league={league}
          isLoading={loading && allProps.length === 0}
          onAddToBetSlip={handleAddToSlip}
          slipIds={slipIds}
        />
      </div>

      {/* ── Load more ────────────────────────────────────────────────────────── */}
      {hasMore && (
        <div className="flex justify-center pt-8 pb-12">
          <button onClick={() => loadMore()} disabled={loading}
            className="flex items-center gap-3 px-12 py-5 bg-[#111111] border border-white/10 rounded-2xl hover:border-white/20 hover:bg-[#161616] transition-all group">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Database className="h-5 w-5" />}
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
              {loading ? 'Accessing Ledger...' : 'Expand Data Pool'}
            </span>
          </button>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {showManual && (
        <ManualEntryModal isOpen={showManual} onClose={() => setShowManual(false)} onAddLeg={addLeg} />
      )}

      {showEnrich && (
        <EnrichModal
          isOpen={showEnrich}
          onClose={() => setShowEnrich(false)}
          onComplete={() => { refresh(); setShowEnrich(false); }}
          league={league as 'nba' | 'nfl'}
          defaultDate={activeDate}
          defaultSeason={season}
          defaultCollection="all"
        />
      )}

      {showPostGame && league === 'nba' && (
        <PostGameModal
          date={yesterday}
          season={season}
          onClose={() => setShowPostGame(false)}
          onComplete={() => refresh()}
        />
      )}
    </div>
  );
}
