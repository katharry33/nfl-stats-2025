'use client';

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// FIXED: Added league and mode to the interface
export interface PropsTableProps {
  props: any[];
  isLoading: boolean;
  mode: string;
  league?: 'nba' | 'nfl'; 
}

export default function PropsTable({ props, isLoading, mode, league }: PropsTableProps) {
  if (isLoading) return <div className="p-8 text-center text-[10px] font-black uppercase animate-pulse">Loading Props...</div>;

  return (
    <div className="rounded-[24px] border border-white/5 bg-zinc-950/50 overflow-hidden">
      <Table>
        <TableHeader className="bg-white/5">
          <TableRow className="border-white/5 hover:bg-transparent">
            <TableHead className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Player</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-widest text-zinc-500 text-center">Prop</TableHead>
            <TableHead className="text-[9px] font-black uppercase tracking-widest text-zinc-500 text-right">Line</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.map((prop, i) => (
            <TableRow key={i} className="border-white/5 hover:bg-white/2 transition-colors">
              <TableCell className="text-[11px] font-bold text-white">{prop.player}</TableCell>
              <TableCell className="text-[10px] font-medium text-zinc-400 text-center uppercase">{prop.prop}</TableCell>
              <TableCell className="text-[11px] font-black text-indigo-400 text-right">{prop.line}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}