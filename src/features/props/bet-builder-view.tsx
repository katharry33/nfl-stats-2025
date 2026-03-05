'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Plus, Check } from "lucide-react";
import { NFLProp } from '@/lib/types';

interface PropsTableProps {
  props: NFLProp[];
  isInBetSlip: (id: string) => boolean;
  onAddToBetSlip: (prop: NFLProp) => void;
  onRemoveFromBetSlip: (id: string) => void;
}

export default function PropsTable({ props, isInBetSlip, onAddToBetSlip, onRemoveFromBetSlip }: PropsTableProps) {
  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900/50 overflow-hidden">
      <Table>
        <TableHeader className="bg-zinc-950">
          <TableRow className="border-white/5 hover:bg-transparent">
            <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest">Player</TableHead>
            <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest">Prop / Line</TableHead>
            <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest">Expert Pick</TableHead>
            <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest text-center">Best Odds</TableHead>
            <TableHead className="text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.map((p, i) => {
            const isSelected = p.id ? isInBetSlip(p.id) : false;
            return (
              <TableRow key={p.id ?? i} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                <TableCell>
                  <div className="font-bold text-white">{p.Player}</div>
                  <div className="text-[10px] text-zinc-500 uppercase font-black">{p.matchup}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-300">{p.Prop}</span>
                    <Badge variant="secondary" className="bg-[#FFD700] text-black font-black text-[10px]">
                      {p.Line}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {p.expertStars ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex text-[#FFD700]">
                        {[...Array(p.expertStars)].map((_, i) => <Star key={i} size={10} fill="currentColor" />)}
                      </div>
                      <div className="text-[10px] text-zinc-400 italic">"{p.expertPick}"</div>
                    </div>
                  ) : <span className="text-zinc-600">—</span>}
                </TableCell>
                <TableCell className="text-center">
                  <div className="text-emerald-400 font-mono font-bold">
                    {p.bestOdds && p.bestOdds > 0 ? `+${p.bestOdds}` : p.bestOdds}
                  </div>
                  <div className="text-[9px] text-zinc-500 uppercase">{p.bestBook}</div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (p.id) {
                        isSelected ? onRemoveFromBetSlip(p.id) : onAddToBetSlip(p);
                      }
                    }}
                    className={isSelected 
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20" 
                      : "bg-white text-black hover:bg-zinc-200"}
                  >
                    {isSelected ? <Check size={14} /> : <Plus size={14} />}
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
