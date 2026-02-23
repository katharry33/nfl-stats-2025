'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
}

export function EditBetModal({ bet, isOpen, onClose }: EditBetModalProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({ gameDate: '' });

  useEffect(() => {
    if (bet) {
      const initialDate = bet.gameDate?.seconds
        ? new Date(bet.gameDate.seconds * 1000).toISOString().split('T')[0]
        : (bet.gameDate ? new Date(bet.gameDate).toISOString().split('T')[0] : '');
      setFormData({ gameDate: initialDate });
    }
  }, [bet]);

  if (!bet) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    const res = await fetch('/api/update-bet', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bet.id, ...formData }),
    });

    if (res.ok) {
      router.refresh(); 
      onClose();
    } else {
        console.error("Failed to save bet:", await res.text());
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
              name="gameDate"
              value={formData.gameDate}
              onChange={handleInputChange}
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
