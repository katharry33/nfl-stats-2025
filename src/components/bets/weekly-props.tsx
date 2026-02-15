'use client';

import { useBetSlip } from "../../context/betslip-context";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { BetLeg, WeeklyProp } from "../../lib/types";
import { toast } from "sonner";

interface WeeklyPropsProps {
  props: WeeklyProp[];
  loading: boolean;
}

export function WeeklyProps({ props, loading }: WeeklyPropsProps) {
  const { addLeg, removeLeg, selections } = useBetSlip();

  const isInBetSlip = (propId: string) => selections.some((leg: BetLeg) => leg.propId === propId);

  const handleToggleBet = (prop: WeeklyProp) => {
    const existingLeg = selections.find(leg => leg.propId === prop.id);

    if (existingLeg) {
      removeLeg(existingLeg.id);
      toast.info(`${prop.player || prop.Player} removed from bet slip`);
    } else {
      addLeg({
        id: `weekly-${prop.id}`,
        propId: prop.id,
        player: prop.player || prop.Player || 'Unknown',
        prop: prop.prop || prop.Prop || 'Unknown',
        line: prop.line || prop.Line || 0,
        odds: prop.odds || prop.Odds || -110,
        selection: (prop['Over/Under?'] || prop.overunder || 'Over') as 'Over' | 'Under',
        week: prop.week || prop.Week || 0,
        team: prop.team || prop.Team || '',
        matchup: prop.matchup || prop.Matchup || '',
        source: 'weekly',
      });
      toast.success(`${prop.player || prop.Player} added to bet slip`);
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
            <div className="space-y-2">
              <p className="font-bold text-blue-400">{prop.player || prop.Player}</p>
              <p className="text-xs text-slate-400">
                {prop.prop || prop.Prop} {prop.line || prop.Line}
              </p>
              <p className="text-xs text-emerald-400 font-mono">
                {prop['Over/Under?'] || prop.overunder || 'Over'}
              </p>
              <p className="text-xs text-slate-500 font-mono">
                {prop.matchup || prop.Matchup || 'Matchup N/A'} • Week {prop.week || prop.Week}
              </p>
            </div>
            <div className="flex flex-col items-end justify-between gap-2">
              <p className="text-sm font-mono text-emerald-400 font-bold">
                {(prop.odds || prop.Odds || -110) > 0 ? `+${prop.odds || prop.Odds}` : (prop.odds || prop.Odds || -110)}
              </p>
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
