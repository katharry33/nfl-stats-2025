'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Trash2, Edit } from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BetsTableProps {
  bets: any[];
  onEdit: (bet: any) => void;
}

type SortKey = 'createdAt' | 'week' | 'stake' | 'odds' | 'result';

export function BetsTable({ bets, onEdit }: BetsTableProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [weekFilter, setWeekFilter] = useState<number | 'all'>('all');

  // Sorting
  const sorted = useMemo(() => {
    const arr = [...bets];
    arr.sort((a, b) => {
      const A = a[sortKey];
      const B = b[sortKey];
      if (A == null && B == null) return 0;
      if (A == null) return 1;
      if (B == null) return -1;
      if (A < B) return sortDir === 'asc' ? -1 : 1;
      if (A > B) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [bets, sortKey, sortDir]);

  // Week filter
  const filtered = useMemo(() => {
    if (weekFilter === 'all') return sorted;
    return sorted.filter(b => b.week === weekFilter);
  }, [sorted, weekFilter]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatStake = (n: number) => `$${n.toFixed(2)}`;
  const formatOdds = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  const resultColor = (r: string) => {
    if (!r) return 'text-zinc-400';
    const x = r.toLowerCase();
    if (x === 'won' || x === 'win') return 'text-green-400';
    if (x === 'lost' || x === 'loss') return 'text-red-400';
    if (x === 'push') return 'text-yellow-400';
    return 'text-zinc-400';
  };

  // Firestore actions
  const deleteParlay = async (parlayid: string) => {
    try {
      await deleteDoc(doc(db, 'bettingLog', parlayid));
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  const updateLeg = async (parlayid: string, index: number, updates: any) => {
    try {
      const ref = doc(db, 'bettingLog', parlayid);
      const bet = bets.find(b => b.parlayid === parlayid);
      if (!bet) return;

      const newLegs = [...bet.legs];
      newLegs[index] = { ...newLegs[index], ...updates };

      await updateDoc(ref, { legs: newLegs });
    } catch (e) {
      console.error('Update leg error:', e);
    }
  };

  const deleteLeg = async (parlayid: string, index: number) => {
    try {
      const ref = doc(db, 'bettingLog', parlayid);
      const bet = bets.find(b => b.parlayid === parlayid);
      if (!bet) return;

      const newLegs = bet.legs.filter((_: any, i: number) => i !== index);
      await updateDoc(ref, { legs: newLegs });
    } catch (e) {
      console.error('Delete leg error:', e);
    }
  };

  return (
    <div className="w-full overflow-x-auto">

      {/* Week Filter */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Week:
        </span>

        <button
          onClick={() => setWeekFilter('all')}
          className={cn(
            'px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
            weekFilter === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-black/40 text-zinc-500 hover:text-zinc-300'
          )}
        >
          All
        </button>

        {Array.from(new Set(bets.map(b => b.week).filter(Boolean))).map((w: number) => (
          <button
            key={w}
            onClick={() => setWeekFilter(w)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
              weekFilter === w
                ? 'bg-indigo-600 text-white'
                : 'bg-black/40 text-zinc-500 hover:text-zinc-300'
            )}
          >
            {w}
          </button>
        ))}
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
          <tr className="border-b border-white/5">
            <th className="py-3 cursor-pointer" onClick={() => toggleSort('createdAt')}>Date</th>
            <th className="py-3 cursor-pointer" onClick={() => toggleSort('week')}>Week</th>
            <th className="py-3">Legs</th>
            <th className="py-3 cursor-pointer" onClick={() => toggleSort('stake')}>Stake</th>
            <th className="py-3 cursor-pointer" onClick={() => toggleSort('odds')}>Odds</th>
            <th className="py-3 cursor-pointer" onClick={() => toggleSort('result')}>Result</th>
            <th className="py-3">Actions</th>
          </tr>
        </thead>

        <tbody className="text-white">
          {filtered.map((bet) => {
            const isOpen = expanded[bet.parlayid];

            return (
              <React.Fragment key={bet.parlayid}>
                <tr
                  className="border-b border-white/5 hover:bg-white/5 transition cursor-pointer"
                  onClick={() => toggleExpand(bet.parlayid)}
                >
                  <td className="py-3 text-zinc-300">
                    {bet.gameDate ? new Date(bet.gameDate).toLocaleDateString() : '—'}
                  </td>

                  <td className="py-3 text-center text-zinc-300">
                    {bet.week ?? '—'}
                  </td>

                  <td className="py-3 text-zinc-300">
                    {bet.legs.length} legs
                  </td>

                  <td className="py-3 text-zinc-300">
                    {formatStake(bet.stake)}
                  </td>

                  <td className="py-3 text-zinc-300">
                    {formatOdds(bet.odds)}
                  </td>

                  <td className={cn('py-3 font-bold', resultColor(bet.result))}>
                    {bet.result}
                  </td>

                  <td className="py-3 flex gap-3 justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(bet);
                      }}
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      <Edit size={16} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteParlay(bet.parlayid);
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>

                {isOpen && (
                  <tr className="bg-black/40 border-b border-white/5">
                    <td colSpan={7} className="p-4">
                      <div className="space-y-4">
                        {bet.legs.map((leg: any, index: number) => (
                          <div
                            key={index}
                            className="p-4 bg-black/30 rounded-xl border border-white/5"
                          >
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <p className="text-white font-semibold">{leg.player}</p>
                                <p className="text-zinc-400 text-xs">
                                  {leg.prop} — {leg.selection} {leg.line}
                                </p>
                                <p className="text-zinc-500 text-xs">{leg.matchup}</p>
                              </div>

                              <div className="flex gap-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit({ ...bet, editLegIndex: index });
                                  }}
                                  className="text-indigo-400 hover:text-indigo-300"
                                >
                                  <Edit size={16} />
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteLeg(bet.parlayid, index);
                                  }}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
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
}
