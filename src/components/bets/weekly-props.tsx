'use client';

import { useBetSlip } from "@/context/betslip-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { BetLeg, WeeklyProp } from "@/lib/types";

interface WeeklyPropsProps {
  props: WeeklyProp[];
  loading: boolean;
}

export function WeeklyProps({ props, loading }: WeeklyPropsProps) {
  const { selections, addLeg, removeLeg } = useBetSlip();

  const handleToggleBet = (prop: WeeklyProp) => {
    const existingLeg = selections.find((leg: BetLeg) => leg.propId === prop.id);

    if (existingLeg) {
      removeLeg(existingLeg.id);
    } else {
      const newLeg: BetLeg = {
        id: `${prop.id}-${prop.overunder}`,
        propId: prop.id,
        player: prop.Player ?? "Unknown Player",
        prop: prop.Prop ?? "Unknown Prop",
        line: prop.Line ?? 0,
        odds: prop.Odds ?? 0,
        selection: prop.overunder as 'Over' | 'Under',
        week: prop.Week,
        team: prop.Team ?? "TBD",
        matchup: prop.Matchup ?? '',
        gameDate: prop.GameDate ?? '',
        source: 'weekly',
        status: 'pending'
      };
      addLeg(newLeg);
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
      {props.map(prop => {
        const isInBetSlip = selections.some((leg: BetLeg) => leg.propId === prop.id);
        return (
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
                <p className="text-xs text-slate-500 mt-1">
                  {prop.Matchup || 'Matchup N/A'} • Week {prop.Week}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono font-bold text-green-500">
                  {(prop.Odds ?? 0) > 0 ? `+${prop.Odds}` : (prop.Odds ?? 0)}
                </span>
                <Button
                  size="sm"
                  variant={isInBetSlip ? "destructive" : "default"}
                  className={!isInBetSlip ? "bg-blue-600 hover:bg-blue-700" : ""}
                  onClick={() => handleToggleBet(prop)}
                >
                  {isInBetSlip ? (
                    <><span className="mr-1"><Trash2 className="h-4 w-4" /></span>Remove</>
                  ) : (
                    <><span className="mr-1"><Plus className="h-4 w-4" /></span>Add</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
