'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ColumnDef, flexRender, getCoreRowModel, getSortedRowModel,
  useReactTable, SortingState, ColumnOrderState, VisibilityState,
  Table, Updater, TableOptions,
} from '@tanstack/react-table';
import { Loader2, GripVertical, ChevronDown, SlidersHorizontal } from 'lucide-react';

interface FlexibleDataTableProps<TData, TValue = unknown> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  tableId: string;
  onTableInstance?: (table: Table<TData>) => void;
  defaultColumnVisibility?: VisibilityState;
  state?: {
    columnVisibility?: VisibilityState;
    sorting?: SortingState;
    columnOrder?: ColumnOrderState;
  };
  onColumnVisibilityChange?: (updater: Updater<VisibilityState>) => void;
  onSortingChange?: (updater: Updater<SortingState>) => void;
  onColumnOrderChange?: (updater: Updater<ColumnOrderState>) => void;
  meta?: TableOptions<TData>['meta'];
  onLoadMore?: () => void | Promise<void>;
  hasMore?: boolean;
  /** Slot rendered on the LEFT of the toolbar (search, filters, etc.) */
  toolbarLeft?: React.ReactNode;
}

// ─── Draggable Column Selector ────────────────────────────────────────────────

function ColumnSelector<TData>({
  table,
  onColumnOrderChange,
}: {
  table: Table<TData>;
  onColumnOrderChange: (updater: Updater<ColumnOrderState>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dragId = useRef<string | null>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Only include columns where enableHiding !== false
  const allCols = table.getAllLeafColumns().filter((c) => c.columnDef.enableHiding !== false);
  const orderedIds = table.getState().columnOrder;
  const orderedCols = orderedIds.length > 0
    ? orderedIds.map((id) => allCols.find((c) => c.id === id)).filter(Boolean) as typeof allCols
    : allCols;

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (!dragId.current || dragId.current === id) return;
    const full = table.getState().columnOrder.length > 0
      ? [...table.getState().columnOrder]
      : table.getAllLeafColumns().map((c) => c.id);
    const from = full.indexOf(dragId.current);
    const to   = full.indexOf(id);
    if (from === -1 || to === -1) return;
    const next = [...full];
    next.splice(from, 1);
    next.splice(to, 0, dragId.current);
    onColumnOrderChange(next);
  }

  const visibleCount = orderedCols.filter((c) => c.getIsVisible()).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 text-zinc-400 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
      >
        <SlidersHorizontal size={12} />
        <span>Columns</span>
        <span className="bg-indigo-500/20 text-indigo-400 rounded-md px-1.5 py-0.5 text-[9px] font-black">
          {visibleCount}
        </span>
        <ChevronDown size={11} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Show / Reorder</span>
            <span className="text-[9px] text-zinc-700">drag to reorder</span>
          </div>
          <div className="overflow-y-auto max-h-72 py-1 custom-scrollbar">
            {orderedCols.map((col) => {
              const label =
                typeof col.columnDef.header === 'string'
                  ? col.columnDef.header
                  : col.id.replace(/-/g, ' ');
              return (
                <div
                  key={col.id}
                  draggable
                  onDragStart={() => { dragId.current = col.id; }}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragEnd={() => { dragId.current = null; }}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 cursor-grab active:cursor-grabbing group"
                >
                  <GripVertical size={11} className="text-zinc-700 group-hover:text-zinc-500 shrink-0" />
                  <input
                    type="checkbox"
                    checked={col.getIsVisible()}
                    onChange={() => col.toggleVisibility()}
                    onClick={(e) => e.stopPropagation()}
                    className="accent-indigo-500 shrink-0"
                  />
                  <span className="text-xs text-zinc-300 capitalize truncate">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FlexibleDataTable<TData, TValue = unknown>({
  columns,
  data,
  isLoading,
  tableId,
  onTableInstance,
  defaultColumnVisibility = {},
  state: externalState,
  onColumnVisibilityChange,
  onSortingChange,
  onColumnOrderChange,
  meta,
  onLoadMore,
  hasMore,
  toolbarLeft,
}: FlexibleDataTableProps<TData, TValue>) {
  const [internalSorting,           setInternalSorting]           = useState<SortingState>([]);
  const [internalColumnOrder,       setInternalColumnOrder]       = useState<ColumnOrderState>(
    () => columns.map((c) => ((c as any).id || (c as any).accessorKey) as string)
  );
  const [internalColumnVisibility,  setInternalColumnVisibility]  = useState<VisibilityState>(defaultColumnVisibility);
  const [loadingMore,               setLoadingMore]               = useState(false);

  // Restore from localStorage (merge on top of defaults so new cols get their intended state)
  useEffect(() => {
    if (onColumnOrderChange || onColumnVisibilityChange) return;
    const saved = localStorage.getItem(`table-prefs-${tableId}`);
    if (!saved) return;
    try {
      const { order, visibility } = JSON.parse(saved);
      if (order)      setInternalColumnOrder(order);
      if (visibility) setInternalColumnVisibility({ ...defaultColumnVisibility, ...visibility });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  // Persist to localStorage
  useEffect(() => {
    if (onColumnOrderChange || onColumnVisibilityChange) return;
    localStorage.setItem(
      `table-prefs-${tableId}`,
      JSON.stringify({ order: internalColumnOrder, visibility: internalColumnVisibility })
    );
  }, [internalColumnOrder, internalColumnVisibility, tableId, onColumnOrderChange, onColumnVisibilityChange]);

  const state = useMemo(() => ({
    sorting:          externalState?.sorting          ?? internalSorting,
    columnOrder:      externalState?.columnOrder      ?? internalColumnOrder,
    columnVisibility: externalState?.columnVisibility ?? internalColumnVisibility,
  }), [
    externalState?.sorting, externalState?.columnOrder, externalState?.columnVisibility,
    internalSorting, internalColumnOrder, internalColumnVisibility,
  ]);

  const table = useReactTable({
    data,
    columns,
    state,
    onSortingChange:          onSortingChange          ?? setInternalSorting,
    onColumnOrderChange:      onColumnOrderChange      ?? setInternalColumnOrder,
    onColumnVisibilityChange: onColumnVisibilityChange ?? setInternalColumnVisibility,
    getCoreRowModel:   getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    meta,
  });

  useEffect(() => { if (onTableInstance) onTableInstance(table); }, [table, onTableInstance]);

  const handleLoadMore = async () => {
    if (!onLoadMore || loadingMore) return;
    setLoadingMore(true);
    await onLoadMore();
    setLoadingMore(false);
  };

  const handleOrderChange = onColumnOrderChange ?? setInternalColumnOrder;

  return (
    <div className="w-full overflow-x-auto custom-scrollbar bg-zinc-900/10 rounded-b-[24px]">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/5 sticky top-0 bg-zinc-900/90 backdrop-blur-sm z-20">
        {/* Left slot: search, filters etc. */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {toolbarLeft}
        </div>

        {/* Right: row count + columns toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest hidden sm:block">
            {data.length} rows
          </span>
          <ColumnSelector table={table} onColumnOrderChange={handleOrderChange} />
        </div>
      </div>

      {/* ── Table ── */}
      <table className="w-full text-left border-collapse border-spacing-0">
        <thead className="sticky top-[49px] z-10">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="bg-zinc-900/95 border-b border-white/5">
              {hg.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const canSort = header.column.getCanSort();
                return (
                  <th
                    key={header.id}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 select-none whitespace-nowrap"
                    style={{ cursor: canSort ? 'pointer' : 'default' }}
                  >
                    <div className="flex items-center gap-1 hover:text-white transition-colors">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {sorted === 'asc'  && <span className="text-indigo-400 text-[9px]">↑</span>}
                      {sorted === 'desc' && <span className="text-indigo-400 text-[9px]">↓</span>}
                      {!sorted && canSort && <span className="text-zinc-700 text-[8px]">⇅</span>}
                    </div>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>

        <tbody className="divide-y divide-white/4">
          {isLoading && data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="h-64 text-center">
                <Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-500 opacity-40" />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="h-32 text-center text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                No data found
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => {
              const result = (row.original as any).actualResult;
              return (
                <tr
                  key={row.id}
                  className={[
                    'border-b border-white/4 transition-colors hover:bg-white/2',
                    result === 'Won'  ? 'bg-emerald-500/5' : '',
                    result === 'Lost' ? 'bg-red-500/5'     : '',
                  ].filter(Boolean).join(' ')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-xs text-zinc-300 font-medium">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* ── Load More Footer ── */}
      {(hasMore || (isLoading && data.length > 0)) && (
        <div className="flex items-center justify-center py-5 border-t border-white/5">
          {isLoading && data.length > 0 ? (
            <Loader2 className="animate-spin h-5 w-5 text-indigo-500 opacity-40" />
          ) : (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-indigo-500/10 border border-white/10 hover:border-indigo-500/30 rounded-xl text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {loadingMore && <Loader2 size={12} className="animate-spin" />}
              {loadingMore ? 'Loading…' : 'Load More'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}