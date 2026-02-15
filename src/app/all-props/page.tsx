'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBetSlip } from '@/context/betslip-context';
import { X, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function AllPropsPage() {
  const router = useRouter();
  const [props, setProps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { legs: selections, addLeg, removeLeg, clearSelections } = useBetSlip();

  // Filter states
  const [season, setSeason] = useState('2025-2026');
  const [week, setWeek] = useState('1');
  const [team, setTeam] = useState('');
  const [player, setPlayer] = useState('');
  const [propType, setPropType] = useState('all');
  const [gameDate, setGameDate] = useState('');

  // Options for filters
  const [filterOptions, setFilterOptions] = useState<any>({
    weeks: [],
    teams: [],
    players: [],
    props: [],
  });

  // Fetch filter options on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await fetch(`/api/all-props/options?season=${season}`);
        const data = await res.json();
        setFilterOptions(data);
      } catch (error) {
        console.error('Failed to fetch options:', error);
      }
    };
    fetchOptions();
  }, [season]);

  // Fetch props when filters change
  useEffect(() => {
    const fetchProps = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (season) params.append('season', season);
        if (week) params.append('week', week);
        if (team) params.append('team', team.toUpperCase().trim()); // Teams are usually uppercase in DB (KC, NYG)
        if (player) params.append('player', player.trim()); // We will handle player normalization
        if (propType && propType !== 'all') params.append('prop', propType);
        if (gameDate) params.append('gamedate', gameDate);

        const response = await fetch(`/api/all-props?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch props');
        
        const propsData = await response.json();
        setProps(propsData);
      } catch (error) {
        console.error('Error fetching props:', error);
        toast.error("Failed to fetch props");
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch or when filters change
    fetchProps();

  }, [season, week, team, player, propType, gameDate]);

  const handleAddToBetSlip = (prop: any) => {
    addLeg({
      id: crypto.randomUUID(), // Unique ID for the slip
      propId: prop.id,
      player: prop.Player || prop.player,
      prop: prop.Prop || prop.prop,
      line: prop.Line || prop.line,
      matchup: prop.Matchup || prop.matchup,
      selection: 'Over', // Default selection so it's not empty
      odds: -110 // Default odds
      source: 'all-props' // <-- Add this
    });
    toast.success("Added to slip");
  };

  const handleClearFilters = () => {
    setSeason('2025-2026');
    setWeek('1');
    setTeam('');
    setPlayer('');
    setPropType('all');
    setGameDate('');
  };

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-white tracking-tighter italic">ALL PROPS</h1>
        <p className="text-slate-500 text-sm">Search and build your custom parlays</p>
      </div>

      {/* Filters */}
      <Card className="bg-slate-950 border-slate-800 mb-6">
        <CardHeader className="border-b border-slate-800">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm">Search Filters</CardTitle>
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Season</Label>
              <Select value={season} onValueChange={setSeason}>
                <SelectTrigger className="bg-slate-900 border-slate-800"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024-2025">2024-2025</SelectItem>
                  <SelectItem value="2025-2026">2025-2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Week</Label>
              <Select value={week} onValueChange={setWeek}>
                <SelectTrigger className="bg-slate-900 border-slate-800"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {filterOptions.weeks?.map((w: number) => (
                    <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Team</Label>
              <Input placeholder="e.g. KC" value={team} onChange={(e) => setTeam(e.target.value)} className="bg-slate-900 border-slate-800" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Player Name</Label>
              <Input placeholder="Search player..." value={player} onChange={(e) => setPlayer(e.target.value)} className="bg-slate-900 border-slate-800" />
            </div>
            <div className="space-y-2">
                <Label className="text-xs text-slate-400">Prop Type</Label>
                <Select value={propType} onValueChange={setPropType}>
                    <SelectTrigger className="bg-slate-900 border-slate-800 text-white">
                    <SelectValue placeholder="All Props" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">All Props</SelectItem>
                    <SelectItem value="Passing Yards">Passing Yards</SelectItem>
                    <SelectItem value="Rushing Yards">Rushing Yards</SelectItem>
                    <SelectItem value="Receiving Yards">Receiving Yards</SelectItem>
                    <SelectItem value="Touchdowns">Touchdowns</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Game Date</Label>
              <Input type="date" value={gameDate} onChange={(e) => setGameDate(e.target.value)} className="bg-slate-900 border-slate-800" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Props Grid */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="text-center py-12"><p className="text-slate-400">Loading props...</p></div>
          ) : props.length === 0 ? (
            <div className="text-center py-12"><p className="text-slate-400">No props found.</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {props.map((prop, index) => (
                <Card key={prop.id || index} className="bg-slate-900 border-slate-800">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-white text-lg">{prop.Player || prop.player}</h3>
                        <p className="text-sm text-slate-400">{prop.Team || prop.team}</p>
                      </div>
                      <Badge variant="outline">Week {prop.Week || week}</Badge>
                    </div>
                    <div className="p-3 bg-slate-950 rounded border border-slate-800 mb-3">
                      <p className="text-sm text-slate-400">{prop.Prop || prop.prop}</p>
                      <p className="text-2xl font-bold text-emerald-400">{prop.Line || prop.line}</p>
                    </div>
                    <Button onClick={() => handleAddToBetSlip(prop)} className="w-full bg-emerald-600">Add to Slip</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Bet Slip Sidebar */}
        <div className="lg:col-span-1">
          <Card className="bg-slate-950 border-slate-800 sticky top-6">
            <CardHeader className="border-b border-slate-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-emerald-500">Bet Slip ({selections.length})</CardTitle>
                {selections.length > 0 && <Button variant="ghost" size="sm" onClick={clearSelections}>Clear</Button>}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {selections.length === 0 ? (
                <p className="text-center py-8 text-slate-500 text-sm">No selections yet</p>
              ) : (
                <>
                  <div className="space-y-2 mb-4 max-h-[400px] overflow-y-auto">
                    {selections.map((sel: any) => (
                      <div key={sel.id} className="p-3 bg-slate-900 rounded-lg border border-slate-800 relative group">
                        <button onClick={() => removeLeg(sel.id)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-3 w-3" />
                        </button>
                        <p className="font-bold text-sm text-white">{sel.player}</p>
                        <p className="text-xs text-slate-400">{sel.prop} • {sel.line}</p>
                      </div>
                    ))}
                  </div>
                  <Button onClick={() => router.push('/parlay-studio')} className="w-full bg-emerald-600 font-bold">
                    Parlay Studio <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
