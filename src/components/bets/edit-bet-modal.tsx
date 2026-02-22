'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EditBetModalProps {
  bet: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: any) => Promise<void>; // Add this line
}

export function EditBetModal({ bet, isOpen, onClose, onSave }: EditBetModalProps) {
  const [gameDate, setGameDate] = useState('');

  useEffect(() => {
    if (bet?.gameDate) {
      const date = bet.gameDate.seconds
        ? new Date(bet.gameDate.seconds * 1000)
        : new Date(bet.gameDate);

      if (!isNaN(date.getTime())) {
        setGameDate(date.toISOString().split('T')[0]);
      }
    }
  }, [bet]);

  if (!bet) return null;

  const handleSave = async () => {
    try {
      await onSave({ gameDate });
      onClose();
    } catch (error) {
      console.error('Failed to save bet:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black italic uppercase tracking-tighter">
            Edit Bet Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-slate-500">Game Date</label>
            <Input
              type="date"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
              className="bg-slate-950 border-slate-800 text-white focus:ring-emerald-500 [color-scheme:dark]"
            />
          </div>
          {/* Add other fields here like Stake, Status, etc. */}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="hover:bg-slate-800">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
