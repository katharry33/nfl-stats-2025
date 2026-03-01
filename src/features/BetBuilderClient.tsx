'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useProps } from '@/hooks/useProps';
import { useBetSlip } from '@/hooks/useBetSlip';
import PropsTable from './PropsTable';
import { BetSlipPanel } from './BetSlipPanel';
import { NFLProp, SortKey, SortDir, BetLeg } from '@/lib/types';
import { calculateParlayOdds } from '@/lib/utils/odds';
import { RefreshCw } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PropFilters {
  search: string;
  propType: string;
  team: string;
}

interface BetBuilderClientProps {
  initialWeek: number;
  season?: number;
}

export function BetBuilderClient({ initialWeek, season = 2025 }: BetBuilderClientProps) {
  const router = useRouter();

  const {
    props: rawProps,
    isLoading,
    error,
    propTypes,
    teams,
  } = useProps(initialWeek, season);

  const {
    items: selections,
    totalStake,
    savingIds,
    addToBetSlip,
    removeFromBetSlip,
    updateBetAmount,
    clearBetSlip,
    isInBetSlip,
    addLegToSlip,
  } = useBetSlip(initialWeek, season);

  // ── Client-side filter + sort state ─────────────────────────────────────────
  const [filters, setFilters] = useState<PropFilters>({
    search: '',
    propType: '',
    team: '',
  });
  const [sortKey, setSortKey] = useState<SortKey>('player');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const setSort = useCallback((key: SortKey) => {
    setSortDir(prev => key === sortKey ? (prev === 'asc' ? 'desc' : 'asc') : 'asc');
    setSortKey(key);
  }, [sortKey]);

  // ── Filter + sort in-memory ──────────────────────────────────────────────────
  const filteredProps = useMemo(() => {
    let list = rawProps ?? [];

    const search = filters.search.trim().toLowerCase();
    if (search) {
      list = list.filter((p: NFLProp) =>
        p.player?.toLowerCase().includes(search) ||
        p.matchup?.toLowerCase().includes(search) ||
        p.prop?.toLowerCase().includes(search)
      );
    }
    if (filters.propType) {
      list = list.filter((p: NFLProp) =>
        (p.prop ?? '').toLowerCase() === filters.propType.toLowerCase()
      );
    }
    if (filters.team) {
      list = list.filter((p: NFLProp) =>
        (p.team ?? '').toLowerCase() === filters.team.toLowerCase()
      );
    }

    return [...list].sort((a, b) => {
      const av = String(a[sortKey as keyof typeof a] ?? '').toLowerCase();
      const bv = String(b[sortKey as keyof typeof b] ?? '').toLowerCase();
      const numA = parseFloat(av), numB = parseFloat(bv);
      
      const cmp = !isNaN(numA) && !isNaN(numB)
        ? numA - numB
        : av.localeCompare(bv);
        
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rawProps, filters, sortKey, sortDir]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSaveToParlay = () => {
    sessionStorage.setItem('pendingBetSlip', JSON.stringify(selections));
    router.push('/parlay-studio');
  };
  
  const handleAddManualLeg = async (form: any) => {
    const { playerName, selectedProp, line, playerTeam, currentMatchup, selectedDate } = form;
    
    const newLeg: BetLeg = {
      id: crypto.randomUUID(),
      player: playerName,
      prop: selectedProp,
      line: Number(line) || 0, // Fixed the array/number type mismatch
      selection: 'Over',
      odds: -110,
      status: 'pending',
      team: playerTeam,
      matchup: currentMatchup,
      gameDate: selectedDate,
    };
    
    addLegToSlip(newLeg);
  
    try {
      await fetch('/api/props/save-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLeg)
      });
    } catch (err) {
      console.error("Failed to persist manual prop:", err);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-screen bg-[#060606] p-4 md:p-8 text-white">

      {/* ── Main Content Area ─────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white">
              Bet Builder
            </h1>
            <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mt-1">
              NFL Week {initialWeek} <span className="text-[#FFD700] mx-2">/</span> {season} Season
            </p>
          </div>
          <button
            onClick={() => router.refresh()}
            className="group flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-white/5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all"
          >
            <RefreshCw className="w-3 h-3 group-active:rotate-180 transition-transform duration-500" />
            Refresh
          </button>
        </header>

        <PropsTable
          props={filteredProps}
          isLoading={isLoading}
          error={error}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={setSort}
          filters={filters}
          onFilterChange={setFilters}
          propTypes={propTypes}
          teams={teams}
          isInBetSlip={isInBetSlip}
          onAddToBetSlip={addToBetSlip}
          onRemoveFromBetSlip={removeFromBetSlip}
        />
      </main>

      {/* ── Sidebar Bet Slip ─────────────────────────────────────────────── */}
      <aside className="w-full lg:w-[380px] flex-shrink-0">
        <div className="sticky top-8 bg-[#0f1115] border border-white/5 rounded-[2.5rem] p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[#FFD700] text-xl font-black italic uppercase tracking-tight">
              Current Slip
            </h2>
            {selections.length > 0 && (
              <span className="bg-[#FFD700] text-black text-[10px] font-black rounded-full px-2 py-0.5 uppercase">
                {selections.length} Legs
              </span>
            )}
          </div>

          <BetSlipPanel
            items={selections}
            totalStake={totalStake}
            savingIds={savingIds}
            onUpdateAmount={updateBetAmount}
            onRemove={removeFromBetSlip}
            onClear={clearBetSlip}
            onSaveToParlay={handleSaveToParlay}
            onAddManualLeg={handleAddManualLeg}
          />
        </div>
      </aside>
    </div>
  );
}