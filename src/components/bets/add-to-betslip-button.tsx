'use client';

import React from 'react';
import { useBetSlip } from '@/hooks/useBetSlip';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function AddToBetslipButton({ prop, selection }: { prop: any; selection: 'Over' | 'Under' }) {
  const { addLeg, selections } = useBetSlip();

  const legId = `${prop.id}-${selection}`;
  const isInSlip = selections.some((l: any) => `${l.propId}-${l.selection}` === legId);

  const handleAdd = () => {
    addLeg({
      ...prop,
      propId: prop.id,
      selection,
      odds: selection === 'Over' ? prop.overOdds : prop.underOdds,
    });
    toast.success(`Added to slip: ${prop.player} ${selection} ${prop.line} ${prop.prop}`);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={`w-full ${isInSlip ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : ''}`}
      onClick={handleAdd}
      disabled={isInSlip}
    >
      {isInSlip ? 'Added' : `Add ${selection}`}
    </Button>
  );
}
