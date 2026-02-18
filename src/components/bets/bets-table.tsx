'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Helper to ensure a value is a number for calculations
const ensureNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

// Calculates payout based on stake and odds
export function calculatePayout(stake: number | string, odds: number | string, isBonus: boolean = false): number {
  const s = ensureNumber(stake);
  const o = ensureNumber(odds);
  if (s <= 0 || o === 0) return 0;
  let profit = o > 0 ? s * (o / 100) : s * (100 / Math.abs(o));
  return isBonus ? profit : profit + s;
}

// Parses various date formats into a standard Date object
function getNormalizedDate(bet: any): Date | null {
  const rawDate = bet.createdAt || bet.date || bet.gameDate || bet.timestamp;
  if (!rawDate) return null;
  try {
    // If it's a Firestore Timestamp {seconds, nanoseconds}
    if (typeof rawDate === 'object') {
      if (rawDate.seconds) return new Date(rawDate.seconds * 1000);
      if (rawDate._seconds) return new Date(rawDate._seconds * 1000);
    }
    // If it's already a string or number
    const parsedDate = new Date(rawDate);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  } catch (error) {
    return null;
  }
}

export const BetsTable = ({ bets, onDelete, onEdit }: any) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: string) => {
    setSortColumn(prev => (prev === column ? prev : column));
    setSortDirection(prev => (sortColumn === column ? (prev === 'asc' ? 'desc' : 'asc') : 'desc'));
  };

  const sortedBets = useMemo(() => {
    if (!Array.isArray(bets)) return [];
    // The 'bets' prop is now expected to be pre-grouped.
    return [...bets].sort((a, b) => {
      let aVal, bVal;
      switch(sortColumn) {
        case 'date':
          aVal = getNormalizedDate(a)?.getTime() || 0;
          bVal = getNormalizedDate(b)?.getTime() || 0;
          break;
        case 'stake': aVal = ensureNumber(a.stake); bVal = ensureNumber(b.stake); break;
        case 'odds': aVal = ensureNumber(a.odds); bVal = ensureNumber(b.odds); break;
        case 'status': aVal = a.status || ''; bVal = b.status || ''; break;
        case 'payout':
          aVal = a.status?.toLowerCase() === 'lost' ? 0 : calculatePayout(a.stake, a.odds, a.isBonus);
          bVal = b.status?.toLowerCase() === 'lost' ? 0 : calculatePayout(b.stake, b.odds, b.isBonus);
          break;
        default: aVal = 0; bVal = 0;
      }
      return sortDirection === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [bets, sortColumn, sortDirection]);

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <span className="opacity-0 group-hover:opacity-50 transition-opacity">↕</span>;
    return <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="overflow-x-auto border border-slate-800 rounded-lg bg-slate-950/50">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
          <tr>
            <th className="px-4 py-4 w-10"></th>
            {['date', 'selection', 'odds', 'stake', 'status', 'payout'].map(col => (
              <th key={col} className="px-4 py-4 cursor-pointer hover:text-emerald-400 group" onClick={() => handleSort(col)}>
                {col} <SortIcon column={col} />
              </th>
            ))}
            <th className="px-4 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {sortedBets?.map((bet) => {
            const isExpanded = expandedRows.has(bet.id);
            const status = (bet.status || bet.result || 'pending').toLowerCase();
            
            const legs = Array.isArray(bet.legs) && bet.legs.length > 0 ? bet.legs : [];

            const isParlay = bet.betType === 'parlay' || legs.length > 1;
            const numericStake = ensureNumber(bet.stake);
            const isBonus = !!bet.isBonus;
            const effectiveOdds = ensureNumber(bet.odds || (legs.length > 0 ? legs[0].odds : 0));
            const payoutValue = calculatePayout(numericStake, effectiveOdds, isBonus);
            const betDate = getNormalizedDate(bet);

            return (
              <React.Fragment key={bet.id}>
                <tr className="hover:bg-slate-900/40 transition-colors group text-sm">
                  <td className="px-4 py-4">
                    {isParlay && (
                      <button onClick={() => {
                        const next = new Set(expandedRows);
                        isExpanded ? next.delete(bet.id) : next.add(bet.id);
                        setExpandedRows(next);
                      }} className="text-slate-500 hover:text-emerald-400">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-4 text-slate-400 whitespace-nowrap text-xs">
                    {betDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) || <span className="text-red-400 text-[10px]">No Date</span>}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-slate-200">
                        {isParlay ? `${legs.length} Leg Parlay` : (legs[0]?.player || 'Straight Bet')}
                      </span>
                      {!isParlay && legs[0] && (
                        <span className="text-xs text-slate-400">
                          {legs[0].prop} {legs[0].selection} {legs[0].line}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono text-slate-300 font-bold">
                    {effectiveOdds > 0 ? `+${effectiveOdds}` : effectiveOdds}
                  </td>
                  <td className="px-4 py-4 text-slate-200">${numericStake.toFixed(2)}</td>
                  <td className="px-4 py-4">
                    <Badge className={ status === 'won' ? 'bg-green-500/10 text-green-500 border-green-500/20' : status === 'lost' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20' }>
                      {status}
                    </Badge>
                  </td>
                  <td className={`px-4 py-4 font-mono font-bold ${status === 'won' ? 'text-emerald-400' : status === 'lost' ? 'text-red-400' : 'text-slate-400'}`}>
                    ${status === 'lost' ? '0.00' : payoutValue.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => onEdit?.(bet)} className="h-7 w-7"><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete?.(bet.id)} className="h-7 w-7 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
                {isExpanded && isParlay && (
                  <tr className="bg-slate-900/60">
                    <td colSpan={8} className="p-0">
                      <div className="px-10 py-6 border-l-4 border-emerald-500/50">
                        <h4 className="text-sm font-bold text-emerald-400 mb-4">Parlay Legs:</h4>
                        <div className="space-y-3">
                          {legs.map((leg: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                               <div>
                                <p className="font-bold text-slate-200 text-sm">
                                  {leg.playerteam || leg.player}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {leg.matchup && <span className="text-blue-400 mr-2">{leg.matchup}</span>}
                                  {leg.prop}: <span className="text-emerald-400 font-semibold">{leg.selection} {leg.line}</span>
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge variant="secondary" className="font-mono text-xs bg-slate-900 text-slate-300">{leg.odds > 0 ? `+${leg.odds}` : leg.odds}</Badge>
                                {leg.status && <span className={`ml-3 text-xs font-bold uppercase px-2 py-1 rounded ${ leg.status === 'won' ? 'bg-green-500/10 text-green-500' : leg.status === 'lost' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500' }`}>{leg.status}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
