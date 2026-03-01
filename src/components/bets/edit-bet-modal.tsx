'use client';

import { useState, useEffect } from 'react';
import { Bet, BetLeg } from '@/lib/types';
import { Trash2, Plus, Calendar, Hash, Percent, Zap } from 'lucide-react';

interface EditBetModalProps {
  bet: Bet | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (bet: any) => void;
}

export function EditBetModal({ bet, isOpen, onClose, onSave }: EditBetModalProps) {
  const [formData, setFormData] = useState<any>(null);

  // Initialize form data when modal opens
  useEffect(() => {
    if (bet) {
      setFormData({
        ...bet,
        stake: (bet as any).stake || (bet as any).amount || 0,
        boost: (bet as any).boost || 0,
        odds: (bet as any).odds || 0,
        week: (bet as any).week || 1,
        gameDate: (bet as any).gameDate || new Date().toISOString().split('T')[0],
        legs: Array.isArray(bet.legs) ? [...bet.legs] : []
      });
    }
  }, [bet, isOpen]);

  if (!isOpen || !formData) return null;

  const updateLeg = (index: number, updates: Partial<BetLeg>) => {
    const newLegs = [...formData.legs];
    newLegs[index] = { ...newLegs[index], ...updates };
    setFormData({ ...formData, legs: newLegs });
  };

  const removeLeg = (index: number) => {
    setFormData({ ...formData, legs: formData.legs.filter((_: any, i: number) => i !== index) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-[#0f1115] border border-white/10 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-8 pb-4 flex justify-between items-center border-b border-white/5">
          <div>
            <h2 className="text-[#FFD700] text-3xl font-black italic uppercase tracking-tighter">
              Edit Bet Detail
            </h2>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Transaction ID: {formData.id}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-3xl">&times;</button>
        </div>

        {/* Scrollable Content */}
        <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
          
          {/* Global Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                <Hash className="w-3 h-3" /> Week
              </label>
              <input 
                type="number" 
                value={formData.week}
                onChange={(e) => setFormData({...formData, week: e.target.value})}
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-white focus:border-[#FFD700] outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                <Calendar className="w-3 h-3" /> Date
              </label>
              <input 
                type="date" 
                value={formData.gameDate}
                onChange={(e) => setFormData({...formData, gameDate: e.target.value})}
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-white focus:border-[#FFD700] outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-[#FFD700]">
                <Zap className="w-3 h-3" /> Boost %
              </label>
              <input 
                type="number" 
                value={formData.boost}
                onChange={(e) => setFormData({...formData, boost: e.target.value})}
                className="w-full bg-[#FFD700]/5 border border-[#FFD700]/20 rounded-xl px-4 py-2 text-[#FFD700] font-bold focus:border-[#FFD700] outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                Stake
              </label>
              <input 
                type="number" 
                value={formData.stake}
                onChange={(e) => setFormData({...formData, stake: e.target.value})}
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-white font-mono focus:border-[#FFD700] outline-none transition-all"
              />
            </div>
          </div>

          {/* Legs Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-white font-black italic uppercase tracking-tight text-lg">Bet Legs</h3>
              <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">{formData.legs.length} Total</span>
            </div>

            {formData.legs.map((leg: any, idx: number) => (
              <div key={idx} className="group relative bg-white/[0.02] border border-white/5 rounded-[1.5rem] p-5 space-y-4 hover:border-white/10 transition-all">
                <button 
                  onClick={() => removeLeg(idx)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Player / Team</label>
                    <input 
                      value={leg.player}
                      onChange={(e) => updateLeg(idx, { player: e.target.value })}
                      className="w-full bg-transparent border-b border-white/10 py-1 text-sm font-bold focus:border-[#FFD700] outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Market (Prop)</label>
                    <input 
                      value={leg.prop}
                      onChange={(e) => updateLeg(idx, { prop: e.target.value })}
                      className="w-full bg-transparent border-b border-white/10 py-1 text-sm font-bold focus:border-[#FFD700] outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Line</label>
                    <input 
                      type="number"
                      value={leg.line}
                      onChange={(e) => updateLeg(idx, { line: Number(e.target.value) })}
                      className="w-full bg-black/20 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-1 ring-[#FFD700]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">O/U</label>
                    <select 
                      value={leg.selection}
                      onChange={(e) => updateLeg(idx, { selection: e.target.value as 'Over' | 'Under' })}
                      className="w-full bg-black/20 rounded-lg px-3 py-2 text-sm font-bold outline-none appearance-none cursor-pointer"
                    >
                      <option value="Over">Over</option>
                      <option value="Under">Under</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Status</label>
                    <select 
                      value={leg.status}

                      className={`w-full bg-black/20 rounded-lg px-3 py-2 text-sm font-black uppercase outline-none cursor-pointer ${
                        leg.status === 'won' ? 'text-primary' : leg.status === 'lost' ? 'text-red-500' : 'text-zinc-400'
                      }`}
                    >
                      <option value="pending">Pending</option>onChange={(e) => updateLeg(idx, { status: e.target.value as 'pending' | 'won' | 'lost' | 'void' })}
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

        {/* Footer Actions */}
        <div className="p-8 bg-white/[0.02] border-t border-white/5 flex gap-4">
          <button 
            onClick={onClose} 
            className="flex-1 px-6 py-4 rounded-2xl font-bold text-zinc-400 hover:bg-white/5 transition-colors"
          >
            Discard Changes
          </button>
          <button 
            onClick={() => onSave(formData)}
            className="flex-[2] px-6 py-4 rounded-2xl font-black italic uppercase bg-[#FFD700] text-black shadow-[0_0_20px_rgba(255,215,0,0.2)] hover:scale-[1.02] active:scale-95 transition-all"
          >
            Save Transacation
          </button>
        </div>
      </div>
    </div>
  );
}