'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, CalendarIcon, Plus, X, Zap, Gift, Ghost, Layers, Star, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { db } from '@/lib/firebase/client';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import type { Bonus } from '@/lib/types';
import { resolveFirestoreDate } from '@/lib/types';

// ─── Preset bet types ──────────────────────────────────────────────────────────

const PRESET_BET_TYPES = [
  {
    id: 'bonus_bet',
    label: 'Bonus Bet',
    icon: <Gift className="h-4 w-4" />,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/30',
    activeBg: 'bg-violet-600 border-violet-500',
    description: 'Free bet — stake not returned on win',
    defaultLogic: 'Stake is not returned on win. Payout = odds × bonus amount.',
  },
  {
    id: 'profit_boost',
    label: 'Profit Boost',
    icon: <Zap className="h-4 w-4" />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
    activeBg: 'bg-amber-600 border-amber-500',
    description: 'Percentage boost on winnings',
    defaultLogic: 'Winnings boosted by boost %. Stake returned on win.',
  },
  {
    id: 'ghost_parlay',
    label: 'Ghost Parlay',
    icon: <Ghost className="h-4 w-4" />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
    activeBg: 'bg-blue-600 border-blue-500',
    description: '1 losing leg is forgiven',
    defaultLogic: 'Up to 1 leg may lose — parlay still pays out at reduced odds.',
  },
  {
    id: 'parlay_boost',
    label: 'Parlay Boost',
    icon: <Layers className="h-4 w-4" />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    activeBg: 'bg-emerald-600 border-emerald-500',
    description: 'Boosted payout on parlay wins',
    defaultLogic: 'All legs must win. Payout boosted by boost % on top of normal parlay odds.',
  },
  {
    id: 'sgp',
    label: 'SGP Boost',
    icon: <Star className="h-4 w-4" />,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10 border-pink-500/30',
    activeBg: 'bg-pink-600 border-pink-500',
    description: 'Same-game parlay boost',
    defaultLogic: 'All legs must win. Same game only. Boost applied to winnings.',
  },
  {
    id: 'custom',
    label: 'Custom',
    icon: <Plus className="h-4 w-4" />,
    color: 'text-slate-400',
    bg: 'bg-slate-700/30 border-slate-600/30',
    activeBg: 'bg-slate-700 border-slate-500',
    description: 'Define your own type',
    defaultLogic: '',
  },
];

// ─── Win logic presets ─────────────────────────────────────────────────────────

const LOGIC_PRESETS = [
  { id: 'all_win',      label: 'All legs must win',            desc: 'Standard parlay — every leg must hit' },
  { id: 'one_lose',     label: '1 losing leg forgiven',        desc: 'Ghost parlay — one miss allowed' },
  { id: 'two_lose',     label: '2 losing legs forgiven',       desc: 'Up to 2 misses — odds adjusted' },
  { id: 'bonus_payout', label: 'Stake not returned on win',    desc: 'Bonus / free bet payout style' },
  { id: 'boost_only',   label: 'Boost applied to profit only', desc: 'Stake returned + boosted profit' },
  { id: 'custom',       label: 'Custom logic…',                desc: 'Write your own rule' },
];

// ─── Input helpers ─────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-slate-600";
const textareaCls = `${inputCls} resize-none min-h-[80px]`;

// ─── Component ─────────────────────────────────────────────────────────────────

interface BonusFormProps {
  onSave: (bonus: Bonus) => void;
  bonusToEdit?: Bonus | null;
  onClose?: () => void;
}

