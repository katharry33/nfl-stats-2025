'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bet, BetLeg } from '@/lib/types';
import { calculateParlayOdds } from '@/lib/utils/odds';
import { Trash2, Calendar, Hash, Zap, ShieldCheck, Flame } from 'lucide-react';

interface EditBetModalProps {
  bet: Bet | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (bet: any) => void;
  onDelete: (id: string) => void;
}

export function EditBetModal({
  bet,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: EditBetModalProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<any>(null);
  const [oddsOverridden, setOddsOverridden] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const recalculatePayout = useCallback((data: any) => {
    const stake = Number(data.stake || 0);
    const odds = Number(data.odds || 0);
    const boost = 1 + (Number(data.boost || 0) / 100);

    if (stake === 0 || odds === 0) {
      return { ...data, potentialPayout: '0.00' };
    }

    const profitMultiplier = odds > 0 ? odds / 100 : 100 / Math.abs(odds);
    let payout;

    if (data.isBonusBet) {
      payout = stake * profitMultiplier;
    } else {
      payout = stake * (profitMultiplier + 1);
    }

    payout *= boost;
    return { ...data, potentialPayout: payout.toFixed(2) };
  }, []);

  useEffect(() => {
    if (bet && isOpen) {
      setOddsOverridden(false);
      const initialData = {
        ...bet,
        stake: Number((bet as any).stake || (bet as any).amount || 0),
        boost: Number((bet as any).boost || 0),
        odds: Number((bet as any).odds || (bet as any).parlayOdds || 0),
        week: Number((bet as any).week || 1),
        // Force the date to the correct format for the HTML5 date input
        gameDate: (bet as any).gameDate || new Date().toISOString().split('T')[0],
        isBonusBet: (bet as any).isBonusBet || false,
        status: (bet as any).status || 'pending',
        cashedAmount: (bet as any).status === 'cashed' ? (bet as any).payout : '',
        legs: Array.isArray(bet.legs)
          ? bet.legs.map((leg: any) => ({ 
              ...leg, 
              isLive: leg.isLive || false, 
              odds: Number(leg.odds || -110),
              status: leg.status || 'pending'
            }))
          : [],
      };
      setFormData(recalculatePayout(initialData));
    }
  }, [bet, isOpen, recalculatePayout]);

  const handleDataChange = (updates: Partial<any>) => {
    setFormData((prev: any) => recalculatePayout({ ...prev, ...updates }));
  };

  const updateLeg = (index: number, updates: Partial<BetLeg>) => {
    const newLegs = formData.legs.map((leg: BetLeg, i: number) =>
      i === index ? { ...leg, ...updates } : leg
    );
    
    if (oddsOverridden) {
        handleDataChange({ legs: newLegs });
    } else {
        const newTotalOdds = calculateParlayOdds(newLegs.map((l: any) => Number(l.odds || -110)));
        handleDataChange({ legs: newLegs, odds: newTotalOdds });
    }
  };

  const handleSave = async () => {
    if (!formData || isSaving) return;
    setIsSaving(true);

    // 1. All Must Win Logic (Case-insensitive)
    const hasLost = formData.legs.some((l: any) => l.status.toLowerCase() === 'lost');
    const allWon = formData.legs.every((l: any) => l.status.toLowerCase() === 'won');
    
    let finalStatus = formData.status; 
    if (formData.status !== 'cashed' && formData.status !== 'void') {
       finalStatus = hasLost ? 'lost' : (allWon ? 'won' : 'pending');
    }

    const payload = {
      ...formData,
      status: finalStatus,
      stake: Number(formData.stake),
      odds: Number(formData.odds),
      boost: Number(formData.boost),
      gameDate: formData.gameDate, // Date format "YYYY-MM-DD"
      legs: formData.legs.map((leg: any) => ({
        ...leg,
        line: Number(leg.line),
        odds: Number(leg.odds)
      }))
    };

    try {
      // ✅ Ensure this route exists at src/app/api/save-bet/route.ts
      const response = await fetch('/api/save-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // ✅ Fix for "Unexpected token <" - check response status first
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server Error (${response.status}):`, errorText);
        alert(`Failed to save: Server returned ${response.status}. Check console for details.`);
        return;
      }

      const data = await response.json();
      
      // ✅ Trigger Refresh to update the SSR Betting Log page
      router.refresh();
      onClose();
    } catch (error) {
      console.error("Save process failed:", error);
      alert("Network error: Could not connect to the save API.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!formData?.id) return;
    if (confirm('Are you sure you want to scrub this bet from the log?')) {
      onDelete(formData.id);
    }
  };

  const removeLeg = (index: number) => {
    const newLegs = formData.legs.filter((_: any, i: number) => i !== index);
    if (oddsOverridden) {
        handleDataChange({ legs: newLegs });
    } else {
        const newTotalOdds = calculateParlayOdds(newLegs.map((l: any) => Number(l.odds || -110)));
        handleDataChange({ legs: newLegs, odds: newTotalOdds });
    }
  };

  if (!isOpen || !formData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 text-white">
      <div className="bg-[#0f1115] border border-white/10 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-8 pb-4 flex justify-between items-center border-b border-white/5">
          <div>
            <h2 className="text-[#FFD700] text-3xl font-black italic uppercase tracking-tighter">Edit Bet Detail</h2>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Transaction ID: {formData.id}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-3xl">&times;</button>
        </div>

        {/* Scrollable Content */}
        <div className="p-8 overflow-y-auto space-y-6 custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest"><Hash className="w-3 h-3" /> Week</label>
              <input type="number" value={formData.week} onChange={(e) => handleDataChange({ week: e.target.value })} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-white focus:border-[#FFD700] outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest"><Calendar className="w-3 h-3" /> Date</label>
              <input type="date" value={formData.gameDate} onChange={(e) => handleDataChange({ gameDate: e.target.value })} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-white focus:border-[#FFD700] outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Stake</label>
              <input type="number" value={formData.stake} onChange={(e) => handleDataChange({ stake: e.target.value })} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-white font-mono focus:border-[#FFD700] outline-none transition-all" />
            </div>
            <div className="space-y-2 col-span-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-[#FFD700]"><Zap className="w-3 h-3" /> Boost %</label>
              <input type="number" value={formData.boost} onChange={(e) => handleDataChange({ boost: e.target.value })} className="w-full bg-[#FFD700]/5 border border-[#FFD700]/20 rounded-xl px-4 py-2 text-[#FFD700] font-bold focus:border-[#FFD700] outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Status</label>
              <select value={formData.status} onChange={(e) => handleDataChange({ status: e.target.value })} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-white focus:border-[#FFD700] outline-none transition-all appearance-none text-center">
                <option value="pending">Pending</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="void">Void</option>
                <option value="cashed">Cashed</option>
              </select>
            </div>
          </div>

          <div className="bg-black/40 border border-[#FFD700]/20 rounded-2xl p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Overall Odds</p>
                <input
                  type="number"
                  value={formData.odds}
                  onChange={(e) => {
                    handleDataChange({ odds: e.target.value });
                    setOddsOverridden(true);
                  }}
                  className="w-full bg-transparent p-0 text-[#FFD700] font-black italic text-2xl focus:ring-0 outline-none transition-all"
                />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{formData.status === 'cashed' ? 'Cashed For' : 'Est. Payout'}</p>
                <p className="text-green-400 text-2xl font-black italic">
                  ${formData.status === 'cashed' ? parseFloat(formData.cashedAmount || 0).toFixed(2) : formData.potentialPayout}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-white font-black italic uppercase tracking-tight text-lg">Bet Legs</h3>
              <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">{formData.legs.length} Total</span>
            </div>

            {formData.legs.map((leg: any, idx: number) => (
              <div key={idx} className="group relative bg-white/[0.02] border border-white/5 rounded-[1.5rem] p-5 space-y-4 hover:border-white/10 transition-all">
                <button onClick={() => removeLeg(idx)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Player / Team</label>
                    <input value={leg.player} onChange={(e) => updateLeg(idx, { player: e.target.value })} className="w-full bg-transparent border-b border-white/10 py-1 text-sm font-bold focus:border-[#FFD700] outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Market (Prop)</label>
                    <input value={leg.prop} onChange={(e) => updateLeg(idx, { prop: e.target.value })} className="w-full bg-transparent border-b border-white/10 py-1 text-sm font-bold focus:border-[#FFD700] outline-none transition-colors" />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div>
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Line</label>
                    <input type="number" step="0.5" value={leg.line} onChange={(e) => updateLeg(idx, { line: Number(e.target.value) })} className="w-full bg-black/20 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-1 ring-[#FFD700]" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">O/U</label>
                    <select value={leg.selection} onChange={(e) => updateLeg(idx, { selection: e.target.value as any })} className="w-full bg-black/20 rounded-lg px-3 py-2 text-sm font-bold outline-none appearance-none cursor-pointer">
                      <option value="Over">Over</option>
                      <option value="Under">Under</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Odds</label>
                    <input type="number" value={leg.odds} onChange={(e) => updateLeg(idx, { odds: Number(e.target.value) })} className="w-full bg-black/20 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-1 ring-[#FFD700]" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Status</label>
                    <select value={leg.status} onChange={(e) => updateLeg(idx, { status: e.target.value as any })} className={`w-full bg-black/20 rounded-lg px-3 py-2 text-sm font-black uppercase outline-none cursor-pointer ${leg.status === 'won' ? 'text-green-500' : leg.status === 'lost' ? 'text-red-500' : 'text-zinc-400'}`}>
                      <option value="pending">Pending</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                      <option value="void">Voided</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-white/[0.02] border-t border-white/5 flex justify-between items-center gap-4">
          <button onClick={handleDelete} className="px-6 py-4 rounded-2xl font-bold text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2 justify-center">
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
          <div className="flex-grow flex gap-4">
            <button onClick={onClose} className="flex-1 px-6 py-4 rounded-2xl font-bold text-zinc-400 hover:bg-white/5 transition-colors">
              Discard Changes
            </button>
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              className={`flex-[2] px-6 py-4 rounded-2xl font-black italic uppercase bg-[#FFD700] text-black shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all ${isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
            >
              {isSaving ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}