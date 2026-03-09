'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Gift, Zap, Ghost, Layers, Star } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { db } from '@/lib/firebase/client';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import type { Bonus } from '@/lib/types';
import { resolveFirestoreDate } from '@/lib/types';

const PRESET_BET_TYPES = [
  { id: 'bonus_bet', label: 'Bonus Bet', icon: <Gift className="h-4 w-4" />, color: 'text-violet-400' },
  { id: 'profit_boost', label: 'Profit Boost', icon: <Zap className="h-4 w-4" />, color: 'text-[#FFD700]' },
  { id: 'ghost_parlay', label: 'Ghost Parlay', icon: <Ghost className="h-4 w-4" />, color: 'text-blue-400' },
  { id: 'parlay_boost', label: 'Parlay Boost', icon: <Layers className="h-4 w-4" />, color: 'text-emerald-400' },
  { id: 'sgp', label: 'SGP Boost', icon: <Star className="h-4 w-4" />, color: 'text-pink-400' },
  { id: 'custom', label: 'Custom', icon: <Plus className="h-4 w-4" />, color: 'text-zinc-400' },
];

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-black border border-white/10 text-white text-sm rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-mono placeholder:text-zinc-700";

interface BonusFormProps {
  onSave: (bonus: Bonus) => void;
  bonusToEdit?: Bonus | null;
  onClose?: () => void;
}

export function BonusForm({ onSave, bonusToEdit, onClose }: BonusFormProps) {
  const [name, setName] = useState('');
  const [boost, setBoost] = useState('');
  const [maxWager, setMaxWager] = useState('');
  const [selectedType, setSelectedType] = useState('profit_boost');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!bonusToEdit) return;
    setName(bonusToEdit.name ?? '');
    setBoost(String(bonusToEdit.boost ?? ''));
    setMaxWager(String(bonusToEdit.maxWager ?? ''));
    setSelectedType(bonusToEdit.betType ?? 'profit_boost');
  }, [bonusToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const bonusData = {
        name: name.trim(),
        boost: parseFloat(boost),
        maxWager: parseFloat(maxWager),
        betType: selectedType,
        status: 'active',
        updatedAt: serverTimestamp(),
      };

      if (bonusToEdit?.id) {
        await updateDoc(doc(db, 'bonuses', bonusToEdit.id), bonusData);
      } else {
        await addDoc(collection(db, 'bonuses'), { ...bonusData, createdAt: serverTimestamp() });
      }
      onSave({ id: bonusToEdit?.id ?? '', ...bonusData } as any);
    } catch (err) {
      toast.error('Failed to save asset');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field label="Asset Type" required>
        <div className="grid grid-cols-3 gap-2">
          {PRESET_BET_TYPES.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedType(t.id)}
              className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                selectedType === t.id ? `bg-white border-white text-black shadow-lg` : `bg-black border-white/5 ${t.color} hover:border-white/20`
              }`}
            >
              {t.icon}
              <span className="text-[9px] font-black uppercase tracking-tighter">{t.label}</span>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Asset Name" required>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="e.g. DK 50% NFL BOOST" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Boost %" required>
          <div className="relative">
            <input type="number" value={boost} onChange={e => setBoost(e.target.value)} className={inputCls} placeholder="50" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 font-black text-xs">%</span>
          </div>
        </Field>
        <Field label="Max Wager" required>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 font-black text-xs">$</span>
            <input type="number" value={maxWager} onChange={e => setMaxWager(e.target.value)} className={`${inputCls} pl-8`} placeholder="10.00" />
          </div>
        </Field>
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="w-full py-4 rounded-2xl bg-[#FFD700] text-black font-black uppercase tracking-widest text-xs hover:bg-[#e6c200] disabled:opacity-50 transition-all"
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (bonusToEdit ? 'Update Asset' : 'Initialize Asset')}
      </button>
    </form>
  );
}