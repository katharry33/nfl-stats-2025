'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAllProps } from '@/hooks/useAllProps'; // Fixed import name
import { useBetSlip } from '@/hooks/useBetSlip';
import BetBuilderTable from '@/components/bets/bet-builder-table'; // Fixed path
import { BetSlipPanel } from './BetSlipPanel'; 
import { NFLProp, BetLeg } from '@/lib/types';
import { RefreshCw, Search } from 'lucide-react';

interface BetBuilderClientProps {
  initialWeek: number;
  season?: number;
}

export function BetBuilderClient({ initialWeek, season = 2025 }: BetBuilderClientProps) {
  const router = useRouter();
  
  // Destructure from the actual hook return values
  const { allProps: rawProps, loading: isLoading, error, propTypes, fetchProps } = useAllProps();
  
  // Initial fetch on mount
  useEffect(() => {
    fetchProps();
  }, [fetchProps]);

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

  const [filters, setFilters] = useState({ search: '', propType: '', team: '' });

  // Compute unique teams from props for the filter (since hook doesn't provide it)
  const teams = useMemo(() => {
    const t = new Set(rawProps.map(p => p.team).filter(Boolean));
    return Array.from(t).sort();
  }, [rawProps]);

  const filteredProps = useMemo(() => {
    let list = rawProps ?? [];
    const search = filters.search.trim().toLowerCase();
    
    if (search) {
      list = list.filter((p: any) =>
        p.player?.toLowerCase().includes(search) ||
        p.prop?.toLowerCase().includes(search)
      );
    }
    if (filters.propType) {
      list = list.filter((p: any) => (p.prop ?? '').toLowerCase() === filters.propType.toLowerCase());
    }
    if (filters.team) {
      list = list.filter((p: any) => (p.team ?? '').toLowerCase() === filters.team.toLowerCase());
    }
    return list;
  }, [rawProps, filters]);

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-screen bg-[#060606] p-4 md:p-8 text-white">
      <main className="flex-1 min-w-0 space-y-6">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
              Market <span className="text-[#FFD700]">Builder</span>
            </h1>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em] mt-2">
              NFL Week {initialWeek} <span className="text-zinc-800 mx-2">|</span> Live Props Feed
            </p>
          </div>
          
          <div className="flex gap-2">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                <input 
                  type="text"
                  placeholder="Search players..."
                  className="bg-zinc-900 border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-[#FFD700]/40 transition-all w-48"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                />
             </div>
             <button onClick={() => fetchProps(true)} className="p-2 bg-zinc-900 border border-white/5 rounded-xl hover:bg-zinc-800 transition-colors">
                <RefreshCw className={`w-4 h-4 text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
             </button>
          </div>
        </header>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold uppercase tracking-widest text-center">
            Error: {error}
          </div>
        )}

        <BetBuilderTable
          // Filter out any props that accidentally don't have an ID 
          // to ensure the table only handles valid data
          props={filteredProps.filter(p => !!p.id) as any} 
          isLoading={isLoading}
          isInBetSlip={isInBetSlip}
          // Use a wrapper to satisfy the type requirement
          onAddToBetSlip={(prop) => addToBetSlip(prop as any)} 
          onRemoveFromBetSlip={removeFromBetSlip}
        />
      </main>

      <aside className="w-full lg:w-[400px] flex-shrink-0">
        <div className="sticky top-8">
           <div className="bg-[#0f1115] border border-white/5 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden">
             <h2 className="text-[#FFD700] text-xl font-black italic uppercase tracking-tight mb-6 flex items-center gap-2">
               Your Ticket
               {selections.length > 0 && (
                 <span className="bg-[#FFD700] text-black text-[10px] px-2 py-0.5 rounded-full not-italic">
                   {selections.length}
                 </span>
               )}
             </h2>

             <BetSlipPanel
               items={selections}
               totalStake={totalStake}
               savingIds={savingIds}
               onUpdateAmount={updateBetAmount}
               onRemove={removeFromBetSlip}
               onClear={clearBetSlip}
               onSaveToParlay={() => {
                 sessionStorage.setItem('pendingBetSlip', JSON.stringify(selections));
                 router.push('/parlay-studio');
               }}
               onAddManualLeg={addLegToSlip}
             />
           </div>
        </div>
      </aside>
    </div>
  );
}