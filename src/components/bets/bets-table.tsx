
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit2, Trash2, ArrowUpDown, ChevronDown } from 'lucide-react';
import { formatBetDate } from '@/lib/utils/dates';
import { getBetPayout, formatPayout } from '@/lib/utils/payout';

export function BetsTable({ 
  bets, 
  isLibraryView = false, 
  onEdit, 
  onDelete,
  onSort 
}: { 
  bets: any[], 
  isLibraryView?: boolean,
  onEdit?: (bet: any) => void,
  onDelete?: (id: string) => void,
  onSort: (key: string) => void
}) {
  const [expandedParlays, setExpandedParlays] = useState<Set<string>>(new Set());

  const toggleParlay = (betId: string) => {
    setExpandedParlays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(betId)) {
        newSet.delete(betId);
      } else {
        newSet.add(betId);
      }
      return newSet;
    });
  };

  const hasParlays = bets.some(bet => bet.legs?.length > 1);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-950 border-b-2 border-slate-800">
          <TableRow>
            <TableHead className="text-slate-200 font-bold">Player / Prop</TableHead>
            <TableHead className="text-slate-200 font-bold">Selection</TableHead>
            <TableHead className="text-slate-400 font-bold">Matchup</TableHead>
            <TableHead>
              <button 
                onClick={() => onSort('gameDate')} 
                className="flex items-center gap-2 group transition-colors w-full"
              >
                <span className="text-slate-200 font-bold uppercase text-[11px] group-hover:text-emerald-400">
                  Game Date
                </span>
                <ArrowUpDown size={12} className="text-slate-500 group-hover:text-emerald-400" />
              </button>
            </TableHead>

            {!isLibraryView && (
              <>
                <TableHead>
                  <button 
                    onClick={() => onSort('stake')} 
                    className="flex items-center gap-2 group transition-colors w-full"
                  >
                    <span className="text-slate-200 font-bold uppercase text-[11px] group-hover:text-emerald-400">
                      Stake
                    </span>
                    <ArrowUpDown size={12} className="text-slate-500 group-hover:text-emerald-400" />
                  </button>
                </TableHead>
                
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Boost
                </th>
                <th
                  className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer whitespace-nowrap"
                  onClick={() => onSort('week')}
                >
                  Week <ArrowUpDown className="inline h-3 w-3 ml-1 opacity-40" />
                </th>

                <TableHead>
                  <button 
                    onClick={() => onSort('status')} 
                    className="flex items-center gap-2 group transition-colors w-full"
                  >
                    <span className="text-slate-200 font-bold uppercase text-[11px] group-hover:text-emerald-400">
                      Status
                    </span>
                    <ArrowUpDown size={12} className="text-slate-500 group-hover:text-emerald-400" />
                  </button>
                </TableHead>

                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Payout / Paid
                </th>
                
                <TableHead className="text-right text-slate-200 font-bold">
                  <div className="flex items-center justify-end gap-4">
                    <span>Actions</span>
                    {hasParlays && expandedParlays.size > 0 && (
                      <button 
                        onClick={() => setExpandedParlays(new Set())} 
                        className="text-slate-400 hover:text-emerald-400 text-[10px] font-bold uppercase tracking-widest"
                      >
                        Collapse
                      </button>
                    )}
                  </div>
                </TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {bets.map((bet) => {
            const isParlay = bet.legs?.length > 1;
            const firstLeg = bet.legs?.[0];
            const isExpanded = expandedParlays.has(bet.id);

            return (
              <React.Fragment key={bet.id}>
                <TableRow className={`border-slate-800/60 ${isParlay ? 'cursor-pointer bg-slate-900/10' : ''}`} onClick={() => isParlay && toggleParlay(bet.id)}>
                  <TableCell>
                    <div className="font-bold text-slate-100">
                      {isParlay ? (
                        <button onClick={() => toggleParlay(bet.id)} className="flex items-center gap-2 text-emerald-500 transition-colors hover:text-emerald-400">
                          <ChevronDown size={16} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          <span className="flex items-center gap-2">
                            <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded uppercase">Parlay</span>
                            {bet.legs.length} Legs
                          </span>
                        </button>
                      ) : (
                        firstLeg?.player
                      )}
                    </div>
                    {!isParlay && <div className="text-[10px] text-slate-500 uppercase">{firstLeg?.prop}</div>}
                  </TableCell>

                  <TableCell>
                    <span className="uppercase text-emerald-400 font-black mr-1.5">
                      {isParlay ? `+${bet.odds || '—'}` : firstLeg?.selection}
                    </span>
                    {!isParlay && <span className="text-white font-bold">{firstLeg?.line}</span>}
                  </TableCell>

                  <TableCell className="uppercase font-mono text-[10px] text-slate-500">
                    {isParlay ? 'MULTI' : firstLeg?.matchup}
                  </TableCell>
                  
                  <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                    {formatBetDate(bet)}
                  </td>

                  {!isLibraryView && (
                    <>
                      <TableCell className="text-slate-100 font-mono">${bet.stake}</TableCell>
                      
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {bet.bettype !== 'DK' && bet.boostpercentage
                          ? <span className="text-amber-400 font-mono font-semibold">
                              +{bet.boostpercentage}%
                            </span>
                          : <span className="text-slate-600">—</span>
                        }
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap font-mono">
                        {bet.legs?.[0]?.week ? `WK ${bet.legs[0].week}` : '—'}
                      </td>
                      
                      <TableCell>
                        {(() => {
                          const status = bet.status;
                          if (status === 'cashed out') {
                            return (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                CASHED OUT
                              </span>
                            );
                          }
                          const statusClass = status === 'won' ? 'text-emerald-400 bg-emerald-500/10' :
                                            status === 'lost' ? 'text-rose-400 bg-rose-500/10' : 'text-slate-400';
                          return (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-sm uppercase ${statusClass}`}>
                              {status}
                            </span>
                          );
                        })()}
                      </TableCell>

                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {(() => {
                          const payout = getBetPayout(bet);
                          const colorClass =
                            payout.type === 'won'     ? 'text-emerald-400 font-semibold' :
                            payout.type === 'cashout' ? 'text-amber-400 font-semibold'   :
                            payout.type === 'lost'    ? 'text-slate-500 line-through'    :
                            payout.type === 'pending' ? 'text-blue-400'                  :
                                                      'text-slate-400';
                          return (
                            <div>
                              <div className={`font-mono text-xs ${colorClass}`}>
                                {formatPayout(payout)}
                              </div>
                              <div className="text-[10px] text-slate-600 uppercase">{payout.label}</div>
                            </div>
                          );
                        })()}
                      </td>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => onEdit?.(bet)} className="p-1 text-slate-500 hover:text-white"><Edit2 size={14}/></button>
                          <button onClick={() => onDelete?.(bet.id)} className="p-1 text-slate-500 hover:text-rose-400"><Trash2 size={14}/></button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>

                {isParlay && isExpanded && bet.legs.map((leg: any, idx: number) => (
                  <TableRow key={`${bet.id}-leg-${idx}`} className="bg-slate-950/50 border-none group">
                    <TableCell className="pl-12 py-3 border-l-2 border-emerald-500/30">
                       <div className="text-xs text-slate-200 font-semibold">{leg.player}</div>
                       <div className="text-[10px] text-slate-500 uppercase">{leg.prop}</div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="uppercase text-[10px] text-emerald-400/80 font-bold">{leg.selection}</span>
                      <span className="text-[10px] text-slate-100 ml-1 font-bold">{leg.line}</span>
                    </TableCell>
                    <TableCell className="py-3 uppercase font-mono text-[9px] text-slate-600">{leg.matchup}</TableCell>
                    <TableCell />

                    {!isLibraryView && (
                      <>
                        <TableCell />
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2 text-xs text-slate-500 font-mono">
                          {leg.week ? `WK ${leg.week}` : '—'}
                        </td>
                        <TableCell className="py-3">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase ${
                            leg.status === 'won' ? 'text-emerald-500 bg-emerald-500/10' :
                            leg.status === 'lost' ? 'text-rose-500 bg-rose-500/10' : 'text-slate-600'
                          }`}>
                            {leg.status || 'PENDING'}
                          </span>
                        </TableCell>
                        <td className="px-4 py-2" />
                        <TableCell />
                      </>
                    )}
                  </TableRow>
                ))}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
