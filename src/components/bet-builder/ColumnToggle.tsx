'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table } from '@tanstack/react-table';
import { SlidersHorizontal } from 'lucide-react';

interface ColumnToggleProps<TData> {
  table: Table<TData>;
}

export function ColumnToggle<TData>({ table }: ColumnToggleProps<TData>) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto h-8 flex">
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          View
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[150px]">
        <div className="px-1 py-1.5 font-bold text-xs">Toggle columns</div>
        <div className="border-t border-zinc-800 -mx-1" />
        <div className="grid gap-1.5 py-2 px-1">
          {table
            .getAllColumns()
            .filter(
              (column) =>
                typeof column.accessorFn !== 'undefined' && column.getCanHide()
            )
            .map((column) => (
              <div
                key={column.id}
                className="flex items-center space-x-2 text-zinc-300 hover:bg-zinc-800 rounded-md p-1.5"
              >
                <Checkbox
                  checked={column.getIsVisible()}
                  onCheckedChange={(val) => column.toggleVisibility(!!val)}
                />
                <span className="text-xs capitalize">{column.id}</span>
              </div>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
