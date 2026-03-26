// components/flexible-data-table.tsx
'use client';

import React, { useEffect, useMemo } from 'react';
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
  Updater,
} from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';

interface FlexibleDataTableProps<TData, TValue = unknown> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  tableId: string;
  onTableInstance?: (table: Table<TData>) => void;
  state?: {
    columnVisibility?: VisibilityState;
    sorting?: SortingState;
    columnOrder?: ColumnOrderState;
  };
  onColumnVisibilityChange?: (updater: Updater<VisibilityState>) => void;
  onSortingChange?: (updater: Updater<SortingState>) => void;
  onColumnOrderChange?: (updater: Updater<ColumnOrderState>) => void;
}

function ColumnSelector<TData>({ table }: { table: Table<TData> }) {
  return (
    <div className="p-2">
      <details className="relative">
        <summary className="cursor-pointer text-xs font-black select-none">Columns</summary>
        <div className="absolute bg-zinc-900 p-3 rounded shadow mt-2 z-10">
          {table.getAllLeafColumns().map((col) => (
            <label key={col.id} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={col.getIsVisible()}
                onChange={() => col.toggleVisibility()}
                aria-label={`Toggle column ${col.id}`}
              />
              <span className="capitalize">{String(col.id)}</span>
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}

export function FlexibleDataTable<TData, TValue = unknown>({
  columns,
  data,
  isLoading,
  tableId,
  onTableInstance,
  state: externalState,
  onColumnVisibilityChange,
  onSortingChange,
  onColumnOrderChange,
}: FlexibleDataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const [internalColumnOrder, setInternalColumnOrder] = React.useState<ColumnOrderState>(() =>
    columns.map((c) => ((c as any).id || (c as any).accessorKey) as string)
  );
  const [internalColumnVisibility, setInternalColumnVisibility] = React.useState<VisibilityState>({});

  const state = useMemo(
    () => ({
      sorting: externalState?.sorting ?? internalSorting,
      columnOrder: externalState?.columnOrder ?? internalColumnOrder,
      columnVisibility: externalState?.columnVisibility ?? internalColumnVisibility,
    }),
    [externalState?.sorting, externalState?.columnOrder, externalState?.columnVisibility, internalSorting, internalColumnOrder, internalColumnVisibility]
  );

  useEffect(() => {
    if (!onColumnOrderChange && !onColumnVisibilityChange) {
      const saved = localStorage.getItem(`table-prefs-${tableId}`);
      if (saved) {
        try {
          const { order, visibility } = JSON.parse(saved);
          if (order) setInternalColumnOrder(order);
          if (visibility) setInternalColumnVisibility(visibility);
        } catch (e) {}
      }
    }
  }, [tableId, onColumnOrderChange, onColumnVisibilityChange]);

  useEffect(() => {
    if (!onColumnOrderChange && !onColumnVisibilityChange) {
      localStorage.setItem(
        `table-prefs-${tableId}`,
        JSON.stringify({ order: internalColumnOrder, visibility: internalColumnVisibility })
      );
    }
  }, [internalColumnOrder, internalColumnVisibility, tableId, onColumnOrderChange, onColumnVisibilityChange]);

  const table = useReactTable({
    data,
    columns,
    state,
    onSortingChange: onSortingChange ?? setInternalSorting,
    onColumnOrderChange: onColumnOrderChange ?? setInternalColumnOrder,
    onColumnVisibilityChange: onColumnVisibilityChange ?? setInternalColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  useEffect(() => {
    if (onTableInstance) onTableInstance(table);
  }, [table, onTableInstance]);

  return (
    <div className="w-full overflow-x-auto custom-scrollbar bg-zinc-900/10 rounded-b-[24px]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <ColumnSelector table={table} />
        </div>
        <div className="text-xs text-zinc-400">Rows: {data.length}</div>
      </div>

      <table className="w-full text-left border-collapse border-spacing-0">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="bg-zinc-900/80 border-b border-white/5">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 select-none cursor-pointer hover:text-white transition-colors"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-2">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: ' ↑',
                      desc: ' ↓',
                    }[header.column.getIsSorted() as string] ?? null}
                  </div>
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
                    {cell ? flexRender(cell.column.columnDef.cell, cell.getContext()) : null}
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
