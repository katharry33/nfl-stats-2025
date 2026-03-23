'use client';

import { Table } from '@tanstack/react-table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Settings2, Check } from 'lucide-react';

interface ColumnControllerProps<TData> {
  table: Table<TData>;
}

export function ColumnController<TData>({ table }: ColumnControllerProps<TData>) {
  // Filter out columns that shouldn't be toggled (like actions or select)
  const togglableColumns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide() && column.id !== 'actions');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-9 border-white/10 bg-slate-900/50 hover:bg-slate-800 text-slate-300"
        >
          <Settings2 className="mr-2 h-4 w-4" />
          Display
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2 bg-slate-950 border-white/10 shadow-2xl">
        <div className="mb-2 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">
          Toggle Data Fields
        </div>
        <div className="flex flex-col space-y-0.5 max-h-[300px] overflow-y-auto custom-scrollbar">
          {togglableColumns.map((column) => (
            <button
              key={column.id}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-all ${
                column.getIsVisible() 
                  ? 'text-slate-200 hover:bg-white/5' 
                  : 'text-slate-500 hover:bg-white/5 hover:text-slate-400'
              }`}
              onClick={() => column.toggleVisibility(!column.getIsVisible())}
            >
              <span className="capitalize">
                {/* Use the header if it's a string, otherwise fallback to ID */}
                {typeof column.columnDef.header === 'string' 
                  ? column.columnDef.header 
                  : column.id.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
              </span>
              {column.getIsVisible() && (
                <Check size={14} className="text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}