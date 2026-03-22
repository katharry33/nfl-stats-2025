'use client';

import { Table } from '@tanstack/react-table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Settings2, Check } from 'lucide-react';

interface ColumnControllerProps<TData> {
  table: Table<TData>;
}

export function ColumnController<TData>({ table }: ColumnControllerProps<TData>) {

  const toggleColumn = (id: string) => {
    const column = table.getColumn(id);
    if (column) {
      column.toggleVisibility(!column.getIsVisible());
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="mr-2 h-4 w-4" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 bg-slate-900 border-slate-800">
        <div className="mb-2 text-center text-xs font-bold uppercase text-slate-500">
          Toggle Columns
        </div>
        <div className="flex flex-col space-y-1">
          {table.getAllLeafColumns().map(column => {
            if (column.id === 'actions') return null; // Don't allow hiding actions
            return (
              <button
                key={column.id}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                onClick={() => toggleColumn(column.id)}
              >
                <span className="capitalize">{column.id.replace(/_/g, ' ')}</span>
                {column.getIsVisible() && (
                  <Check size={14} className="text-emerald-400" />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
