
import React from 'react';
import { NFLProp, DefenseMap, SortKey } from '@/lib/types';
type SortDir = 'asc' | 'desc';

interface PropsTableProps {
  props: (NFLProp & { id: string })[];
  isLoading: boolean;
  error: string | null;
  onAddToBetSlip: (prop: NFLProp & { id: string }) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onRemoveFromBetSlip: (propId: string) => void;
  [key: string]: any;
}

export default function PropsTable({ 
  props, 
  isLoading, 
  error, 
  onAddToBetSlip,
  sortKey,
  sortDir,
  onSort,
  onRemoveFromBetSlip
}: PropsTableProps) {
  if (isLoading) return <div className="p-8 text-center text-slate-400">Loading props...</div>;
  if (error) return <div className="p-8 text-center text-rose-500">Error: {error}</div>;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <table className="w-full text-sm text-left border-collapse">
      <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold tracking-widest">
        <tr>
          {/* Map through sortable keys to keep code DRY */}
          {(['player', 'prop', 'line'] as SortKey[]).map((key) => (
            <th 
              key={key}
              className="p-4 cursor-pointer hover:text-white transition-colors group"
              onClick={() => onSort(key)}
            >
              <div className="flex items-center gap-1">
                {key}
                <span className={`transition-opacity ${sortKey === key ? 'opacity-100 text-emerald-500' : 'opacity-0 group-hover:opacity-50'}`}>
                  {sortKey === key && sortDir === 'desc' ? '↓' : '↑'}
                </span>
              </div>
            </th>
          ))}
          <th className="p-4 text-right">Action</th>
        </tr>
      </thead>
        <tbody className="divide-y divide-slate-800">
          {props.map((p) => (
            <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
              <td className="p-4">
                <div className="flex flex-col">
                  <span className="font-bold text-white">{p.player}</span>
                  <span className="text-[10px] text-slate-500 font-mono uppercase">
                    {p.team} • ID: {p.pfrid || 'N/A'}
                  </span>
                </div>
              </td>
              <td className="p-4 text-slate-400">{p.prop}</td>
              <td className="p-4 font-mono text-emerald-400">{p.line}</td>
              <td className="p-4 text-right">
                <button 
                  onClick={() => onAddToBetSlip(p)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-md text-xs font-bold transition-all active:scale-95"
                >
                  ADD
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
