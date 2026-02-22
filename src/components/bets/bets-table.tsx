'use client';

import React, { useState, useCallback } from 'react';
import { Edit2, Trash2, ArrowUpDown, ChevronDown } from 'lucide-react';
import { cn, formatBetDate, calculateNetProfit } from '@/lib/utils';

// Helper Component 1: StatusBadge
function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? '').toLowerCase();
  const styles: Record<string, string> = {
    won:         'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    lost:        'bg-red-500/15 text-red-400 border-red-500/20',
    pending:     'bg-slate-700/40 text-slate-400 border-slate-600/30',
    'cashed out':'bg-amber-500/15 text-amber-400 border-amber-500/20',
    void:        'bg-slate-700/20 text-slate-600 border-slate-700/20',
  };
  const cls = styles[s] ?? styles.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${cls}`}>
      {s === 'cashed out' ? 'CASHED' : (status ?? 'PENDING').toUpperCase()}
    </span>
  );
}

// Helper Component 2: PayoutCell
function PayoutCell({ bet }: { bet: any }) {
  const stake = Number(bet.stake || bet.wager || 0);
  if (stake === 0) {
    return (
      <div>
        <div className="text-slate-600">-</div>
        <div className="text-[10px] text-slate-600 uppercase tracking-wide">NO STAKE</div>
      </div>
    );
  }

  const status = (bet.status || '').toLowerCase();

  switch (status) {
    case 'won': {
      const profit = calculateNetProfit(stake, bet.odds);
      const payout = stake + profit;
      return (
        <div>
          <div className="font-mono text-xs font-semibold text-emerald-400">
            ${payout.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-600 uppercase tracking-wide">
            +${profit.toFixed(2)} PROFIT
          </div>
        </div>
      );
    }
    case 'lost': {
      return (
        <div>
          <div className="font-mono text-xs font-semibold text-slate-500 line-through">
            ${stake.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-600 uppercase tracking-wide">
            -${stake.toFixed(2)} LOSS
          </div>
        </div>
      );
    }
    case 'cashed out':
    case 'cashed': {
      const cashedAmount = Number(bet.cashedOutAmount || bet.cashedAmount || 0);
      const profit = cashedAmount - stake;
      return (
        <div>
          <div className="font-mono text-xs font-semibold text-amber-400">
            ${cashedAmount.toFixed(2)}
          </div>
          <div className={cn(
            "text-[10px] uppercase tracking-wide",
            profit >= 0 ? "text-emerald-500" : "text-rose-500"
          )}>
            {profit >= 0 ? '+' : ''}${profit.toFixed(2)} NET
          </div>
        </div>
      );
    }
    case 'void':
    case 'push': {
      return (
        <div>
          <div className="font-mono text-xs font-semibold text-slate-500">
            ${stake.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-600 uppercase tracking-wide">
            PUSH/VOID
          </div>
        </div>
      );
    }
    case 'pending':
    default: {
      const profit = calculateNetProfit(stake, bet.odds);
      const payout = stake + profit;
      return (
        <div>
          <div className="font-medium text-slate-400">
            ${payout.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 uppercase font-bold">
            Profit: ${profit.toFixed(2)}
          </div>
        </div>
      );
    }
  }
}


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
  onSort?: (key: string) => void
}) {
  const [expandedParlays, setExpandedParlays] = useState<Set<string>>(new Set());

  const toggleParlay = useCallback((betId: string) => {
    setExpandedParlays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(betId)) {
        newSet.delete(betId);
      } else {
        newSet.add(betId);
      }
      return newSet;
    });
  }, []);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-900/80 border-b border-slate-800">
          <tr>
            <th className="w-8 px-4 py-3" />
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Player / Prop</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Selection</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase cursor-pointer" onClick={() => onSort?.('matchup')}>Matchup</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase cursor-pointer" onClick={() => onSort?.('gameDate')}>Game Date</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase cursor-pointer" onClick={() => onSort?.('stake')}>Stake</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Boost</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase cursor-pointer" onClick={() => onSort?.('week')}>Week</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase cursor-pointer" onClick={() => onSort?.('status')}>Status</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Payout / Paid</th>
            <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody>
          {bets.map((bet) => {
            const isParlay = bet.legs?.length > 1;
            const isExpanded = expandedParlays.has(bet.id);
            const firstLeg = bet.legs?.[0] ?? {};

            return (
              <React.Fragment key={bet.id}>
                <tr className="border-b border-slate-800/60 hover:bg-slate-800/20" onClick={() => isParlay && toggleParlay(bet.id)}>
                  <td className="px-4 py-3 text-center">
                    {isParlay && (
                      <ChevronDown size={16} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-100">
                      {isParlay ? `${bet.legs.length}-Leg Parlay` : firstLeg.player}
                    </div>
                    {!isParlay && <div className="text-[10px] text-slate-500 uppercase">{firstLeg.prop}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="uppercase text-emerald-400 font-black mr-1.5">
                      {isParlay ? (bet.odds > 0 ? `+${bet.odds}`: bet.odds) : firstLeg.selection}
                    </span>
                    {!isParlay && <span className="text-white font-bold">{firstLeg.line}</span>}
                  </td>
                  <td className="px-4 py-3 uppercase font-mono text-[10px] text-slate-500">
                    {isParlay ? 'MULTI' : firstLeg.matchup}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {/* Ensure this property name matches your DB exactly */}
                    {formatBetDate(bet.date || bet.gameDate)} 
                  </td>

                  {/* Stake */}
                  <td className="px-4 py-3 text-sm font-mono text-slate-300 whitespace-nowrap">
                    {(bet.stake > 0 || bet.wager > 0)
                      ? `$${(bet.stake || bet.wager || 0).toFixed(2)}`
                      : <span className="text-slate-600">—</span>
                    }
                  </td>

                  {/* Boost */}
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {bet.boost
                      ? <span className="text-amber-400 font-mono font-semibold text-xs">{bet.boost}</span>
                      : <span className="text-slate-700">—</span>
                    }
                  </td>

                  {/* Week */}
                  <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap font-mono">
                    {(bet.week ?? bet.legs?.[0]?.week)
                      ? `WK ${bet.week ?? bet.legs?.[0]?.week}`
                      : <span className="text-slate-700">—</span>
                    }
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={bet.status} />
                  </td>

                  {/* Payout / Paid */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <PayoutCell bet={bet} />
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={(e) => { e.stopPropagation(); onEdit?.(bet); }} className="p-1 text-slate-500 hover:text-white"><Edit2 size={14}/></button>
                      <button onClick={(e) => { e.stopPropagation(); onDelete?.(bet.id); }} className="p-1 text-slate-500 hover:text-rose-400"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>

                {isParlay && isExpanded && bet.legs?.map((leg: any, i: number) => (
                  <tr key={leg.id || i} className="bg-slate-950/60 border-b border-slate-800/50">
                    <td className="pl-10 pr-4 py-2" colSpan={1} />
                    <td className="px-4 py-2">
                      <div className="text-xs text-slate-300 font-medium">{leg.player || leg.playerteam}</div>
                      <div className="text-[10px] text-slate-600">{leg.prop}</div>
                    </td>
                    <td className="px-4 py-2 text-xs">
                      <span className={leg.selection === 'Over' ? 'text-blue-400' : 'text-orange-400'}>
                        {leg.selection}
                      </span>
                      <span className="text-slate-400 ml-1">{leg.line}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">{leg.matchup}</td>
                    <td className="px-4 py-2 text-xs text-slate-600">—</td>
                    <td className="px-4 py-2 text-xs text-slate-600">—</td>
                    <td className="px-4 py-2" />
                    <td className="px-4 py-2 text-xs text-slate-500 font-mono">
                      {leg.week ? `WK ${leg.week}` : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={leg.status} />
                    </td>
                    <td className="px-4 py-2" />
                    <td className="px-4 py-2" />
                  </tr>
                ))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}