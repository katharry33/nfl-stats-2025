'use client';

import React, { useState } from 'react';
import { X, Plus, Save, Loader2, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { getWeekFromDate } from '@/lib/utils/nfl-week';
import { BetLeg } from '@/lib/types'; // Import your central type

interface ManualLeg {
  player: string;
  prop: string;
  line: string;
  selection: 'Over' | 'Under';
  odds: string;
  team: string;
  matchup: string;
  week: string;
  gameDate: string;
  season: string;
}

const BLANK_LEG: ManualLeg = {
  player: '', prop: '', line: '', selection: 'Over',
  odds: '-110', team: '', matchup: '', week: '', gameDate: '', season: '',
};

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLeg: (leg: BetLeg) => void; // Typed correctly now
}

export function ManualEntryModal({ isOpen, onClose, onAddLeg }: ManualEntryModalProps) {
  const [legs, setLegs] = useState<ManualLeg[]>([{ ...BLANK_LEG }]);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const updateLeg = (i: number, up: Partial<ManualLeg>) => {
    setLegs(prev => prev.map((l, idx) => {
      if (idx !== i) return l;
      const newLeg = { ...l, ...up };
      if (up.gameDate) {
        const dateObj = new Date(up.gameDate);
        const derivedWeek = getWeekFromDate(up.gameDate);
        const derivedSeason = dateObj.getFullYear();
        newLeg.week = derivedWeek ? String(derivedWeek) : newLeg.week;
        newLeg.season = derivedSeason ? String(derivedSeason) : newLeg.season;
      }
      return newLeg;
    }));
  };

  const addBlankLeg = () => setLegs(prev => [...prev, { ...BLANK_LEG }]);
  const removeLeg = (i: number) => setLegs(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    const valid = legs.filter(l => l.player.trim() && l.prop.trim());
    if (!valid.length) {
      toast.error('Add at least one leg with a player and prop.');
      return;
    }

    setSaving(true);
    try {
      // 1. Save to allProps collection
      const res = await fetch('/api/all-props/save-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legs: valid }),
      });
      
      if (!res.ok) {
        console.warn('allProps save warning');
      }

      // 2. Add each leg to the bet slip with sanitized whole number odds
      for (const leg of valid) {
        const propId = `manual-${leg.player}-${leg.prop}-${Date.now()}`
          .replace(/\s+/g, '-')
          .toLowerCase();

        onAddLeg({
          id: propId,
          propId,
          player: leg.player.trim(),
          prop: leg.prop.trim(),
          line: Number(leg.line) || 0,
          selection: leg.selection,
          // RULE: Odds must be a whole number
          odds: Math.round(Number(leg.odds)) || -110,
          team: leg.team.trim().toUpperCase(),
          matchup: leg.matchup.trim(),
          week: Number(leg.week) || undefined,
          season: Number(leg.season) || undefined,
          gameDate: leg.gameDate || new Date().toISOString(),
          status: 'pending',
          source: 'manual',
        });
      }

      toast.success(`${valid.length} leg${valid.length > 1 ? 's' : ''} added`, {
        style: { background: '#0f1115', border: '1px solid rgba(255,215,0,0.2)', color: '#FFD700' },
      });
      
      setLegs([{ ...BLANK_LEG }]);
      onClose();
    } catch (err: any) {
      toast.error('Failed to save', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const INPUT = 'w-full bg-black/40 border border-white/[0.08] text-white text-sm rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-[#FFD700]/30 transition-all placeholder:text-zinc-700';
  const LABEL = 'text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1 block';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-[#0f1115] border border-white/[0.1] rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-[0_0_50px_-12px_rgba(255,215,0,0.15)] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/[0.05] bg-white/[0.01]">
          <div>
            <h2 className="text-white font-black text-xl italic uppercase tracking-tighter flex items-center gap-2">
              <Hash className="h-5 w-5 text-[#FFD700]" /> Manual <span className="text-[#FFD700]">Entry</span>
            </h2>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Legs Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 custom-scrollbar">
          {legs.map((leg, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-5 space-y-4 relative group hover:border-white/[0.1] transition-colors">
              {legs.length > 1 && (
                <button onClick={() => removeLeg(i)}
                  className="absolute top-4 right-4 text-zinc-700 hover:text-red-500 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}

              <div className="flex items-center gap-2">
                <span className="text-[#FFD700] text-[9px] font-black bg-[#FFD700]/10 px-2 py-0.5 rounded italic">
                  LEG {i + 1}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Player Name</label>
                  <input value={leg.player} onChange={e => updateLeg(i, { player: e.target.value })}
                    placeholder="e.g. Patrick Mahomes" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Market / Prop</label>
                  <input value={leg.prop} onChange={e => updateLeg(i, { prop: e.target.value })}
                    placeholder="e.g. Passing TDs" className={INPUT} />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className={LABEL}>Line</label>
                  <input type="number" step="0.5" value={leg.line} onChange={e => updateLeg(i, { line: e.target.value })}
                    placeholder="1.5" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Selection</label>
                  <select value={leg.selection} onChange={e => updateLeg(i, { selection: e.target.value as 'Over' | 'Under' })}
                    className={INPUT}>
                    <option value="Over">Over</option>
                    <option value="Under">Under</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Odds (Whole #)</label>
                  <input type="number" value={leg.odds} onChange={e => updateLeg(i, { odds: e.target.value })}
                    placeholder="-110" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Week</label>
                  <input type="number" value={leg.week} onChange={e => updateLeg(i, { week: e.target.value })}
                    className={INPUT} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={LABEL}>Team (Code)</label>
                  <input value={leg.team} onChange={e => updateLeg(i, { team: e.target.value })}
                    placeholder="KC" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Matchup</label>
                  <input value={leg.matchup} onChange={e => updateLeg(i, { matchup: e.target.value })}
                    placeholder="KC @ LV" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Game Date</label>
                  <input type="date" value={leg.gameDate} onChange={e => updateLeg(i, { gameDate: e.target.value })}
                    className={`${INPUT} [color-scheme:dark]`} />
                </div>
              </div>
            </div>
          ))}

          <button onClick={addBlankLeg}
            className="w-full flex items-center justify-center gap-2 py-4 border border-dashed border-white/[0.1]
              hover:bg-white/[0.02] hover:border-[#FFD700]/30 text-zinc-500 hover:text-[#FFD700] rounded-3xl text-[10px] font-black uppercase tracking-widest
              transition-all">
            <Plus className="h-4 w-4" /> Add Another Leg
          </button>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-white/[0.05] flex gap-4 bg-white/[0.01]">
          <button onClick={onClose}
            className="px-6 py-3 text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#FFD700] hover:bg-white
              disabled:opacity-50 text-black font-black italic uppercase text-sm rounded-2xl transition-all shadow-lg shadow-[#FFD700]/10">
            {saving
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Storing Data…</>
              : <><Save className="h-4 w-4" /> Add to Parlay & Archive</>}
          </button>
        </div>
      </div>
    </div>
  );
}