'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calculator } from 'lucide-react';
import { calculatePayout } from '@/components/bets/bets-table';

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
      const rawDate = bet.manualDate || bet.date || bet.createdAt;
      
      if (rawDate) {
        const d = rawDate._seconds 
          ? new Date(rawDate._seconds * 1000) 
          : rawDate.seconds
            ? new Date(rawDate.seconds * 1000)
            : new Date(rawDate);
        
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
        boostPercentage: bet.boostPercentage || bet.boost || 0,
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
        boostPercentage: Number(formData.boostPercentage),
        boost: Number(formData.boostPercentage) > 0,
        legs: formData.legs,
        manualDate: formData.date,
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
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-200 sm:max-w-[650px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-center pr-6">
            <DialogTitle className="text-xl font-bold text-white">Edit Bet</DialogTitle>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <Calculator className="h-3 w-3 text-emerald-500" />
              <span className="text-xs font-mono text-emerald-400 font-bold">
                Payout: ${previewPayout.toFixed(2)}
              </span>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-4">
          <div className="grid gap-6 py-4">
            {/* Game Date */}
            <div className="space-y-2">
              <Label className="text-emerald-500 font-bold text-xs uppercase">Game Date</Label>
              <Input 
                type="date" 
                className="bg-slate-900 border-slate-700 focus:border-emerald-500 text-white" 
                value={formData.date} 
                onChange={(e) => setFormData({...formData, date: e.target.value})} 
              />
            </div>

            {/* Stake and Odds */}
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
                <Label className="text-slate-400 text-xs uppercase">Total Odds (+/-)</Label>
                <Input 
                  type="number" 
                  className="bg-slate-900 border-slate-800 font-mono font-bold text-emerald-400" 
                  value={formData.odds} 
                  onChange={(e) => setFormData({...formData, odds: e.target.value})} 
                  placeholder="e.g. +150 or -110"
                />
              </div>
            </div>

            {/* Status and Boost */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-400 text-xs uppercase">Status</Label>
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

              <div className="space-y-2">
                <Label className="text-slate-400 text-xs uppercase">Boost %</Label>
                <Input 
                  type="number" 
                  step="1"
                  min="0"
                  max="100"
                  placeholder="0"
                  className="bg-slate-900 border-slate-800" 
                  value={formData.boostPercentage} 
                  onChange={(e) => setFormData({...formData, boostPercentage: e.target.value})} 
                />
              </div>
            </div>

            {/* Bonus Bet Checkbox */}
            <div className="flex items-center space-x-3 p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
              <Checkbox 
                id="isBonus" 
                checked={formData.isBonus}
                onCheckedChange={(checked) => setFormData({...formData, isBonus: !!checked})}
                className="border-slate-600 data-[state=checked]:bg-purple-600"
              />
              <div className="grid gap-1.5 leading-none">
                <label htmlFor="isBonus" className="text-sm font-bold text-slate-200 cursor-pointer">
                  Bonus Bet
                </label>
                <p className="text-[10px] text-slate-500 uppercase">Profit only (Stake not returned)</p>
              </div>
            </div>

            {/* Legs Section */}
            {formData.legs.length > 0 && (
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest">
                    Bet Legs ({formData.legs.length})
                  </h3>
                </div>

                {formData.legs.map((leg: any, index: number) => (
                  <div key={index} className="p-4 bg-slate-900/30 border border-slate-800 rounded-lg space-y-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-white text-sm">{leg.player}</p>
                        <p className="text-xs text-slate-400">{leg.team}</p>
                        <p className="text-xs text-slate-500 font-mono">{leg.matchup}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Prop</Label>
                        <p className="text-sm text-slate-300">{leg.prop}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-500">Line</Label>
                        <p className="text-sm text-emerald-400 font-bold">{leg.line}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-400 uppercase">Selection</Label>
                        <Select 
                          value={leg.selection || 'Over'} 
                          onValueChange={(v) => updateLeg(index, 'selection', v)}
                        >
                          <SelectTrigger className="bg-slate-950 border-slate-800 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800">
                            <SelectItem value="Over">Over</SelectItem>
                            <SelectItem value="Under">Under</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-slate-400 uppercase">Leg Status</Label>
                        <Select 
                          value={leg.status || 'pending'} 
                          onValueChange={(v) => updateLeg(index, 'status', v)}
                        >
                          <SelectTrigger className="bg-slate-950 border-slate-800 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800">
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="won">Won</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-slate-400 uppercase">Leg Odds</Label>
                      <Input 
                        type="number"
                        className="bg-slate-950 border-slate-800 h-9 font-mono" 
                        value={leg.odds || -110}
                        onChange={(e) => updateLeg(index, 'odds', Number(e.target.value))}
                        placeholder="-110"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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