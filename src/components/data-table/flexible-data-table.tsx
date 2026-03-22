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
import { Settings2, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

// Helper to get nested values (e.g., "stats.h2h_average")
const getNestedValue = (obj: any, path: string) => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

export interface ColumnDef<T = any> {
  accessorKey: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  cell?: (value: any, row: T) => React.ReactNode;
}

export function FlexibleDataTable<T extends Record<string, any>>({
  data,
  columns,
  isLoading = false,
  tableId,
  defaultVisibleColumns = [],
  searchPlaceholder = "Search...",
  emptyMessage = "No data available",
}: any) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`table-cols-${tableId}`);
      if (saved) return JSON.parse(saved);
    }
    // ADDED SAFETY CHECK
    if (!columns || !Array.isArray(columns)) {
      return [];
    }
    if (defaultVisibleColumns && defaultVisibleColumns.length > 0) {
      return defaultVisibleColumns;
    }
    return columns.map((col: any) => col.accessorKey || col.id);
  });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'} | null>(null);

  useEffect(() => {
    if (tableId) {
      localStorage.setItem(`table-cols-${tableId}`, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns, tableId]);

  const handleSort = (columnKey: string) => {
      const column = columns.find((col: any) => col.accessorKey === columnKey);
      if (!column?.sortable) return;

      setSortConfig((prev) => {
        if (prev && prev.key === columnKey) {
          if (prev.direction === "asc") {
            return { key: columnKey, direction: "desc" };
          }
          return null; // Clear sort on third click
        }
        return { key: columnKey, direction: "asc" };
      });
  };

  const processedData = useMemo(() => {
    if (!data) return [];
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

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        if (aVal === bVal) return 0;

        const result = aVal > bVal ? 1 : -1;
        return sortConfig.direction === 'asc' ? result : -result;
      });
    }

    return filtered;
  }, [data, searchTerm, sortConfig, columns]);

  const getSortIcon = (columnKey: string) => {
    if (sortConfig?.key !== columnKey) {
      return <ChevronsUpDown className="w-3 h-3 ml-2 opacity-30" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ChevronUp className="w-3 h-3 ml-2 text-yellow-400" />;
    }
    return <ChevronDown className="w-3 h-3 ml-2 text-yellow-400" />;
  };

  if (isLoading) return <div className="p-20 text-center animate-pulse text-slate-500">Loading Table...</div>;
  if (!data || data.length === 0) {
      return <div className="p-20 text-center text-slate-600 font-bold uppercase text-[10px] tracking-widest">{emptyMessage}</div>;
  }
  if (!columns || columns.length === 0) {
    return <div className="p-20 text-center text-red-500">Error: Table columns not defined.</div>
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between bg-[#0d0d0d] p-4 rounded-t-xl border border-white/5">
        <Input 
          placeholder={searchPlaceholder} 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs bg-black border-white/10 text-white"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-white/10 text-white">
              <Settings2 className="w-4 h-4 mr-2" /> Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#111] border-white/10 text-white">
            {columns.map((col: any) => (
              <DropdownMenuCheckboxItem
                key={col.accessorKey}
                checked={visibleColumns.includes(col.accessorKey)}
                onCheckedChange={(checked) => {
                  setVisibleColumns(prev => checked 
                    ? [...prev, col.accessorKey] 
                    : prev.filter(k => k !== col.accessorKey)
                  );
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
            <tr className="border-b border-white/5 bg-opacity-2 bg-white">
              {columns.filter((c: any) => visibleColumns.includes(c.accessorKey)).map((col: any) => (
                <th 
                  key={col.accessorKey}
                  className="px-6 py-4 text-[10px] font-black tracking-widest text-slate-500 uppercase cursor-pointer select-none"
                  onClick={() => handleSort(col.accessorKey)}
                >
                  <div className="flex items-center">
                    {col.header}
                    {col.sortable && getSortIcon(col.accessorKey)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {processedData.map((row, i) => (
              <tr key={row.id || i} className="hover:bg-opacity-1 hover:bg-white">
                {columns.filter((c: any) => visibleColumns.includes(c.accessorKey)).map((col: any) => (
                  <td key={col.accessorKey} className="px-6 py-4 text-sm text-slate-300">
                    {col.cell ? col.cell(getNestedValue(row, col.accessorKey), row) : getNestedValue(row, col.accessorKey) ?? '—'}
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