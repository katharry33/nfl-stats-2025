'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, Trash2, TrendingUp, DollarSign, Calendar, Loader2, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { Bet } from '@/lib/types';
import { toDecimal, toAmerican } from '@/lib/utils/odds';
import { getWeekFromDate } from '@/lib/utils/nfl-week';

interface EditBetModalProps {
  bet: Bet; 
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>; // Added for full CRUD support
  userId?: string; // Add this line
  mode?: 'archive' | 'active';
}

const INPUT = 'w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground font-mono text-sm outline-none focus:ring-1 focus:ring-primary/30';
const SELECT = 'w-full bg-secondary border border-border rounded-xl px-4 py-3 text-foreground text-sm outline-none focus:ring-1 focus:ring-primary/30';

function calcParlayOdds(legs: any[]): number {
  if (!legs?.length) return 0;
  // logic to calculate odds...
  return 0; // replace with actual logic
}


// ... constants (LEG_STATUSES, INPUT, SELECT remains same)

export function EditBetModal({ bet, isOpen, onClose, onSave, onDelete, mode = 'active' }: EditBetModalProps) {
  const [formData, setFormData] = useState<any>(bet);
  const [legs, setLegs] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [oddsManual, setOddsManual] = useState(false);
  
  const isArchive = mode === 'archive';

  // Sync state when bet changes
  useEffect(() => {
    if (bet) {
      setFormData({ ...bet });
      setLegs(Array.isArray(bet.legs) ? [...bet.legs] : []);
      setOddsManual(false);
    }
  }, [bet, isOpen]);

  // Auto-calculate Parlay Odds
  useEffect(() => {
    if (legs.length > 1 && !oddsManual) {
      const calc = calcParlayOdds(legs);
      if (calc !== 0) setFormData((prev: any) => ({ ...prev, odds: calc }));
    }
  }, [legs, oddsManual]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // Merge current legs state into the final submission
      await onSave({ 
        ...formData, 
        legs: legs,
        updatedAt: new Date().toISOString() 
      });
      onClose();
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !bet.id || isDeleting) return;
    if (!confirm("Are you sure you want to delete this bet?")) return;
    
    setIsDeleting(true);
    try {
      await onDelete(bet.id);
      onClose();
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !bet) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isArchive ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-tight">
                {isArchive ? 'Archive Entry' : 'Edit Wager'}
              </h2>
              <p className="text-[10px] text-muted-foreground font-mono">{bet.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Status Select */}
          <div className="space-y-2">
             <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Wager Status</label>
             <select 
                value={formData.status} 
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className={SELECT}
             >
                <option value="pending">Pending</option>
                <option value="win">Win</option>
                <option value="loss">Loss</option>
                <option value="push">Push</option>
                <option value="cashed">Cashed Out</option>
             </select>
          </div>

          {/* Main Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Odds
              </label>
              <input 
                type="number" 
                value={formData.odds ?? ''}
                onChange={e => { setFormData({ ...formData, odds: Number(e.target.value) }); setOddsManual(true); }}
                className={INPUT} 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Stake ($)
              </label>
              <input 
                type="number" 
                value={formData.stake ?? ''}
                onChange={e => setFormData({ ...formData, stake: Number(e.target.value) })} 
                className={INPUT} 
              />
            </div>
          </div>

          {/* Logic for Legs would go here if you want them editable in the modal */}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          {onDelete && (
            <button 
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="p-3 rounded-xl bg-loss/10 text-loss hover:bg-loss/20 transition-colors disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          )}
          
          <div className="flex-1 flex gap-3">
            <button 
              onClick={onClose} 
              className="flex-1 px-4 py-3 rounded-xl bg-secondary text-xs font-bold hover:bg-secondary/80 transition-colors"
            >
              CANCEL
            </button>
            <button 
              onClick={handleSave} 
              disabled={isSaving || isDeleting}
              className={`flex-1 px-4 py-3 rounded-xl text-xs font-bold text-white transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2 ${
                  isArchive ? 'bg-blue-600 hover:bg-blue-500' : 'bg-orange-600 hover:bg-orange-500'
              } disabled:opacity-50`}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
