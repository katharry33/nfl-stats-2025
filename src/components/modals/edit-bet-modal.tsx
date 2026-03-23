'use client';
import React, { useState, useEffect } from 'react';
import { X, Save, Trash2, TrendingUp, DollarSign, Calendar, Loader2, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';
import type { Bet } from '@/lib/types';
import { toDecimal, toAmerican } from '@/lib/utils/odds';
import { getWeekFromDate } from '@/lib/utils/nfl-week';

interface EditBetModalProps {
  bet: any; 
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  mode?: 'archive' | 'active'; // Add this to distinguish
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

export function EditBetModal({ bet, isOpen, onClose, onSave, mode = 'active' }: EditBetModalProps) {
  const [formData,      setFormData]      = useState<any>(bet);
  const [legs,          setLegs]          = useState<any[]>([]);
  const [deletedLegIds, setDeletedLegIds] = useState<string[]>([]);
  const [isSaving,      setIsSaving]      = useState(false);
  const [isDeleting,    setIsDeleting]    = useState(false);
  const [legsExpanded,  setLegsExpanded]  = useState(true);
  const [oddsManual,    setOddsManual]    = useState(false);
  
  const isArchive = mode === 'archive';

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
    setIsSaving(true);
    try { await onSave({ ...formData, legs, deletedLegIds }); onClose(); }
    catch {} finally { setIsSaving(false); }
  };

  if (!isOpen) return null;

  const payout   = calcPayout();
  const isParlay = legs.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
      <div className="bg-card border border-border w-full max-w-lg rounded-2xl overflow-hidden shadow-xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
          <div className={`p-3 rounded-xl border ${isArchive ? 'bg-blue-500/10 border-blue-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
            <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${isArchive ? 'bg-blue-500' : 'bg-orange-500'}`} />
              {isArchive ? 'Editing Historical Archive' : 'Editing Active Bet'}
            </h2>
            <p className="text-[10px] text-muted-foreground mt-1">
              {isArchive 
                ? 'Changes here will update the master prop database for this season.'
                : 'Changes here only affect this specific wager in your log.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {isArchive && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Manual Result</label>
                <div className="flex gap-2">
                  {['won', 'lost', 'pending'].map((res) => (
                    <button
                      key={res}
                      onClick={() => setFormData({ ...formData, actualResult: res })}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase border transition-all ${
                        formData.actualResult === res 
                          ? 'bg-foreground text-background border-foreground' 
                          : 'bg-secondary/50 border-transparent text-muted-foreground'
                      }`}>
                      {res}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6 pt-2 border-t border-border shrink-0">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl bg-secondary text-xs font-bold">
            CANCEL
          </button>
          <button 
            onClick={() => onSave(formData)} 
            className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold ${
                isArchive ? 'bg-blue-600 hover:bg-blue-500' : 'bg-orange-600 hover:bg-orange-500'
            } text-white transition-colors`}
          >
            SAVE CHANGES
          </button>
        </div>
      </div>
    </div>
  );
}
