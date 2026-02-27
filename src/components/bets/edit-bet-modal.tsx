'use client';

import React, { useState, useEffect } from 'react';
import { Bet, BetLeg } from '@/lib/types';
import { calculateParlayStatus } from '@/lib/utils/calculate-parlay-status';
import { Trash2, Zap, Save, X } from 'lucide-react';

interface EditBetModalProps {
  isOpen: boolean;
  onClose: () => void;
  bet: Bet | null;
  onSave: (updatedBet: Bet) => void;
}

export default function EditBetModal({ isOpen, onClose, bet, onSave }: EditBetModalProps) {
  const [formData, setFormData] = useState<Partial<Bet>>({});

  useEffect(() => {
    if (bet) {
      setFormData({
        ...bet,
        legs: bet.legs || [],
        boost: bet.boost || 0,
        type: bet.type || 'Parlay'
      });
    }
  }, [bet]);

  if (!isOpen || !bet) return null;

  const handleLegStatusChange = (index: number, status: BetLeg['status']) => {
    const updatedLegs = [...(formData.legs || [])];
    updatedLegs[index] = { ...updatedLegs[index], status };
    
    // Auto-calculate parlay status: Any 'lost' leg = 'lost' overall
    const newStatus = calculateParlayStatus(updatedLegs);
    setFormData({ ...formData, legs: updatedLegs, status: newStatus });
  };

  const removeLeg = (index: number) => {
    const updatedLegs = (formData.legs || []).filter((_, i) => i !== index);
    const newStatus = calculateParlayStatus(updatedLegs);
    setFormData({ ...formData, legs: updatedLegs, status: newStatus });
  };

  const handleSubmit = async () => {
    // Ensure we are sending the absolute path to avoid 404s
    const response = await fetch('/api/save-bet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      onSave(formData as Bet);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Edit {formData.type || 'Bet'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20}/></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Grid: Stake, Odds, Boost */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] uppercase font-black text-slate-500 mb-1">Stake</label>
              <input 
                type="number" 
                value={formData.stake || 0}
                onChange={(e) => setFormData({...formData, stake: Number(e.target.value)})}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black text-slate-500 mb-1">Boost %</label>
              <select 
                value={formData.boost || 0}
                onChange={(e) => setFormData({...formData, boost: Number(e.target.value)})}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white"
              >
                {[0, 10, 20, 25, 30, 50, 100].map(v => <option key={v} value={v}>{v}%</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-black text-slate-500 mb-1">Overall Status</label>
              <div className="px-3 py-2 rounded-lg bg-slate-800 text-sm font-bold text-white uppercase text-center">
                {formData.status}
              </div>
            </div>
          </div>

          {/* Legs Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-400">Bet Legs</h3>
            {(formData.legs || []).map((leg, index) => (
              <div key={leg.id || index} className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{leg.player}</p>
                  <p className="text-xs text-slate-400">{leg.prop} {leg.line}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    value={leg.status}
                    onChange={(e) => handleLegStatusChange(index, e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                    <option value="void">Void</option>
                  </select>
                  <button onClick={() => removeLeg(index)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white">Cancel</button>
          <button onClick={handleSubmit} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors">
            <Save size={18} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}