// src/features/bet-builder/BetBuilderClient.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useProps } from '@/hooks/useProps';
import { useBetSlip } from '@/hooks/useBetSlip';
import PropsTable from './PropsTable'; // Corrected import
import { BetSlipPanel } from './BetSlipPanel';
import type { NFLProp } from '@/lib/enrichment/types';

interface BetBuilderClientProps {
  initialWeek: number;
  season?: number;
}

export function BetBuilderClient({ initialWeek, season = 2025 }: BetBuilderClientProps) {
  const router = useRouter();

  const {
    filteredProps, isLoading, error,
    filters, setFilters,
    sortKey, sortDir, setSort,
    propTypes, teams,
    refresh,
  } = useProps(initialWeek, season);

  const {
    items, totalStake, savingIds,
    addToBetSlip, removeFromBetSlip,
    updateBetAmount, clearBetSlip,
    isInBetSlip,
  } = useBetSlip(initialWeek, season);

  const handleSaveToParlay = () => {
    // Store bet slip in sessionStorage so Parlay Studio can pick it up
    sessionStorage.setItem('pendingBetSlip', JSON.stringify(items));
    router.push('/parlay-studio');
  };

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
          onSort={setSort}
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
              {items.length > 0 && (
                <span className="ml-2 bg-green-700 text-white text-xs font-bold rounded-full w-5 h-5 inline-flex items-center justify-center">
                  {items.length}
                </span>
              )}
            </h2>
          </div>

          <BetSlipPanel
            items={items}
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
