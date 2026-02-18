'use client';

import { useBetSlip } from '@/context/betslip-context';
import { BetLeg, PropData } from '@/lib/types';

export function PropCard({ prop }: { prop: PropData }) {
  const { addLeg, selections } = useBetSlip();

  // Helper to render the betting button
  const SelectionButton = ({ type }: { type: 'Over' | 'Under' }) => {
    // Check if this specific prop and selection is in the betslip
    const existingSelection = selections.find(s => s.propId === prop.id);
    const active = existingSelection ? existingSelection.selection === type : false;
    const odds = type === 'Over' ? prop.overOdds : prop.underOdds;

    const handlePress = () => {
      // Construct the full BetLeg object as required by the context
      const leg: BetLeg = {
        id: `${prop.id}-${type}`,
        propId: prop.id,
        player: prop.player,
        prop: prop.prop,
        line: prop.line,
        selection: type,
        odds: odds,
        status: 'pending', // Default status for a new leg
        team: prop.team,
        matchup: prop.matchup,
        gameDate: prop.gameDate,
        week: prop.week,
        source: 'weekly-props', // Or another appropriate source
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
        <span className="text-xs font-mono">{Number(odds) > 0 ? `+${odds}` : odds}</span>
      </button>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-800 rounded">
          WEEK {prop.week}
        </span>
        <span className="text-xs text-gray-500">{prop.league}</span>
      </div>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-white font-bold leading-tight">{prop.player}</h3>
          <p className="text-xs text-slate-500 uppercase font-semibold">{prop.team} • {prop.prop}</p>
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
