"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings2, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export interface ColumnDef<T = any> {
  id?: string;
  accessorKey: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  cell?: (value: any, row: T) => React.ReactNode;
}

export interface FlexibleDataTableProps<T = any> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  tableId: string;
  defaultVisibleColumns?: string[];
  searchPlaceholder?: string;
  emptyMessage?: string;
}

type SortConfig = {
  key: string;
  direction: "asc" | "desc";
} | null;

export function FlexibleDataTable<T extends Record<string, any>>({
  data,
  columns,
  isLoading = false,
  tableId,
  defaultVisibleColumns = [],
  searchPlaceholder = "Search...",
  emptyMessage = "No data available",
}: FlexibleDataTableProps<T>) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const storageKey = `table-columns-${tableId}`;
    if (typeof window !== 'undefined') {
        try {
            const savedColumns = window.localStorage.getItem(storageKey);
            if (savedColumns) {
                return JSON.parse(savedColumns);
            }
        } catch (error) {
            console.error("Failed to read from localStorage", error);
        }
    }

    if (defaultVisibleColumns.length > 0) {
      return defaultVisibleColumns;
    }
    return columns.map((col) => col.accessorKey);
  });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  useEffect(() => {
    const storageKey = `table-columns-${tableId}`;
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
        } catch (error) {
            console.error("Failed to write to localStorage", error);
        }
    }
  }, [visibleColumns, tableId]);

  const toggleColumn = (columnKey: string) => {
    setVisibleColumns((prev) =>
      prev.includes(columnKey)
        ? prev.filter((key) => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  const toggleAllColumns = () => {
    if (visibleColumns.length === columns.length) {
      setVisibleColumns([]);
    } else {
      setVisibleColumns(columns.map((col) => col.accessorKey));
    }
  };

  const handleSort = (columnKey: string) => {
    const column = columns.find((col) => col.accessorKey === columnKey);
    if (!column?.sortable) return;

    setSortConfig((current) => {
      if (current?.key === columnKey) {
        if (current.direction === "asc") {
          return { key: columnKey, direction: "desc" };
        } else {
          return null; // Clear sort
        }
      }
      return { key: columnKey, direction: "asc" };
    });
  };

  const getSortIcon = (columnKey: string) => {
    const column = columns.find((col) => col.accessorKey === columnKey);
    if (!column?.sortable) return null;

    if (sortConfig?.key === columnKey) {
      return sortConfig.direction === "asc" ? (
        <ChevronUp className="w-4 h-4" />
      ) : (
        <ChevronDown className="w-4 h-4" />
      );
    }
    return <ChevronsUpDown className="w-4 h-4 opacity-40" />;
  };

  const processedData = useMemo(() => {
    let filtered = [...data];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      
      const filterableColumns = columns.filter(col => col.filterable !== false);
      
      filtered = filtered.filter((row) => {
        return filterableColumns.some((col) => {
          const value = row[col.accessorKey];
          if (value == null) return false;
          return value.toString().toLowerCase().includes(searchLower);
        });
      });
    }

    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;

        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortConfig.direction === "asc" 
            ? aValue - bValue 
            : bValue - aValue;
        }

        const aString = aValue.toString();
        const bString = bValue.toString();
        const comparison = aString.localeCompare(bString);
        return sortConfig.direction === "asc" ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, searchTerm, sortConfig, columns]);

  const visibleColumnObjects = columns.filter((col) =>
    visibleColumns.includes(col.accessorKey)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4 p-4 bg-white border-b">
        <Input
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-black">
            Showing {processedData.length} of {data.length} rows
          </span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="w-4 h-4 mr-2" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-[400px] overflow-y-auto">
              <DropdownMenuItem onClick={toggleAllColumns} className="font-medium">
                {visibleColumns.length === columns.length
                  ? "Deselect All"
                  : "Select All"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {columns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.accessorKey}
                  checked={visibleColumns.includes(column.accessorKey)}
                  onCheckedChange={() => toggleColumn(column.accessorKey)}
                >
                  {column.header}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              {visibleColumnObjects.map((column) => (
                <th
                  key={column.accessorKey}
                  className={`px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider ${
                    column.sortable ? "cursor-pointer hover:bg-slate-100 select-none" : ""
                  }`}
                  onClick={() => column.sortable && handleSort(column.accessorKey)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.header}</span>
                    {getSortIcon(column.accessorKey)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {processedData.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumnObjects.length}
                  className="px-4 py-8 text-center text-black"
                >
                  {searchTerm ? `No results found for "${searchTerm}"` : emptyMessage}
                </td>
              </tr>
            ) : (
              processedData.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  className="hover:bg-slate-50 transition-colors"
                >
                  {visibleColumnObjects.map((column) => {
                    const value = row[column.accessorKey];
                    return (
                      <td
                        key={column.accessorKey}
                        className="px-4 py-3 text-sm text-black"
                      >
                        {column.cell ? column.cell(value, row) : value ?? "—"}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
