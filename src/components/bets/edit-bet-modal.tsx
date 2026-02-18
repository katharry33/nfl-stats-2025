'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function EditBetModal({ bet, isOpen, onClose, onSave }: any) {
  const [status, setStatus] = useState('');
  const [stake, setStake] = useState('');

  useEffect(() => {
    if (bet) {
      setStatus(bet.status || 'pending');
      setStake(bet.stake?.toString() || '0');
    }
  }, [bet]);

  const handleSave = () => {
    onSave({
      id: bet.id,
      parlayid: bet.parlayid || null, // Pass this to the API
      status,
      stake: parseFloat(stake)
    });
    onClose();
  };

  if (!bet) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle>Edit Bet Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Information Section */}
          <div className={`p-3 rounded-lg border ${status === 'won' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-800/50 border-slate-700'}`}>
            <p className="text-xs text-slate-400 uppercase font-bold">Selection</p>
            <p className="text-sm font-medium">
              {bet.legs?.length > 1 ? `${bet.legs.length} Leg Parlay` : (bet.legs?.[0]?.player || bet.playerteam || 'Straight Bet')}
            </p>
          </div>

          {/* Form Fields */}
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-400">Status</label>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-sm focus:ring-emerald-500"
            >
              <option value="pending">Pending</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="void">Void</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-400">Stake ($)</label>
            <Input 
              type="number" 
              value={stake} 
              onChange={(e) => setStake(e.target.value)}
              className="bg-slate-950 border-slate-800"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="hover:bg-slate-800">Cancel</Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
