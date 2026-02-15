'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Trash2, Calculator } from 'lucide-react';
import { calculatePayout } from './bets-table'; // Ensure this path is correct

interface EditBetModalProps {
  bet: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: any) => Promise<void>;
}

export const EditBetModal = ({ bet, isOpen, onClose, onSave }: EditBetModalProps) => {
  const [formData, setFormData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (bet && isOpen) {
      let displayDate = '';
      const rawDate = bet.manualDate || bet.createdAt || bet.date;
      
      if (rawDate) {
        // Handle Firestore Timestamp vs Date String
        const d = rawDate.seconds ? new Date(rawDate.seconds * 1000) : new Date(rawDate);
        if (!isNaN(d.getTime())) {
          displayDate = d.toISOString().split('T')[0];
        }
      }

      setFormData({
        status: (bet.status || bet.result || 'pending').toLowerCase(),
        stake: bet.stake || 0,
        odds: typeof bet.odds === 'string' 
          ? parseFloat(bet.odds.replace(/[^0-9.-]/g, '')) 
          : (bet.odds || 0),
        date: displayDate,
        isBonus: !!bet.isBonus,
        legs: Array.isArray(bet.legs) ? [...bet.legs] : [],
      });
    } else {
      setFormData(null);
    }
  }, [bet, isOpen]);

  const previewPayout = useMemo(() => {
    if (!formData) return 0;
    return calculatePayout(formData.stake, formData.odds, formData.isBonus);
  }, [formData]);

  // CRITICAL FIX: Guard against null formData before rendering any UI
  if (!isOpen || !formData) return null;

  const handleLocalSave = async () => {
    if (!bet || !formData) return;
    setIsSaving(true);
    
    try {
      const submissionData = {
        status: formData.status.toLowerCase(),
        stake: Number(formData.stake),
        odds: Number(formData.odds),
        isBonus: formData.isBonus,
        legs: formData.legs,
        manualDate: formData.date, // API will convert this string to Timestamp
      };

      await onSave(bet.id, submissionData);
      onClose();
    } catch (e) {
      console.error("Save Error:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const updateLeg = (index: number, field: string, value: any) => {
    const updatedLegs = [...formData.legs];
    updatedLegs[index] = { ...updatedLegs[index], [field]: value };
    setFormData({ ...formData, legs: updatedLegs });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-200 sm:max-w-[550px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-center pr-6">
            <DialogTitle className="text-xl font-bold text-white">Edit Bet Record</DialogTitle>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <Calculator className="h-3 w-3 text-emerald-500" />
              <span className="text-xs font-mono text-emerald-400 font-bold">
                Potential Payout: ${previewPayout.toFixed(2)}
              </span>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4">
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-emerald-500 font-bold text-xs uppercase">Date</Label>
                <Input 
                  type="date" 
                  className="bg-slate-900 border-slate-700 focus:border-emerald-500 text-white" 
                  value={formData.date} 
                  onChange={(e) => setFormData({...formData, date: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400 text-xs uppercase">Result</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger className="bg-slate-900 border-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="void">Void</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-400 text-xs uppercase">Stake ($)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  className="bg-slate-900 border-slate-800" 
                  value={formData.stake} 
                  onChange={(e) => setFormData({...formData, stake: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400 text-xs uppercase">Total Odds</Label>
                <Input 
                  type="number" 
                  className="bg-slate-900 border-slate-800" 
                  value={formData.odds} 
                  onChange={(e) => setFormData({...formData, odds: e.target.value})} 
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
              <Checkbox 
                id="isBonus" 
                checked={formData.isBonus}
                onCheckedChange={(checked) => setFormData({...formData, isBonus: !!checked})}
                className="border-slate-600 data-[state=checked]:bg-purple-600"
              />
              <div className="grid gap-1.5 leading-none">
                <label htmlFor="isBonus" className="text-sm font-bold text-slate-200 cursor-pointer">
                  Bonus Bet Play
                </label>
                <p className="text-[10px] text-slate-500 uppercase">Profit only (Stake not returned)</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest">Legs</h3>
                <Button variant="outline" size="sm" onClick={() => {
                  setFormData({ ...formData, legs: [...formData.legs, { player: '', prop: '', selection: '', line: '', status: 'pending' }] });
                }} className="h-7 text-[10px] bg-slate-900 border-slate-700">
                  <PlusCircle className="mr-1 h-3 w-3" /> Add Leg
                </Button>
              </div>

              {formData.legs.map((leg: any, index: number) => (
                <div key={index} className="p-4 bg-slate-900/30 border border-slate-800 rounded-lg space-y-3 relative group">
                  <button 
                    onClick={() => {
                      const updated = formData.legs.filter((_: any, i: number) => i !== index);
                      setFormData({ ...formData, legs: updated });
                    }} 
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Player" className="h-8 bg-slate-950 text-sm border-slate-800" value={leg.player || ''} onChange={(e) => updateLeg(index, 'player', e.target.value)} />
                    <Input placeholder="Prop" className="h-8 bg-slate-950 text-sm border-slate-800" value={leg.prop || ''} onChange={(e) => updateLeg(index, 'prop', e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4 pt-4 border-t border-slate-800 gap-2">
          <Button variant="ghost" onClick={onClose} className="text-slate-400">Cancel</Button>
          <Button onClick={handleLocalSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};