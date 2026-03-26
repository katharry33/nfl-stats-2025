'use client';

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bet } from '@/lib/types';
import { cn, formatTimestamp } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// ─── ICONS ──────────────────────────────────────────────────────────────────
import { Shield, TrendingUp, Sparkles, AlertTriangle, Check, X, Circle, HelpCircle } from 'lucide-react';

// ─── Cells ──────────────────────────────────────────────────────────────────
import { EditableOddsCell, EditableStakeCell, EditableStatusCell } from './editable-cell';
// ─── Types & Interfaces ───────────────────────────────────────────────────

interface BetsTableProps {
  bets: Bet[];
  loading?: boolean;
  onSave?: (bet: Bet) => void;
  onDelete?: (id: string) => void;
  onEdit?: (bet: Bet) => void; 
}

// ─── Bet Icons ────────────────────────────────────────────────────────────────

function BetIcons({ bet }: { bet: any }) {
  return (
    <div className="flex items-center gap-1.5">
      {bet.isBonusBet && <Badge variant="outline" className="border-amber-500/50 text-amber-500 bg-amber-500/10 text-[8px] font-black uppercase tracking-wider">BONUS</Badge>}
      {bet.boost && <Badge variant="outline" className="border-indigo-500/50 text-indigo-500 bg-indigo-500/10 text-[8px] font-black uppercase tracking-wider">BOOST</Badge>}
    </div>
  );
}

function StakeCell({ bet }: { bet: any }) {
  const stake = Number(bet.stake || bet.wager || 0);
  const isCashed = (bet.status ?? '').toLowerCase() === 'cashed';
  const cashOut = isCashed ? (Number(bet.cashOutAmount ?? bet.payout) || null) : null;

  return (
    <div>
      <span className="text-foreground text-xs font-mono">
        {stake > 0 ? `$${stake.toFixed(2)}` : '—'}
      </span>
      {cashOut !== null && (
        <p className="text-edge text-[9px] font-mono">cashed ${cashOut.toFixed(2)}</p>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function BetsTable({ bets, loading, onSave, onDelete, onEdit }: BetsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Bet>>({});

  const handleUpdate = (id: string, updates: Partial<Bet>) => {
    const betToUpdate = bets.find(b => b.id === id);
    if (betToUpdate && onSave) {
      onSave({ ...betToUpdate, ...updates });
    }
  };

  return (
    <Table className="w-full text-sm">
      <TableHeader>
        <TableRow className="border-white/10">
          <TableHead className="w-[50%]">Player Prop</TableHead>
          <TableHead>Stake</TableHead>
          <TableHead>Odds</TableHead>
          <TableHead>Result</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bets.map((bet) => (
          <TableRow key={bet.id} className="border-white/5 hover:bg-zinc-900/50 transition-colors" onClick={() => onEdit && onEdit(bet)}>
            <TableCell className="font-medium">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-2 rounded-full",
                  bet.status === 'won' && "bg-green-500/10 text-green-500",
                  bet.status === 'lost' && "bg-red-500/10 text-red-500",
                  bet.status === 'pending' && "bg-zinc-700/50 text-zinc-500",
                  (bet.status === 'void' || bet.status === 'push') && "bg-gray-500/10 text-gray-500",
                )}>
                  {bet.status === 'won' && <Check size={14} />}
                  {bet.status === 'lost' && <X size={14} />}
                  {bet.status === 'pending' && <HelpCircle size={14} />}
                  {(bet.status === 'void' || bet.status === 'push') && <Circle size={14} />}
                </div>
                <div>
                  <p className="text-white font-bold text-xs">{bet.player}</p>
                  <p className="text-zinc-400 text-xs">{bet.prop}</p>
                  <BetIcons bet={bet} />
                </div>
              </div>
            </TableCell>
            <TableCell>
              <EditableStakeCell 
                value={bet.stake ?? 0} 
                onSave={(v: number) => handleUpdate(bet.id, { stake: v })}
              />
            </TableCell>
            <TableCell className="font-mono">
              <EditableOddsCell 
                value={bet.odds ?? 0} 
                onSave={(v: number) => handleUpdate(bet.id, { odds: v })}
              />
            </TableCell>
            <TableCell>
                <EditableStatusCell 
                  value={bet.status ?? 'pending'} 
                  onSave={(v: string) => handleUpdate(bet.id, { status: v })}
                />
            </TableCell>
            <TableCell className="text-zinc-400 text-xs font-mono">{formatTimestamp(bet.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