export function BonusForm({ onSave, bonusToEdit, onClose }: BonusFormProps) {
  // Core fields
  const [name,           setName]           = useState('');
  const [boost,          setBoost]          = useState('');
  const [maxWager,       setMaxWager]       = useState('');
  const [description,    setDescription]    = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [expirationTime, setExpirationTime] = useState('23:59');
  const [isSaving,       setIsSaving]       = useState(false);

  // Type + logic
  const [selectedType,   setSelectedType]   = useState('profit_boost');
  const [customTypeName, setCustomTypeName] = useState('');
  const [selectedLogic,  setSelectedLogic]  = useState('all_win');
  const [customLogic,    setCustomLogic]    = useState('');

  // Populate when editing
  useEffect(() => {
    if (!bonusToEdit) return;
    setName(bonusToEdit.name ?? '');
    setBoost(String(bonusToEdit.boost ?? ''));
    setMaxWager(String(bonusToEdit.maxWager ?? ''));
    setDescription(bonusToEdit.description ?? '');

    const betType = bonusToEdit.betType ?? 'profit_boost';
    const knownIds = PRESET_BET_TYPES.map(t => t.id);
    if (knownIds.includes(betType)) {
      setSelectedType(betType);
    } else {
      setSelectedType('custom');
      setCustomTypeName(betType);
    }

    const logic = (bonusToEdit as any).winLogic ?? '';
    const knownLogic = LOGIC_PRESETS.map(l => l.id);
    if (knownLogic.includes(logic)) {
      setSelectedLogic(logic);
    } else if (logic) {
      setSelectedLogic('custom');
      setCustomLogic(logic);
    }

    const d = resolveFirestoreDate(bonusToEdit.expirationDate);
    if (d) {
      setExpirationDate(d.toISOString().split('T')[0]);
      setExpirationTime(format(d, 'HH:mm'));
    }
  }, [bonusToEdit]);

  // Auto-fill logic when type changes
  useEffect(() => {
    const preset = PRESET_BET_TYPES.find(t => t.id === selectedType);
    if (!preset || selectedType === 'custom') return;
    if (selectedType === 'ghost_parlay') setSelectedLogic('one_lose');
    else if (selectedType === 'bonus_bet') setSelectedLogic('bonus_payout');
    else if (selectedType === 'profit_boost') setSelectedLogic('boost_only');
    else setSelectedLogic('all_win');
  }, [selectedType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !boost || !maxWager || !expirationDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const [h, m] = expirationTime.split(':');
      const expiry = new Date(expirationDate + 'T00:00:00');
      expiry.setHours(parseInt(h), parseInt(m), 0, 0);

      const finalType  = selectedType === 'custom' ? (customTypeName.trim() || 'custom') : selectedType;
      const finalLogic = selectedLogic === 'custom' ? customLogic.trim() : (LOGIC_PRESETS.find(l => l.id === selectedLogic)?.label ?? selectedLogic);

      const bonusData = {
        name: name.trim(),
        boost:         parseFloat(boost),
        betType:       finalType,
        maxWager:      parseFloat(maxWager),
        expirationDate: expiry,
        description:   description.trim(),
        winLogic:      finalLogic,
        status:        'active' as const,
        updatedAt:     serverTimestamp(),
      };

      if (bonusToEdit?.id) {
        await updateDoc(doc(db, 'bonuses', bonusToEdit.id), bonusData);
        toast.success('Bonus updated');
      } else {
        await addDoc(collection(db, 'bonuses'), { ...bonusData, createdAt: serverTimestamp() });
        toast.success('Bonus created');
      }

      onSave({ id: bonusToEdit?.id ?? '', ...bonusData } as unknown as Bonus);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save bonus');
    } finally {
      setIsSaving(false);
    }
  };

  const activeType = PRESET_BET_TYPES.find(t => t.id === selectedType);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Bet Type picker ──────────────────────────────────────────────────── */}
      <Field label="Bonus Type" required>
        <div className="grid grid-cols-3 gap-2">
          {PRESET_BET_TYPES.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedType(t.id)}
              className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-center transition-all ${
                selectedType === t.id
                  ? `${t.activeBg} text-white shadow-lg`
                  : `${t.bg} ${t.color} hover:opacity-80`
              }`}
            >
              {t.icon}
              <span className="text-[10px] font-bold uppercase leading-tight">{t.label}</span>
            </button>
          ))}
        </div>
        {activeType && selectedType !== 'custom' && (
          <p className="text-[10px] text-slate-500 mt-1.5 ml-1">{activeType.description}</p>
        )}
        {selectedType === 'custom' && (
          <input
            type="text"
            placeholder="Type name (e.g. Round Robin Boost)"
            value={customTypeName}
            onChange={e => setCustomTypeName(e.target.value)}
            className={`${inputCls} mt-2`}
          />
        )}
      </Field>

      {/* ── Name ──────────────────────────────────────────────────────────────── */}
      <Field label="Bonus Name" required>
        <input
          type="text"
          placeholder="e.g. DraftKings 50% Profit Boost"
          value={name}
          onChange={e => setName(e.target.value)}
          className={inputCls}
          required
        />
      </Field>

      {/* ── Boost + Max Wager ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Boost %" required>
          <div className="relative">
            <input
              type="number" step="1" min="0" max="500"
              placeholder="50"
              value={boost}
              onChange={e => setBoost(e.target.value)}
              className={inputCls}
              required
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-mono">%</span>
          </div>
        </Field>
        <Field label="Max Wager ($)" required>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
            <input
              type="number" step="0.01" min="0"
              placeholder="100"
              value={maxWager}
              onChange={e => setMaxWager(e.target.value)}
              className={`${inputCls} pl-7`}
              required
            />
          </div>
        </Field>
      </div>

      {/* ── Win Logic ─────────────────────────────────────────────────────────── */}
      <Field label="Win Logic">
        <div className="space-y-1.5">
          {LOGIC_PRESETS.map(l => (
            <button
              key={l.id}
              type="button"
              onClick={() => setSelectedLogic(l.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                selectedLogic === l.id
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                selectedLogic === l.id ? 'bg-emerald-500 border-emerald-400' : 'border-slate-600'
              }`} />
              <div className="min-w-0">
                <div className="text-xs font-semibold leading-tight">{l.label}</div>
                <div className="text-[10px] text-slate-500 truncate">{l.desc}</div>
              </div>
            </button>
          ))}
        </div>
        {selectedLogic === 'custom' && (
          <textarea
            placeholder="Describe your win logic…"
            value={customLogic}
            onChange={e => setCustomLogic(e.target.value)}
            className={`${textareaCls} mt-2`}
          />
        )}
      </Field>

      {/* ── Expiry ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Expiration Date" required>
          <input
            type="date"
            value={expirationDate}
            onChange={e => setExpirationDate(e.target.value)}
            className={`${inputCls} [color-scheme:dark]`}
            required
          />
        </Field>
        <Field label="Expiration Time">
          <input
            type="time"
            value={expirationTime}
            onChange={e => setExpirationTime(e.target.value)}
            className={`${inputCls} [color-scheme:dark]`}
          />
        </Field>
      </div>

      {/* ── Notes ─────────────────────────────────────────────────────────────── */}
      <Field label="Notes">
        <textarea
          placeholder="e.g. Valid on NFL parlays only, min 3 legs"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className={textareaCls}
        />
      </Field>

      {/* ── Submit ────────────────────────────────────────────────────────────── */}
      <div className="flex gap-2 pt-1">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm font-bold hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold uppercase tracking-wide transition-colors"
        >
          {isSaving
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            : bonusToEdit ? 'Update Bonus' : 'Create Bonus'
          }
        </button>
      </div>
    </form>
  );
}