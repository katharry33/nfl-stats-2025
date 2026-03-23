'use client';

import React, { useState, useEffect } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnOrderState,
  VisibilityState,
} from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';

interface FlexibleDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  tableId: string;
  onTableInstance?: (table: any) => void;
}

export function FlexibleDataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  tableId,
  onTableInstance,
}: FlexibleDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // ── PERSISTENCE LOAD ──
  useEffect(() => {
    const saved = localStorage.getItem(`table-prefs-${tableId}`);
    if (saved) {
      try {
        const { order, visibility } = JSON.parse(saved);
        if (order) setColumnOrder(order);
        if (visibility) setColumnVisibility(visibility);
      } catch (e) {
        console.error("Failed to load table prefs", e);
      }
    } else {
      // Default order if none exists
      setColumnOrder(columns.map(c => c.id as string));
    }
  }, [tableId, columns]);

  // ── PERSISTENCE SAVE HELPER ──
  const savePrefs = (order: ColumnOrderState, visibility: VisibilityState) => {
    localStorage.setItem(`table-prefs-${tableId}`, JSON.stringify({ order, visibility }));
  };

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnOrder, columnVisibility },
    onSortingChange: setSorting,
    onColumnOrderChange: (updater) => {
      const next = typeof updater === 'function' ? updater(columnOrder) : updater;
      setColumnOrder(next);
      savePrefs(next, columnVisibility);
    },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === 'function' ? updater(columnVisibility) : updater;
      setColumnVisibility(next);
      savePrefs(columnOrder, next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableColumnReorder: true,
  });

  // Provide instance to parent (for ColumnToggle)
  useEffect(() => {
    if (onTableInstance) onTableInstance(table);
  }, [table.getState().columnVisibility, onTableInstance]); // Re-sync when visibility changes

  return (
    <div className="w-full overflow-x-auto custom-scrollbar bg-[#121212] rounded-b-[24px]">
      <table className="w-full text-left border-collapse border-spacing-0">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="bg-zinc-900/80 border-b border-white/5">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-indigo-400 transition-colors cursor-move select-none"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('colId', header.column.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const draggedId = e.dataTransfer.getData('colId');
                    const targetId = header.column.id;
                    if (draggedId !== targetId) {
                      const currentOrder = table.getState().columnOrder;
                      const newOrder = [...currentOrder];
                      const oldIdx = newOrder.indexOf(draggedId);
                      const newIdx = newOrder.indexOf(targetId);
                      
                      newOrder.splice(oldIdx, 1);
                      newOrder.splice(newIdx, 0, draggedId);
                      
                      setColumnOrder(newOrder); // Update local state
                      savePrefs(newOrder, columnVisibility); // Persist immediately
                    }
                  }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-white/5 bg-zinc-900/20">
          {isLoading && data.length === 0 ? (
            <tr>
              <td colSpan={table.getVisibleFlatColumns().length} className="h-64 text-center">
                <Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-500 opacity-50" />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={table.getVisibleFlatColumns().length} className="h-32 text-center text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                No matching historical data found
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-white/[0.03] transition-colors group">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3.5 text-xs text-zinc-300 font-medium whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}