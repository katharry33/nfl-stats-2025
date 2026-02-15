// src/components/bets/bets-table.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const ensureNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

export function calculatePayout(stake: number | string, odds: number | string, isBonus: boolean = false): number {
  const s = ensureNumber(stake);
  const o = ensureNumber(odds);
  if (s <= 0 || o === 0) return 0;
  let profit = o > 0 ? s * (o / 100) : s * (100 / Math.abs(o));
  return isBonus ? profit : profit + s;
}

function getNormalizedDate(bet: any): Date | null {
  const rawDate = bet.createdAt || bet.date || bet.gameDate || bet.timestamp;
  
  if (!rawDate) {
    console.log('⚠️ No date for bet:', bet.id);
    return null;
  }
  
  try {
    // Handle Firestore Timestamp - check BOTH _seconds and seconds
    if (typeof rawDate === 'object') {
      // Serialized Firestore Timestamp (from API)
      if (rawDate._seconds) {
        console.log('✓ Found _seconds:', rawDate._seconds);
        return new Date(rawDate._seconds * 1000);
      }
      // Direct Firestore Timestamp
      if (rawDate.seconds) {
        return new Date(rawDate.seconds * 1000);
      }
    }
    
    // Handle string dates
    const parsedDate = new Date(rawDate);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  } catch (error) {
    console.error('Date parsing error:', error, rawDate);
    return null;
  }
}

