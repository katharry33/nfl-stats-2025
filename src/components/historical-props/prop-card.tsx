'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useBetSlip } from '@/context/betslip-context';
import { PropData, BetLeg } from '@/lib/types';
import { toast } from 'sonner';

interface PropCardProps {
  prop: PropData | BetLeg;
}

export function PropCard({ prop }: PropCardProps) {
  const { addLeg, selections } = useBetSlip();

  const isBetLeg = 'selection' in prop;

  const displayProp = useMemo(() => {
    if (isBetLeg) {
      const leg = prop as BetLeg;
      return {
        id: leg.id,
        player: leg.player,
        team: leg.team || 'N/A',
        prop: leg.prop,
        line: leg.line,
        matchup: leg.matchup || 'N/A',
        week: Number(leg.week) || undefined,
        gameDate: leg.gameDate,
        overOdds:  leg.selection === 'Over'  ? leg.odds : undefined,
        underOdds: leg.selection === 'Under' ? leg.odds : undefined,
        originalSelection: leg.selection,
        overUnder: leg.overUnder,
      };
    }
    const propData = prop as PropData;
    return {
      ...propData,
      originalSelection: undefined,
    };
  }, [prop, isBetLeg]);

  const [selection, setSelection] = useState<'Over' | 'Under'>(
    ((displayProp.overUnder ?? (displayProp as any)['Over/Under?']) as 'Over' | 'Under') ||
    (displayProp.originalSelection as 'Over' | 'Under') ||
    'Over'
  );

  const isSelected = useMemo(() => {
    return selections?.some((item: any) => item.id === displayProp.id);
  }, [selections, displayProp.id]);

  const handleAddLeg = () => {
    if (isSelected) {
      toast.info('This selection is already in your bet slip.');
      return;
    }

    const odds = selection === 'Over' ? displayProp.overOdds : displayProp.underOdds;

    if (odds === undefined) {
      toast.error('Odds not available for this selection.');
      return;
    }

    const legToAdd: BetLeg = {
      id:        `${displayProp.id}-${selection}`,
      player:    displayProp.player ?? '', // PATCH: Add fallback
      prop:      displayProp.prop   ?? '', // PATCH: Add fallback
      line:      Number(displayProp.line),
      selection,
      odds,
      matchup:   displayProp.matchup || 'TBD',
      status:    'pending',
      team:      displayProp.team,
      gameDate:  displayProp.gameDate,
      overUnder: (displayProp as any).overUnder,
      week:      displayProp.week ? Number(displayProp.week) : undefined,
    };

    addLeg(legToAdd);
    toast.success(`${displayProp.player} (${selection} ${displayProp.line}) added to bet slip.`);
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
          {displayProp.week && (
            <Badge variant="outline" className="text-xs">Week {displayProp.week}</Badge>
          )}
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
                  {displayProp.overOdds !== undefined && (
                    <span className="font-mono text-emerald-400">
                      {Number(displayProp.overOdds) > 0 ? `+${displayProp.overOdds}` : displayProp.overOdds}
                    </span>
                  )}
                </div>
              </SelectItem>
              <SelectItem value="Under" disabled={displayProp.underOdds === undefined}>
                <div className="flex justify-between w-full gap-8">
                  <span>Under {displayProp.line}</span>
                  {displayProp.underOdds !== undefined && (
                    <span className="font-mono text-emerald-400">
                      {Number(displayProp.underOdds) > 0 ? `+${displayProp.underOdds}` : displayProp.underOdds}
                    </span>
                  )}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleAddLeg}
            disabled={isSelected}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-400"
            size="sm"
          >
            {isSelected ? 'In Slip' : `Add ${selection}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
