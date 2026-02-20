'use client';

import { useState } from 'react';
import { BetLeg } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLeg: (leg: BetLeg) => void;
}

export function ManualEntryModal({ isOpen, onClose, onAddLeg }: ManualEntryModalProps) {
  const [player, setPlayer] = useState('');
  const [prop, setProp] = useState('');
  const [line, setLine] = useState('');
  const [odds, setOdds] = useState('-110');
  const [selection, setSelection] = useState<'Over' | 'Under'>('Over');

  const handleSave = () => {
    if (!player || !prop || !line) {
      toast.error('Please fill out all fields.');
      return;
    }

    const newLeg: BetLeg = {
      id: `manual-${Date.now()}`,
      player,
      prop,
      line: Number(line),
      odds: Number(odds),
      selection,
      status: 'pending',
      source: 'manual-entry',
      // Fill in other required fields with defaults
      team: '',
      matchup: '',
      gameDate: new Date().toISOString(),
    };

    onAddLeg(newLeg);
    toast.success('Manual leg added to slip.');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle>Manual Bet Leg Entry</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="player" className="text-right">Player</Label>
            <Input id="player" value={player} onChange={(e) => setPlayer(e.target.value)} className="col-span-3 bg-slate-800 border-slate-700" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="prop" className="text-right">Prop</Label>
            <Input id="prop" value={prop} onChange={(e) => setProp(e.target.value)} className="col-span-3 bg-slate-800 border-slate-700" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="line" className="text-right">Line</Label>
            <Input id="line" type="number" value={line} onChange={(e) => setLine(e.target.value)} className="col-span-3 bg-slate-800 border-slate-700" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="odds" className="text-right">Odds</Label>
            <Input id="odds" value={odds} onChange={(e) => setOdds(e.target.value)} className="col-span-3 bg-slate-800 border-slate-700" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="selection" className="text-right">Selection</Label>
            <Select value={selection} onValueChange={(value: 'Over' | 'Under') => setSelection(value)}>
              <SelectTrigger className="col-span-3 bg-slate-800 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                <SelectItem value="Over">Over</SelectItem>
                <SelectItem value="Under">Under</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500">Add to Slip</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
