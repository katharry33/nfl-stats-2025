'use client';
import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, TrendingUp, DollarSign, Calendar, Copy, Loader2 } from 'lucide-react';
import { Bet } from '@/lib/types';
import { toDecimal } from '@/lib/utils/odds';
import { toast } from 'sonner';

interface EditBetModalProps {
  bet: Bet;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Bet) => Promise<void>;
  onDelete: (id: string) => void;
}

export function EditBetModal({ bet, isOpen, onClose, onSave, onDelete }: EditBetModalProps) {
  const [formData, setFormData] = useState<Bet>(bet);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when the selected bet changes
  useEffect(() => {
    setFormData(bet);
  }, [bet]);

  const handleFieldChange = (fields: Partial<Bet>) => {
    setFormData(prev => ({ ...prev, ...fields }));
  };

  const handleClone = () => {
    // 1. Destructure to remove ID and timestamps
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, createdAt, updatedAt, ...cloneData } = formData;
    
    // 2. Prepare the cloned state as a "New" bet
    const newBet = {
      ...cloneData,
      status: 'pending' as const,
      // We keep the gameDate, but you could also default it to today:
      // gameDate: new Date().toISOString().split('T')[0]
    } as Bet;

    setFormData(newBet);
    toast.info("Bet cloned! Adjust details and click 'Create New Bet'.", {
      icon: <Copy className="h-4 w-4" />,
      style: { background: '#0f1115', border: '1px solid rgba(255,215,0,0.2)', color: '#FFD700' },
    });
  };

  const calculatePayout = () => {
    const stake = Number(formData.stake) || 0;
    const odds = Number(formData.odds) || 0;
    const boost = Number(formData.boost || 0);
    
    const dec = toDecimal(odds);
    const boostMult = 1 + (boost / 100);
    const payout = stake * dec * boostMult;
    
    return formData.isBonusBet ? (payout - stake) : payout;
  };

  const handleInternalSave = async () => {
    setIsSaving(true);
    try {
      // If formData.id exists, it's an update. If not (cloned), it's a create.
      const res = await fetch('/api/save-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to save bet to database');
      const result = await res.json();

      // Update local context/state
      // If it was a clone, we pass the new ID returned from the server
      await onSave({ ...formData, id: formData.id || result.id });
      
      toast.success(formData.id ? "Bet updated" : "New bet created from clone");
      onClose();
    } catch (error: any) {
      toast.error("Error saving bet", { description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // Determine if we are in "Clone Mode" (no ID)
  const isCloned = !formData.id;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className={`bg-[#0f1115] border ${isCloned ? 'border-blue-500/40' : 'border-white/10'} w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl transition-colors`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
          <div>
            <h2 className="text-white font-black text-xl italic uppercase tracking-tighter">
              {isCloned ? 'Clone Bet' : 'Edit Bet'}
            </h2>
            <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
              {isCloned ? 'Creating New Entry' : `ID: ${bet.id.slice(-8)}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {/* Section: Odds & Stake */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Overall Odds
              </label>
              <input
                type="number"
                value={formData.odds}
                onChange={(e) => handleFieldChange({ odds: Number(e.target.value) })}
                className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-[#FFD700] font-mono outline-none focus:border-[#FFD700]/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Stake
              </label>
              <input
                type="number"
                value={formData.stake}
                onChange={(e) => handleFieldChange({ stake: Number(e.target.value) })}
                className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-white font-mono outline-none focus:border-white/20"
              />
            </div>
          </div>

          {/* Section: Date & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Game Date
              </label>
              <input
                type="date"
                value={typeof formData.gameDate === 'string' ? formData.gameDate : ''}
                onChange={(e) => handleFieldChange({ gameDate: e.target.value })}
                className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-white text-sm outline-none [color-scheme:dark]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase">Status</label>
              <select
                value={formData.status}
                onChange={(e) => handleFieldChange({ status: e.target.value as any })}
                className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-white text-sm outline-none"
              >
                <option value="pending">Pending</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="void">Void</option>
              </select>
            </div>
          </div>

          {/* Payout Preview Card */}
          <div className="bg-[#FFD700]/5 border border-[#FFD700]/10 rounded-3xl p-5 flex justify-between items-center">
            <span className="text-xs text-zinc-500 font-black uppercase italic">Potential Payout</span>
            <span className="text-2xl font-black font-mono text-[#FFD700]">${calculatePayout().toFixed(2)}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {!isCloned && (
              <>
                <button
                  onClick={() => { if(confirm("Delete this bet?")) onDelete(bet.id); }}
                  className="px-6 py-4 rounded-2xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                <button
                  onClick={handleClone}
                  className="px-6 py-4 rounded-2xl border border-white/10 text-zinc-400 hover:bg-white/5 transition-all"
                  title="Clone this bet"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </>
            )}
            
            <button
              onClick={handleInternalSave}
              disabled={isSaving}
              className={`flex-1 ${isCloned ? 'bg-blue-600 hover:bg-blue-500' : 'bg-[#FFD700] hover:bg-[#e6c200]'} text-black font-black uppercase py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50`}
            >
              {isSaving ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : isCloned ? (
                <Copy className="h-5 w-5" />
              ) : (
                <Save className="h-5 w-5" />
              )}
              {isCloned ? 'Create New Bet' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}