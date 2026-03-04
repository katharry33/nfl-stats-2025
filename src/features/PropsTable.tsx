'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PropsTable({ props, isInBetSlip, onAddToBetSlip, onRemoveFromBetSlip }: any) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#0f1115] overflow-hidden">
      <Table>
        <TableHeader className="bg-zinc-950/50">
          <TableRow className="border-white/5">
            <TableHead className="text-zinc-400 font-bold text-[10px] uppercase">Player / Team</TableHead>
            <TableHead className="text-zinc-400 font-bold text-[10px] uppercase">Market</TableHead>
            <TableHead className="text-zinc-400 font-bold text-[10px] uppercase text-center">Line</TableHead>
            <TableHead className="text-zinc-400 font-bold text-[10px] uppercase text-center">Edge %</TableHead>
            <TableHead className="text-zinc-400 font-bold text-[10px] uppercase text-center">Odds</TableHead>
            <TableHead className="text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.map((p: any) => {
            const selected = isInBetSlip(p.id);
            return (
              <TableRow key={p.id} className="border-white/5 hover:bg-white/[0.02]">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{p.Player || p.player}</span>
                    {p.valueIcon && <span>{p.valueIcon}</span>}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight">
                    {p.team} • {p.matchup}
                  </div>
                </TableCell>
                
                <TableCell className="text-zinc-300 text-sm">
                  {p.Prop || p.prop}
                </TableCell>

                <TableCell className="text-center">
                  <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                    {p.Line || p.line}
                  </Badge>
                </TableCell>

                <TableCell className="text-center">
                  <div className={cn(
                    "font-mono font-bold",
                    (p.bestEdgePct > 0.1) ? "text-emerald-400" : "text-zinc-400"
                  )}>
                    {(p.bestEdgePct * 100).toFixed(1)}%
                  </div>
                </TableCell>

                <TableCell className="text-center font-mono font-bold text-blue-400">
                  {p.bestOdds > 0 ? `+${p.bestOdds}` : p.bestOdds}
                </TableCell>

                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => selected ? onRemoveFromBetSlip(p.id) : onAddToBetSlip(p)}
                    className={cn(
                      "h-8 w-8 p-0 rounded-full",
                      selected ? "bg-emerald-500 text-black hover:bg-emerald-400" : "bg-zinc-800 text-white hover:bg-zinc-700"
                    )}
                  >
                    {selected ? <Check size={16} /> : <Plus size={16} />}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
