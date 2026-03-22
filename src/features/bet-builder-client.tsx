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
  X, ChevronLeft, ChevronRight, Trophy, Filter,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Sport theming ────────────────────────────────────────────────────────────
const THEME = {
  nfl: {
    accent:       '#22c55e',
    accentBg:     'rgba(34,197,94,0.08)',
    accentBorder: 'rgba(34,197,94,0.18)',
    label:        'NFL',
    icon:         '🏈',
  },
  nba: {
    accent:       '#f97316',
    accentBg:     'rgba(249,115,22,0.08)',
    accentBorder: 'rgba(249,115,22,0.18)',
    label:        'NBA',
    icon:         '🏀',
  },
} as const;

// ─── Post-game modal ──────────────────────────────────────────────────────────

function PostGameModal({
  date, season, league, onClose, onComplete,
}: {
  date: string; season: number; league: string;
  onClose: () => void; onComplete: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const toastId = toast.loading(`Grading ${date} results…`);
    try {
      const endpoint = league === 'nba' ? '/api/nba/grade' : '/api/nfl/grade';
      const res  = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ date, season }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      toast.success(
        `${date}: ${data.migrated ?? 0} migrated · ${data.gradedPerm ?? data.gradedFromDaily ?? 0} graded`,
        { id: toastId },
      );
      onComplete();
      onClose();
    } catch (err: any) {
      toast.error(`Post-game failed: ${err.message}`, { id: toastId });
    }
    setLoading(false);
  };

  const theme = THEME[league as 'nfl' | 'nba'] ?? THEME.nba;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-sm p-6 bg-surface border border-white/10 rounded-2xl shadow-2xl space-y-4"
        style={{ borderColor: theme.accentBorder }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black italic uppercase tracking-tighter" style={{ color: theme.accent }}>
              🏆 Post-Game
            </h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">
              Grade results + move to history
            </p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-slate-400">
          Fetches box scores for <span className="font-bold text-white">{date}</span> via Basketball Reference,
          grades all pending props, and writes actual stats + results to the permanent collection.
        </p>

        <ul className="text-[11px] text-slate-500 space-y-1 pl-2">
          <li>✅ Fills <span className="text-white">gameStat</span> + <span className="text-white">actualResult</span></li>
          <li>✅ Migrates daily → historical collection</li>
          <li>✅ Updates bettingLog leg statuses</li>
        </ul>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-white/10 rounded-xl text-xs font-black uppercase text-slate-500 hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={run} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: theme.accentBg, color: theme.accent, border: `1px solid ${theme.accentBorder}` }}>
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Trophy size={13} />}
            {loading ? 'Grading…' : 'Run Post-Game'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stale banner ─────────────────────────────────────────────────────────────

function StaleBanner({
  staleDate, season, onGraded,
}: { staleDate: string; season: number; onGraded: () => void }) {
  const [loading, setLoading] = useState(false);

  const grade = async () => {
    setLoading(true);
    const toastId = toast.loading(`Grading ${staleDate}…`);
    try {
      const res  = await fetch('/api/nba/grade', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: staleDate, season }),
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
      style={{ background: 'rgba(249,115,22,0.06)', borderColor: 'rgba(249,115,22,0.2)' }}>
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
        style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }}>
        {loading ? <Loader2 size={11} className="animate-spin" /> : <Trophy size={11} />}
        Grade {staleDate}
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface BetBuilderClientProps {
  initialDate?: string;
  season?:      number;
  league?:      'nfl' | 'nba';
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
  const [enrichedOnly,  setEnrichedOnly]  = useState(false);
  const [staleDate,     setStaleDate]     = useState<string | null>(null);

  const theme = THEME[league] ?? THEME.nba;

  const propTypes = useMemo(() => {
    const types = new Set(
      allProps.map((p: NormalizedProp) => p.prop).filter((v): v is string => !!v)
    );
    return ['All', ...Array.from(types).sort()];
  }, [allProps]);

  const filteredProps = useMemo(() => {
    let result = allProps;
    if (enrichedOnly)          result = result.filter((p: NormalizedProp) => p.confidenceScore != null);
    if (selectedType !== 'All') result = result.filter((p: NormalizedProp) => p.prop === selectedType);
    return result;
  }, [allProps, selectedType, enrichedOnly]);

  const slipIds = useMemo(
    () => new Set((selections ?? []).map((s: any) => String(s.propId ?? s.id))),
    [selections],
  );

  const handleDateChange = (offset: number) => {
    const d = new Date(activeDate + 'T12:00:00Z');
    d.setDate(d.getDate() + offset);
    router.push(`/bet-builder?league=${league}&date=${d.toISOString().split('T')[0]}&season=${season}`);
  };

  const handleAddToSlip = useCallback((prop: NormalizedProp) => {
    const propId = String(prop.id);
    if (slipIds.has(propId)) { toast.error(`${prop.player} already in slip`); return; }
    addLeg({
      id: propId, propId,
      player:    prop.player   ?? 'Unknown',
      prop:      prop.prop     ?? 'Prop',
      line:      prop.line     ?? 0,
      selection: (prop.overUnder as 'Over' | 'Under') || 'Over',
      season:    prop.season   ?? season,
      gameDate:  prop.gameDate ?? new Date().toISOString(),
      odds:      prop.bestOdds ?? -110,
      matchup:   prop.matchup  ?? '',
      team:      prop.team     ?? '',
      week:      prop.week,
      league,
      bdlId:     prop.bdlId    ?? null,
    });
    toast.success(`${prop.player} added to slip`);
  }, [addLeg, slipIds, league, season]);

  const handleEnrichClick = async () => {
    if (league !== 'nba') { setShowEnrich(true); return; }
    try {
      const res = await fetch(`/api/nba/enrich?date=${activeDate}&season=${season}&dryRun=true`);
      if (res.status === 409) {
        const data = await res.json();
        setStaleDate(data.staleDate ?? null);
        return;
      }
    } catch { /* open modal normally */ }
    setShowEnrich(true);
  };

  const yesterday = useMemo(() => {
    const d = new Date(activeDate + 'T12:00:00Z');
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, [activeDate]);

  const enrichedCount = useMemo(
    () => allProps.filter((p: NormalizedProp) => p.confidenceScore != null).length,
    [allProps],
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl"
        style={{ background: 'var(--surface)', border: `1px solid ${theme.accentBorder}`, boxShadow: `0 0 0 1px ${theme.accentBorder}, 0 8px 32px rgba(0,0,0,0.3)` }}>

        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center border text-2xl"
            style={{ background: theme.accentBg, borderColor: theme.accentBorder }}>
            {theme.icon}
          </div>
          <div>
            <h2 className="text-xl font-black italic tracking-tighter uppercase" style={{ color: theme.accent }}>
              {theme.label} Prop Builder
            </h2>
            <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 mt-0.5">
              {loading
                ? 'Syncing…'
                : `${filteredProps.length} props${enrichedOnly ? '' : ` · ${enrichedCount} enriched`}`}
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
          {/* Prop type filter */}
          <select value={selectedType} onChange={e => setSelectedType(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 outline-none cursor-pointer min-w-[120px]">
            {propTypes.map((type: string) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          {/* Enriched only toggle */}
          <button onClick={() => setEnrichedOnly(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border"
            style={enrichedOnly
              ? { background: theme.accentBg, color: theme.accent, borderColor: theme.accentBorder }
              : { background: 'rgba(255,255,255,0.03)', color: '#64748b', borderColor: 'rgba(255,255,255,0.08)' }}>
            <Filter className="h-3 w-3" />
            Enriched
          </button>

          {/* Clear slip */}
          {(selections?.length ?? 0) > 0 && (
            <button onClick={() => clearSlip?.()}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all text-[9px] font-black uppercase">
              <X className="h-3.5 w-3.5" />
              Clear ({selections.length})
            </button>
          )}

          {/* Post-game */}
          <button onClick={() => setShowPostGame(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border"
            style={{ background: theme.accentBg, color: theme.accent, borderColor: theme.accentBorder }}>
            <Trophy className="h-3.5 w-3.5" />
            Post-Game
          </button>

          {/* Enrich */}
          <button onClick={handleEnrichClick}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border"
            style={{ background: 'rgba(34,211,238,0.08)', color: '#22d3ee', borderColor: 'rgba(34,211,238,0.18)' }}>
            <Zap className="h-3.5 w-3.5" />
            Enrich
          </button>

          {/* Manual */}
          <button onClick={() => setShowManual(true)}
            className="p-2.5 bg-white/5 text-slate-400 border border-white/5 rounded-xl hover:bg-white/10 transition-all">
            <Plus className="h-4 w-4" />
          </button>

          {/* Refresh */}
          <button onClick={() => refresh()} disabled={loading}
            className="p-2.5 bg-white/5 text-slate-400 border border-white/5 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Stale banner ─────────────────────────────────────────────────────── */}
      {staleDate && league === 'nba' && (
        <StaleBanner
          staleDate={staleDate} season={season}
          onGraded={() => { setStaleDate(null); setShowEnrich(true); }}
        />
      )}

      {/* ── Error ────────────────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-black uppercase tracking-widest flex justify-between items-center">
          <div className="flex items-center gap-2">
            <X className="h-4 w-4" />
            <span>{error}</span>
          </div>
          <button onClick={() => refresh()} className="underline hover:text-white transition-colors">Retry</button>
        </div>
      )}

      {/* ── Props table ───────────────────────────────────────────────────────── */}
      <div className="min-h-[400px] rounded-3xl border border-white/5 overflow-hidden" style={{ background: 'var(--surface)' }}>
        <PropsTable
          props={filteredProps}
          league={league}
          isLoading={loading && allProps.length === 0}
          onAddToBetSlip={handleAddToSlip}
          slipIds={slipIds}
        />
      </div>

      {/* ── Load more ─────────────────────────────────────────────────────────── */}
      {hasMore && (
        <div className="flex justify-center pt-8 pb-12">
          <button onClick={() => loadMore()} disabled={loading}
            className="flex items-center gap-3 px-12 py-5 border border-white/10 rounded-2xl hover:border-white/20 transition-all"
            style={{ background: 'var(--surface)' }}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Database className="h-5 w-5" />}
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
              {loading ? 'Loading…' : 'Load More'}
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
          league={league}
          defaultDate={activeDate}
          defaultSeason={season}
          defaultCollection="all"
        />
      )}

      {showPostGame && (
        <PostGameModal
          date={yesterday} season={season} league={league}
          onClose={() => setShowPostGame(false)}
          onComplete={() => refresh()}
        />
      )}
    </div>
  );
}
