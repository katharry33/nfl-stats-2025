'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutGrid, 
  Table as TableIcon, 
  Settings2, 
  Plus, 
  Loader2, 
  Edit3,
  Trash2 
} from 'lucide-react'; 
import { PropCard } from '@/components/historical-props/prop-card'; 
import { FlexibleDataTable } from '@/components/data-table/flexible-data-table';
import { NormalizedProp } from '@/lib/types';

interface PropsTableProps {
  props:          NormalizedProp[];
  league:         string;
  isLoading:      boolean;
  onAddToBetSlip: (prop: NormalizedProp) => void;
  onEditProp:     (prop: NormalizedProp) => void;
  onDeleteProp?:  (id: string) => Promise<void>;
  slipIds:        Set<string>;
  onOpenManual?:   () => void;
  hasMore?:       boolean;
  onLoadMore?:    () => void;
}

export function PropsTable({
  props,
  league,
  isLoading,
  onAddToBetSlip,
  onEditProp,
  onDeleteProp,
  slipIds,
  onOpenManual,
  hasMore,
  onLoadMore,
}: PropsTableProps) {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [visibleKeys, setVisibleKeys] = useState<string[]>(['player', 'prop', 'line', 'bestOdds']);
  
  // Ref for the Infinite Scroll intersection
  const observerTarget = useRef<HTMLDivElement>(null);

  // 1. Setup Intersection Observer for Infinite Scroll
  useEffect(() => {
    if (!hasMore || isLoading || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [hasMore, isLoading, onLoadMore]);

  // 2. Sort props by confidence score descending
  const sortedProps = useMemo(() => {
    return [...props].sort((a, b) => (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0));
  }, [props]);

  // 3. Define Table Columns with Action Buttons
  const columns = useMemo(() => {
    const baseCols = visibleKeys.map(key => ({
      accessorKey: key,
      header: key === 'bestOdds' ? 'Odds' : key.charAt(0).toUpperCase() + key.slice(1),
      sortable: true,
      cell: key === 'bestOdds' 
        ? (val: number | null | undefined) => {
            if (val === null || val === undefined) return '-';
            return val > 0 ? `+${val}` : val;
          }
        : undefined
    }));

    return [
      ...baseCols,
      {
        accessorKey: 'actions',
        header: 'Action',
        cell: (_: any, row: NormalizedProp) => (
          <div className="flex items-center gap-1">
            <button 
              onClick={() => onAddToBetSlip(row)}
              disabled={slipIds.has(row.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                slipIds.has(row.id) 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-orange-500 text-white hover:bg-orange-400 active:scale-95'
              }`}
            >
              {slipIds.has(row.id) ? 'Added' : '+ Slip'}
            </button>
            
            <button 
              onClick={() => onEditProp(row)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-indigo-400"
              title="Edit Prop"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>

            {onDeleteProp && (
              <button 
                onClick={() => onDeleteProp(row.id)}
                className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-slate-400 hover:text-red-500"
                title="Delete from Archive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )
      }
    ];
  }, [visibleKeys, slipIds, onAddToBetSlip, onEditProp, onDeleteProp]);

  return (
    <div className="space-y-4">
      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/50 p-3 rounded-2xl border border-white/5 sticky top-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* View Switcher */}
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
            <button 
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-slate-800 shadow-sm text-indigo-400' : 'text-slate-500'}`}
            >
              <TableIcon className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-800 shadow-sm text-indigo-400' : 'text-slate-500'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {/* Column Toggle Controls */}
          {viewMode === 'table' && (
            <div className="hidden lg:flex items-center gap-2 border-l border-white/10 pl-3">
              <Settings2 className="h-4 w-4 text-slate-500" />
              {['team', 'week', 'matchup', 'confidenceScore'].map(key => (
                <button
                  key={key}
                  onClick={() => setVisibleKeys(prev => 
                    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                  )}
                  className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold border transition-all ${
                    visibleKeys.includes(key) 
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' 
                      : 'border-transparent text-slate-500 hover:bg-slate-800'
                  }`}
                >
                  {key === 'confidenceScore' ? 'Conf.' : key}
                </button>
              ))}
            </div>
          )}
        </div>

        <button 
          onClick={onOpenManual}
          className="bg-white text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" /> MANUAL ENTRY
        </button>
      </div>

      {/* MAIN DATA VIEW */}
      {viewMode === 'table' ? (
        <div className="rounded-2xl border border-white/5 bg-slate-900/30 overflow-hidden">
          <FlexibleDataTable
            data={sortedProps}
            columns={columns}
            isLoading={isLoading}
            tableId={`${league}-props-archive`}
          />
          
          {hasMore && (
            <div className="p-4 border-t border-white/5 flex justify-center bg-black/20">
              <button 
                onClick={onLoadMore} 
                disabled={isLoading}
                className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-indigo-400 transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load More Historical Data'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
          {sortedProps.map((prop) => (
            <PropCard key={prop.id} prop={prop} />
          ))}
          
          {/* Intersection Observer Target for Grid Mode */}
          <div ref={observerTarget} className="col-span-full h-24 flex flex-col items-center justify-center gap-2">
            {isLoading && (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                <span className="text-[10px] uppercase font-bold text-slate-500 animate-pulse tracking-widest">Syncing Archive...</span>
              </>
            )}
            {!hasMore && props.length > 0 && (
              <p className="text-xs text-slate-600 italic border-t border-white/5 w-full text-center pt-8">
                End of {league.toUpperCase()} archive reached.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}