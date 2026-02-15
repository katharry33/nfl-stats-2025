'use client';

import { useBetSlip } from "../../context/betslip-context";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { BetLeg, WeeklyProp } from "../../lib/types"; 

interface WeeklyPropsProps {
  props: WeeklyProp[];
  loading: boolean;
}

export function WeeklyProps({ props, loading }: WeeklyPropsProps) {
  const { addLeg, removeLeg, legs } = useBetSlip();

  const isInBetSlip = (propId: string) => legs.some((leg: BetLeg) => leg.propId === propId);

  const handleToggleBet = (prop: WeeklyProp) => {
    if (isInBetSlip(prop.id)) {
      removeLeg(prop.id);
    } else {
      const leg: BetLeg = {
        id: crypto.randomUUID(), // <-- Add this
        propId: prop.id,
        player: prop.Player,
        prop: prop.Prop,
        line: prop.Line,
        odds: prop.Odds,
        selection: prop.overunder as 'Over' | 'Under', 
        week: prop.Week,  // Also add lowercase for compatibility
        team: prop.Team,
        matchup: prop.Matchup || '', // Use fallback to empty string
        source: 'weekly',
      };
      addLeg(leg);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <p className="text-slate-400 animate-pulse">Loading props...</p>
      </div>
    );
  }

  if (props.length === 0) {
    return (
      <div className="text-center p-8 border border-dashed border-[#30363d] rounded-lg">
        <p className="text-slate-500">No props found for this search.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {props.map(prop => (
        <Card key={prop.id} className="bg-[#161b22] border-[#30363d] text-white">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="font-bold text-blue-400">{prop.Player}</p>
              <p className="text-sm">
                {prop.Prop} {prop.Line} 
                <span className="ml-2 px-2 py-0.5 bg-slate-800 rounded text-xs uppercase text-slate-300">
                  {prop.overunder}
                </span>
              </p>
              {/* Optional chaining prevents crashes if Matchup is missing */}
              <p className="text-xs text-slate-500 mt-1">
                {prop.Matchup || 'Matchup N/A'} • Week {prop.Week}
              </p>
            </div>
            <div className="flex items-center gap-4">
               <span className="font-mono font-bold text-green-500">
                {prop.Odds > 0 ? `+${prop.Odds}` : prop.Odds}
              </span>
              <Button
                size="sm"
                variant={isInBetSlip(prop.id) ? "destructive" : "default"}
                className={!isInBetSlip(prop.id) ? "bg-blue-600 hover:bg-blue-700" : ""}
                onClick={() => handleToggleBet(prop)}
              >
                {isInBetSlip(prop.id) ? (
                  <><Trash2 className="h-4 w-4 mr-1" />Remove</>
                ) : (
                  <><Plus className="h-4 w-4 mr-1" />Add</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}