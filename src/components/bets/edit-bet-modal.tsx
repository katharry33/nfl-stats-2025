'use client';
import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, TrendingUp, DollarSign, Calendar, Loader2, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';
import type { Bet } from '@/lib/types';
import { toDecimal, toAmerican } from '@/lib/utils/odds';
import { getWeekFromDate } from '@/lib/utils/nfl-week';

interface EditBetModalProps {
  bet: Bet; isOpen: boolean; userId?: string;
  onClose: () => void; onSave?: (updated: Bet) => Promise<void>; onDelete?: (id: string) => void;
}

const LEG_STATUSES = [
  { value: 'won',     label: 'Win',     icon: CheckCircle2, cls: 'bg-profit/10 text-profit border-profit/30' },
  { value: 'lost',    label: 'Loss',    icon: XCircle,      cls: 'bg-loss/10 text-loss border-loss/30' },
  { value: 'pending', label: 'Pending', icon: Clock,        cls: 'bg-primary/10 text-primary border-primary/30' },
  { value: 'void',    label: 'Void',    icon: XCircle,      cls: 'bg-secondary text-muted-foreground border-border' },
];

function calcParlayOdds(legs: any[]): number {
  if (!legs?.length) return 0;
  const dec = legs.reduce((acc, leg) => {
    if (leg.status === 'void') return acc;
    return acc * toDecimal(Number(leg.odds) || -110);
  }, 1);
  return dec > 1 ? Math.round(toAmerican(dec)) : 0;
}

const INPUT = 'w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground font-mono text-sm outline-none focus:ring-1 focus:ring-primary/30';
const SELECT = 'w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm outline-none focus:ring-1 focus:ring-primary/30';

