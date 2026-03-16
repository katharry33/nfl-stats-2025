'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { db, auth } from '@/lib/firebase/client';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

const BOOST_OPTIONS = [5, 10, 15, 20, 25, 30, 33, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 100];
const BOOKS = ['DraftKings', 'FanDuel', 'BetMGM', 'Caesars', 'Other'];
const ELIGIBLE_OPTIONS = ['Single', 'Parlay', 'SGP', 'SGPx', 'Live'];

export function BonusForm({ onSave, bonusToEdit, onClose }: any) {
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [book, setBook] = useState('DraftKings');
  const [eligibleTypes, setEligibleTypes] = useState<string[]>(['Single']);
  const [maxWager, setMaxWager] = useState('');
  const [minOdds, setMinOdds] = useState('-200');
  const [boost, setBoost] = useState<number>(50);
  const [isCustom, setIsCustom] = useState(false);
  const [customBoost, setCustomBoost] = useState('');

  useEffect(() => {
    if (bonusToEdit) {
      setName(bonusToEdit.name || '');
      setBook(bonusToEdit.book || 'DraftKings');
      setEligibleTypes(bonusToEdit.eligibleTypes || ['Single']);
      setMaxWager(String(bonusToEdit.maxWager || ''));
      setMinOdds(bonusToEdit.minOdds || '-200');
      if (BOOST_OPTIONS.includes(bonusToEdit.boost)) {
        setBoost(bonusToEdit.boost);
        setIsCustom(false);
      } else {
        setIsCustom(true);
        setCustomBoost(String(bonusToEdit.boost || ''));
      }
    }
  }, [bonusToEdit]);

  const finalBoostValue = isCustom ? parseFloat(customBoost) || 0 : boost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const user = auth.currentUser;
    if (!user) {
      toast.error("Authentication required");
      setIsSaving(false);
      return;
    }

    try {
      const bonusData = {
        name: name.trim(),
        book,
        boost: finalBoostValue,
        maxWager: parseFloat(maxWager) || 0,
        minOdds: minOdds || '-200',
        eligibleTypes,
        userId: user.uid,     // REQUIRED for the query to find it
        status: 'active',     // REQUIRED to show in "Active Promos"
        updatedAt: serverTimestamp(),
      };

      if (bonusToEdit?.id) {
        await updateDoc(doc(db, 'bonuses', bonusToEdit.id), bonusData);
      } else {
        await addDoc(collection(db, 'bonuses'), { ...bonusData, createdAt: serverTimestamp() });
      }

      toast.success('Asset synchronized to inventory');
      onSave(); // This should trigger setModalOpen(false) in your parent
    } catch (err) {
      console.error("Save Error:", err);
      toast.error('Sync failed: Check Firestore permissions');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Asset Name">
          <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="DK NFL Boost" />
        </Field>
        <Field label="Sportsbook">
          <select value={book} onChange={e => setBook(e.target.value)} className={inputCls}>
            {BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Boost Percentage">
        <div className="grid grid-cols-6 gap-2 bg-black/20 p-2 rounded-xl border border-white/5">
          {BOOST_OPTIONS.map(v => (
            <button key={v} type="button" onClick={() => {setBoost(v); setIsCustom(false)}} 
              className={`py-2 rounded-lg border text-[10px] font-mono font-black transition-all ${!isCustom && boost === v ? 'bg-[#FFD700] border-[#FFD700] text-black' : 'bg-zinc-900 border-white/5 text-zinc-500'}`}>
              {v}%
            </button>
          ))}
        </div>
        {isCustom && <input type="number" value={customBoost} onChange={e => setCustomBoost(e.target.value)} className={`${inputCls} mt-2`} placeholder="Enter %" />}
      </Field>

      <Field label="Eligible Bet Types">
        <div className="flex flex-wrap gap-2">
          {ELIGIBLE_OPTIONS.map(opt => (
            <button key={opt} type="button" onClick={() => setEligibleTypes(prev => prev.includes(opt) ? prev.filter(t => t !== opt) : [...prev, opt])}
              className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase ${eligibleTypes.includes(opt) ? 'bg-emerald-500 border-emerald-500 text-black' : 'bg-zinc-900 text-zinc-500 border-white/5'}`}>
              {opt}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Max Wager ($)">
          <input type="number" value={maxWager} onChange={e => setMaxWager(e.target.value)} className={inputCls} placeholder="10.00" />
        </Field>
        <Field label="Min Odds">
          <input type="text" value={minOdds} onChange={e => setMinOdds(e.target.value)} className={inputCls} placeholder="-200" />
        </Field>
      </div>

      <button type="submit" disabled={isSaving} className="w-full py-4 rounded-2xl bg-[#FFD700] text-black font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all">
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Save Bonus'}
      </button>
    </form>
  );
}

const inputCls = "w-full bg-zinc-900/50 border border-white/10 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-[#FFD700]/50 font-mono transition-all";

function Field({ label, children }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">{label}</label>
      {children}
    </div>
  );
}
