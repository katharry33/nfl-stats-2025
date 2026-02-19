'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bet } from '@/lib/types';

// Helper to get initial date in YYYY-MM-DD format
const getInitialDateForInput = (bet: Bet | null) => {
  if (!bet) return '';
  const dateSource = bet.manualDate || bet.date || bet.legs[0]?.gameDate || bet.createdAt;
  if (!dateSource) return '';

  let date;
  if (dateSource.toDate) { // Firebase Timestamp
    date = dateSource.toDate();
  } else {
    date = new Date(dateSource);
  }

  if (isNaN(date.getTime())) return '';

  date.setMinutes(date.getMinutes() + date.getTimezoneOffset());

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

export function EditBetModal({ bet, isOpen, onClose, onSave }: any) {
  const [status, setStatus] = useState('');
  const [stake, setStake] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [cashedOutAmount, setCashedOutAmount] = useState('');

  useEffect(() => {
    if (bet) {
      setStatus(bet.status || 'pending');
      setStake(bet.stake?.toString() || '0');
      setManualDate(getInitialDateForInput(bet));
      setCashedOutAmount(bet.cashedOutAmount?.toString() || '');
    }
  }, [bet]);

  const handleSave = () => {
    const payload: any = {
      id: bet.id,
      status: status,
      stake: parseFloat(stake),
      manualDate: manualDate,
    };
    
    if (status === 'cashed out') {
      payload.cashedOutAmount = parseFloat(cashedOutAmount) || 0;
    }

    onSave(payload);
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
          <div className={`p-3 rounded-lg border ${status === 'won' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-800/50 border-slate-700'}`}>
            <p className="text-xs text-slate-400 uppercase font-bold">Selection</p>
            <p className="text-sm font-medium">
              {bet.legs?.length > 1 ? `${bet.legs.length} Leg Parlay` : (bet.legs?.[0]?.player || 'Straight Bet')}
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-400">Game Date</label>
            <Input 
              type="date" 
              value={manualDate} 
              onChange={(e) => setManualDate(e.target.value)}
              className="bg-slate-950 border-slate-800 text-white"
              placeholder="YYYY-MM-DD"
            />
          </div>

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
              <option value="cashed out">Cashed Out</option>
              <option value="void">Void</option>
            </select>
          </div>

          {status === 'cashed out' && (
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-400">Cashed Out Amount ($)</label>
              <Input 
                type="number" 
                value={cashedOutAmount} 
                onChange={(e) => setCashedOutAmount(e.target.value)}
                className="bg-slate-950 border-slate-800"
                placeholder="Enter amount"
              />
            </div>
          )}

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
