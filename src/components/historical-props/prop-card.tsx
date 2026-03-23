'use client';

import React from 'react';
import { NormalizedProp, BetLeg } from '@/lib/types';
import { TrendingUp, TrendingDown, Plus, Check } from 'lucide-react';

interface PropCardProps {
  prop: NormalizedProp;
  onAddToBetSlip: (leg: BetLeg) => void;
  isAdded?: boolean;
}

export const PropCard = ({ prop, onAddToBetSlip, isAdded }: PropCardProps) => {
  const handleAdd = (selection: 'Over' | 'Under', odds: number) => {
    // FIX: Explicitly typing the object to match BetLeg requirements
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
  };

  return (
    <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 hover:border-indigo-500/50 transition-all">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-bold text-sm text-white">{prop.player}</h4>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">{prop.team} • {prop.prop}</p>
        </div>
        <div className="text-right">
          <span className="text-lg font-black text-indigo-400">{prop.line}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleAdd('Over', prop.overOdds || prop.bestOdds || -110)}
          className="flex flex-col items-center p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all group"
        >
          <span className="text-[9px] uppercase font-bold text-slate-500 group-hover:text-emerald-400">Over</span>
          <span className="text-xs font-mono font-bold text-white">{prop.overOdds || prop.bestOdds || -110}</span>
        </button>
        <button
          onClick={() => handleAdd('Under', prop.underOdds || prop.bestOdds || -110)}
          className="flex flex-col items-center p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-red-500/10 hover:border-red-500/50 transition-all group"
        >
          <span className="text-[9px] uppercase font-bold text-slate-500 group-hover:text-red-400">Under</span>
          <span className="text-xs font-mono font-bold text-white">{prop.underOdds || prop.bestOdds || -110}</span>
        </button>
      </div>

      {prop.confidenceScore && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-[9px] text-slate-500 uppercase font-bold">Confidence</span>
          <div className="flex items-center gap-1">
            <div className="h-1 w-16 bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500" 
                style={{ width: `${prop.confidenceScore * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-indigo-400">{(prop.confidenceScore * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}
    </div>
  );
};