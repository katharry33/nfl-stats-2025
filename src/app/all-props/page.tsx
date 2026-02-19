'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useBetSlip } from '@/context/betslip-context';
import { BetsTable } from '@/components/bets/bets-table';
import { BetSlip } from '@/components/bets/betslip';
import { Bet, BetLeg, PropData, BetType } from '@/lib/types';
import { 
  Search, 
  RotateCcw, 
  Loader2, 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';

const transformPropToBet = (prop: PropData): Bet => {
  const leg: BetLeg = {
    id: prop.id || crypto.randomUUID(),
    propId: prop.id,
    player: prop.player || prop.Player || 'N/A',
    team: prop.team || prop.Team || 'N/A',
    prop: prop.prop || prop.Prop || 'N/A',
    line: Number(prop.line || prop.Line || 0),
    odds: Number(prop.odds || prop.Odds || -110),
    selection: prop.overunder === 'Over' || prop['Over/Under?'] === 'Over' ? 'Over' : 'Under',
    status: 'pending',
    gameDate: prop.gameDate || prop.GameDate || new Date().toISOString(),
    matchup: prop.matchup || prop.Matchup || 'TBD',
    week: (prop.week || prop.Week) ? Number(prop.week || prop.Week) : undefined,
  };

  return {
    id: leg.id,
    userId: 'system',
    betType: 'Single',
    stake: 0,
    odds: leg.odds,
    status: 'pending',
    legs: [leg],
    createdAt: new Date(),
  };
};

export default function AllPropsPage() {
  const { addLeg } = useBetSlip();

  const [props, setProps] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDbVolume, setTotalDbVolume] = useState(0);
  const [filterOptions, setFilterOptions] = useState<{ weeks: number[]; propTypes: string[] }>({ weeks: [], propTypes: [] });

  const [playerInput, setPlayerInput] = useState('');
  const [teamInput, setTeamInput] = useState('');
  const [weekInput, setWeekInput] = useState('all');
  const [propTypeInput, setPropTypeInput] = useState('All Props');

  const [appliedFilters, setAppliedFilters] = useState({
    player: '',
    team: '',
    betType: 'Single' as BetType,
    gameDate: null
  });

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await fetch('/api/all-props/options');
        if (!response.ok) throw new Error('Failed to fetch filter options');
        const data = await response.json();
        setFilterOptions(data);
      } catch (error) {
        console.error(error);
        toast.error('Could not load filter options.');
      }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    const fetchProps = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (appliedFilters.betType && appliedFilters.betType !== 'Single') params.append('betType', appliedFilters.betType);
      if (appliedFilters.team) params.append('team', appliedFilters.team);
      if (appliedFilters.player) params.append('player', appliedFilters.player);

      try {
        const response = await fetch(`/api/all-props?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch props');
        const data: PropData[] = await response.json();
        if (params.toString().length === 0) {
          setTotalDbVolume(data.length);
        }
        const transformedData = data.map(transformPropToBet);
        setProps(transformedData);
      } catch (error) {
        console.error(error);
        toast.error('Failed to fetch historical props.');
      } finally {
        setLoading(false);
      }
    };

    fetchProps();
  }, [appliedFilters]);

  const handleSearch = () => {
    setAppliedFilters({
      player: playerInput,
      team: teamInput,
      betType: propTypeInput as BetType,
      gameDate: null
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleReset = () => {
    setPlayerInput('');
    setTeamInput('');
    setWeekInput('all');
    setPropTypeInput('All Props');
    setAppliedFilters({ player: '', team: '', betType: 'Single', gameDate: null });
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <header className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Historical Props</h1>
              <p className="text-slate-500 text-xs font-mono">Collection: allProps_2025</p>
            </div>
            <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Database Volume</p>
                <p className="text-xl font-mono text-blue-500 font-bold">{totalDbVolume.toLocaleString()}</p>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/50 items-end">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase text-slate-500 font-bold ml-1">Player</Label>
              <Input placeholder="Search..." value={playerInput} onChange={(e) => setPlayerInput(e.target.value)} onKeyDown={handleKeyDown} className="bg-slate-950 border-slate-800 text-xs h-9 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase text-slate-500 font-bold ml-1">Team</Label>
              <Input placeholder="LAL, NYG..." value={teamInput} onChange={(e) => setTeamInput(e.target.value)} onKeyDown={handleKeyDown} className="bg-slate-950 border-slate-800 text-xs h-9 text-white uppercase" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase text-slate-500 font-bold ml-1">Week</Label>
              <Select value={weekInput} onValueChange={setWeekInput}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-xs h-9 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="all">All Weeks</SelectItem>
                  {filterOptions.weeks.map(week => <SelectItem key={week} value={String(week)}>Week {week}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase text-slate-500 font-bold ml-1">Prop Type</Label>
              <Select value={propTypeInput} onValueChange={setPropTypeInput}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-xs h-9 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {filterOptions.propTypes.map(prop => <SelectItem key={prop} value={prop}>{prop}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button onClick={handleSearch} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase h-9"><Search className="h-3.5 w-3.5 mr-2" /> Search</Button>
              <Button variant="ghost" onClick={handleReset} className="text-slate-500 hover:text-white border border-slate-800 h-9 px-3"><RotateCcw className="h-3.5 w-3.5" /></Button>
            </div>
          </div>

          <div className="bg-slate-900/20 rounded-xl border border-slate-800 overflow-hidden min-h-[500px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                <p className="text-slate-500 text-sm font-mono animate-pulse uppercase">Loading Historical Props...</p>
              </div>
            ) : (
              <BetsTable 
                bets={props} 
                isHistorical={true}
                onAction={(bet) => {
                  addLeg(bet.legs[0]);
                  toast.success("Leg added to parlay creator");
                }}
              />
            )}
          </div>
        </div>
      </main>
      <BetSlip />
    </div>
  );
}
