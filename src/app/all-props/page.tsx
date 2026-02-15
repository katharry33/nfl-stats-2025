// src/app/all-props/page.tsx - COMPLETE FILE
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
  const { selections, addLeg, removeLeg, clearSelections } = useBetSlip();

  // Filter states
  const [season, setSeason] = useState('2025-2026');
  const [week, setWeek] = useState('1');
  const [team, setTeam] = useState('');
  const [player, setPlayer] = useState('');
  const [propType, setPropType] = useState('');
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
        if (team) params.append('team', team);
        if (player) params.append('player', player);
        if (propType) params.append('prop', propType);
        if (gameDate) params.append('gamedate', gameDate);

        const response = await fetch(`/api/all-props?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch props');
        
        const propsData = await response.json();
        console.log('📦 Received props:', propsData.length);
        setProps(propsData);
      } catch (error) {
        console.error('Error fetching props:', error);
        toast.error("Failed to fetch props");
      } finally {
        setLoading(false);
      }
    };

    if (week || player || team || propType) {
      fetchProps();
    }
  }, [season, week, team, player, propType, gameDate]);

  const handleAddToBetSlip = (prop: any) => {
    addLeg({
      id: `${prop.id}-${Date.now()}`,
      player: prop.Player || prop.player || 'Unknown Player',
      prop: prop.Prop || prop.prop || 'Unknown Prop',
      line: prop.Line || prop.line || 0,
      selection: (prop.selection as 'Over' | 'Under') || 'Over',
      odds: 0,
      matchup: prop.Matchup || prop.matchup || '',
      team: prop.Team || prop.team || '',
      week: prop.Week || prop.week || parseInt(week),
      propId: prop.id,
    });
    
    toast.success(`${prop.Player || prop.player} added to bet slip`);
  };

  const handleClearFilters = () => {
    setSeason('2025-2026');
    setWeek('1');
    setTeam('');
    setPlayer('');
    setPropType('');
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
            {/* Season */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Season</Label>
              <Select value={season} onValueChange={setSeason}>
                <SelectTrigger className="bg-slate-900 border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024-2025">2024-2025</SelectItem>
                  <SelectItem value="2025-2026">2025-2026</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Week */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Week</Label>
              <Select value={week} onValueChange={setWeek}>
                <SelectTrigger className="bg-slate-900 border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.weeks?.map((w: number) => (
                    <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Team</Label>
              <Input
                placeholder="e.g. KC"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="bg-slate-900 border-slate-800"
              />
            </div>

            {/* Player */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Player Name</Label>
              <Input
                placeholder="Search player..."
                value={player}
                onChange={(e) => setPlayer(e.target.value)}
                className="bg-slate-900 border-slate-800"
              />
            </div>

            {/* Prop Type */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Prop Type</Label>
              <Input
                placeholder="e.g. Passing Yards"
                value={propType}
                onChange={(e) => setPropType(e.target.value)}
                className="bg-slate-900 border-slate-800"
              />
            </div>

            {/* Game Date */}
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Game Date</Label>
              <Input
                type="date"
                value={gameDate}
                onChange={(e) => setGameDate(e.target.value)}
                className="bg-slate-900 border-slate-800"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Props Grid - Left Side */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-slate-400">Loading props...</p>
            </div>
          ) : props.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400">No props found. Try adjusting your filters.</p>
            </div>
          ) : (
            <>
              <p className="text-slate-400 text-sm mb-4">{props.length} props available</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {props.map((prop, index) => {
                  const player = prop.Player || prop.player || `Player ${index + 1}`;
                  const team = prop.Team || prop.team || 'N/A';
                  const propType = prop.Prop || prop.prop || 'Unknown Prop';
                  const line = prop.Line !== undefined ? prop.Line : (prop.line || 0);
                  const matchup = prop.Matchup || prop.matchup || '';
                  const weekNum = prop.Week !== undefined ? prop.Week : (prop.week || parseInt(week));

                  return (
                    <Card 
                      key={prop.id || index} 
                      className="bg-slate-900 border-slate-800 hover:border-emerald-500/50 transition-colors"
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-white text-lg">{player}</h3>
                            <p className="text-sm text-slate-400">{team}</p>
                            {matchup && (
                              <p className="text-xs text-slate-500 font-mono">{matchup}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs">Week {weekNum}</Badge>
                        </div>

                        <div className="space-y-3">
                          <div className="p-3 bg-slate-950 rounded border border-slate-800">
                            <p className="text-sm text-slate-400 mb-1">{propType}</p>
                            <p className="text-2xl font-bold text-emerald-400 font-mono">{line}</p>
                          </div>

                          <Button
                            onClick={() => handleAddToBetSlip(prop)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                          >
                            Add to Slip
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Bet Slip - Right Sidebar */}
        <div className="lg:col-span-1">
          <Card className="bg-slate-950 border-slate-800 sticky top-6">
            <CardHeader className="border-b border-slate-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-emerald-500">Bet Slip ({selections.length})</CardTitle>
                {selections.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearSelections}>
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {selections.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <p>No selections yet</p>
                  <p className="text-xs mt-2">Add props to build your parlay</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-4 max-h-[400px] overflow-y-auto">
                    {selections.map((sel) => (
                      <div 
                        key={sel.id} 
                        className="p-3 bg-slate-900 rounded-lg border border-slate-800 relative group"
                      >
                        <button
                          onClick={() => removeLeg(sel.id)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        
                        <div className="space-y-1">
                          <p className="font-bold text-sm text-white">{sel.player}</p>
                          <p className="text-xs text-slate-400">
                            {sel.prop} • {sel.line}
                          </p>
                          <p className="text-xs text-slate-500 font-mono">{sel.matchup}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => router.push('/parlay-studio')}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold"
                  >
                    Parlay Studio
                    <ArrowRight className="ml-2 h-4 w-4" />
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
