'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Trash2, Calendar, Edit, Calculator } from 'lucide-react';
import { useBetSlip } from '@/context/betslip-context';
import { calculateParlayOdds, calculatePayout } from '@/lib/utils/odds';
import { toast } from 'sonner';
import type { BetLeg } from '@/lib/types';
import { useSearchParams } from 'next/navigation';

export default function ParlayStudioPage() {
  const { selections, removeLeg, clearSlip, updateLeg, submitBet } = useBetSlip();
  const searchParams = useSearchParams();

  const [stake, setStake] = useState('');
  const [boostPercent, setBoostPercent] = useState('0');
  const [isBonus, setIsBonus] = useState(false);
  const [betDate, setBetDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLive, setIsLive] = useState(false);
  const [betType, setBetType] = useState('Parlay');
  
  // New state for manual odds override
  const [manualOdds, setManualOdds] = useState<string>('');
  const [isManualOdds, setIsManualOdds] = useState(false);

  useEffect(() => {
    // If 'source' is historical, automatically enable manual odds mode
    if (searchParams.get('source') === 'historical') {
      setIsManualOdds(true);
    }
  }, [searchParams]);
  
  const calculatedParlayOdds = useMemo(() => {
    if (selections.length === 0) return 0;
    const legsWithOdds = selections.map((leg: BetLeg) => Number(leg.odds || -110));
    // Round the final odds to a whole number
    return Math.round(calculateParlayOdds(legsWithOdds));
  }, [selections]);

  // Determine which odds to use
  const parlayOdds = isManualOdds ? Number(manualOdds) : calculatedParlayOdds;

  const potentialPayout = useMemo(() => {
    if (!stake || !parlayOdds) return 0;
    return calculatePayout(Number(stake), parlayOdds, isBonus);
  }, [stake, parlayOdds, isBonus]);

  const overallStatus = useMemo(() => {
    const results = selections.map((leg: BetLeg) => leg.status || 'pending');
    if (results.every((r: string) => r === 'won')) return 'won';
    if (results.some((r: string) => r === 'lost')) return 'lost';
    if (results.some((r: string) => r === 'push')) return 'push';
    return 'pending';
  }, [selections]);

  const handleSave = async () => {
    if (!stake || selections.length === 0) {
      toast.error('Please add selections and enter stake');
      return;
    }
    if (isManualOdds && !manualOdds) {
      toast.error("Please enter the odds for this historical bet.");
      return;
    }

    const payload = {
      stake: Number(stake),
      odds: parlayOdds,
      betType: betType as any,
      status: overallStatus as any,
      boost: Number(boostPercent) > 0,
      boostPercentage: Number(boostPercent),
      isBonus,
      isLive,
      legs: selections.map(leg => ({
        ...leg,
        // Ensure the leg keeps its original historical date if it exists
        gameDate: leg.gameDate || betDate 
      })),
      // This is the date for the overall Betting Log entry
      createdAt: new Date(betDate).toISOString(), 
    };

    try {
      await submitBet(payload);

      // Reset local page state
      setStake('');
      setBoostPercent('0');
      setIsBonus(false);
      setIsLive(false);
      setManualOdds('');
      setBetDate(new Date().toISOString().split('T')[0]);
      
      toast.success('Bet saved to betting log!');
    } catch (error) {
      console.error('Error saving bet:', error);
      toast.error('Failed to save bet');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="p-8 max-w-7xl mx-auto">
        <div className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-md pb-4 pt-8 mb-6">
          <h1 className="text-3xl font-black text-white tracking-tighter italic">PARLAY STUDIO</h1>
          <p className="text-slate-500 text-sm">Build and record your custom parlays from allProps_2025.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Bet Legs */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-950 border-slate-800">
              <CardHeader className="border-b border-slate-800">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white">Bet Legs ({selections.length})</CardTitle>
                  {selections.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => clearSlip()} className="text-slate-400 hover:text-white">
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {selections.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <p>No legs added yet</p>
                    <p className="text-sm mt-2">Search for props and add them to your bet slip</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selections.map((leg: BetLeg) => (
                      leg.id && <Card key={leg.id} className="bg-slate-900 border-slate-800">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h3 className="font-bold text-white">{leg.player}</h3>
                              <p className="text-sm text-slate-400">{leg.team}</p>
                              <p className="text-xs text-slate-500 font-mono">{leg.matchup}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLeg(leg.id!)}
                              className="text-red-500 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-slate-950 rounded border border-slate-800">
                                <p className="text-xs text-slate-500">{leg.prop}</p>
                                <p className="text-lg font-bold text-emerald-400 font-mono">{leg.line}</p>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Odds</Label>
                                <Input
                                  type="number"
                                  value={leg.odds}
                                  placeholder="-110"
                                  onChange={(e) => updateLeg(leg.id!, { odds: Number(e.target.value) })}
                                  className="bg-slate-800 border-slate-700 font-mono text-white"
                                />
                              </div>
                            </div>

                            {/* Over/Under Selection */}
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <Button 
                                onClick={() => updateLeg(leg.id!, { selection: 'Over' })}
                                variant={leg.selection === 'Over' ? 'default' : 'outline'}
                                className={leg.selection === 'Over' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-slate-700 text-slate-400'}
                              >
                                OVER
                              </Button>
                              <Button 
                                onClick={() => updateLeg(leg.id!, { selection: 'Under' })}
                                variant={leg.selection === 'Under' ? 'default' : 'outline'}
                                className={leg.selection === 'Under' ? 'bg-red-600 hover:bg-red-700' : 'border-slate-700 text-slate-400'}
                              >
                                UNDER
                              </Button>
                            </div>

                            {/* Result Status */}
                            <div className="space-y-2 pt-3 border-t border-slate-800/50 mt-4">
                              <Label className="text-xs text-slate-400">Result</Label>
                              <div className="flex gap-2">
                                <Button
                                  variant={leg.status === 'won' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => updateLeg(leg.id!, { status: 'won' })}
                                  className={`flex-1 ${leg.status === 'won' ? 'bg-green-600 hover:bg-green-700' : 'border-slate-700 text-slate-400'}`}
                                >
                                  Win
                                </Button>
                                <Button
                                  variant={leg.status === 'lost' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => updateLeg(leg.id!, { status: 'lost' })}
                                  className={`flex-1 ${leg.status === 'lost' ? 'bg-red-600 hover:bg-red-700' : 'border-slate-700 text-slate-400'}`}
                                >
                                  Loss
                                </Button>
                                <Button
                                  variant={leg.status === 'pending' ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => updateLeg(leg.id!, { status: 'pending' })}
                                  className={`flex-1 ${leg.status === 'pending' ? 'bg-amber-600 hover:bg-amber-700' : 'border-slate-700 text-slate-400'}`}
                                >
                                  Pending
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Bet Details */}
          <div>
            <Card className="bg-slate-950 border-slate-800 sticky top-6">
              <CardHeader className="border-b border-slate-800">
                <CardTitle className="text-white">Bet Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400 flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    Game Date
                  </Label>
                  <Input
                    type="date"
                    value={betDate}
                    onChange={(e) => setBetDate(e.target.value)}
                    className="bg-slate-900 border-slate-800 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Bet Type</Label>
                  <Select value={betType} onValueChange={setBetType}>
                    <SelectTrigger className="bg-emerald-500/10 border-emerald-500/20 text-emerald-500 font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Parlay">Parlay</SelectItem>
                      <SelectItem value="SGP">SGP (Same Game Parlay)</SelectItem>
                      <SelectItem value="SGPx">SGP+ (SGP Cross-Sport)</SelectItem>
                      <SelectItem value="Anytime TD">Anytime TD</SelectItem>
                      <SelectItem value="Moneyline">Moneyline</SelectItem>
                      <SelectItem value="Spread">Spread</SelectItem>
                      <SelectItem value="Round Robin">Round Robin</SelectItem>
                      <SelectItem value="Teaser">Teaser</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
                  <Checkbox
                    id="live-bet"
                    checked={isLive}
                    onCheckedChange={(checked: boolean) => setIsLive(!!checked)}
                  />
                  <Label htmlFor="live-bet" className="text-sm cursor-pointer text-white">Live Bet</Label>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Stake ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={stake}
                    onChange={(e) => setStake(e.target.value)}
                    className="bg-slate-900 border-slate-800 text-white"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-xs text-slate-400">Total Odds (+/-)</Label>
                  
                  {/* Manual/Auto Toggle - BIG and OBVIOUS */}
                  <div className="flex gap-2">
                    <Button 
                      type="button"
                      onClick={() => setIsManualOdds(false)}
                      variant={!isManualOdds ? "default" : "outline"}
                      className={`flex-1 font-bold ${
                        !isManualOdds 
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
                      }`}
                    >
                      <Calculator className="h-4 w-4 mr-2"/> 
                      AUTO
                    </Button>
                    <Button 
                      type="button"
                      onClick={() => setIsManualOdds(true)}
                      variant={isManualOdds ? "default" : "outline"}
                      className={`flex-1 font-bold ${
                        isManualOdds 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
                      }`}
                    >
                      <Edit className="h-4 w-4 mr-2"/> 
                      MANUAL
                    </Button>
                  </div>
                  
                  {/* Odds Input with Visual Feedback */}
                  <Input
                    type="number"
                    value={isManualOdds ? manualOdds : calculatedParlayOdds}
                    onChange={(e) => setManualOdds(e.target.value)}
                    disabled={!isManualOdds}
                    placeholder={isManualOdds ? "Enter odds (e.g., 450 or -110)" : "Auto-calculated"}
                    className={`font-mono font-bold text-lg ${
                      isManualOdds 
                        ? 'bg-blue-900/20 border-blue-500 text-blue-400 ring-2 ring-blue-500/50' 
                        : 'bg-slate-900 border-slate-800 text-emerald-400'
                    }`}
                  />
                  {isManualOdds && (
                    <p className="text-xs text-blue-400">✏️ Manual mode: Enter your historical odds</p>
                  )}
                  {!isManualOdds && (
                    <p className="text-xs text-emerald-400">🤖 Auto mode: Calculated from leg odds</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Boost %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={boostPercent}
                    onChange={(e) => setBoostPercent(e.target.value)}
                    className="bg-slate-900 border-slate-800 text-white"
                  />
                  <p className="text-[9px] text-slate-500">Enter percentage (e.g., 25 for 25% boost)</p>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
                  <Checkbox
                    id="bonus-bet"
                    checked={isBonus}
                    onCheckedChange={(checked: boolean) => setIsBonus(!!checked)}
                    className="border-slate-600 data-[state=checked]:bg-purple-600"
                  />
                  <div className="grid gap-1 leading-none">
                    <Label htmlFor="bonus-bet" className="text-sm cursor-pointer text-white">Bonus Bet</Label>
                    <p className="text-[9px] text-slate-500">Profit only</p>
                  </div>
                </div>

                {stake && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Potential Payout:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        ${potentialPayout.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Status:</span>
                      <Badge className={
                        overallStatus === 'won' ? 'bg-green-500' :
                        overallStatus === 'lost' ? 'bg-red-500' :
                        overallStatus === 'push' ? 'bg-slate-500' :
                        'bg-amber-500'
                      }>
                        {overallStatus}
                      </Badge>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSave}
                  disabled={selections.length === 0 || !stake || (isManualOdds && !manualOdds)}
                  className="w-full bg-blue-600 hover:bg-blue-700 font-bold"
                >
                  Save to Betting Log
                </Button>

                <div className="pt-4 border-t border-slate-800 space-y-1 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>Legs:</span>
                    <span className="text-white">{selections.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="text-white">{betType}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
