'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useProps } from '@/hooks/useProps';
import { useBetSlip } from '@/hooks/useBetSlip';
import PropsTable from './PropsTable';
import { BetSlipPanel } from './BetSlipPanel';
import { NFLProp, SortKey, SortDir } from '@/lib/types';
import { toDecimal, toAmerican } from '@/lib/utils/odds';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PropFilters {
  search:   string;
  propType: string;
  team:     string;
}

interface BetBuilderClientProps {
  initialWeek: number;
  season?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BetBuilderClient({ initialWeek, season = 2025 }: BetBuilderClientProps) {
  const router = useRouter();

  // useProps expects number[] — wrap week in array
  const {
    props: rawProps,
    isLoading,
    error,
    propTypes,
    teams,
  } = useProps([initialWeek], season);

  const {
    items: selections,
    totalStake,
    savingIds,
    addToBetSlip,
    removeFromBetSlip,
    updateBetAmount,
    clearBetSlip,
    isInBetSlip,
  } = useBetSlip(initialWeek, season);

  // Calculate the combined decimal odds for the parlay
  const parlayDecimalOdds = selections.reduce((acc: number, leg: any) => {
    // Convert each leg's American odds to Decimal and multiply
    const legOdds = Number(leg.odds) || -110;
    return acc * toDecimal(legOdds);
  }, 1);

  // Convert that total decimal back to American (e.g., 3.64 -> +264)
  const autoAmerican = toAmerican(parlayDecimalOdds);

  // ── Client-side filter + sort state ─────────────────────────────────────────
  const [filters, setFilters] = useState<PropFilters>({
    search:   '',
    propType: '',
    team:     '',
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

  // ── Refresh (re-trigger useProps by nudging — hook manages its own fetch) ───
  // If useProps doesn't expose refresh, just reload the page data via router
  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  // ── Send to Parlay Studio ────────────────────────────────────────────────────
  const handleSaveToParlay = () => {
    sessionStorage.setItem('pendingBetSlip', JSON.stringify(selections));
    router.push('/parlay-studio');
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-6 h-full">

      {/* ── Main props table ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Bet Builder</h1>
            <p className="text-sm text-gray-500 mt-0.5">Week {initialWeek} · {season}</p>
          </div>
          <button
            onClick={refresh}
            className="text-xs text-gray-500 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <span>↻</span> Refresh
          </button>
        </div>

        <PropsTable
          props={filteredProps}
          isLoading={isLoading}
          error={error}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={(key: any) => setSort(key)}
          filters={filters}
          onFilterChange={setFilters}
          propTypes={propTypes}
          teams={teams}
          isInBetSlip={isInBetSlip}
          onAddToBetSlip={(p: NFLProp & { id: string }) => addToBetSlip(p)}
          onRemoveFromBetSlip={removeFromBetSlip}
        />
      </div>

      {/* ── Bet slip sidebar ─────────────────────────────────────────────── */}
      <aside className="w-80 flex-shrink-0">
        <div className="sticky top-6 bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">
              Bet Slip
              {selections.length > 0 && (
                <span className="ml-2 bg-green-700 text-white text-xs font-bold rounded-full w-5 h-5 inline-flex items-center justify-center">
                  {selections.length}
                </span>
              )}
            </h2>
          </div>

          <BetSlipPanel
            items={selections}
            totalStake={totalStake}
            savingIds={savingIds}
            onUpdateAmount={updateBetAmount}
            onRemove={removeFromBetSlip}
            onClear={clearBetSlip}
            onSaveToParlay={handleSaveToParlay}
          />
        </div>
      </aside>
    </div>
  );
}
