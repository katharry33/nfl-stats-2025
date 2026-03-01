'use client';

// src/components/bets/add-to-betslip-button.tsx

import { useBetSlip } from '@/context/betslip-context';
import { toast } from 'sonner';
import { useMemo } from 'react';
import { Plus, Check } from 'lucide-react';
import { BetLeg, PropData } from '@/lib/types';

type SelectionType = 'Over' | 'Under';

export function AddToBetslipButton({
  prop,
  selection,
}: {
  prop: PropData | any;
  selection: SelectionType | '';
}) {
  const { addLeg, selections } = useBetSlip();

  const propId = prop.id ?? `${prop.player ?? prop.Player ?? ''}-${prop.prop ?? prop.Prop ?? ''}-${prop.line ?? prop.Line ?? 0}`;
  const legId = `${propId}-${selection}`;

  const isInBetSlip = useMemo(() => {
    if (!selection) return false;
    return selections.some((leg: BetLeg) => leg.id === legId);
  }, [selections, legId, selection]);

  const handleAdd = () => {
    if (!selection) {
      toast.error('Please select Over or Under first.');
      return;
    }
    if (isInBetSlip) {
      toast.info('Already in slip');
      return;
    }

    const rawOdds =
      selection === 'Over'
        ? (prop.overOdds ?? prop.odds ?? -110)
        : (prop.underOdds ?? prop.odds ?? -110);

    const legToAdd: BetLeg = {
      id: legId,
      player:   prop.player   ?? prop.Player   ?? '',
      team:     String(prop.team ?? prop.Team ?? '').toUpperCase(),
      prop:     prop.prop     ?? prop.Prop     ?? '',
      line:     Number(prop.line ?? prop.Line ?? 0),
      selection,
      odds:     Number(rawOdds),
      matchup:  prop.matchup  ?? prop.Matchup  ?? '',
      gameDate: prop.gameDate ?? prop.GameDate ?? new Date().toISOString(),
      status:   'pending',
      source:   'historical-props',
    };

    addLeg(legToAdd);
    toast.success(`${legToAdd.player} ${selection} ${legToAdd.line} added`, {
      style: { background: '#0f1115', border: '1px solid rgba(255,215,0,0.2)', color: '#FFD700' },
    });
  };

  return (
    <button
      onClick={handleAdd}
      disabled={!selection}
      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-black
        uppercase tracking-wider transition-all
        ${isInBetSlip
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
          : 'bg-[#FFD700]/10 hover:bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/20 hover:border-[#FFD700]/40'
        }
        disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {isInBetSlip
        ? <><Check className="h-3.5 w-3.5" /> In Slip</>
        : <><Plus className="h-3.5 w-3.5" /> Add to Slip</>}
    </button>
  );
}