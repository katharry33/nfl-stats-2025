'use client';

import React, { useState } from 'react';
import { X, Plus, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getWeekFromDate } from '@/lib/utils/nfl-week';

interface ManualLeg {
  player: string; prop: string; line: string;
  selection: 'Over' | 'Under'; odds: string;
  team: string; matchup: string; week: string;
  gameDate: string; season: string;
}

const BLANK_LEG: ManualLeg = {
  player: '', prop: '', line: '', selection: 'Over',
  odds: '-110', team: '', matchup: '', week: '', gameDate: '', season: '',
};

interface ManualEntryModalProps {
  isOpen:   boolean;
  onClose:  () => void;
  onAddLeg: (leg: any) => void;
}

export function ManualEntryModal({ isOpen, onClose, onAddLeg }: ManualEntryModalProps) {
  const [legs,   setLegs]   = useState<ManualLeg[]>([{ ...BLANK_LEG }]);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const updateLeg = (i: number, up: Partial<ManualLeg>) => {
    setLegs(prev => prev.map((l, idx) => {
      if (idx !== i) return l;
      const newLeg = { ...l, ...up };
      if (up.gameDate) {
        const derived = getWeekFromDate(up.gameDate);
        const yr      = new Date(up.gameDate).getFullYear();
        newLeg.week   = derived ? String(derived) : newLeg.week;
        newLeg.season = yr ? String(yr) : newLeg.season;
      }
      return newLeg;
    }));
  };

  const addBlankLeg = () => setLegs(prev => [...prev, { ...BLANK_LEG }]);
  const removeLeg   = (i: number) => setLegs(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    const valid = legs.filter(l => l.player.trim() && l.prop.trim());
    if (!valid.length) { toast.error('Add at least one leg with a player and prop.'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/all-props/save-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legs: valid }),
      });
      if (!res.ok) console.warn('allProps save warning:', await res.json().catch(() => ({})));

      for (const leg of valid) {
        const propId = `${leg.player}-${leg.prop}-${leg.line}-manual`.replace(/\s+/g, '-').toLowerCase();
        onAddLeg({
          id: propId, propId,
          player: leg.player.trim(), prop: leg.prop.trim(),
          line: Number(leg.line) || 0, selection: leg.selection,
          odds: Number(leg.odds) || -110,
          team: leg.team.trim().toUpperCase(), matchup: leg.matchup.trim(),
          week: Number(leg.week) || undefined, season: Number(leg.season) || undefined,
          gameDate: leg.gameDate || new Date().toISOString(),
          status: 'pending', source: 'manual',
        });
      }

      toast.success(`${valid.length} leg${valid.length > 1 ? 's' : ''} added to slip`);
      setLegs([{ ...BLANK_LEG }]);
      onClose();
    } catch (err: any) {
      toast.error('Failed to save', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const INPUT = 'w-full bg-background border border-border text-foreground text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/60';
  const LABEL = 'text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <h2 className="text-foreground font-semibold text-lg">Manual Entry</h2>
            <p className="text-muted-foreground text-[11px] mt-0.5">Props saved to database for future search</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Legs */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {legs.map((leg, i) => (
            <div key={i} className="bg-secondary border border-border rounded-xl p-4 space-y-3 relative group">
              {legs.length > 1 && (
                <button onClick={() => removeLeg(i)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-loss hover:bg-loss/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="h-3 w-3" />
                </button>
              )}

              <span className="text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                LEG {i + 1}
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Player *</label>
                  <input value={leg.player} onChange={e => updateLeg(i, { player: e.target.value })}
                    placeholder="e.g. Tyreek Hill" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Prop *</label>
                  <input value={leg.prop} onChange={e => updateLeg(i, { prop: e.target.value })}
                    placeholder="e.g. Rec Yards" className={INPUT} />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className={LABEL}>Line</label>
                  <input type="number" value={leg.line} onChange={e => updateLeg(i, { line: e.target.value })}
                    placeholder="74.5" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>O/U</label>
                  <select value={leg.selection} onChange={e => updateLeg(i, { selection: e.target.value as 'Over' | 'Under' })}
                    className={INPUT}>
                    <option value="Over">Over</option>
                    <option value="Under">Under</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Odds</label>
                  <input type="number" value={leg.odds} onChange={e => updateLeg(i, { odds: e.target.value })}
                    placeholder="-110" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Week</label>
                  <input type="number" min={1} max={22} value={leg.week}
                    onChange={e => updateLeg(i, { week: e.target.value })}
                    placeholder="1-22" className={INPUT} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={LABEL}>Team</label>
                  <input value={leg.team} onChange={e => updateLeg(i, { team: e.target.value })}
                    placeholder="MIA" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Matchup</label>
                  <input value={leg.matchup} onChange={e => updateLeg(i, { matchup: e.target.value })}
                    placeholder="MIA @ BUF" className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Game Date</label>
                  <input type="date" value={leg.gameDate} onChange={e => updateLeg(i, { gameDate: e.target.value })}
                    className={`${INPUT} [color-scheme:light]`} />
                </div>
              </div>
            </div>
          ))}

          <button onClick={addBlankLeg}
            className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border hover:border-primary/40 text-muted-foreground hover:text-primary rounded-xl text-xs font-medium transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add Another Leg
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex gap-3 shrink-0">
          <button onClick={onClose}
            className="px-5 py-2.5 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold uppercase transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold text-sm rounded-lg transition-colors">
            {saving
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              : <><Save className="h-4 w-4" /> Add to Slip &amp; Save</>}
          </button>
        </div>
      </div>
    </div>
  );
}