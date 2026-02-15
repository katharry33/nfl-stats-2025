'use client';

import React from 'react';
import { useBetSlip } from '../../context/betslip-context';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function Betslip() {
  const { selections, removeLeg, clearSelections } = useBetSlip();

  const handlePlaceBet = () => {
    // This is a placeholder for the actual bet placement logic.
    toast.success('Bet placed successfully!');
    clearSelections();
  };

  if (selections.length === 0) {
    return (
      <Card className="bg-[#161b22] border-[#30363d] text-white border-dashed">
        <CardContent className="pt-6 text-center text-slate-500">
          Your bet slip is empty.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {selections.map((leg) => (
          <Card key={leg.id} className="bg-[#21262d] border-[#30363d] text-white">
            <CardContent className="p-3 flex justify-between items-center">
              <div className="space-y-1">
                <p className="font-bold text-sm text-blue-400">{leg.player}</p>
                <p className="text-xs text-slate-300">
                  {leg.prop} {leg.line}
                  <span className="ml-2 px-1.5 py-0.5 bg-slate-700 rounded text-xs uppercase">
                    {leg.selection}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm font-bold text-green-500">
                  {leg.odds > 0 ? `+${leg.odds}` : leg.odds}
                </span>
                <Button onClick={() => removeLeg(leg.id)} variant="ghost" size="icon" className="text-slate-500 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        <Button onClick={handlePlaceBet} className="w-full bg-green-600 hover:bg-green-700">
          Place Bet
        </Button>
        <Button onClick={() => clearSelections()} variant="outline" className="w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white">
          Clear All
        </Button>
      </div>
    </div>
  );
}