export const BetsTable = ({ bets, onDelete, onEdit }: any) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedBets = useMemo(() => {
    if (!Array.isArray(bets)) {
      return [];
    }
    return [...bets].sort((a, b) => {
      let aVal, bVal;
      
      switch(sortColumn) {
        case 'date':
          aVal = getNormalizedDate(a)?.getTime() || 0;
          bVal = getNormalizedDate(b)?.getTime() || 0;
          break;
        case 'stake':
          aVal = Number(a.stake) || 0;
          bVal = Number(b.stake) || 0;
          break;
        case 'odds':
          aVal = Number(a.odds) || 0;
          bVal = Number(b.odds) || 0;
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'payout':
          const aStatus = (a.status || '').toLowerCase();
          const bStatus = (b.status || '').toLowerCase();
          aVal = aStatus === 'lost' ? 0 : calculatePayout(a.stake, Number(a.odds) || 0, a.isBonus);
          bVal = bStatus === 'lost' ? 0 : calculatePayout(b.stake, Number(b.odds) || 0, b.isBonus);
          break;
        default:
          aVal = 0;
          bVal = 0;
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [bets, sortColumn, sortDirection]);

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <span className="opacity-0">↕</span>;
    return <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="overflow-x-auto border border-slate-800 rounded-lg bg-slate-950/50">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
          <tr>
            <th className="px-4 py-4 w-10"></th>
            <th 
              className="px-4 py-4 cursor-pointer hover:text-emerald-400" 
              onClick={() => handleSort('date')}
            >
              Date <SortIcon column="date" />
            </th>
            <th className="px-4 py-4">Selection</th>
            <th 
              className="px-4 py-4 cursor-pointer hover:text-emerald-400" 
              onClick={() => handleSort('odds')}
            >
              Odds <SortIcon column="odds" />
            </th>
            <th 
              className="px-4 py-4 cursor-pointer hover:text-emerald-400" 
              onClick={() => handleSort('stake')}
            >
              Stake <SortIcon column="stake" />
            </th>
            <th 
              className="px-4 py-4 cursor-pointer hover:text-emerald-400" 
              onClick={() => handleSort('status')}
            >
              Status <SortIcon column="status" />
            </th>
            <th 
              className="px-4 py-4 text-emerald-500 cursor-pointer hover:text-emerald-300" 
              onClick={() => handleSort('payout')}
            >
              Payout <SortIcon column="payout" />
            </th>
            <th className="px-4 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {sortedBets?.map((bet) => {
            const isExpanded = expandedRows.has(bet.id);
            const status = (bet.status || bet.result || 'pending').toLowerCase();
            
            const legs = Array.isArray(bet.legs) && bet.legs.length > 0 
              ? bet.legs 
              : Array.isArray(bet.selections) 
                ? bet.selections 
                : (bet.player || bet.prop) 
                  ? [{ player: bet.player, prop: bet.prop, selection: bet.selection, line: bet.line }] 
                  : [];

            const isParlay = legs.length > 1;
            const numericStake = ensureNumber(bet.stake);
            const isBonus = !!bet.isBonus;
            const effectiveOdds = ensureNumber(bet.odds || legs[0]?.odds || 0);
            const payoutValue = calculatePayout(numericStake, effectiveOdds, isBonus);
            
            // Get unique matchups for display
            const matchups = Array.from(new Set(legs.map((l: any) => l.matchup).filter(Boolean)));
            const matchupDisplay = matchups.length > 0 ? matchups.join(' • ') : '';
            
            // Create player preview for parlays
            const playerPreview = isParlay 
              ? legs.map((l: any) => l.player).filter(Boolean).join(', ')
              : '';

            const betDate = getNormalizedDate(bet);

            return (
              <React.Fragment key={bet.id}>
                <tr className="hover:bg-slate-900/40 transition-colors group text-sm">
                  <td className="px-4 py-4">
                    {legs.length > 0 && (
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
                    {betDate ? betDate.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: '2-digit'
                    }) : (
                      <span className="text-red-400 text-[10px]">No Date</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-slate-200">
                        {bet.betType?.includes('leg') 
                          ? bet.betType 
                          : isParlay 
                            ? `${legs.length} Leg Parlay` 
                            : (legs[0]?.player || 'Straight Bet')
                        }
                      </span>
                      
                      {/* Show player preview for parlays */}
                      {isParlay && playerPreview && (
                        <span className="text-xs text-slate-500 truncate max-w-xs">
                          {playerPreview}
                        </span>
                      )}
                      
                      {/* Show prop details for single bets */}
                      {!isParlay && legs[0] && (
                        <span className="text-xs text-slate-400">
                          {legs[0].prop} {legs[0].selection} {legs[0].line}
                        </span>
                      )}
                      
                      {/* Show matchups as badges */}
                      {matchupDisplay && (
                        <div className="flex gap-1 flex-wrap mt-1">
                          {matchups.slice(0, 3).map((matchup, idx) => (
                            <Badge 
                              key={idx} 
                              variant="outline" 
                              className="text-[9px] px-1.5 py-0 font-mono bg-slate-900/50 border-slate-700 text-slate-400"
                            >
                              {String(matchup)} {/* Convert to string */}
                            </Badge>
                          ))}
                          {matchups.length > 3 && (
                            <Badge 
                              variant="outline" 
                              className="text-[9px] px-1.5 py-0 font-mono bg-slate-900/50 border-slate-700 text-slate-500"
                            >
                              +{String(matchups.length - 3)} {/* Convert to string */}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono text-slate-300 font-bold">
                    {effectiveOdds > 0 ? `+${effectiveOdds}` : effectiveOdds}
                  </td>
                  <td className="px-4 py-4 text-slate-200">${numericStake.toFixed(2)}</td>
                  <td className="px-4 py-4">
                    <Badge className={
                      status === 'won' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 
                      status === 'lost' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                      status === 'cashed_out' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                      'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }>
                      {status === 'cashed_out' ? 'Cashed Out' : status}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col font-mono">
                      <span className={`font-bold ${status === 'won' ? 'text-emerald-400' : status === 'lost' ? 'text-red-400' : 'text-slate-400'}`}>
                        ${status === 'lost' ? '0.00' : payoutValue.toFixed(2)}
                      </span>
                      {status === 'won' && (
                        <span className="text-[9px] text-emerald-500">
                          Profit: +${(payoutValue - numericStake).toFixed(2)}
                        </span>
                      )}
                      {status === 'pending' && (
                        <span className="text-[9px] text-amber-400">
                          If wins
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => onEdit?.(bet)} className="h-7 w-7">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete?.(bet.id)} className="h-7 w-7 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
                
                {/* Expanded legs view */}
                {isExpanded && legs.length > 0 && (
                  <tr className="bg-slate-900/60">
                    <td colSpan={8} className="px-6 py-6 border-l-4 border-emerald-500/50">
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-emerald-400 mb-4">
                          {isParlay ? 'Parlay Legs:' : 'Bet Details:'}
                        </h4>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {legs.map((leg: any, idx: number) => (
                            <div 
                              key={idx} 
                              className="flex flex-col gap-2 p-4 bg-slate-950/80 rounded-lg border border-slate-800/70 hover:border-emerald-500/30 transition-colors"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-bold text-slate-200 text-sm">
                                    {leg.player}
                                    {leg.team && <span className="text-slate-500 font-normal ml-2">({leg.team})</span>}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-1">
                                    {leg.prop}: <span className="text-emerald-400 font-semibold">{leg.selection} {leg.line}</span>
                                  </p>
                                  {leg.matchup && (
                                    <p className="text-xs text-slate-500 mt-1 font-mono">
                                      📍 {leg.matchup}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <Badge variant="secondary" className="font-mono text-xs bg-slate-900 text-slate-300">
                                    {leg.odds > 0 ? `+${leg.odds}` : leg.odds}
                                  </Badge>
                                  {leg.status && (
                                    <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                                      leg.status === 'won' ? 'bg-green-500/10 text-green-500' :
                                      leg.status === 'lost' ? 'bg-red-500/10 text-red-500' :
                                      'bg-amber-500/10 text-amber-500'
                                    }`}>
                                      {leg.status}
                                    </span>
                                  )}
                                </div>
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