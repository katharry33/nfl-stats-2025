'use client';

import { useBetSlip } from '@/context/betslip-context';
import { BetLeg, PropData } from '@/lib/types';

export function PropCard({ prop }: { prop: PropData }) {
  const { addLeg, selections } = useBetSlip();

  const SelectionButton = ({ type }: { type: 'Over' | 'Under' }) => {
    const existingSelection = selections.find(s => s.id?.startsWith(prop.id));
    const active = existingSelection ? existingSelection.selection === type : false;
    const odds = type === 'Over' ? prop.overOdds : prop.underOdds;

    const handlePress = () => {
      const leg: BetLeg = {
        id:        `${prop.id}-${type}`,
        player:    prop.player ?? '', // PATCH: Add fallback
        prop:      prop.prop   ?? '', // PATCH: Add fallback
        line:      prop.line   ?? 0,  // PATCH: Add fallback
        selection: type,
        // BetLeg.odds is `number` — fall back to -110 if odds is undefined
        odds:      odds ?? -110,
        status:    'pending',
        team:      prop.team,
        matchup:   prop.matchup || 'TBD',
        gameDate:  prop.gameDate,
        week:      prop.week,
      };
      addLeg(leg);
    };

    return (
      <button
        onClick={handlePress}
        className={`flex-1 flex flex-col items-center py-2 rounded-lg border transition-all ${
          active
            ? 'bg-blue-600 border-blue-400 text-white'
            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
        }`}
      >
        <span className="text-[10px] uppercase font-bold opacity-70">{type}</span>
        <span className="font-bold">{prop.line}</span>
        <span className="text-xs font-mono">
          {odds !== undefined
            ? Number(odds) > 0 ? `+${odds}` : odds
            : 'N/A'}
        </span>
      </button>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-800 rounded">
          WEEK {prop.week}
        </span>
        {/* prop.league does not exist on PropData — removed */}
      </div>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-white font-bold leading-tight">{prop.player}</h3>
          <p className="text-xs text-slate-500 uppercase font-semibold">
            {prop.team} • {prop.prop}
          </p>
        </div>
        <div className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">
          {prop.matchup}
        </div>
      </div>

      <div className="flex gap-2">
        <SelectionButton type="Over" />
        <SelectionButton type="Under" />
      </div>
    </div>
  );
}
