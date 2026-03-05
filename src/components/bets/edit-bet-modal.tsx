'use client';
import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, TrendingUp, DollarSign, Calendar, Loader2, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';
import { Bet } from '@/lib/types';
import { toDecimal, toAmerican } from '@/lib/utils/odds';
import { toast } from 'sonner';
import { getWeekFromDate } from '@/lib/utils/nfl-week';

interface EditBetModalProps {
  bet: Bet;
  isOpen: boolean;
  userId?: string;
  onClose: () => void;
  onSave: (updated: Bet) => void;
  onDelete: (id: string) => void;
}

const LEG_STATUSES = [
  { value: 'won',     label: 'Win',     icon: CheckCircle2, cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  { value: 'lost',    label: 'Loss',    icon: XCircle,      cls: 'bg-red-500/20 text-red-400 border-red-500/40' },
  { value: 'pending', label: 'Pending', icon: Clock,        cls: 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30' },
  { value: 'void',    label: 'Void',    icon: XCircle,      cls: 'bg-white/[0.06] text-zinc-400 border-white/20' },
];

function calcParlayOdds(legs: any[]): number {
  if (!legs || legs.length === 0) return 0;
  const dec = legs.reduce((acc, leg) => {
    if (leg.status === 'void') return acc;
    return acc * toDecimal(Number(leg.odds) || -110);
  }, 1);
  return dec > 1 ? Math.round(toAmerican(dec)) : 0;
}

export function EditBetModal({ bet, isOpen, userId, onClose, onSave, onDelete }: EditBetModalProps) {
  const [formData, setFormData] = useState<any>(bet);
  const [legs, setLegs] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [legsExpanded, setLegsExpanded] = useState(true);
  const [oddsManual, setOddsManual] = useState(false);

  useEffect(() => {
    const initialLegs = Array.isArray((bet as any).legs) ? (bet as any).legs : [];
    setFormData(bet);
    setLegs(initialLegs);
    setOddsManual(false);
    setLegsExpanded(true);
  }, [bet]);

  // Auto-calc parlay odds from legs UNLESS user manually edited overall odds
  useEffect(() => {
    if (legs.length > 1 && !oddsManual) {
      const calc = calcParlayOdds(legs);
      if (calc !== 0) setFormData((prev: any) => ({ ...prev, odds: calc }));
    }
  }, [legs, oddsManual]);

  const set = (fields: any) => setFormData((prev: any) => ({ ...prev, ...fields }));

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const year = parseInt(val.split('-')[0]);
    if (year < 2000 || year > 2100) return;
    set({
      gameDate: val,
      week: getWeekFromDate(val) ?? formData.week,
      season: new Date(val).getFullYear(),
    });
  };

  const handleLegChange = (index: number, fields: any) => {
    setLegs(prev => prev.map((leg, i) => i === index ? { ...leg, ...fields } : leg));
  };

  const handleDeleteLeg = (index: number) => {
    setLegs(prev => prev.filter((_, i) => i !== index));
  };

  const calcPayout = () => {
    const stake = Number(formData.stake) || 0;
    const odds  = Number(formData.odds)  || 0;
    const boost = Number(formData.boost  || 0);
    if (!stake || !odds) return 0;
    const dec = toDecimal(odds);
    const raw = stake * dec * (1 + boost / 100);
    return formData.isBonusBet ? raw - stake : raw;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        id:            formData.id,
        userId,
        odds:          parseInt(String(formData.odds), 10) || 0,
        stake:         Number(formData.stake),
        status:        formData.status,
        week:          Number(formData.week),
        season:        Number(formData.season),
        gameDate:      formData.gameDate,
        boost:         formData.boost,
        isBonusBet:    formData.isBonusBet    ?? false,
        isGhostParlay: formData.isGhostParlay ?? false,
        type:          formData.type,
        legs,
      };

      const res = await fetch('/api/betting-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      onSave({ ...formData, legs, odds: payload.odds, stake: payload.stake, status: payload.status } as Bet);
      toast.success('Bet updated', {
        style: { background: '#0f1115', border: '1px solid rgba(255,215,0,0.2)', color: '#FFD700' },
      });
      onClose();
    } catch (err: any) {
      toast.error('Error saving bet', { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const payout = calcPayout();
  const isParlay = legs.length > 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="bg-[#0f1115] border border-white/10 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 shrink-0">
          <div>
            <h2 className="text-white font-black text-xl italic uppercase tracking-tighter">Edit Bet</h2>
            <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest">ID: {bet.id?.slice(-8)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Odds + Stake */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Overall Odds
                {isParlay && !oddsManual && (
                  <span className="text-[8px] text-[#FFD700]/50 font-mono ml-1">(AUTO)</span>
                )}
              </label>
              <input
                type="number"
                value={formData.odds ?? ''}
                onChange={e => { set({ odds: Number(e.target.value) }); setOddsManual(true); }}
                onFocus={() => setOddsManual(true)}
                className="w-full bg-black/40 border border-white/[0.08] rounded-2xl px-4 py-3 text-[#FFD700] font-mono text-sm outline-none focus:ring-1 focus:ring-[#FFD700]/40"
              />
              {isParlay && oddsManual && (
                <button
                  onClick={() => setOddsManual(false)}
                  className="text-[9px] text-zinc-600 hover:text-[#FFD700] transition-colors"
                >
                  ↺ Use calculated odds
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Stake ($)
              </label>
              <input
                type="number"
                value={formData.stake ?? ''}
                onChange={e => set({ stake: Number(e.target.value) })}
                className="w-full bg-black/40 border border-white/[0.08] rounded-2xl px-4 py-3 text-white font-mono text-sm outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>
          </div>

          {/* Boost + Week */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-1">
                <Zap className="h-3 w-3 text-[#FFD700]" /> Boost %
              </label>
              <select
                value={formData.boost ?? ''}
                onChange={e => set({ boost: e.target.value })}
                className="w-full bg-black/40 border border-white/[0.08] rounded-2xl px-4 py-3 text-white text-sm outline-none focus:ring-1 focus:ring-[#FFD700]/30"
              >
                <option value="">None</option>
                {[5,10,15,20,25,30,33,35,40,50,100].map(p => (
                  <option key={p} value={String(p)}>{p}%</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase">NFL Week</label>
              <input
                type="number" min={1} max={22}
                value={formData.week ?? ''}
                onChange={e => set({ week: e.target.value })}
                placeholder="1–22"
                className="w-full bg-black/40 border border-white/[0.08] rounded-2xl px-4 py-3 text-white font-mono text-sm outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>
          </div>

          {/* Game Date + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Game Date
              </label>
              <input
                type="date"
                value={typeof formData.gameDate === 'string' ? formData.gameDate.split('T')[0] : ''}
                onChange={handleDateChange}
                className="w-full bg-black/40 border border-white/[0.08] rounded-2xl px-4 py-3 text-white text-sm outline-none [color-scheme:dark]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase">Status</label>
              <select
                value={formData.status ?? 'pending'}
                onChange={e => set({ status: e.target.value })}
                className="w-full bg-black/40 border border-white/[0.08] rounded-2xl px-4 py-3 text-white text-sm outline-none"
              >
                <option value="pending">Pending</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="void">Void</option>
              </select>
            </div>
          </div>

          {/* Bonus Bet + Ghost Parlay */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isBonusBet ?? false}
                onChange={e => set({ isBonusBet: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-700 bg-black/40"
              />
              <span className="text-sm text-white">Bonus Bet</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isGhostParlay ?? false}
                onChange={e => set({ isGhostParlay: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-700 bg-black/40"
              />
              <span className="text-sm text-white">Ghost Parlay</span>
            </label>
          </div>

          {/* Legs */}
          {legs.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setLegsExpanded(p => !p)}
                className="w-full flex items-center justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-zinc-300 transition-colors"
              >
                <span>Legs ({legs.length})</span>
                {legsExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {legsExpanded && (
                <div className="space-y-2">
                  {legs.map((leg, i) => (
                    <div key={leg.id || i} className="bg-black/30 border border-white/[0.06] rounded-2xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/20 text-[9px] font-black text-[#FFD700] flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-black text-xs uppercase italic truncate">{leg.player || '—'}</p>
                          <p className="text-zinc-600 text-[10px] font-mono">{leg.prop}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteLeg(i)}
                          className="p-1.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-zinc-600 uppercase font-black">Line</span>
                          <input
                            type="number" step="0.5"
                            value={leg.line ?? ''}
                            onChange={e => handleLegChange(i, { line: parseFloat(e.target.value) || 0 })}
                            className="w-16 bg-black/40 border border-white/[0.08] text-white font-mono text-xs rounded-xl px-2 py-1.5 text-center outline-none focus:ring-1 focus:ring-[#FFD700]/30"
                          />
                        </div>

                        <div className="flex rounded-xl overflow-hidden border border-white/[0.08]">
                          {(['Over', 'Under'] as const).map(s => (
                            <button
                              key={s}
                              onClick={() => handleLegChange(i, { selection: s })}
                              className={`px-3 py-1.5 text-[10px] font-black uppercase transition-colors ${
                                leg.selection === s
                                  ? s === 'Over' ? 'bg-blue-600 text-white' : 'bg-orange-600 text-white'
                                  : 'bg-black/40 text-zinc-600 hover:bg-white/[0.04]'
                              }`}
                            >{s}</button>
                          ))}
                        </div>

                        <div className="flex items-center gap-1.5 ml-auto">
                          <span className="text-[9px] text-zinc-600 uppercase font-black">Odds</span>
                          <input
                            type="number"
                            value={leg.odds ?? ''}
                            onChange={e => handleLegChange(i, { odds: parseInt(e.target.value) || -110 })}
                            className="w-20 bg-black/40 border border-white/[0.08] text-white font-mono text-xs rounded-xl px-2 py-1.5 text-center outline-none focus:ring-1 focus:ring-[#FFD700]/30"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] text-zinc-600 uppercase font-black w-10">Result</span>
                        {LEG_STATUSES.map(r => {
                          const Icon = r.icon;
                          const active = (leg.status || 'pending') === r.value;
                          return (
                            <button
                              key={r.value}
                              onClick={() => handleLegChange(i, { status: r.value })}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-black uppercase transition-all ${
                                active ? r.cls : 'border-white/[0.08] text-zinc-600 hover:border-white/20 hover:text-zinc-400'
                              }`}
                            >
                              <Icon className="h-3 w-3" />{r.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Payout Preview */}
          <div className="bg-[#FFD700]/5 border border-[#FFD700]/10 rounded-2xl p-4 flex justify-between items-center">
            <span className="text-[10px] text-zinc-500 font-black uppercase italic">Potential Payout</span>
            <span className="text-xl font-black font-mono text-[#FFD700]">${payout.toFixed(2)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6 pt-2 border-t border-white/5 shrink-0">
          <button
            onClick={() => { if (confirm('Delete this bet?')) onDelete(bet.id); }}
            className="px-5 py-3.5 rounded-2xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-[#FFD700] hover:bg-[#e6c200] text-black font-black uppercase py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}