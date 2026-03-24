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
  Table,
} from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';

interface FlexibleDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  tableId: string;
  onTableInstance?: (table: Table<TData>) => void;
}

// Fixed: Explicitly generic <TData, TValue>
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
      setColumnOrder(columns.map(c => (c as any).id || (c as any).accessorKey));
    }
  }, [tableId, columns]);

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
    // Fixed: Removed enableColumnReorder (it's not a valid root prop in v8)
  });

  useEffect(() => {
    if (onTableInstance) onTableInstance(table);
  }, [table, onTableInstance]);

  return (
    <div className="w-full overflow-x-auto custom-scrollbar bg-zinc-900/10 rounded-b-[24px]">
      <table className="w-full text-left border-collapse border-spacing-0">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="bg-zinc-900/80 border-b border-white/5">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 select-none"
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-white/5">
          {isLoading && data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="h-64 text-center">
                <Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-500 opacity-50" />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="h-32 text-center text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                No matching data found
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-white/5 transition-colors group">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3.5 text-xs text-zinc-300 font-medium">
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