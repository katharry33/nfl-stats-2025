'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Zap, Percent } from 'lucide-react';

const BOOST_OPTIONS = [
  5, 10, 15, 20, 25, 30, 33, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 100
];

export function BonusForm({ onSave, bonusToEdit }: any) {
  const [boost, setBoost] = useState<number>(50);
  const [isCustom, setIsCustom] = useState(false);
  const [customBoost, setCustomBoost] = useState('');

  // Sync state if editing
  useEffect(() => {
    if (bonusToEdit?.boost) {
      if (BOOST_OPTIONS.includes(bonusToEdit.boost)) {
        setBoost(bonusToEdit.boost);
        setIsCustom(false);
      } else {
        setBoost(0);
        setIsCustom(true);
        setCustomBoost(String(bonusToEdit.boost));
      }
    }
  }, [bonusToEdit]);

  const finalBoostValue = isCustom ? parseFloat(customBoost) || 0 : boost;

  return (
    <div className="space-y-6">
      {/* ... Name, Book, and Type fields above ... */}

      <div className="space-y-3">
        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-1">
          Boost Percentage
        </label>
        
        <div className="grid grid-cols-6 gap-2 bg-black/40 p-3 rounded-2xl border border-white/5">
          {BOOST_OPTIONS.map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => {
                setBoost(val);
                setIsCustom(false);
              }}
              className={`py-2 rounded-lg border text-[10px] font-mono font-black transition-all ${
                !isCustom && boost === val
                  ? 'bg-[#FFD700] border-[#FFD700] text-black shadow-[0_0_15px_rgba(255,215,0,0.2)]'
                  : 'bg-zinc-900 border-white/5 text-zinc-500 hover:border-white/20 hover:text-zinc-300'
              }`}
            >
              {val}%
            </button>
          ))}
          
          <button
            type="button"
            onClick={() => setIsCustom(true)}
            className={`py-2 rounded-lg border text-[10px] font-black transition-all ${
              isCustom 
                ? 'bg-white border-white text-black' 
                : 'bg-zinc-900 border-white/5 text-zinc-500'
            }`}
          >
            {isCustom ? 'CUSTOM' : '+'}
          </button>
        </div>

        {isCustom && (
          <div className="mt-2 relative animate-in fade-in slide-in-from-top-1">
            <input
              type="number"
              value={customBoost}
              onChange={(e) => setCustomBoost(e.target.value)}
              placeholder="Enter custom %"
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white outline-none focus:border-[#FFD700]/50"
            />
            <Percent className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-5 py-4 bg-[#FFD700]/5 border border-[#FFD700]/10 rounded-2xl">
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-[#FFD700] uppercase tracking-widest">Multiplier Applied</span>
          <span className="text-xs text-zinc-500 italic">Profit is multiplied by this factor</span>
        </div>
        <span className="text-xl font-mono font-black text-white">
          {(1 + finalBoostValue / 100).toFixed(2)}x
        </span>
      </div>

      {/* ... Max Wager and Odds fields ... */}
    </div>
  );
}