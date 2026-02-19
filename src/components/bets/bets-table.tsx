'use client';

import React, { useState, useMemo } from 'react';
import { Bet, BetLeg } from "@/lib/types";
import { cn } from "@/lib/utils";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  ChevronDown, 
  ChevronRight, 
  Trash2, 
  Edit, 
  MoreVertical,
  PlusCircle,
  ArrowUp, 
  ArrowDown
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

type SortableKey = 'selection' | 'gameDate' | 'matchup' | 'odds' | 'stake' | 'potential' | 'status';
type SortDirection = 'ascending' | 'descending';

interface BetsTableProps {
  bets: Bet[];
  onAction?: (bet: Bet) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

const getStatusClass = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'won': return 'text-emerald-500 bg-emerald-500/10';
    case 'lost': return 'text-red-500 bg-red-500/10';
    case 'pending': return 'text-yellow-500 bg-yellow-500/10';
    case 'cashed out': return 'text-blue-500 bg-blue-500/10';
    case 'push':
    default: return 'text-slate-400 bg-slate-700/20';
  }
};

const calculatePotential = (stake: number, odds: number) => {
    if (odds > 0) return stake * (odds / 100);
    return stake * (100 / Math.abs(odds));
};

const normalizeAndFormatDate = (bet: Bet): string => {
  const dateSource = bet.manualDate || bet.date || bet.legs[0]?.gameDate || bet.createdAt;
  if (!dateSource) return 'N/A';

  let date;
  if (typeof dateSource === 'string') {
    date = new Date(dateSource);
  } else if (dateSource && typeof dateSource.toDate === 'function') {
    date = dateSource.toDate();
  } else if (dateSource instanceof Date) {
    date = dateSource;
  }

  if (date && !isNaN(date.getTime())) {
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    return adjustedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } 
  else if (typeof dateSource === 'string') {
      return dateSource;
  }
  
  return 'Invalid Date';
};

const formatLegSelection = (leg: BetLeg) => {
  const parts = [leg.player, leg.selection, leg.prop, leg.line];
  return parts.filter(p => p).join(' ');
};

