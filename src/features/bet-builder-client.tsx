'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAllProps, NormalizedProp } from '@/hooks/useAllProps';
import { useBetSlip } from '@/hooks/useBetSlip';
import { PropsTable } from '@/components/bets/PropsTable';
import { BetSlipPanel } from '@/components/bets/BetSlipPanel';
import { RefreshCw, LayoutGrid, Table2, SlidersHorizontal, Zap, Settings2, Check } from 'lucide-react';
import { toast } from 'sonner';

const COLUMN_OPTIONS = [
    { id: 'week', label: 'Wk/Date' },
    { id: 'player', label: 'Player' },
    { id: 'matchup', label: 'Matchup' },
    { id: 'avg', label: 'Avg' },
    { id: 'oppRank', label: 'Opp Rank' },
    { id: 'hitPct', label: 'Hit %' },
    { id: 'edge', label: 'Edge/EV' },
    { id: 'conf', label: 'Conf' },
  ];

export function BetBuilderClient({ initialWeek, season = 2025 }: { initialWeek: number; season?: number }) {
    const { allProps: rawProps, loading: isLoading, error, propTypes, fetchProps, deleteProp } = useAllProps(initialWeek);
    const { selections, addLeg, removeLeg, clear } = useBetSlip();
  
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [isEnriching, setIsEnriching] = useState(false);
    const [filters, setFilters] = useState({ search: '', propType: '', team: '' });
    const [visibleColumns, setVisibleColumns] = useState<string[]>(COLUMN_OPTIONS.map(c => c.id));
    const [showColumnMenu, setShowColumnMenu] = useState(false);

    const toggleColumn = (id: string) => {
        setVisibleColumns(prev => 
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const filteredProps = useMemo(() => {
        let list: NormalizedProp[] = rawProps ?? [];
        const search = filters.search.trim().toLowerCase();
        if (search) {
          list = list.filter(p =>
            (p.player ?? '').toLowerCase().includes(search) ||
            (p.prop ?? '').toLowerCase().includes(search) ||
            (p.matchup ?? '').toLowerCase().includes(search)
          );
        }
        if (filters.propType) {
          list = list.filter(p => (p.prop ?? '').toLowerCase() === filters.propType.toLowerCase());
        }
        if (filters.team) {
          list = list.filter(p => (p.team ?? '').toLowerCase() === filters.team.toLowerCase());
        }
        return list.filter((p): p is NormalizedProp & { id: string } => !!p.id);
      }, [rawProps, filters]);

    const slipIds = useMemo(
        () => new Set((selections ?? []).map((s: any) => String(s.propId ?? s.id))),
        [selections]
      );
    
      const handleAddLeg = useCallback((prop: NormalizedProp) => {
        addLeg({
          id:        String(prop.id),
          propId:    String(prop.id),
          player:    prop.player || 'Unknown',
          prop:      prop.prop || '',
          line:      prop.line ?? 0,
          selection: (prop.overUnder as 'Over' | 'Under') || 'Over',
          matchup:   prop.matchup,
          team:      prop.team,
          week:      initialWeek,
          season:    season,
          status:    'pending',
        });
      }, [addLeg, initialWeek, season]);

    // --- Enrichment Logic ---
    const handleBulkEnrich = async () => {
      setIsEnriching(true);
      const toastId = toast.loading(`Enriching Week ${initialWeek} Stats...`);
      
      try {
        const res = await fetch('/api/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ week: initialWeek, season })
        });
        
        if (!res.ok) throw new Error('Failed to enrich');
        
        const data = await res.json();
        toast.success(`Successfully enriched ${data.count} props`, { id: toastId });
        fetchProps(true); // Trigger a fresh fetch to see new stats
      } catch (err) {
        toast.error("Enrichment failed. Check server logs.", { id: toastId });
      } finally {
        setIsEnriching(false);
      }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[#060606] text-white">
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div>
                        <h1 className="text-3xl font-black italic uppercase tracking-tighter">
                            Market <span className="text-[#FFD700]">Builder</span>
                        </h1>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase mt-1">
                            NFL Week {initialWeek} | {filteredProps.length} Props
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button
                                onClick={() => setShowColumnMenu(!showColumnMenu)}
                                className={`p-2 rounded-xl border transition-all ${showColumnMenu ? 'bg-[#FFD700]/10 border-[#FFD700]/30 text-[#FFD700]' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-white'}`}
                            >
                                <Settings2 className="w-4 h-4" />
                            </button>

                            {showColumnMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-[#0f1115] border border-white/10 rounded-xl shadow-2xl z-50 py-2">
                                    <p className="px-4 py-2 text-[10px] font-black uppercase text-zinc-500 border-b border-white/5 mb-1">Display Columns</p>
                                    {COLUMN_OPTIONS.map(col => (
                                        <button
                                            key={col.id}
                                            onClick={() => toggleColumn(col.id)}
                                            className="w-full flex items-center justify-between px-4 py-2 text-xs hover:bg-white/5 transition-colors"
                                        >
                                            <span className={visibleColumns.includes(col.id) ? 'text-white' : 'text-zinc-600'}>{col.label}</span>
                                            {visibleColumns.includes(col.id) && <Check className="w-3 h-3 text-[#FFD700]" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleBulkEnrich}
                            disabled={isEnriching || isLoading}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 text-[10px] font-black uppercase transition-all disabled:opacity-30"
                        >
                            <Zap className={`h-3.5 w-3.5 ${isEnriching ? 'animate-pulse' : ''}`} />
                            {isEnriching ? 'Enriching...' : 'Enrich Stats'}
                        </button>

                        <button onClick={() => fetchProps(true)} className="p-2 bg-zinc-900 border border-white/5 rounded-xl text-zinc-500 hover:text-white">
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <PropsTable
                        props={filteredProps}
                        isLoading={isLoading}
                        onAddToBetSlip={handleAddLeg}
                        onDelete={deleteProp} 
                        slipIds={slipIds}
                        visibleColumns={visibleColumns}
                    />
                </div>
            </div>
             <div className="w-96 shrink-0 border-l border-white/5 overflow-hidden">
                <BetSlipPanel
                    selections={selections}
                    onRemove={removeLeg}
                    onClear={clear}
                    week={initialWeek}
                />
            </div>
        </div>
    );
}