'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAllProps, NormalizedProp } from '@/hooks/useAllProps'; 
import { useBetSlip } from '@/hooks/useBetSlip';
import BetBuilderTable from '@/components/bets/bet-builder-table'; 
import { NFLProp } from '@/lib/types';
import { RefreshCw, Search } from 'lucide-react';

export function BetBuilderClient({ initialWeek, season = 2025 }: { initialWeek: number; season?: number }) {
  const { allProps: rawProps, loading: isLoading, error, fetchProps } = useAllProps();
  const { isInBetSlip, addToBetSlip, removeFromBetSlip } = useBetSlip(initialWeek, season);

  const [filters, setFilters] = useState({ search: '', propType: '', team: '' });

  // 1. Explicitly type 'p' as NormalizedProp to fix "implicitly has any" errors
  const filteredProps = useMemo(() => {
    let list: NormalizedProp[] = rawProps ?? [];
    const search = filters.search.trim().toLowerCase();
    
    if (search) {
      list = list.filter((p: NormalizedProp) =>
        (p.player || '').toLowerCase().includes(search) ||
        (p.prop || '').toLowerCase().includes(search)
      );
    }
    if (filters.propType) {
      list = list.filter((p: NormalizedProp) => 
        (p.prop || '').toLowerCase() === filters.propType.toLowerCase()
      );
    }
    if (filters.team) {
      list = list.filter((p: NormalizedProp) => 
        (p.team || '').toLowerCase() === filters.team.toLowerCase()
      );
    }

    // 2. Resolve the ID mismatch error (2322)
    // We use a Type Guard to ensure every prop passed to the table has a string ID.
    return list.filter((p): p is NormalizedProp & { id: string } => !!p.id);
  }, [rawProps, filters]);

  useEffect(() => {
    fetchProps();
  }, [fetchProps]);

  return (
    <div className="space-y-6 p-4 md:p-8 bg-[#060606] text-white">
      {/* Header & Search UI */}
      <div className="flex justify-between items-end gap-4">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">
          Market <span className="text-[#FFD700]">Builder</span>
        </h1>
        <div className="flex gap-2">
           <input 
             className="bg-zinc-900 border border-white/5 rounded-xl px-4 py-2 text-xs"
             placeholder="Search players..."
             value={filters.search}
             onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
           />
           <button onClick={() => fetchProps(true)} className="p-2 bg-zinc-900 rounded-xl">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      {error && <div className="text-red-500 text-xs uppercase font-bold">{error}</div>}

      <BetBuilderTable
        // We cast to any here only because the internal NFLProp 
        // and NormalizedProp might have slight property mismatches, 
        // but our Type Guard ensures the 'id' requirement is met.
        props={filteredProps as any} 
        isLoading={isLoading}
        isInBetSlip={isInBetSlip}
        onAddToBetSlip={(prop) => addToBetSlip(prop as any)}
        onRemoveFromBetSlip={removeFromBetSlip}
      />
    </div>
  );
}