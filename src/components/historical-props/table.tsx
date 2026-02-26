'use client';

import React from 'react';
import { Plus, Calendar, User, Hash } from 'lucide-react';
import { useBetSlip } from '@/context/betslip-context';

// Safe formatting for the "Line" to prevent .toFixed crashes
function fmtLine(n: any): string {
  if (n == null || n === '') return '—';
  const num = typeof n === 'number' ? n : parseFloat(String(n).replace(/[^\d.-]/g, ''));
  return isNaN(num) ? String(n) : num.toFixed(1);
}

interface HistoricalPropsTableProps {
  props: any[];
  totalRecords: number; // The length of the unfiltered props array
}

export function HistoricalPropsTable({ props, totalRecords }: HistoricalPropsTableProps) {
  const { addLeg } = useBetSlip();

  return (
    <div className="space-y-4">
      {/* Dynamic Record Counter */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
            Results
          </span>
        </div>
        <div className="text-sm">
          <span className="text-emerald-400 font-mono font-bold">{props.length}</span>
          <span className="text-slate-600 mx-2 text-xs">/</span>
          <span className="text-slate-400 font-mono">{totalRecords}</span>
          <span className="ml-2 text-[10px] text-slate-500 uppercase tracking-tighter">Total Records</span>
        </div>
      </div>

      {/* The Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-950/50 border-b border-slate-800">
            <tr>
              <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Player</th>
              <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Prop Type</th>
              <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Line</th>
              <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Week</th>
              <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
              <th className="px-4 py-4 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {props.map((item) => (
              <tr key={item.id} className="hover:bg-emerald-500/5 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-slate-600" />
                    <span className="text-sm font-bold text-slate-100">{item.player}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-400 capitalize">{item.prop}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-emerald-400 font-bold">{fmtLine(item.line)}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                    <Hash className="h-3 w-3" />
                    WK {item.week}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="h-3 w-3" />
                    {item.gameDate ? new Date(item.gameDate).toLocaleDateString() : '—'}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => addLeg({ 
                      ...item, 
                      source: 'historical-props',
                      id: item.id // Ensure the context gets the unique ID for removal
                    })}
                    className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-emerald-600 hover:text-white transition-all shadow-lg"
                    title="Add to Bet Slip"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}