'use client';

import { useBetSlip } from '@/context/betslip-context';
import { toast } from 'sonner';
import { useMemo } from 'react';
import { Plus, Check, AlertCircle } from 'lucide-react';
import { BetLeg } from '@/context/betslip-context'; // Corrected import path
import { PropData } from '@/lib/types';

type SelectionType = 'Over' | 'Under';

interface AddToBetslipButtonProps {
  prop: PropData | any;
  selection?: SelectionType | ''; 
}

export function AddToBetslipButton({
  prop,
  selection,
}: AddToBetslipButtonProps) {
  const { addLeg, selections } = useBetSlip();

  const legId = useMemo(() => {
    const p = prop.player ?? prop.Player ?? 'unknown';
    const pr = prop.prop ?? prop.Prop ?? 'prop';
    const l = prop.line ?? prop.Line ?? 0;
    const w = prop.week ?? prop.Week ?? '0';
    const s = selection || 'none';
    return `${p}-${pr}-${l}-${w}-${s}`.toLowerCase().replace(/\s+/g, '-');
  }, [prop, selection]);

  const isInBetSlip = useMemo(() => {
    if (!selection) return false;
    return selections.some((leg: BetLeg) => leg.id === legId);
  }, [selections, legId, selection]);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!selection) {
      toast('Selection Required', {
        description: 'Please pick Over or Under to add this prop.',
        icon: <AlertCircle className="h-4 w-4 text-[#FFD700]" />,
        className: 'bg-[#0f1115] border-white/10 text-white font-bold',
      });
      return;
    }

    if (isInBetSlip) {
      toast.info('This leg is already in your slip');
      return;
    }

    const rawOdds = selection === 'Over'
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
      source:   'historical-props'
    };

    addLeg(legToAdd);
    
    toast.success('Leg Added', {
      description: `${legToAdd.player} ${selection} ${legToAdd.line}`,
      style: { 
        background: '#0f1115', 
        border: '1px solid rgba(255,215,0,0.2)', 
        color: '#FFD700' 
      },
    });
  };

  return (
    <button
      onClick={handleAdd}
      className={`group relative w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black
        uppercase tracking-widest transition-all duration-300
        ${isInBetSlip
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default'
          : 'bg-[#FFD700] hover:bg-white text-black border border-transparent shadow-lg shadow-[#FFD700]/5 hover:shadow-[#FFD700]/10 active:scale-95'
        }
        ${!selection && 'opacity-50 grayscale cursor-not-allowed hover:bg-[#FFD700] hover:text-black'}`}
    >
      {isInBetSlip ? (
        <>
          <Check className="h-3.5 w-3.5 animate-in zoom-in duration-300" />
          <span>In Bet Slip</span>
        </>
      ) : (
        <>
          <Plus className={`h-3.5 w-3.5 transition-transform duration-300 ${!selection ? '' : 'group-hover:rotate-90'}`} />
          <span>Add to Slip</span>
        </>
      )}

      {!isInBetSlip && selection && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
      )}
    </button>
  );
}
