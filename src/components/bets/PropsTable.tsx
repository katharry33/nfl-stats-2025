'use client';

import React from 'react';
import { 
  RefreshCw, Edit3, Trash2, Plus, 
  User, Zap, Loader2, CheckCircle2, XCircle, 
  ArrowUpDown, Search
} from 'lucide-react';

interface PropsTableProps {
  props: any[];
  league: 'nba' | 'nfl';
  isLoading: boolean;
  mode: 'builder' | 'archive';
  hasMore?: boolean;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  onEdit?: (prop: any) => void;
  onDelete?: (prop: any) => void;
  onAddToSlip?: (prop: any) => void;
  onManualEntry?: () => void;
}

export default function PropsTable({ 
  props, league, isLoading, mode, hasMore, 
  onLoadMore, onRefresh, onEdit, onDelete, onAddToSlip, onManualEntry 
}: PropsTableProps) {

  if (isLoading && props.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Accessing Engine...</span>
      </div>
    );
  }

  return (
    <div className="w-full bg-transparent overflow-hidden font-sans">
      {/* 🟢 TOP ACTION BAR */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-black/20">
        <div className="flex items-center gap-6">
          <button 
            onClick={onRefresh}
            className="group flex items-center gap-2 text-zinc-500 hover:text-indigo-400 transition-colors"
          >
            <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-700" />
            <span className="text-[9px] font-black uppercase tracking-widest">Enrich & Backfill Slate</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-zinc-900 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all">
            Columns
          </button>
          <button 
            onClick={onManualEntry}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white hover:bg-zinc-700 transition-all shadow-lg active:scale-95"
          >
            <Plus size={12} /> Manual Entry
          </button>
        </div>
      </div>

      {/* 📊 DATA TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1100px]">
          <thead>
            <tr className="border-b border-white/5 bg-black/10">
              <th className="py-5 px-8 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                <div className="flex items-center gap-2">Player / Matchup <ArrowUpDown size={10}/></div>
              </th>
              <th className="py-5 px-6 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-center">Prop Type</th>
              <th className="py-5 px-6 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-center">Line</th>
              
              {/* HISTORICAL ONLY COLUMN */}
              {mode === 'archive' && (
                <th className="py-5 px-6 text-[9px] font-black text-emerald-500 uppercase tracking-widest text-center">Actual</th>
              )}
              
              <th className="py-5 px-6 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-center">
                {mode === 'archive' ? 'Result' : 'Projection'}
              </th>
              <th className="py-5 px-8 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {props.map((prop, i) => {
              const resultRaw = (prop.actualResult || '').toLowerCase();
              const isWin = resultRaw.includes('hit') || resultRaw.includes('won') || resultRaw.includes('over');
              
              return (
                <tr key={prop.id || i} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="py-5 px-8">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-zinc-900 rounded-xl border border-white/5 group-hover:border-indigo-500/30">
                        <User size={16} className="text-zinc-600 group-hover:text-indigo-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-black text-white group-hover:text-indigo-400 uppercase tracking-tight">
                          {prop.playerName || prop.player || 'Unknown'}
                        </span>
                        <span className="text-[10px] font-bold text-zinc-600 uppercase">
                          {prop.matchup || `${prop.team} @ ${prop.opponent}`}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-5 px-6 text-center">
                    <span className="text-[10px] font-black text-zinc-400 uppercase bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 tracking-wider">
                      {prop.propNorm || prop.prop}
                    </span>
                  </td>

                  <td className="py-5 px-6 text-center">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1.5">
                        <Zap size={12} className="text-zinc-600" />
                        <span className="text-[14px] font-black text-white tabular-nums tracking-tighter">
                          {prop.line}
                        </span>
                      </div>
                      <span className={`text-[10px] font-black ${prop.overUnder === 'Over' ? 'text-emerald-500' : 'text-rose-500'}`}>
                         {prop.overUnder === 'Over' ? 'O' : 'U'} {prop.odds > 0 ? `+${prop.odds}` : prop.odds}
                      </span>
                    </div>
                  </td>

                  {/* ACTUAL STATS (Archive Only) */}
                  {mode === 'archive' && (
                    <td className="py-5 px-6 text-center">
                      <span className="text-[15px] font-mono font-black text-white italic underline underline-offset-4 decoration-emerald-500/30">
                        {prop.gameStat || '—'}
                      </span>
                    </td>
                  )}

                  <td className="py-5 px-6 text-center">
                    {mode === 'archive' ? (
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest ${
                        isWin ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}>
                        {isWin ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                        {isWin ? 'Hit' : 'Miss'}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-[13px] font-black text-zinc-300 italic">
                          {prop.projection || '—'}
                        </span>
                        {prop.projection && (
                          <span className={`text-[8px] font-black ${Number(prop.projection) > prop.line ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {Number(prop.projection) > prop.line ? '▲' : '▼'} {Math.abs(Number(prop.projection) - prop.line).toFixed(1)}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="py-5 px-8">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => onAddToSlip?.(prop)}
                        className="bg-white text-black px-4 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-indigo-500 hover:text-white transition-all active:scale-95 shadow-lg shadow-white/5"
                      >
                        + Slip
                      </button>
                      <button onClick={() => onEdit?.(prop)} className="p-2 text-zinc-700 hover:text-white transition-colors">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => onDelete?.(prop)} className="p-2 text-zinc-700 hover:text-rose-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 🟢 PAGINATION */}
      {hasMore && (
        <div className="p-8 flex justify-center border-t border-white/5 bg-black/20">
          <button 
            onClick={onLoadMore} 
            className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] hover:text-white transition-all"
          >
            Load More Records
          </button>
        </div>
      )}
    </div>
  );
}