'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toDateInputValue } from '@/lib/utils/dates';
import { getWeekFromDate } from '@/lib/utils/nfl-week';

const BOOST_OPTIONS = [
  { label: 'None', value: '' },
  { label: '10%', value: '10' },
  { label: '15%', value: '15' },
  { label: '20%', value: '20' },
  { label: '25%', value: '25' },
  { label: '30%', value: '30' },
  { label: '35%', value: '35' },
  { label: '40%', value: '40' },
  { label: '45%', value: '45' },
  { label: '50%', value: '50' },
];

export function EditBetModal({ bet, isOpen, onClose, onSave }: any) {
  const router = useRouter();
  const [status, setStatus]                   = useState('');
  const [stake, setStake]                     = useState('');
  const [odds, setOdds]                       = useState('');
  const [week, setWeek]                       = useState('');
  const [boost, setBoost]                     = useState('');
  const [gameDate, setGameDate]               = useState('');
  const [cashedOutAmount, setCashedOutAmount] = useState('');
  const [isSaving, setIsSaving]               = useState(false);
  const [saveError, setSaveError]             = useState<string | null>(null);

  const isParlay = (bet?.legs?.length ?? 0) > 1;

  useEffect(() => {
    if (!bet) return;
    setSaveError(null);
    setStatus(bet.status || 'pending');
    setStake((bet.stake ?? bet.wager ?? 0).toString());
    setCashedOutAmount(bet.cashedOutAmount?.toString() || '');
    setOdds((bet.odds ?? bet.legs?.[0]?.odds ?? '').toString());

    const resolvedWeek =
      bet.week ??
      bet.legs?.[0]?.week ??
      getWeekFromDate(bet.createdAt ?? bet.date ?? bet.gameDate) ??
      '';
    setWeek(resolvedWeek?.toString() ?? '');

    // Boost: convert number→string for select, non-numeric string → ''
    const rawBoost = bet.boostPct ?? bet.boostRaw ?? bet.boost ?? null;
    const boostNum = typeof rawBoost === 'number' ? rawBoost
      : typeof rawBoost === 'string' && /^\d+(\.\d+)?$/.test(rawBoost.trim()) ? parseFloat(rawBoost)
      : null;
    setBoost(boostNum !== null ? String(Math.round(boostNum)) : '');

    // Date: priority gameDate → date (legacy) → createdAt
    const dateSource = bet.gameDate ?? bet.date ?? bet.manualDate ?? bet.legs?.[0]?.gameDate ?? bet.createdAt ?? null;
    setGameDate(toDateInputValue(dateSource));
  }, [bet]);

  const handleDateChange = (val: string) => {
    setGameDate(val);
    if (!week) {
      const derived = getWeekFromDate(val);
      if (derived) setWeek(derived.toString());
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const oddsNum = parseFloat(odds);
      const weekNum = parseInt(week, 10);

      const payload: Record<string, any> = {
        id: bet.id,
        status,
        stake: parseFloat(stake) || 0,
        gameDate,                  // YYYY-MM-DD — API parses as local noon
        propagateToLegs: isParlay, // propagate gameDate to all legs
      };
      if (!isNaN(oddsNum))         payload.odds  = oddsNum;
      if (!isNaN(weekNum))         payload.week  = weekNum;
      if (boost)                   payload.boost = parseFloat(boost);
      if (status === 'cashed out') payload.cashedOutAmount = parseFloat(cashedOutAmount) || 0;

      const response = await fetch('/api/update-bet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? `Server error ${response.status}`);

      onSave?.({ ...payload });
      router.refresh();
      onClose();
    } catch (err: any) {
      setSaveError(err.message ?? 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!bet) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Bet Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selection summary */}
          <div className={`p-3 rounded-lg border ${status === 'won' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-800/50 border-slate-700'}`}>
            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Selection</p>
            <p className="text-sm font-medium">
              {isParlay ? `${bet.legs.length} Leg Parlay` : (bet.legs?.[0]?.player || 'Straight Bet')}
            </p>
            {isParlay && (
              <div className="mt-1.5 space-y-0.5">
                {bet.legs.map((leg: any, i: number) => (
                  <p key={i} className="text-xs text-slate-400 truncate">
                    · {leg.player} — {leg.prop} {leg.selection} {leg.line}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Game Date */}
          <div className="space-y-1.5 group">
            <label className="text-[10px] uppercase font-black text-slate-500 group-focus-within:text-emerald-500 transition-colors">
              Game Date
              {isParlay && <span className="text-amber-500/70 ml-2 font-normal normal-case">(updates all legs)</span>}
            </label>
            <input
              type="date"
              value={gameDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-emerald-500 outline-none [color-scheme:dark]"
            />
          </div>

          {/* Status */}
          <div className="grid gap-1.5">
            <label className="text-[10px] uppercase font-black text-slate-500">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-emerald-500 outline-none text-white"
            >
              <option value="pending">Pending</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="cashed out">Cashed Out</option>
              <option value="void">Void</option>
            </select>
          </div>

          {/* Cashed Out Amount */}
          {status === 'cashed out' && (
            <div className="grid gap-1.5">
              <label className="text-[10px] uppercase font-black text-slate-500">Cashed Out Amount ($)</label>
              <Input
                type="number"
                value={cashedOutAmount}
                onChange={(e) => setCashedOutAmount(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white"
                placeholder="Amount received"
              />
            </div>
          )}

          {/* Stake + Odds */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label className="text-[10px] uppercase font-black text-slate-500">Stake ($)</label>
              <Input type="number" value={stake} onChange={(e) => setStake(e.target.value)} className="bg-slate-950 border-slate-800 text-white" />
            </div>
            <div className="grid gap-1.5">
              <label className="text-[10px] uppercase font-black text-slate-500">Odds {isParlay ? '(Parlay)' : ''}</label>
              <Input type="number" value={odds} onChange={(e) => setOdds(e.target.value)} className="bg-slate-950 border-slate-800 text-white" placeholder="-110" />
            </div>
          </div>

          {/* Week + Boost */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label className="text-[10px] uppercase font-black text-slate-500">
                NFL Week
                {!bet.week && <span className="text-amber-500/70 ml-1 font-normal">(auto)</span>}
              </label>
              <Input
                type="number" min={1} max={22}
                value={week}
                onChange={(e) => setWeek(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white"
                placeholder="1–22"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-[10px] uppercase font-black text-slate-500">Boost %</label>
              <select
                value={boost}
                onChange={(e) => setBoost(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-emerald-500 outline-none text-white"
              >
                {BOOST_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Error */}
          {saveError && (
            <div className="rounded-lg bg-red-900/30 border border-red-700/40 px-3 py-2 text-sm text-red-400">
              ⚠️ {saveError}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSaving} className="hover:bg-slate-800">Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 min-w-[110px]">
            {isSaving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Saving...
              </span>
            ) : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}