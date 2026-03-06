'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Ghost, ShieldCheck, TrendingUp, Trash2, 
  CheckCircle2, XCircle, Clock, HandCoins
} from 'lucide-react';
import { toast } from 'sonner';
import { toDecimal } from '@/lib/utils/odds';
import { getWeekFromDate } from '@/lib/utils/nfl-week';
import type { Bet, BetLeg, BetStatus } from '@/lib/types';

interface EditBetModalProps {
  bet: Bet;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedBet: Bet) => void;
}

const BOOST_OPTIONS = [0, 10, 15, 20, 25, 30, 33, 35, 40, 50, 100];
// Status options now explicitly match the BetStatus type
const STATUS_OPTIONS: BetStatus[] = ['pending', 'won', 'lost', 'void', 'cashed'];

export function EditBetModal({ bet, isOpen, onClose, onSave }: EditBetModalProps) {
  const [editedBet, setEditedBet] = useState<Bet | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [useManualOdds, setUseManualOdds] = useState(false);

  useEffect(() => {
    if (bet) {
      setEditedBet({ ...bet });
      if (bet.manualOdds) setUseManualOdds(true);
    }
  }, [bet]);

  // Fixes Error 2322: Ensures week is never undefined if the interface requires number
  const currentWeek = useMemo(() => {
    if (!editedBet?.gameDate) return bet.week; // Fallback to original bet week
    return getWeekFromDate(editedBet.gameDate) ?? bet.week;
  }, [editedBet?.gameDate, bet.week]);

  const finalOdds = useMemo(() => {
    if (useManualOdds && editedBet?.manualOdds) return Math.round(Number(editedBet.manualOdds));
    return Math.round(Number(editedBet?.odds || 0));
  }, [useManualOdds, editedBet?.manualOdds, editedBet?.odds]);

  const calculatedDisplayValue = useMemo(() => {
    if (!editedBet) return 0;
    
    if (editedBet.status === 'cashed') {
      return Number(editedBet.cashedAmount || 0);
    }

    const stake = Number(editedBet.stake) || 0;
    const decimalOdds = toDecimal(finalOdds);
    const boostMult = editedBet.boost ? 1 + (Number(editedBet.boost) / 100) : 1;
    let total = stake * decimalOdds * boostMult;
    
    if (editedBet.isBonusBetUsed) total = total - stake;
    return total;
  }, [editedBet, finalOdds]);

  if (!isOpen || !editedBet) return null;

  const updateLeg = (index: number, updates: Partial<BetLeg>) => {
    if (!editedBet) return;
    const newLegs = [...editedBet.legs];
    newLegs[index] = { ...newLegs[index], ...updates };
    setEditedBet({ ...editedBet, legs: newLegs });
  };

  const removeLeg = (index: number) => {
    if (!editedBet) return;
    const newLegs = editedBet.legs.filter((_: BetLeg, i: number) => i !== index);
    setEditedBet({ ...editedBet, legs: newLegs });
  };

  const handleSave = async () => {
    if (!editedBet) return;
    setIsSaving(true);
    try {
      // Fixes Error 2345: Explicitly casting the object to 'Bet'
      const finalBet: Bet = {
        ...editedBet,
        odds: finalOdds,
        manualOdds: useManualOdds ? finalOdds : null, // Interface expects number | null
        week: currentWeek, // Guaranteed to be a number via useMemo fallback
        payout: editedBet.status === 'cashed' 
          ? (editedBet.cashedAmount ?? null) 
          : calculatedDisplayValue,
      };
      await onSave(finalBet);
      onClose();
    } catch (err) {
      toast.error('Failed to update');
    } finally { setIsSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
      <div className="bg-[#0f1115] border border-white/10 w-full max-w-3xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Manage <span className="text-[#FFD700]">Bet</span></h2>
            <select 
              value={editedBet.status} 
              // Fixes "Type string is not assignable to BetStatus"
              onChange={(e) => setEditedBet(prev => prev ? {...prev, status: e.target.value as BetStatus} : null)}
              className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg border outline-none cursor-pointer transition-colors
                ${editedBet.status === 'won' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                  editedBet.status === 'cashed' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  editedBet.status === 'lost' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                  'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'}`}
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-500 transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Game Date</span>
              <input type="date" value={editedBet.gameDate?.split('T')[0]} onChange={(e) => setEditedBet(prev => prev ? {...prev, gameDate: e.target.value} : null)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[#FFD700]/50 [color-scheme:dark]" />
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Stake</span>
              <input type="number" value={editedBet.stake} onChange={(e) => setEditedBet(prev => prev ? {...prev, stake: Number(e.target.value)} : null)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-[#FFD700] font-mono outline-none" />
            </div>
            
            {editedBet.status === 'cashed' ? (
              <div className="space-y-1 animate-in slide-in-from-right-2 duration-300">
                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                  <HandCoins className="h-3 w-3" /> Cashed Amount
                </span>
                <input 
                  type="number" 
                  value={editedBet.cashedAmount || ''} 
                  placeholder="Enter $ amount"
                  onChange={(e) => setEditedBet(prev => prev ? {...prev, cashedAmount: Number(e.target.value)} : null)}
                  className="w-full bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-400 font-mono outline-none focus:border-amber-500/50" 
                />
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Boost %</span>
                <select value={editedBet.boost || 0} onChange={(e) => setEditedBet(prev => prev ? {...prev, boost: Number(e.target.value)} : null)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none appearance-none">
                  {BOOST_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}%</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              Parlay Legs ({editedBet.legs.length})
              {editedBet.isGhostParlay && <span className="text-purple-400 flex items-center gap-1"><Ghost className="h-3 w-3" /> GHOST ACTIVE</span>}
            </label>
            <div className="grid gap-3">
              {editedBet.legs.map((leg, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-black/40 border border-white/5 rounded-2xl group transition-all hover:border-white/10">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-white uppercase italic">{leg.player}</p>
                    <p className="text-[9px] text-zinc-600 font-bold uppercase">{leg.prop} · {leg.selection}</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] font-black text-zinc-600 uppercase mb-1">Line</span>
                      <input type="number" step="0.5" value={leg.line} onChange={(e) => updateLeg(idx, { line: parseFloat(e.target.value) })}
                        className="w-14 bg-black border border-white/10 rounded px-1.5 py-1 text-center text-[10px] text-white font-mono" />
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[8px] font-black text-zinc-600 uppercase mb-1">Result</span>
                      <div className="flex gap-1 bg-black/60 p-1 rounded-lg border border-white/5">
                        {[
                          { val: 'won', icon: CheckCircle2, color: 'text-emerald-500' },
                          { val: 'lost', icon: XCircle, color: 'text-red-500' },
                          { val: 'pending', icon: Clock, color: 'text-zinc-500' }
                        ].map((btn) => (
                          <button 
                            key={btn.val}
                            onClick={() => updateLeg(idx, { status: btn.val })}
                            className={`p-1 rounded transition-colors ${leg.status === btn.val ? 'bg-white/10 ' + btn.color : 'text-zinc-700 hover:text-zinc-400'}`}
                          >
                            <btn.icon className="h-3.5 w-3.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => removeLeg(idx)} className="p-2 text-zinc-800 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-4">
               <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Odds Priority</span>
                  <button onClick={() => setUseManualOdds(!useManualOdds)} className="text-[8px] font-black text-[#FFD700] underline">Toggle</button>
               </div>
               {useManualOdds ? (
                 <input type="number" value={editedBet.manualOdds || ''} onChange={(e) => setEditedBet(prev => prev ? {...prev, manualOdds: Math.round(Number(e.target.value)) } : null)}
                   placeholder="Manual Odds (e.g. +350)" className="w-full bg-black border border-[#FFD700]/30 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none" />
               ) : (
                 <div className="px-4 py-3 bg-white/5 rounded-xl text-xs text-zinc-500 font-mono italic opacity-60">Auto: {editedBet.odds > 0 ? '+' : ''}{Math.round(editedBet.odds)}</div>
               )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Ghost', state: 'isGhostParlay', icon: Ghost, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                { label: 'Bonus Used', state: 'isBonusBetUsed', icon: ShieldCheck, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                { label: 'Bonus Recv', state: 'receivesBonusBack', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              ].map((t) => (
                <button 
                  key={t.state}
                  // Fixes dynamic key access
                  onClick={() => setEditedBet(prev => prev ? {...prev, [t.state]: !prev[t.state as keyof Bet]} as Bet : null)}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all 
                    ${editedBet[t.state as keyof Bet] ? `${t.bg} border-${t.color.split('-')[1]}-500/40` : 'bg-black/20 border-white/5 opacity-40'}`}
                >
                  <t.icon className={`h-4 w-4 ${editedBet[t.state as keyof Bet] ? t.color : 'text-zinc-600'}`} />
                  <span className={`text-[8px] font-black uppercase ${editedBet[t.state as keyof Bet] ? t.color : 'text-zinc-600'}`}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 bg-black border-t border-white/5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest italic">
              {editedBet.status === 'cashed' ? 'Cashed Out Value' : 'Projected Payout'}
            </p>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black font-mono tracking-tighter italic ${editedBet.status === 'cashed' ? 'text-amber-400' : 'text-[#FFD700]'}`}>
                ${calculatedDisplayValue.toFixed(2)}
              </span>
              <span className="text-[10px] text-zinc-600 font-bold uppercase italic">
                {editedBet.status === 'cashed' 
                  ? `Profit: $${(calculatedDisplayValue - editedBet.stake).toFixed(2)}` 
                  : `@${finalOdds > 0 ? '+' : ''}${finalOdds}`}
              </span>
            </div>
          </div>
          <button onClick={handleSave} disabled={isSaving} className="px-10 py-4 bg-[#FFD700] hover:bg-white text-black font-black uppercase text-xs rounded-2xl transition-all shadow-xl shadow-[#FFD700]/10">
            {isSaving ? 'Saving...' : 'Confirm Sync'}
          </button>
        </div>
      </div>
    </div>
  );
}