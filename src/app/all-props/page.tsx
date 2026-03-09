'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useBetSlip } from '@/hooks/useBetSlip';
import { useAllProps } from '@/hooks/useAllProps';
import type { NormalizedProp } from '@/hooks/useAllProps';
import { PropsTable } from '@/components/bets/PropsTable';
import { ManualEntryModal } from '@/components/bets/manual-entry-modal';
import {
  Search, RefreshCw, Loader2, Plus, LayoutGrid, TableIcon,
  ChevronLeft, ChevronRight, X, Filter, Zap
} from 'lucide-react';
import { toast } from 'sonner';

// ─── PropCard (Individual View) ───────────────────────────────────────────
function PropCard({ prop, onAdd, inSlip }: {
  prop: NormalizedProp; onAdd: (p: NormalizedProp) => void; inSlip: boolean;
}) {
  const hasResult = prop.actualResult != null && prop.actualResult !== 'pending';
  const resultNum = hasResult && prop.gameStat != null ? prop.gameStat : null;
  const lineVal = prop.line ?? 0;
  
  const hit = resultNum != null
    ? prop.overUnder?.toLowerCase() === 'over' ? resultNum > lineVal : resultNum < lineVal
    : null;

  return (
    <div className={`bg-[#0f1115] border rounded-2xl p-4 flex flex-col gap-3 transition-colors hover:border-white/10
      ${inSlip ? 'border-[#FFD700]/30' : 'border-white/[0.06]'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-white font-black text-sm italic uppercase truncate">{prop.player ?? 'Unknown'}</p>
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

      <div className="flex items-center gap-2">
        <span className="text-zinc-500 text-xs">{prop.prop ?? '—'}</span>
        <span className="text-white font-mono font-bold text-sm">{lineVal}</span>
        <span className={`text-xs font-black uppercase ${
          prop.overUnder?.toLowerCase() === 'over' ? 'text-blue-400' : 'text-orange-400'
        }`}>{prop.overUnder || '—'}</span>
      </div>

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
              Number(prop.seasonHitPct) >= 0.60 ? 'text-emerald-400' :
              Number(prop.seasonHitPct) >= 0.50 ? 'text-[#FFD700]' : 'text-red-400'
            }`}>{Number(prop.seasonHitPct * 100).toFixed(0)}%</p>
          </div>
        )}
        {prop.confidenceScore != null && (
          <div className="bg-black/30 rounded-xl p-2 text-center">
            <p className="text-[8px] text-zinc-700 uppercase font-black">Conf</p>
            <p className="text-zinc-300 font-mono text-xs font-bold">{Number(prop.confidenceScore).toFixed(1)}</p>
          </div>
        )}
      </div>

      {hasResult && (
        <div className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold ${
          hit === true  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
          hit === false ? 'bg-red-500/10 border-red-500/20 text-red-400' :
          'bg-white/[0.03] border-white/[0.06] text-zinc-400'
        }`}>
          <span>Result</span>
          <span className="font-mono">{prop.gameStat}{hit != null ? (hit ? ' ✓' : ' ✗') : ''}</span>
        </div>
      )}

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


// ─── Page Component ──────────────────────────────────────────────────────────

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
  const [searchTerm,    setSearchTerm]    = useState('');
  const [propFilter,    setPropFilter]    = useState('');
  const [weekFilter,    setWeekFilter]    = useState('');
  const [seasonFilter,  setSeasonFilter]  = useState('all');
  const [showManual,    setShowManual]    = useState(false);
  const [isEnriching,   setIsEnriching]   = useState(false);
  const [propLegs,      setPropLegs]      = useState<NormalizedProp[]>([]);

  const [cardPage, setCardPage] = useState(0);
  const CARDS_PER_PAGE = 48;

  useEffect(() => {
    fetchProps();
  }, [fetchProps]);

  useEffect(() => {
    setCardPage(0);
  }, [propLegs]);

  const handleSearch = () => {
    let list = allProps;
    if (searchTerm) {
      const ls = searchTerm.toLowerCase();
      list = list.filter(p => (p.player ?? '').toLowerCase().includes(ls));
    }
    if (propFilter) {
      list = list.filter(p => (p.prop ?? '').toLowerCase().includes(propFilter.toLowerCase()));
    }
    if (weekFilter) {
      const wn = parseInt(weekFilter);
      if (!isNaN(wn)) list = list.filter(p => p.week === wn);
    }
    if (seasonFilter !== 'all') {
      const sn = parseInt(seasonFilter);
      list = list.filter(p => p.season === sn);
    }
    setPropLegs(list);
    fetchProps(); 
  };
  
  const handleReset = () => {
    setSearchTerm('');
    setPropFilter('');
    setWeekFilter('');
    setSeasonFilter('all');
    setPropLegs([]);
  };

  const cardPages  = Math.ceil(propLegs.length / CARDS_PER_PAGE);
  const cardSlice  = propLegs.slice(cardPage * CARDS_PER_PAGE, (cardPage + 1) * CARDS_PER_PAGE);

  const slipIds = useMemo(() => new Set(selections.map((s: any) => String(s.propId ?? s.id))), [selections]);

  const handleBulkEnrich = async () => {
    const currentWeek = weekFilter ? parseInt(weekFilter) : null;
    if (!currentWeek) {
      toast.error("Please filter by a specific week to enrich.");
      return;
    }
    
    setIsEnriching(true);
    const toastId = toast.loading(`Enriching Week ${currentWeek} and updating Betting Log...`);
  
    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          week: currentWeek, 
          season: parseInt(seasonFilter === 'all' ? '2025' : seasonFilter) 
        })
      });
      
      if (!res.ok) throw new Error('Enrichment API failed');
  
      const data = await res.json();
      
      // SUCCESS: Force a hard refresh of the props data and the betting log
      toast.success(`Enriched ${data.count} props. Updating logs...`, { id: toastId });
      
      // This triggers useAllProps to re-pull from Firestore
      await fetchProps(true); 
      
      // Reset local display list to show the newly enriched data
      handleSearch(); 
  
    } catch (err) {
      console.error(err);
      toast.error("Enrichment failed. Check server logs.", { id: toastId });
    } finally {
      setIsEnriching(false);
    }
  };

  const handleAddToSlip = useCallback((prop: NormalizedProp) => {
    const propId = String(prop.id);
    if (slipIds.has(propId)) {
      toast.error(`${prop.player} already in slip`);
      return;
    }
    addLeg({
      id:        propId,
      propId,
      player:    prop.player ?? 'Unknown',
      prop:      prop.prop ?? 'Prop',
      line:      prop.line ?? 0,
      selection: (prop.overUnder as 'Over' | 'Under') || 'Over',
      odds:      prop.bestOdds ?? -110,
      matchup:   prop.matchup ?? '',
      team:      prop.team ?? '',
      week:      prop.week ?? undefined,
      season:    prop.season ?? undefined,
      gameDate:  prop.gameDate ?? new Date().toISOString(),
      status:    'pending',
    });
    toast.success(`${prop.player} added to slip`, {
      style: { background: '#0f1115', border: '1px solid rgba(255,215,0,0.2)', color: '#FFD700' },
    });
  }, [addLeg, slipIds]);

  return (
    <main className="min-h-screen bg-[#060606] text-white p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-5">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white italic uppercase">Historical Props</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {loading
                ? 'Loading…'
                : `${propLegs.length.toLocaleString()} of ${(totalCount ?? 0).toLocaleString()} props shown`}
              {cacheAge != null && !loading && (
                <span className="text-zinc-700 ml-2 text-[10px] font-mono">cache {cacheAge}s</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
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

            <button 
              onClick={handleBulkEnrich} 
              disabled={isEnriching || !weekFilter}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-xs font-black uppercase transition-colors disabled:opacity-30"
            >
              <Zap className={`h-3.5 w-3.5 ${isEnriching ? 'animate-pulse' : ''}`} />
              Enrich
            </button>

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

        <div className="flex flex-wrap items-end gap-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Player</label>
            <input 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white text-xs px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
              placeholder="Search Player..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Prop</label>
            <select 
              value={propFilter} 
              onChange={e => setPropFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white text-xs px-3 py-2 rounded-lg outline-none focus:border-emerald-500 h-[34px]"
            >
              <option value="">All Props</option>
              {propTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Week</label>
            <input 
              type="number"
              min="1"
              max="22"
              value={weekFilter} 
              onChange={e => setWeekFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white text-xs px-3 py-2 rounded-lg outline-none focus:border-emerald-500"
              placeholder="Week #"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase ml-1">Season</label>
            <div className="flex rounded-lg overflow-hidden border border-slate-700 h-[34px]">
              {SEASON_OPTIONS.map(s => (
                  <button key={s.value} onClick={() => setSeasonFilter(s.value)}
                  className={`px-2.5 py-2 text-[9px] font-bold uppercase whitespace-nowrap transition-colors ${
                      seasonFilter === s.value ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
                  }`}>
                  {s.label}
                  </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={handleSearch}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-xs font-bold transition-colors"
            >
              SEARCH
            </button>
            <button 
              onClick={handleReset}
              className="bg-slate-800 hover:bg-slate-700 text-slate-400 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
            >
              RESET
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => fetchProps(true)} className="text-red-400 hover:text-red-300 font-black text-xs">Retry</button>
          </div>
        )}

        {loading && propLegs.length === 0 && (
          <div className="flex items-center justify-center py-20 text-zinc-600">
            <Loader2 className="h-6 w-6 animate-spin mr-3" />
            <span className="text-sm font-black uppercase italic">Loading props…</span>
          </div>
        )}

        {!loading && view === 'table' && (
          <PropsTable
            props={propLegs}
            isLoading={loading}
            onAddToBetSlip={handleAddToSlip}
            onDelete={deleteProp}
            slipIds={slipIds}
          />
        )}

        {!loading && view === 'cards' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {cardSlice.map(prop => (
                <PropCard
                  key={prop.id}
                  prop={prop}
                  onAdd={handleAddToSlip}
                  inSlip={slipIds.has(String(prop.id))}
                />
              ))}
            </div>

            {cardSlice.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-700">
                <Filter className="h-10 w-10 mb-3" />
                <p className="text-sm font-black uppercase italic">No props match filters</p>
                <p className="text-xs text-zinc-500">Try changing your search criteria</p>
              </div>
            )}

            {cardPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <button onClick={() => setCardPage(p => Math.max(0, p - 1))} disabled={cardPage === 0}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl border border-white/[0.08] text-zinc-500 hover:text-white text-xs font-black uppercase disabled:opacity-30 transition-colors">
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                <span className="text-zinc-600 text-[10px] font-mono">
                  {cardPage * CARDS_PER_PAGE + 1}–{Math.min((cardPage + 1) * CARDS_PER_PAGE, propLegs.length)} of {propLegs.length.toLocaleString()}
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
