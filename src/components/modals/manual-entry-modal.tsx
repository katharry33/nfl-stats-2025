'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLeg: (leg: any) => void;
  activeLeague: 'nba' | 'nfl';
}

export function ManualEntryModal({ isOpen, onClose, onAddLeg, activeLeague }: ManualEntryModalProps) {
  const BLANK_LEG = {
    player: '', prop: '', line: '', selection: 'Over', odds: '-110', 
    team: '', matchup: '', week: '22', gameDate: new Date().toISOString().split('T')[0]
  };

  const [legs, setLegs] = useState([BLANK_LEG]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setLegs([{ ...BLANK_LEG }]);
  }, [isOpen]);

  if (!isOpen) return null;

  const updateLeg = (i: number, up: any) => {
    setLegs(prev => prev.map((l, idx) => idx === i ? { ...l, ...up } : l));
  };

  const handleSave = async () => {
    const valid = legs.filter(l => l.player.trim() && l.prop.trim());
    if (!valid.length) return toast.error('Required fields: Player & Prop');
    
    setSaving(true);
    try {
      for (const leg of valid) {
        onAddLeg({
          ...leg,
          id: `${Date.now()}-${Math.random()}`,
          source: 'manual',
          league: activeLeague,
          week: activeLeague === 'nfl' ? Number(leg.week) : undefined,
          line: Number(leg.line),
          odds: Number(leg.odds)
        });
      }
      toast.success('Manual entries saved');
      onClose();
    } catch (e) {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const INPUT = "w-full bg-[#080808] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none transition-all";
  const LABEL = "text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-2 block";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#141414] border border-white/5 rounded-[32px] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="p-8 border-b border-white/5 flex justify-between items-center">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Manual <span className="text-indigo-500">Entry</span></h2>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors"><X /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {legs.map((leg, i) => (
            <div key={i} className="bg-black/40 border border-white/5 rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={LABEL}>Player</label><input className={INPUT} value={leg.player} onChange={e => updateLeg(i, {player: e.target.value})} /></div>
                <div><label className={LABEL}>Prop</label><input className={INPUT} value={leg.prop} onChange={e => updateLeg(i, {prop: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={LABEL}>Line</label><input className={INPUT} type="number" value={leg.line} onChange={e => updateLeg(i, {line: e.target.value})} /></div>
                <div><label className={LABEL}>Selection</label><select className={INPUT} value={leg.selection} onChange={e => updateLeg(i, {selection: e.target.value})}><option>Over</option><option>Under</option></select></div>
                <div><label className={LABEL}>Odds</label><input className={INPUT} type="number" value={leg.odds} onChange={e => updateLeg(i, {odds: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={LABEL}>Matchup</label><input className={INPUT} placeholder="MIA @ BUF" value={leg.matchup} onChange={e => updateLeg(i, {matchup: e.target.value})} /></div>
                {activeLeague === 'nfl' ? (
                  <div><label className={LABEL}>Week</label><input className={INPUT} type="number" value={leg.week} onChange={e => updateLeg(i, {week: e.target.value})} /></div>
                ) : (
                  <div><label className={LABEL}>Game Date</label><input className={INPUT} type="date" value={leg.gameDate} onChange={e => updateLeg(i, {gameDate: e.target.value})} /></div>
                )}
              </div>
            </div>
          ))}
          <button onClick={() => setLegs([...legs, BLANK_LEG])} className="w-full py-4 border border-dashed border-white/10 rounded-2xl text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-all">+ Add Another Leg</button>
        </div>

        <div className="p-8 border-t border-white/5 bg-black/20 flex gap-4">
          <button onClick={onClose} className="px-8 py-4 text-[10px] font-black uppercase text-zinc-500">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest py-4 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="animate-spin" /> : <Save size={16} />} Save Records
          </button>
        </div>
      </div>
    </div>
  );
}