'use client';

import React, { useState, useMemo, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings2, ChevronUp, ChevronDown, ChevronsUpDown, Search } from "lucide-react";

const getNestedValue = (obj: any, path: string) => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

export function FlexibleDataTable({
  data = [],
  columns = [],
  isLoading = false,
  tableId,
  defaultVisibleColumns = [],
  searchPlaceholder = "Search...",
  emptyMessage = "No props found for this date",
}: any) {
  
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  useEffect(() => {
    // 1. Get saved state
    const saved = tableId ? localStorage.getItem(`table-cols-${tableId}`) : null;
    const initial = saved ? JSON.parse(saved) : columns.map((c: any) => c.accessorKey);

    // 2. Only update if state is empty (prevents the loop)
    if (visibleColumns.length === 0) {
      setVisibleColumns(initial);
    }
  }, [tableId, columns]);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'} | null>(null);

  const processedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    let filtered = [...data];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter((row) => 
        columns.some((col: any) => {
          const val = getNestedValue(row, col.accessorKey);
          return val?.toString().toLowerCase().includes(lowerSearch);
        })
      );
    }

    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = getNestedValue(a, sortConfig.key);
        const bVal = getNestedValue(b, sortConfig.key);
        if (aVal === bVal) return 0;
        const result = aVal > bVal ? 1 : -1;
        return sortConfig.direction === 'asc' ? result : -result;
      });
    }

    return filtered;
  }, [data, searchTerm, sortConfig, columns]);

  if (isLoading) return <div className="p-20 text-center animate-pulse text-slate-500 uppercase text-[10px] font-black tracking-widest">Loading Market Data...</div>;
  
  if (!data || data.length === 0) {
    return <div className="p-20 text-center text-slate-600 font-black uppercase text-[10px] tracking-widest bg-[#0d0d0d] rounded-xl border border-white/5">{emptyMessage}</div>;
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between bg-[#0a0a0a] p-4 rounded-t-xl border border-white/5">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
          <Input 
            placeholder={searchPlaceholder} 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-black border-white/10 text-white text-xs h-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="border-white/10 text-white text-[10px] font-bold uppercase tracking-wider">
              <Settings2 className="w-3.5 h-3.5 mr-2" /> Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#111] border-white/10 text-white text-xs">
            {columns.map((col: any) => (
              <DropdownMenuCheckboxItem
                key={col.accessorKey}
                checked={visibleColumns.includes(col.accessorKey)}
                onCheckedChange={(checked) => {
                  const next = checked 
                    ? [...visibleColumns, col.accessorKey] 
                    : visibleColumns.filter(k => k !== col.accessorKey);
                  setVisibleColumns(next);
                  if (tableId) localStorage.setItem(`table-cols-${tableId}`, JSON.stringify(next));
                }}
              >
                {col.header}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-x-auto rounded-b-xl border border-white/5 bg-[#0d0d0d]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/2">
              {columns.filter((c: any) => visibleColumns.includes(c.accessorKey)).map((col: any) => (
                <th 
                  key={col.accessorKey}
                  className="px-6 py-4 text-[9px] font-black tracking-[0.2em] text-slate-500 uppercase cursor-pointer hover:text-slate-300"
                  onClick={() => setSortConfig(prev => ({ key: col.accessorKey, direction: prev?.direction === 'asc' ? 'desc' : 'asc' }))}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/3">
            {processedData.map((row, i) => (
              <tr key={row.id || i} className="hover:bg-white/1 transition-colors">
                {columns.filter((c: any) => visibleColumns.includes(c.accessorKey)).map((col: any) => (
                  <td key={col.accessorKey} className="px-6 py-4 text-xs text-slate-300">
                    {col.cell ? col.cell(getNestedValue(row, col.accessorKey), row) : (getNestedValue(row, col.accessorKey) ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}