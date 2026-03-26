'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table } from '@tanstack/react-table';
import { Settings2 } from 'lucide-react';

interface ColumnToggleProps<TData> {
  table: Table<TData>;
}

export function ColumnToggle<TData>({ table }: ColumnToggleProps<TData>) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all">
          <Settings2 size={14} />
          View
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[200px] bg-surface border-white/10 shadow-2xl p-2">
        <div className="px-2 py-2 font-black text-[10px] uppercase tracking-tighter text-zinc-500 border-b border-white/5 mb-2">
          Toggle Columns
        </div>
        <div className="grid gap-1 max-h-[400px] overflow-y-auto custom-scrollbar">
          {table
            .getAllColumns()
            .filter((column) => column.getCanHide())
            // ALPHABETICAL SORT
            .sort((a, b) => a.id.localeCompare(b.id))
            .map((column) => (
              <div
                key={column.id}
                className="flex items-center space-x-2 text-zinc-300 hover:bg-white/5 rounded-lg p-2 transition-colors cursor-pointer"
                onClick={() => column.toggleVisibility(!column.getIsVisible())}
              >
                <Checkbox
                  checked={column.getIsVisible()}
                  onCheckedChange={(val) => column.toggleVisibility(!!val)}
                  className="border-white/20 data-[state=checked]:bg-indigo-500"
                />
                <span className="text-[10px] font-bold uppercase tracking-tight truncate">
                  {column.id.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                </span>
              </div>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}