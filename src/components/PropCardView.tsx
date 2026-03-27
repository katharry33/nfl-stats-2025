'use client';

import React from 'react';
import { PropDoc } from '@/lib/types';
import { Pencil, Trash2 } from 'lucide-react';

interface PropCardViewProps {
  prop: PropDoc;
  onAddLeg: (p: PropDoc) => void;
  onEdit?: (p: PropDoc) => void;
  onDelete?: (p: PropDoc) => void;
}

function fOdds(v: number | null | undefined) {
  if (v == null) return '—';
  return v > 0 ? `+${v}` : String(v);
}

function fPct(v: number | null | undefined) {
  if (v == null || isNaN(Number(v))) return '—';
  return (Number(v) * 100).toFixed(1) + '%';
}

export function PropCardView({ prop, onAddLeg, onEdit, onDelete }: PropCardViewProps) {
  // Derived matchup (new ingestion does NOT store matchup)
  const matchup =
    prop.team && prop.opponent ? `${prop.team} @ ${prop.opponent}` : null;

  // Win probability bar uses modelProb (0–1)
  const pct = prop.modelProb != null ? prop.modelProb * 100 : null;

  const barCls =
    pct == null
      ? 'bg-zinc-700'
      : pct > 60
      ? 'bg-emerald-500'
      : pct > 50
      ? 'bg-yellow-500'
      : 'bg-red-500';

  const pctCls =
    pct == null
      ? 'text-zinc-500'
      : pct > 60
      ? 'text-emerald-400'
      : pct > 50
      ? 'text-yellow-400'
      : 'text-red-400';

  return (
    <article className="group relative bg-zinc-900/60 border border-white/8 rounded-2xl p-4 hover:border-indigo-500/40 transition-all flex flex-col gap-3">
      {/* Edit / Delete */}
      {(onEdit || onDelete) && (
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={() => onEdit(prop)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white transition-all"
            >
              <Pencil size={11} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(prop)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-all"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      )}

      {/* Player + matchup */}
      <div>
        <div className="font-bold text-white text-sm leading-tight pr-12">
          {prop.player}
        </div>

        <div className="flex items-center gap-1.5 mt-0.5">
          {prop.team && (
            <span className="text-[9px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
              {prop.team}
            </span>
          )}

          {matchup && (
            <span className="text-[10px] text-zinc-500 font-mono">
              {matchup}
            </span>
          )}
        </div>
      </div>

      {/* Prop / Line */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-zinc-300 capitalize">
            {prop.prop}
          </div>

          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-indigo-400 text-[10px] font-black">
              {prop.overUnder === 'Over'
                ? '↑'
                : prop.overUnder === 'Under'
                ? '↓'
                : ''}
            </span>
            <span className="text-indigo-300 font-mono font-bold text-sm">
              {prop.line}
            </span>
          </div>
        </div>

        <span
          className={`font-mono font-black text-base ${
            prop.odds > 0 ? 'text-emerald-400' : 'text-zinc-300'
          }`}
        >
          {fOdds(prop.odds)}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-1 text-center">
        {[
          {
            label: 'Avg',
            value:
              prop.playerAvg != null
                ? Number(prop.playerAvg).toFixed(1)
                : '—',
          },
          { label: 'Win%', value: fPct(prop.modelProb) },
          { label: 'Hit%', value: fPct(prop.seasonHitPct) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-black/30 rounded-lg py-1.5">
            <div className="text-[8px] font-black uppercase text-zinc-600 tracking-wider">
              {label}
            </div>
            <div className="text-[10px] font-bold text-zinc-300 font-mono mt-0.5">
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Win prob bar */}
      {pct != null && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${barCls}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span className={`text-[10px] font-black font-mono ${pctCls}`}>
            {pct.toFixed(1)}%
          </span>
        </div>
      )}

      {/* Add Leg */}
      <button
        onClick={() => onAddLeg(prop)}
        className="w-full py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-400/40 text-indigo-400 text-[10px] font-black uppercase tracking-widest transition-all"
      >
        + Add Leg
      </button>
    </article>
  );
}
