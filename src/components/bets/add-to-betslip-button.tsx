'use client';

// src/components/bets/add-to-betslip-button.tsx

import { useBetSlip } from '@/context/betslip-context';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useMemo } from 'react';
import { BetLeg, PropData } from '@/lib/types';

type SelectionType = 'Over' | 'Under';

export function AddToBetslipButton({
  prop,
  selection,
}: {
  prop: PropData;
  selection: SelectionType | '';
}) {
  const { addLeg, selections } = useBetSlip();

  const propId = prop.id ?? `${prop.player ?? prop.Player ?? ''}-${prop.prop ?? prop.Prop ?? ''}-${prop.line ?? prop.Line ?? 0}`;

  const isInBetSlip = useMemo(() => {
    if (!selection) return false;
    return selections.some(
      (leg) => leg.propId === propId && leg.selection === selection
    );
  }, [selections, propId, selection]);

  const handleAdd = () => {
    if (!selection) {
      toast.error('Please select Over or Under first.');
      return;
    }
    if (isInBetSlip) {
      toast.info('This selection is already in your bet slip.');
      return;
    }

    const rawOdds =
      selection === 'Over'
        ? (prop.overOdds ?? prop.odds ?? -110)
        : (prop.underOdds ?? prop.odds ?? -110);

    const legToAdd: BetLeg = {
      id:        `${propId}-${selection}`,
      propId,
      player:    prop.player    ?? prop.Player    ?? '',
      team:      (prop.team     ?? prop.Team      ?? '').toString().toUpperCase(),
      prop:      prop.prop      ?? prop.Prop      ?? '',
      line:      Number(prop.line ?? prop.Line ?? 0),
      selection,
      odds:      Number(rawOdds),
      matchup:   prop.matchup   ?? prop.Matchup   ?? '',
      week:      prop.week      ?? prop.Week      ?? undefined,
      status:    'pending',
      gameDate:  prop.gameDate  ?? prop.GameDate  ?? new Date().toISOString(),
      source:    'historical-props',
    };

    addLeg(legToAdd);
    toast.success(`${legToAdd.player} (${selection} ${legToAdd.line}) added to slip.`);
  };

  return (
    <Button
      onClick={handleAdd}
      disabled={!selection || isInBetSlip}
      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-400"
    >
      {isInBetSlip ? 'In Bet Slip' : 'Add to Slip'}
    </Button>
  );
}
