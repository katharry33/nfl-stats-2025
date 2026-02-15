'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Trash2, Calendar } from 'lucide-react';
import { useBetSlip } from '@/context/betslip-context';
import { calculateParlayOdds, calculatePayout } from '@/lib/utils/odds';
import { toast } from 'sonner';
import { BetLeg, BetRecord, BetStatus } from '@/lib/types';

interface LegChoice {
  selection: 'Over' | 'Under';
  result: BetStatus;
  odds: number;
}

export default function ParlayStudioPage() {
  const { selections, removeLeg, clearSelections } = useBetSlip();
  const [stake, setStake] = useState('');
  const [boostPercent, setBoostPercent] = useState('0');
  const [isBonus, setIsBonus] = useState(false);
  const [betDate, setBetDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLive, setIsLive] = useState(false);
  const [betType, setBetType] = useState('parlay');
  const [manualOdds, setManualOdds] = useState('');
  const [useManualOdds, setUseManualOdds] = useState(false);

  const [legChoices, setLegChoices] = useState<Record<string, LegChoice>>({});

  useEffect(() => {
    setLegChoices(prevChoices => {
      const newChoices = { ...prevChoices };
      let updated = false;
      selections.forEach((sel: BetLeg) => {
        if (!newChoices[sel.id]) {
          updated = true;
          newChoices[sel.id] = {
            selection: sel.selection || 'Over',
            result: 'pending',
            odds: sel.odds || -110,
          };
        }
      });
      return updated ? newChoices : prevChoices;
    });
  }, [selections]);

  const updateLegChoice = (legId: string, field: keyof LegChoice, value: LegChoice[keyof LegChoice]) => {
    setLegChoices(prev => ({
      ...prev,
      [legId]: {
        ...prev[legId],
        [field]: value,
      },
    }));
  };

  const calculatedOdds = useMemo(() => {
    const legsWithOdds = selections.map((sel: BetLeg) => legChoices[sel.id]?.odds || -110);
    return calculateParlayOdds(legsWithOdds);
  }, [selections, legChoices]);

  const effectiveOdds = useManualOdds && manualOdds ? Number(manualOdds) : calculatedOdds;

  const potentialPayout = useMemo(() => {
    if (!stake) return 0;
    return calculatePayout(Number(stake), effectiveOdds, isBonus);
  }, [stake, effectiveOdds, isBonus]);

  const overallStatus: BetStatus = useMemo(() => {
    const results: BetStatus[] = selections.map((sel: BetLeg) => legChoices[sel.id]?.result || 'pending');
    if (results.length > 0 && results.every((r) => r === 'won')) return 'won';
    if (results.some((r) => r === 'lost')) return 'lost';
    return 'pending';
  }, [selections, legChoices]);

  const handleSave = async () => {
    if (!stake || selections.length === 0) {
      toast.error('Please add legs and enter stake');
      return;
    }

    if (['straight', 'parlay', 'sgp', 'sgpx'].includes(betType)) {
      const missingSelection = selections.some((sel: BetLeg) => !legChoices[sel.id]?.selection);
      if (missingSelection) {
        toast.error('Please select Over or Under for all legs');
        return;
      }
    }

    const betData: BetRecord = {
      stake: Number(stake),
      odds: effectiveOdds,
      betType: betType === 'parlay' && selections.length > 1 ? `${selections.length} leg parlay` : betType,
      status: overallStatus,
      boost: Number(boostPercent) > 0,
      boostPercentage: Number(boostPercent),
      isBonus,
      isLive,
      legs: selections.map((sel: BetLeg) => ({
        ...sel,
        selection: legChoices[sel.id].selection,
        odds: legChoices[sel.id].odds,
        status: legChoices[sel.id].result,
      })),
      date: betDate,
    };

    try {
      const res = await fetch('/api/betting-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betData),
      });

      if (res.ok) {
        toast.success('Bet saved to betting log!');
        clearSelections();
        setStake('');
        setBoostPercent('0');
        setIsBonus(false);
        setIsLive(false);
        setBetDate(new Date().toISOString().split('T')[0]);
        setLegChoices({});
        setManualOdds('');
        setUseManualOdds(false);
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || 'Failed to save bet');
      }
    } catch (error) {
      toast.error('An unexpected error occurred.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-white tracking-tighter italic">PARLAY STUDIO</h1>
        <p className="text-slate-500 text-sm">Build and record your custom parlays, SGPs, and straight bets.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-slate-950 border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <div className="flex justify-between items-center">
                <CardTitle>Bet Legs ({selections.length})</CardTitle>
                {selections.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearSelections}>
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
                    <Card key={leg.id} className="bg-slate-900 border-slate-800">
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
                            onClick={() => removeLeg(leg.id)}
                            className="text-red-500 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-3">
                          <div className="p-3 bg-slate-950 rounded border border-slate-800">
                            <p className="text-xs text-slate-500">{leg.prop}</p>
                            <p className="text-lg font-bold text-emerald-400 font-mono">{leg.line}</p>
                          </div>

                          {['straight', 'parlay', 'sgp', 'sgpx'].includes(betType) && (
                            <>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-400">Selection</Label>
                                  <Select
                                    value={legChoices[leg.id]?.selection || 'Over'}
                                    onValueChange={(v: 'Over' | 'Under') => updateLegChoice(leg.id, 'selection', v)}
                                  >
                                    <SelectTrigger className="bg-slate-950 border-slate-800">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800">
                                      <SelectItem value="Over">Over {leg.line}</SelectItem>
                                      <SelectItem value="Under">Under {leg.line}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-xs text-slate-400">Odds</Label>
                                  <Input
                                    type="number"
                                    value={legChoices[leg.id]?.odds || -110}
                                    onChange={(e) => updateLegChoice(leg.id, 'odds', Number(e.target.value))}
                                    className="bg-slate-950 border-slate-800 font-mono"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Result</Label>
                                <div className="flex gap-2">
                                  <Button
                                    variant={legChoices[leg.id]?.result === 'won' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => updateLegChoice(leg.id, 'result', 'won')}
                                    className={legChoices[leg.id]?.result === 'won' ? 'bg-green-600 hover:bg-green-700' : ''}
                                  >
                                    Win
                                  </Button>
                                  <Button
                                    variant={legChoices[leg.id]?.result === 'lost' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => updateLegChoice(leg.id, 'result', 'lost')}
                                    className={legChoices[leg.id]?.result === 'lost' ? 'bg-red-600 hover:bg-red-700' : ''}
                                  >
                                    Loss
                                  </Button>
                                  <Button
                                    variant={legChoices[leg.id]?.result === 'pending' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => updateLegChoice(leg.id, 'result', 'pending')}
                                    className={legChoices[leg.id]?.result === 'pending' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                                  >
                                    Pending
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="bg-slate-950 border-slate-800 sticky top-6">
            <CardHeader className="border-b border-slate-800">
              <CardTitle>Bet Details</CardTitle>
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
                  className="bg-slate-900 border-slate-800"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Bet Type</Label>
                <Select value={betType} onValueChange={setBetType}>
                  <SelectTrigger className="bg-slate-900 border-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    <SelectItem value="straight">Straight</SelectItem>
                    <SelectItem value="parlay">Parlay</SelectItem>
                    <SelectItem value="sgp">SGP (Same Game Parlay)</SelectItem>
                    <SelectItem value="sgpx">SGP+ (Same Game Parlay Plus)</SelectItem>
                    <SelectItem value="moneyline">Moneyline</SelectItem>
                    <SelectItem value="spread">Spread</SelectItem>
                    <SelectItem value="anytime_td">Anytime TD</SelectItem>
                    <SelectItem value="teaser">Teaser</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
                <Checkbox
                  id="live-bet"
                  checked={isLive}
                  onCheckedChange={(checked) => setIsLive(!!checked)}
                />
                <Label htmlFor="live-bet" className="text-sm cursor-pointer">Live Bet</Label>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Stake ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  className="bg-slate-900 border-slate-800"
                />
              </div>

              <div className="flex items-center space-x-3 p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
                <Checkbox
                  id="manual-odds"
                  checked={useManualOdds}
                  onCheckedChange={(checked) => setUseManualOdds(!!checked)}
                />
                <Label htmlFor="manual-odds" className="text-sm cursor-pointer">Manual Odds Entry</Label>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-400">Total Odds (+/-)</Label>
                {useManualOdds ? (
                  <Input
                    type="number"
                    placeholder="Enter odds (e.g. +150 or -110)"
                    value={manualOdds}
                    onChange={(e) => setManualOdds(e.target.value)}
                    className="bg-slate-900 border-slate-800 font-mono font-bold text-emerald-400"
                  />
                ) : (
                  <Input
                    type="number"
                    value={calculatedOdds}
                    disabled
                    className="bg-slate-900 border-slate-800 font-mono font-bold text-emerald-400"
                  />
                )}
                {!useManualOdds && (
                  <p className="text-[9px] text-slate-500">Auto-calculated from leg odds</p>
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
                  className="bg-slate-900 border-slate-800"
                />
                <p className="text-[9px] text-slate-500">Enter percentage (e.g., 25 for 25% boost)</p>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
                <Checkbox
                  id="bonus-bet"
                  checked={isBonus}
                  onCheckedChange={(checked) => setIsBonus(!!checked)}
                  className="border-slate-600 data-[state=checked]:bg-purple-600"
                />
                <div className="grid gap-1 leading-none">
                  <Label htmlFor="bonus-bet" className="text-sm cursor-pointer">Bonus Bet</Label>
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
                      'bg-amber-500'
                    }>
                      {overallStatus}
                    </Badge>
                  </div>
                </div>
              )}

              <Button
                onClick={handleSave}
                disabled={selections.length === 0 || !stake}
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
                  <span className="text-white uppercase">{betType}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
