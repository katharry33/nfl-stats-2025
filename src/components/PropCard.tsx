// components/PropCard.tsx
'use client';

import React, { useMemo } from 'react';
import { NormalizedProp, BetLeg } from '@/lib/types';
import { Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface PropCardProps {
  prop: NormalizedProp;
  onAddToBetSlip: (leg: BetLeg) => void;
  onEdit?: (prop: NormalizedProp) => void;
  onDelete?: (id: string) => void;
  isAdded?: boolean;
  isAdmin?: boolean;
}

const formatOdds = (o?: number) => (o == null ? '-110' : (o > 0 ? `+${o}` : `${o}`));

export const PropCard = ({ prop, onAddToBetSlip, onEdit, onDelete, isAdded, isAdmin }: PropCardProps) => {
  const overOdds = prop.overOdds ?? prop.bestOdds ?? -110;
  const underOdds = prop.underOdds ?? prop.bestOdds ?? -110;

  const confidencePct = useMemo(() => {
    const raw = (prop.confidenceScore ?? 0) * 100;
    return Math.max(0, Math.min(100, Number(raw.toFixed(0))));
  }, [prop.confidenceScore]);

  const handleAdd = (selection: 'Over' | 'Under', odds: number) => {
    const leg: BetLeg = {
      id: `${prop.id}-${selection}`,
      propId: prop.id,
      player: prop.player,
      prop: prop.prop,
      line: prop.line,
      team: prop.team,
      matchup: prop.matchup,
      selection,
      odds,
      status: 'pending',
      bestBook: prop.bestBook ?? null,
      gameDate: prop.gameDate,
      league: prop.league
    };
    onAddToBetSlip(leg);
    toast.success('Added to bet slip', { description: `${prop.player} ${selection} ${odds}` });
  };

  return (
    <article className="bg-slate-900 border border-white/10 rounded-2xl p-4 hover:border-indigo-500/50 transition-all" role="group" aria-labelledby={`prop-${prop.id}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 id={`prop-${prop.id}`} className="font-bold text-sm text-white">{prop.player}</h4>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">{prop.team} • {prop.prop}</p>
        </div>

        <div className="text-right">
          <span className="text-lg font-black text-indigo-400">{Number(prop.line).toFixed(1)}</span>
          {isAdmin && (
            <div className="flex gap-2 mt-2 justify-end">
              <button aria-label="Edit prop" onClick={() => onEdit?.(prop)} className="p-1 rounded hover:bg-white/5">
                <Edit2 size={14} />
              </button>
              <button aria-label="Delete prop" onClick={() => onDelete?.(prop.id)} className="p-1 rounded hover:bg-white/5">
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleAdd('Over', overOdds)}
          disabled={isAdded}
          aria-disabled={isAdded}
          aria-label={`Add ${prop.player} Over ${formatOdds(overOdds)} to bet slip`}
          className={`flex flex-col items-center p-2 rounded-xl border transition-all group ${isAdded ? 'opacity-60 cursor-not-allowed' : 'bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/50'}`}
        >
          <span className="text-[9px] uppercase font-bold text-slate-500 group-hover:text-emerald-400">Over</span>
          <span className="text-xs font-mono font-bold text-white">{formatOdds(overOdds)}</span>
        </button>

        <button
          onClick={() => handleAdd('Under', underOdds)}
          disabled={isAdded}
          aria-disabled={isAdded}
          aria-label={`Add ${prop.player} Under ${formatOdds(underOdds)} to bet slip`}
          className={`flex flex-col items-center p-2 rounded-xl border transition-all group ${isAdded ? 'opacity-60 cursor-not-allowed' : 'bg-white/5 hover:bg-red-500/10 hover:border-red-500/50'}`}
        >
          <span className="text-[9px] uppercase font-bold text-slate-500 group-hover:text-red-400">Under</span>
          <span className="text-xs font-mono font-bold text-white">{formatOdds(underOdds)}</span>
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-[9px] text-slate-500 uppercase font-bold">Confidence</span>
        <div className="flex items-center gap-2">
          <div className="h-1 w-28 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500" style={{ width: `${confidencePct}%` }} />
          </div>
          <span className="text-[10px] font-mono text-indigo-400">{confidencePct}%</span>
        </div>
      </div>
    </article>
  );
};
