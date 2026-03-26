'use client';

import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Check, X } from "lucide-react";

// --- Editable Odds Cell ---
export function EditableOddsCell({ value, onSave }: { value: number | string, onSave: (val: number) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());

  if (!isEditing) {
    return (
      <div 
        onClick={() => setIsEditing(true)}
        className="cursor-pointer hover:text-white transition-colors"
      >
        {Number(value) > 0 ? `+${value}` : value}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input 
        autoFocus
        className="h-7 w-16 bg-zinc-950 border-white/10 text-[10px] px-1"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSave(Number(tempValue))}
      />
      <button onClick={() => { onSave(Number(tempValue)); setIsEditing(false); }} className="text-emerald-500"><Check size={12}/></button>
    </div>
  );
}

// --- Editable Stake Cell ---
export function EditableStakeCell({ value, onSave }: { value: number, onSave: (val: number) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());

  if (!isEditing) {
    return (
      <div onClick={() => setIsEditing(true)} className="cursor-pointer hover:text-indigo-400">
        ${value.toFixed(2)}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input 
        autoFocus
        className="h-7 w-20 bg-zinc-950 border-white/10 text-[10px]"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
      />
      <button onClick={() => { onSave(Number(tempValue)); setIsEditing(false); }} className="text-emerald-500"><Check size={12}/></button>
    </div>
  );
}

// --- Editable Status Cell ---
export function EditableStatusCell({ value, onSave }: { value: string, onSave: (val: string) => void }) {
  const statuses = ['pending', 'won', 'lost', 'void'];
  
  return (
    <select 
      value={value.toLowerCase()}
      onChange={(e) => onSave(e.target.value)}
      className="bg-transparent border-none text-[10px] font-black uppercase tracking-tighter cursor-pointer focus:ring-0"
    >
      {statuses.map(s => (
        <option key={s} value={s} className="bg-zinc-900 text-white">{s}</option>
      ))}
    </select>
  );
}