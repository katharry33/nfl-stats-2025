'use client';

import React from 'react';
import { PropDoc } from '@/lib/types';
import { ResultBadge } from '@/components/ResultBadge';
import { ScoreDiff } from '@/components/ScoreDiff';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface PropsTableProps {
  data: PropDoc[];
  isLoading?: boolean;
  onAddLeg?: (p: PropDoc) => void;
  onEdit?: (p: PropDoc) => void;
  onDelete?: (p: PropDoc) => void;
  view?: 'table' | 'card';
}

export function PropsTable({
  data,
  isLoading,
  onAddLeg,
  onEdit,
  onDelete,
  view = 'table'
}: PropsTableProps) {

  // ─────────────────────────────────────────────
  // MOBILE CARD VIEW
  // ─────────────────────────────────────────────
  if (view === 'card') {
    return (
      <div className="grid grid-cols-1 gap-3 p-3">
        {data.map((p) => (
          <div key={p.id} className="bg-zinc-900/60 border border-white/5 rounded-2xl p-4 space-y-2">

            <div className="flex justify-between items-center">
              <div className="text-xs font-black text-white uppercase tracking-wider">
                {p.player}
              </div>
              <button
                onClick={() => onAddLeg?.(p)}
                className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
              {p.team} @ {p.opponent}
            </div>

            <div className="flex justify-between items-center">
              <div className="text-xs text-white font-bold">
                {p.prop} <span className="text-zinc-500">({p.line})</span>
              </div>
              <ResultBadge v={p.result} />
            </div>

            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>Avg: {p.playerAvg ?? '—'}</span>
              <ScoreDiff v={p.scoreDiff} />
            </div>

            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>Win %: {(p.modelProb * 100).toFixed(0)}%</span>
              <span>Actual: {p.actual ?? '—'}</span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => onEdit?.(p)}
                className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDelete?.(p)}
                className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600/30"
              >
                <Trash2 size={14} />
              </button>
            </div>

          </div>
        ))}
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // DESKTOP TABLE VIEW
  // ─────────────────────────────────────────────
  return (
    <div className="overflow-x-auto relative">
      <table className="w-full text-xs text-left border-collapse">
        <thead className="bg-zinc-900/80 text-zinc-400 uppercase tracking-widest text-[10px]">
          <tr>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Player</th>
            <th className="px-3 py-2">Matchup</th>
            <th className="px-3 py-2">Prop</th>
            <th className="px-3 py-2">Avg</th>
            <th className="px-3 py-2">Diff</th>
            <th className="px-3 py-2">Win%</th>
            <th className="px-3 py-2">Actual</th>
            <th className="px-3 py-2">Result</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>

        <tbody>
          {data.map((p) => (
            <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
              <td className="px-3 py-2">{p.gameDate}</td>
              <td className="px-3 py-2 font-bold text-white">{p.player}</td>
              <td className="px-3 py-2 text-zinc-400">{p.team} @ {p.opponent}</td>
              <td className="px-3 py-2 text-white">
                {p.prop} <span className="text-zinc-500">({p.line})</span>
              </td>
              <td className="px-3 py-2">{p.playerAvg ?? '—'}</td>
              <td className="px-3 py-2"><ScoreDiff v={p.scoreDiff} /></td>
              <td className="px-3 py-2">{(p.modelProb * 100).toFixed(0)}%</td>
              <td className="px-3 py-2">{p.actual ?? '—'}</td>
              <td className="px-3 py-2"><ResultBadge v={p.result} /></td>

              <td className="px-3 py-2 text-right flex gap-2 justify-end">
                <button
                  onClick={() => onAddLeg?.(p)}
                  className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={() => onEdit?.(p)}
                  className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => onDelete?.(p)}
                  className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600/30"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isLoading && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center text-white text-xs">
          Loading…
        </div>
      )}
    </div>
  );
}
