// src/components/historical-props/prop-card.tsx (or wherever you display props)
'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface PropCardProps {
  prop: any;
  onAddToBetSlip: (selection: any) => void;
}

export function PropCard({ prop, onAddToBetSlip }: PropCardProps) {
  const [selection, setSelection] = useState<'Over' | 'Under'>('Over');
  
  const handleAdd = () => {
    onAddToBetSlip({
      id: `${prop.id}-${selection}`,
      player: prop.player,
      prop: prop.prop,
      line: prop.line,
      selection: selection,
      odds: selection === 'Over' ? prop.overOdds : prop.underOdds,
      matchup: prop.matchup,
      team: prop.team,
      week: prop.week,
    });
  };

  return (
    <Card className="bg-slate-900 border-slate-800 hover:border-emerald-500/50 transition-colors">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-bold text-white">{prop.player}</h3>
            <p className="text-sm text-slate-400">{prop.team}</p>
            <p className="text-xs text-slate-500 font-mono">{prop.matchup}</p>
          </div>
          <Badge variant="outline" className="text-xs">
            Week {prop.week}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">{prop.prop}</span>
            <span className="font-mono font-bold text-emerald-400">{prop.line}</span>
          </div>

          {/* Over/Under Selection */}
          <Select value={selection} onValueChange={(v: any) => setSelection(v)}>
            <SelectTrigger className="bg-slate-950 border-slate-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="Over">
                <div className="flex justify-between w-full gap-8">
                  <span>Over {prop.line}</span>
                  <span className="font-mono text-emerald-400">
                    {prop.overOdds > 0 ? `+${prop.overOdds}` : prop.overOdds}
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="Under">
                <div className="flex justify-between w-full gap-8">
                  <span>Under {prop.line}</span>
                  <span className="font-mono text-emerald-400">
                    {prop.underOdds > 0 ? `+${prop.underOdds}` : prop.underOdds}
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleAdd}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            size="sm"
          >
            Add {selection} {prop.line}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
