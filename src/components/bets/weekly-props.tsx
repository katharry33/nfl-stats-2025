'use client';

import { useBetSlip } from '@/context/betslip-context';
import { Plus, Trash2 } from 'lucide-react';
import type { NormalizedProp } from '@/hooks/useAllProps';

interface WeeklyPropsProps {
  props:   NormalizedProp[];
  loading: boolean;
}

export function WeeklyProps({ props, loading }: WeeklyPropsProps) {
  const { selections, addLeg, removeLeg } = useBetSlip();

  const handleToggleBet = (prop: NormalizedProp) => {
    const propId = String(prop.id ?? '');
    const existingLeg = selections.find((leg: any) => leg.propId === propId);

    if (existingLeg) {
      removeLeg(existingLeg.id);
    } else {
      addLeg({
        id:        `${propId}-${prop.overUnder}`,
        propId,
        player:    prop.player    ?? 'Unknown Player',
        prop:      prop.prop      ?? 'Unknown Prop',
        line:      prop.line      ?? 0,
        odds:      prop.odds      ?? prop.bestOdds ?? 0,
        selection: (prop.overUnder ?? 'Over') as 'Over' | 'Under',
        week:      prop.week,
        team:      prop.team      ?? 'TBD',
        matchup:   prop.matchup   ?? '',
        gameDate:  prop.gameDate  ?? '',
        status:    'pending',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <p className="text-zinc-500 animate-pulse text-sm font-black uppercase">Loading props…</p>
      </div>
    );
  }

  if (props.length === 0) {
    return (
      <div className="text-center p-8 border border-dashed border-white/[0.08] rounded-xl">
        <p className="text-zinc-600 text-sm font-black uppercase italic">No props found for this week.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {props.map(prop => {
        const propId     = String(prop.id ?? '');
        const isInSlip   = selections.some((leg: any) => leg.propId === propId);
        const ou         = prop.overUnder ?? (prop as any).overunder ?? '';
        const odds       = prop.odds ?? prop.bestOdds ?? 0;
        const oddsStr    = odds > 0 ? `+${odds}` : String(odds);
        const isOver     = ou.toLowerCase() === 'over';

        return (
          <div
            key={propId}
            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              isInSlip
                ? 'bg-[#FFD700]/[0.04] border-[#FFD700]/30'
                : 'bg-[#0f1115] border-white/[0.06] hover:border-white/[0.12]'
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black italic uppercase text-white truncate">{prop.player}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-zinc-500 uppercase font-bold">{prop.prop}</span>
                <span className="text-[10px] font-black text-white">{prop.line}</span>
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                  isOver
                    ? 'text-blue-400 bg-blue-500/10'
                    : 'text-orange-400 bg-orange-500/10'
                }`}>{ou}</span>
              </div>
              <p className="text-[9px] text-zinc-600 font-mono mt-0.5">
                {prop.matchup || '—'} · WK{prop.week}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0 ml-3">
              <span className={`font-mono text-sm font-black ${odds > 0 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                {oddsStr}
              </span>
              <button
                onClick={() => handleToggleBet(prop)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${
                  isInSlip
                    ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                    : 'bg-[#FFD700] text-black hover:bg-[#e6c200]'
                }`}
              >
                {isInSlip
                  ? <><Trash2 className="h-3 w-3" /> Remove</>
                  : <><Plus   className="h-3 w-3" /> Add</>
                }
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}