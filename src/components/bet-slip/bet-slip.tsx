'use client';

import React, { useState } from 'react';
import { X, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBetSlip } from '@/context/betslip-context';
import { calculateParlayOdds, getPayout } from '@/lib/utils';
import { BetLeg } from '@/lib/types';
import { useAuth } from '@/lib/firebase/provider';

export function BetSlip() {
  const { user } = useAuth();
  const { selections, removeLeg, clearSelections, submitBet } = useBetSlip();
  const [stake, setStake] = useState<string>('');
  const [isBonus, setIsBonus] = useState(false);
  const [betDate, setBetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parlayOdds = calculateParlayOdds(selections.map((l: BetLeg) => Number(l.odds)));
  const potentialPayout = stake ? getPayout(Number(stake), parlayOdds.combinedOddsAmerican, isBonus) : 0;

  const handleSubmit = async () => {
    if (!stake || selections.length === 0 || !user) return;
    
    setIsSubmitting(true);
    try {
      await submitBet({
        stake: Number(stake),
        odds: parlayOdds.combinedOddsAmerican,
        betType: selections.length > 1 ? 'parlay' : 'straight',
        status: 'pending',
        legs: selections,
        isLive: false,
        boost: false,
        boostPercentage: 0,
        createdAt: new Date(),
      });
      
      setStake('');
      setIsBonus(false);
      setBetDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error('Failed to submit bet from component:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (selections.length === 0) {
    return (
      <Card className="bg-slate-950 border-slate-800">
        <CardContent className="pt-6 text-center text-slate-500">
          <p>No selections yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-950 border-slate-800">
      <CardHeader className="border-b border-slate-800">
        <div className="flex justify-between items-center">
          <CardTitle className="text-emerald-500">Bet Slip ({selections.length})</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearSelections}
            className="text-slate-500 hover:text-white"
          >
            Clear All
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        {/* Selections List */}
        <div className="space-y-2">
          {selections.map((leg: BetLeg) => (
            <div 
              key={leg.id} 
              className="p-3 bg-slate-900 rounded-lg border border-slate-800 relative group"
            >
              <button
                onClick={() => removeLeg(leg.id)}
                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
              
              <div className="space-y-1">
                <p className="font-bold text-sm text-white">{leg.player}</p>
                <p className="text-xs text-slate-400">
                  {leg.prop} {leg.selection} {leg.line}
                </p>
                <p className="text-xs text-slate-500 font-mono">{leg.matchup}</p>
                <p className="text-xs font-mono text-emerald-400 font-bold">
                  {Number(leg.odds) > 0 ? `+${leg.odds}` : leg.odds}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Date Picker */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <Label className="text-xs text-slate-400 flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            Bet Date
          </Label>
          <Input
            type="date"
            value={betDate}
            onChange={(e) => setBetDate(e.target.value)}
            className="bg-slate-900 border-slate-800 text-white"
          />
        </div>

        {/* Stake Input */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Stake Amount ($)</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            className="bg-slate-900 border-slate-800 text-white"
          />
        </div>

        {/* Bonus Bet Toggle */}
        <div className="flex items-center space-x-3 p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
          <Checkbox 
            id="bonus-bet" 
            checked={isBonus}
            onCheckedChange={(checked) => setIsBonus(!!checked)}
            className="border-slate-600 data-[state=checked]:bg-purple-600"
          />
          <div className="grid gap-1 leading-none">
            <label htmlFor="bonus-bet" className="text-xs font-bold text-slate-200 cursor-pointer">
              Bonus Bet
            </label>
            <p className="text-[9px] text-slate-500">Profit only (stake not returned)</p>
          </div>
        </div>

        {/* Odds Summary */}
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Total Odds:</span>
            <span className="font-mono font-bold text-emerald-400">
              {parlayOdds.combinedOddsAmerican > 0 ? `+${parlayOdds.combinedOddsAmerican}` : parlayOdds.combinedOddsAmerican}
            </span>
          </div>
          {stake && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Potential Payout:</span>
              <span className="font-mono font-bold text-white">
                ${potentialPayout.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!stake || isSubmitting}
          className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold"
        >
          {isSubmitting ? 'Placing Bet...' : 'Place Bet'}
        </Button>
      </CardContent>
    </Card>
  );
}
