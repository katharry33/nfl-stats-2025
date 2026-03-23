'use client';

import React from 'react';
import { useBetSlip } from '@/context/betslip-context';
import { NormalizedProp, BetLeg } from '@/lib/types';

export function PropCard({ prop }: { prop: NormalizedProp }) {
  const { addLeg, selections } = useBetSlip();

  const SelectionButton = ({ type }: { type: 'Over' | 'Under' }) => {
    // Search selections safely
    const existingSelection = selections?.find(s => s.id === `${prop.id}-${type}`);
    const active = !!existingSelection;
    const odds = type === 'Over' ? prop.overOdds : prop.underOdds;

    const handlePress = () => {
      const leg: BetLeg = {
        ...prop,
        id: `${prop.id}-${type}`,
        propId: String(prop.id),
        selection: type,
        odds: odds ?? -110,
        status: 'pending',
      };
      addLeg(leg);
    };

    return (
      <button
        onClick={handlePress}
        className={`flex-1 py-2 rounded-lg border transition-all ${
          active ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
        }`}
      >
        <div className="text-[10px] uppercase opacity-60">{type}</div>
        <div className="font-bold">{prop.line}</div>
      </button>
    );
  };

  return (
    <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl space-y-3">
      <h3 className="text-white font-bold">{prop.player}</h3>
      <p className="text-xs text-slate-500">{prop.team} • {prop.prop}</p>
      <div className="flex gap-2">
        <SelectionButton type="Over" />
        <SelectionButton type="Under" />
      </div>
    </div>
  );
}