export function EditBetModal({ bet, isOpen, userId, onClose, onSave, onDelete }: EditBetModalProps) {
  const [formData,      setFormData]      = useState<any>(bet);
  const [legs,          setLegs]          = useState<any[]>([]);
  const [deletedLegIds, setDeletedLegIds] = useState<string[]>([]);
  const [isSaving,      setIsSaving]      = useState(false);
  const [isDeleting,    setIsDeleting]    = useState(false);
  const [legsExpanded,  setLegsExpanded]  = useState(true);
  const [oddsManual,    setOddsManual]    = useState(false);

  useEffect(() => {
    setFormData(bet);
    setLegs(Array.isArray((bet as any).legs) ? [...(bet as any).legs] : []);
    setDeletedLegIds([]);
    setOddsManual(false);
    setLegsExpanded(true);
  }, [bet]);

  useEffect(() => {
    if (legs.length > 1 && !oddsManual) {
      const calc = calcParlayOdds(legs);
      if (calc !== 0) setFormData((prev: any) => ({ ...prev, odds: calc }));
    }
  }, [legs, oddsManual]);

  const set = (fields: any) => setFormData((prev: any) => ({ ...prev, ...fields }));

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) { set({ gameDate: null }); return; }
    const year = parseInt(val.split('-')[0]);
    if (year < 2000 || year > 2100) return;
    const newDate = new Date(`${val}T12:00:00.000Z`);
    if (isNaN(newDate.getTime())) return;
    set({ gameDate: newDate.toISOString(), week: getWeekFromDate(val) ?? formData.week, season: newDate.getUTCFullYear() });
  };

  const handleLegChange = (index: number, fields: any) =>
    setLegs(prev => prev.map((leg, i) => i === index ? { ...leg, ...fields } : leg));

  const handleDeleteLeg = (index: number) => {
    const leg = legs[index];
    if (leg?.id) setDeletedLegIds(prev => [...prev, leg.id]);
    setLegs(prev => prev.filter((_, i) => i !== index));
  };

  const calcPayout = () => {
    if (formData.status === 'cashed') return Number(formData.payout) || 0;
    const stake = Number(formData.stake) || 0;
    const odds  = Number(formData.odds)  || 0;
    const boost = Number(String(formData.boost ?? '').replace('%', '')) || 0;
    if (!stake || !odds) return 0;
    const dec = toDecimal(odds);
    const raw = stake * dec * (1 + boost / 100);
    return formData.isBonusBet ? raw - stake : raw;
  };

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try { await onSave({ ...formData, userId, legs, deletedLegIds } as Bet); onClose(); }
    catch {} finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!bet.id || !onDelete) return;
    setIsDeleting(true);
    try { await onDelete(bet.id); onClose(); } finally { setIsDeleting(false); }
  };

  if (!isOpen) return null;

  const payout   = calcPayout();
  const isParlay = legs.length > 1;

  return (
    <div className="fixed inset-0 'z-100' flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
      <div className="bg-card border border-border w-full max-w-lg rounded-2xl overflow-hidden shadow-xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div>
            <h2 className="text-foreground font-semibold text-lg">Edit Bet</h2>
            <p className="text-muted-foreground text-[10px] font-mono mt-0.5">ID: {bet.id?.slice(-8)}</p>
          </div>
          <button onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Odds
                {isParlay && !oddsManual && <span className="text-[8px] text-primary/60 ml-1">(auto)</span>}
              </label>
              <input type="number" value={formData.odds ?? ''}
                onChange={e => { set({ odds: Number(e.target.value) }); setOddsManual(true); }}
                className={INPUT} />
              {isParlay && oddsManual && (
                <button onClick={() => setOddsManual(false)}
                  className="text-[10px] text-muted-foreground hover:text-primary transition-colors">
                  ↺ Use calculated odds
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Stake ($)
              </label>
              <input type="number" value={formData.stake ?? ''}
                onChange={e => set({ stake: Number(e.target.value) })} className={INPUT} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                <Zap className="h-3 w-3 text-primary" /> Boost %
              </label>
              <select value={formData.boost ?? ''} onChange={e => set({ boost: e.target.value })} className={SELECT}>
                <option value="">None</option>
                {[5,10,15,20,25,30,33,35,40,50,100].map(p => (
                  <option key={p} value={String(p)}>{p}%</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">NFL Week</label>
              <input type="number" min={1} max={22} value={formData.week ?? ''}
                onChange={e => set({ week: e.target.value })} placeholder="1–22" className={INPUT} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Game Date
              </label>
              <input type="date"
                value={typeof formData.gameDate === 'string' ? formData.gameDate.split('T')[0] : ''}
                onChange={handleDateChange}
                className={`${INPUT} 'scheme-light`} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Status</label>
              <select value={formData.status ?? 'pending'}
                onChange={e => set({ status: e.target.value, payout: e.target.value === 'cashed' ? formData.payout : null })}
                className={SELECT}>
                <option value="pending">Pending</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="void">Void</option>
                <option value="cashed">Cashed Out</option>
              </select>
            </div>
          </div>

          {formData.status === 'cashed' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Cashed Out Amount
              </label>
              <input type="number" value={formData.payout ?? ''}
                onChange={e => set({ payout: Number(e.target.value) })} className={INPUT} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'isBonusBet',    label: 'Bonus Bet'    },
              { key: 'isGhostParlay', label: 'Ghost Parlay' },
            ].map(f => (
              <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData[f.key] ?? false}
                  onChange={e => set({ [f.key]: e.target.checked })}
                  className="h-4 w-4 rounded border-border accent-primary" />
                <span className="text-sm text-foreground">{f.label}</span>
              </label>
            ))}
          </div>

          {/* Legs */}
          {legs.length > 0 && (
            <div className="space-y-2">
              <button onClick={() => setLegsExpanded(p => !p)}
                className="w-full flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors">
                <span>Legs ({legs.length})</span>
                {legsExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {legsExpanded && (
                <div className="space-y-2">
                  {legs.map((leg, i) => (
                    <div key={leg.id || i} className="bg-secondary border border-border rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-bold text-primary flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-foreground font-semibold text-xs truncate">{leg.player || '—'}</p>
                          <p className="text-muted-foreground text-[10px] font-mono">{leg.prop}</p>
                        </div>
                        <button onClick={() => handleDeleteLeg(i)}
                          className="p-1.5 text-muted-foreground hover:text-loss hover:bg-loss/10 rounded-lg transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground font-semibold">Line</span>
                          <input type="number" step="0.5" value={leg.line ?? ''}
                            onChange={e => handleLegChange(i, { line: parseFloat(e.target.value) || 0 })}
                            className="w-16 bg-card border border-border text-foreground font-mono text-xs rounded-lg px-2 py-1.5 text-center outline-none focus:ring-1 focus:ring-primary/30" />
                        </div>
                        <div className="flex rounded-lg overflow-hidden border border-border">
                          {(['Over','Under'] as const).map(s => (
                            <button key={s} onClick={() => handleLegChange(i, { selection: s })}
                              className={`px-3 py-1.5 text-[10px] font-semibold uppercase transition-colors ${
                                leg.selection === s
                                  ? s === 'Over' ? 'bg-edge text-white' : 'bg-loss text-white'
                                  : 'bg-card text-muted-foreground hover:bg-secondary'
                              }`}>{s}</button>
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5 ml-auto">
                          <span className="text-[10px] text-muted-foreground font-semibold">Odds</span>
                          <input type="number" value={leg.odds ?? ''}
                            onChange={e => handleLegChange(i, { odds: parseInt(e.target.value) || -110 })}
                            className="w-20 bg-card border border-border text-foreground font-mono text-xs rounded-lg px-2 py-1.5 text-center outline-none focus:ring-1 focus:ring-primary/30" />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground font-semibold w-10">Result</span>
                        {LEG_STATUSES.map(r => {
                          const Icon = r.icon;
                          const active = (leg.status || 'pending') === r.value;
                          return (
                            <button key={r.value} onClick={() => handleLegChange(i, { status: r.value })}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-semibold uppercase transition-all ${
                                active ? r.cls : 'border-border text-muted-foreground hover:border-primary/30'
                              }`}>
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

          {/* Payout preview */}
          <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 flex justify-between items-center">
            <span className="text-[11px] text-muted-foreground font-semibold uppercase">Potential Payout</span>
            <span className="text-xl font-bold font-mono text-primary">${payout.toFixed(2)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6 pt-2 border-t border-border shrink-0">
          <button onClick={handleDelete} disabled={isDeleting}
            className="px-4 py-3 rounded-xl border border-loss/25 text-loss hover:bg-loss/5 transition-all disabled:opacity-50">
            {isDeleting ? <Loader2 className="animate-spin h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
          </button>
          <button onClick={handleSave} disabled={isSaving}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50">
            {isSaving ? <><Loader2 className="animate-spin h-4 w-4" />Saving…</> : <><Save className="h-4 w-4" />Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}