export function BetsTable({ bets, onDelete, onEdit, onAction }: BetsTableProps) {
  const [expandedParlays, setExpandedParlays] = useState<Record<string, boolean>>({});
  const [sortConfig, setSortConfig] = useState<{ key: SortableKey; direction: SortDirection } | null>(null);

  const showActions = !!onDelete || !!onEdit;
  const showAdd = !!onAction;

  const toggleParlay = (id: string) => {
    setExpandedParlays(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const sortedBets = useMemo(() => {
    let sortableItems = [...bets];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case 'selection':
            aValue = a.legs[0]?.player ?? '';
            bValue = b.legs[0]?.player ?? '';
            break;
          case 'gameDate':
            const aDate = a.date || a.legs[0]?.gameDate || a.createdAt;
            const bDate = b.date || b.legs[0]?.gameDate || b.createdAt;
            aValue = aDate ? new Date(aDate.toDate ? aDate.toDate() : aDate).getTime() : 0;
            bValue = bDate ? new Date(bDate.toDate ? bDate.toDate() : bDate).getTime() : 0;
            break;
          case 'matchup':
            aValue = a.legs[0]?.matchup ?? '';
            bValue = b.legs[0]?.matchup ?? '';
            break;
          case 'potential':
            const getSortValue = (bet: Bet) => {
                switch(bet.status) {
                    case 'won': return calculatePotential(bet.stake, bet.odds);
                    case 'cashed out': return bet.cashedOutAmount ? bet.cashedOutAmount - bet.stake : 0;
                    case 'lost': return -bet.stake;
                    case 'push': return 0;
                    default: return calculatePotential(bet.stake, bet.odds);
                }
            }
            aValue = getSortValue(a);
            bValue = getSortValue(b);
            break;
          default:
            aValue = a[sortConfig.key];
            bValue = b[sortConfig.key];
        }

        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [bets, sortConfig]);

  const requestSort = (key: SortableKey) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key: SortableKey) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    if (sortConfig.direction === 'ascending') return <ArrowUp className="h-3 w-3 ml-1" />;
    return <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const PayoutCell = ({ bet }: { bet: Bet }) => {
    let content: React.ReactNode;
    let className: string = 'text-slate-400';

    switch (bet.status) {
      case 'won':
        content = `$${calculatePotential(bet.stake, bet.odds).toFixed(2)}`;
        className = 'text-emerald-400';
        break;
      case 'lost':
        content = `-$${bet.stake.toFixed(2)}`;
        className = 'text-red-500';
        break;
      case 'cashed out':
        content = `$${(bet.cashedOutAmount || 0).toFixed(2)}`;
        className = 'text-blue-400';
        break;
      case 'push':
        content = `$${bet.stake.toFixed(2)}`;
        className = 'text-slate-400';
        break;
      case 'pending':
      default:
        content = `$${calculatePotential(bet.stake, bet.odds).toFixed(2)}`;
        className = 'text-slate-400';
        break;
    }
    
    return <span className={className}>{content}</span>;
  };

  return (
    <div className="border border-slate-800 rounded-xl">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-slate-900/75">
            {showAdd && <TableHead className="w-[50px] text-slate-400">Add</TableHead>}
            <TableHead className="w-12"></TableHead>
            <TableHead onClick={() => requestSort('selection')} className="cursor-pointer text-slate-400 hover:text-white"><div className='flex items-center'>Selection {getSortIndicator('selection')}</div></TableHead>
            <TableHead onClick={() => requestSort('gameDate')} className="cursor-pointer text-slate-400 hover:text-white"><div className='flex items-center'>Game Date {getSortIndicator('gameDate')}</div></TableHead>
            <TableHead onClick={() => requestSort('matchup')} className="cursor-pointer text-slate-400 hover:text-white"><div className='flex items-center'>Matchup {getSortIndicator('matchup')}</div></TableHead>
            <TableHead onClick={() => requestSort('odds')} className="cursor-pointer text-slate-400 hover:text-white"><div className='flex items-center'>Odds {getSortIndicator('odds')}</div></TableHead>
            <TableHead onClick={() => requestSort('stake')} className="cursor-pointer text-slate-400 hover:text-white"><div className='flex items-center'>Stake {getSortIndicator('stake')}</div></TableHead>
            <TableHead onClick={() => requestSort('potential')} className="cursor-pointer text-slate-400 hover:text-white"><div className='flex items-center'>Payout / Potential {getSortIndicator('potential')}</div></TableHead>
            <TableHead onClick={() => requestSort('status')} className="cursor-pointer text-slate-400 hover:text-white"><div className='flex items-center'>Status {getSortIndicator('status')}</div></TableHead>
            {showActions && <TableHead className="text-right text-slate-400">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedBets.map((bet) => (
            <React.Fragment key={bet.id}>
              <TableRow className="border-slate-800">
                {showAdd && <TableCell><Button variant="ghost" size="icon" onClick={() => onAction(bet)} className="text-blue-500 hover:bg-blue-500/10"><PlusCircle className="h-4 w-4" /></Button></TableCell>}
                <TableCell>{bet.legs.length > 1 && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleParlay(bet.id)}>{expandedParlays[bet.id] ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}</Button>}</TableCell>
                <TableCell className="font-medium text-white">{bet.legs.length > 1 ? `${bet.legs.length} Leg Parlay` : formatLegSelection(bet.legs[0])}</TableCell>
                <TableCell className="text-slate-300">{normalizeAndFormatDate(bet)}</TableCell>
                <TableCell className="text-slate-300">{bet.legs.length > 1 ? 'Multiple' : bet.legs[0]?.matchup ?? 'N/A'}</TableCell>
                <TableCell className="text-slate-300">{bet.odds > 0 ? `+${bet.odds}` : bet.odds}</TableCell>
                <TableCell className="text-slate-300">${bet.stake.toFixed(2)}</TableCell>
                <TableCell><PayoutCell bet={bet} /></TableCell>
                <TableCell>
                  {bet.status === 'cashed out' ? (
                    <div>
                      <span className="text-amber-500 font-bold uppercase text-xs">Cashed Out</span>
                      <div className="text-[10px] text-slate-400">
                        ${(bet.cashedOutAmount ?? 0).toFixed(2)}
                      </div>
                    </div>
                  ) : (
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(bet.status)}`}>
                      {bet.status}
                    </span>
                  )}
                </TableCell>
                {showActions && <TableCell className="text-right">{(onEdit || onDelete) && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent className="bg-slate-900 border-slate-800 text-white">{onEdit && <DropdownMenuItem onClick={() => onEdit(bet.id)} className="hover:bg-slate-800"><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>}{onDelete && <DropdownMenuItem onClick={() => onDelete(bet.id)} className="text-red-500 hover:!text-red-500 hover:!bg-red-500/10"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>}</TableCell>}
              </TableRow>
              {expandedParlays[bet.id] && bet.legs.map((leg, index) => (
                <TableRow key={`${bet.id}-leg-${index}`} className="bg-slate-900/50 border-slate-800 hover:bg-slate-900/60">
                  <TableCell colSpan={showAdd ? 2 : 1} />
                  <TableCell className="pl-12 text-sm text-slate-300">
                    <div className="font-medium text-white">{leg.player}</div>
                    <div>{leg.prop}</div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {leg.gameDate ? new Date(leg.gameDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-400 uppercase">{leg.matchup}</TableCell>
                  <TableCell className="text-slate-300">{leg.odds > 0 ? `+${leg.odds}` : leg.odds}</TableCell>
                  <TableCell colSpan={2}>
                     <span className={cn(
                      "inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                      leg.selection?.toLowerCase() === 'over' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {leg.selection} {leg.line}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "text-[10px] font-bold uppercase",
                      leg.status === 'won' ? 'text-emerald-500' : 
                      leg.status === 'lost' ? 'text-red-500' : 'text-slate-500'
                    )}>
                      {leg.status}
                    </span>
                  </TableCell>
                  {showActions && <TableCell></TableCell>}
                </TableRow>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
