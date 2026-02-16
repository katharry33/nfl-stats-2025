'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useBetSlip } from '@/context/betslip-context';
import { PropData, BetLeg } from '@/lib/types';
import { toast } from 'sonner';

// The component now accepts either a full PropData object or a BetLeg from a past bet.
interface PropCardProps {
  prop: PropData | BetLeg;
}

export function PropCard({ prop }: PropCardProps) {
  const { addLeg, selections } = useBetSlip();

  // A type guard to check if the prop is a BetLeg.
  const isBetLeg = 'selection' in prop;

  // Normalize the incoming prop into a consistent shape for the UI.
  const displayProp = useMemo(() => {
    if (isBetLeg) {
      const leg = prop as BetLeg;
      return {
        id: leg.propId || leg.id, // Use propId for consistency
        player: leg.player,
        team: leg.team || 'N/A', 
        prop: leg.prop,
        line: leg.line,
        matchup: leg.matchup || 'N/A',
        week: Number(leg.week) || undefined,
        gameDate: leg.gameDate,
        // Map the single `odds` field from the BetLeg to the correct side.
        overOdds: leg.selection === 'Over' ? leg.odds : undefined,
        underOdds: leg.selection === 'Under' ? leg.odds : undefined,
        // Keep track of the original selection to set the dropdown state.
        originalSelection: leg.selection,
      };
    }
    // If it's PropData, it already has the desired shape.
    const propData = prop as PropData;
    return {
      ...propData,
      originalSelection: undefined,
    };
  }, [prop, isBetLeg]);

  // Default the selection to the original bet's selection if it exists.
  const [selection, setSelection] = useState<'Over' | 'Under'>(displayProp.originalSelection || 'Over');

  const isInBetSlip = useMemo(() => {
    const legId = `${displayProp.id}-${selection}`;
    return selections.some(leg => leg.id === legId);
  }, [selections, displayProp.id, selection]);
  
  const handleAdd = () => {
    if (isInBetSlip) {
      toast.info("This selection is already in your bet slip.");
      return;
    }

    const odds = selection === 'Over' ? displayProp.overOdds : displayProp.underOdds;

    // If for some reason odds are not available (e.g., trying to bet the other side of a leg), prevent it.
    if (odds === undefined) {
      toast.error('Odds not available for this selection.');
      return;
    }

    const legToAdd: BetLeg = {
      id: `${displayProp.id}-${selection}`,
      propId: displayProp.id,
      player: displayProp.player,
      prop: displayProp.prop,
      line: displayProp.line,
      selection: selection,
      odds: odds,
      matchup: displayProp.matchup,
      team: displayProp.team,
      week: displayProp.week,
      gameDate: displayProp.gameDate,
      source: 'historical-props',
      status: 'pending',
    };

    addLeg(legToAdd);
    toast.success(
      `${displayProp.player} (${selection} ${displayProp.line}) added to bet slip.`
    );
  };

  return (
    <Card className="bg-slate-900 border-slate-800 hover:border-emerald-500/50 transition-colors">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-bold text-white">{displayProp.player}</h3>
            <p className="text-sm text-slate-400">{displayProp.team}</p>
            <p className="text-xs text-slate-500 font-mono">{displayProp.matchup}</p>
          </div>
          {displayProp.week && <Badge variant="outline" className="text-xs">Week {displayProp.week}</Badge>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">{displayProp.prop}</span>
            <span className="font-mono font-bold text-emerald-400">{displayProp.line}</span>
          </div>

          <Select value={selection} onValueChange={(v: any) => setSelection(v)}>
            <SelectTrigger className="bg-slate-950 border-slate-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="Over" disabled={displayProp.overOdds === undefined}>
                <div className="flex justify-between w-full gap-8">
                  <span>Over {displayProp.line}</span>
                  {displayProp.overOdds !== undefined && <span className="font-mono text-emerald-400">{displayProp.overOdds > 0 ? `+${displayProp.overOdds}` : displayProp.overOdds}</span>}
                </div>
              </SelectItem>
              <SelectItem value="Under" disabled={displayProp.underOdds === undefined}>
                <div className="flex justify-between w-full gap-8">
                  <span>Under {displayProp.line}</span>
                  {displayProp.underOdds !== undefined && <span className="font-mono text-emerald-400">{displayProp.underOdds > 0 ? `+${displayProp.underOdds}` : displayProp.underOdds}</span>}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleAdd}
            disabled={isInBetSlip}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-400"
            size="sm"
          >
            {isInBetSlip ? "In Slip" : `Add ${selection}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
