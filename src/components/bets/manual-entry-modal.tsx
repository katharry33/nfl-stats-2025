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
import { Activity } from 'lucide-react'; // Added icon for Live

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
  const [isLive, setIsLive] = useState(false); // ─── NEW STATE ───

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
      isLive, // ─── ADDED TO OBJECT ───
      team: '',
      matchup: '',
      gameDate: new Date().toISOString(),
    };

    onAddLeg(newLeg);
    toast.success('Manual leg added to slip.');
    
    // Reset state for next entry
    setPlayer('');
    setProp('');
    setLine('');
    setIsLive(false); 
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Manual Bet Leg Entry
            {isLive && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded animate-pulse">LIVE</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Player */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="player" className="text-right text-slate-400 text-xs uppercase font-bold">Player</Label>
            <Input id="player" value={player} onChange={(e) => setPlayer(e.target.value)} className="col-span-3 bg-slate-950 border-slate-800 focus:ring-blue-500" placeholder="e.g. Patrick Mahomes" />
          </div>

          {/* Prop */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="prop" className="text-right text-slate-400 text-xs uppercase font-bold">Prop</Label>
            <Input id="prop" value={prop} onChange={(e) => setProp(e.target.value)} className="col-span-3 bg-slate-950 border-slate-800 focus:ring-blue-500" placeholder="e.g. Passing Yards" />
          </div>

          <div className="grid grid-cols-2 gap-4">
             {/* Line */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="line" className="text-slate-400 text-[10px] uppercase font-bold">Line</Label>
              <Input id="line" type="number" step="0.5" value={line} onChange={(e) => setLine(e.target.value)} className="bg-slate-950 border-slate-800 focus:ring-blue-500" placeholder="0.5" />
            </div>
            {/* Odds */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="odds" className="text-slate-400 text-[10px] uppercase font-bold">Odds</Label>
              <Input id="odds" type="number" value={odds} onChange={(e) => setOdds(e.target.value)} className="bg-slate-950 border-slate-800 focus:ring-blue-500" />
            </div>
          </div>

          {/* Selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="selection" className="text-right text-slate-400 text-xs uppercase font-bold">Side</Label>
            <Select value={selection} onValueChange={(value: 'Over' | 'Under') => setSelection(value)}>
              <SelectTrigger className="col-span-3 bg-slate-950 border-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-white">
                <SelectItem value="Over">Over</SelectItem>
                <SelectItem value="Under">Under</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ─── LIVE TOGGLE ─── */}
          <div className="grid grid-cols-4 items-center gap-4 pt-2">
            <div className="col-start-2 col-span-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={isLive} 
                  onChange={(e) => setIsLive(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500/20 transition-all"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">Mark as Live Bet</span>
                  <span className="text-[10px] text-slate-500 italic">This bet was placed while the game was in progress</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button onClick={onClose} variant="ghost" className="text-slate-400 hover:text-white">Cancel</Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider">Add to Slip</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}