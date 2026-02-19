'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBetSlip } from '@/context/betslip-context';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { BetSlip } from '@/components/bets/betslip';

export default function AllPropsPage() {
  const [props, setProps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { addLeg } = useBetSlip();

  const [week, setWeek] = useState('all');
  const [team, setTeam] = useState('');
  const [player, setPlayer] = useState('');
  const [propType, setPropType] = useState('All Props');
  const [gameDate, setGameDate] = useState<Date | undefined>();

  const propTypes = [
    'All Props',
    'Passing Yards',
    'Passing TDs',
    'Rushing Yards',
    'Rushing TDs',
    'Receiving Yards',
    'Receiving TDs',
    'Receptions',
    'Completions',
    'Attempts',
    'Interceptions',
  ];

  const fetchProps = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (week !== 'all') params.append('week', week);
      if (team) params.append('team', team.trim());
      if (player) params.append('player', player.trim());
      if (propType && propType !== 'All Props') params.append('prop', propType);
      if (gameDate) params.append('gamedate', format(gameDate, 'yyyy-MM-dd'));

      const response = await fetch(`/api/all-props?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        toast.error(errorData.error || "Failed to fetch props");
        setProps([]);
        return;
      }
      
      const propsData = await response.json();
      
      if (!Array.isArray(propsData)) {
        console.error('Invalid data format:', propsData);
        toast.error("Invalid data format received");
        setProps([]);
        return;
      }
      
      setProps(propsData);
    } catch (error) {
      console.error('Error fetching props:', error);
      toast.error("Failed to fetch props");
      setProps([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProps();
  };

  const handleClearFilters = () => {
    setWeek('all');
    setTeam('');
    setPlayer('');
    setPropType('All Props');
    setGameDate(undefined);
    fetchProps();
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      fetchProps();
    }
  };

  const handleAddToBetSlip = (prop: any) => {
    addLeg({
      id: crypto.randomUUID(),
      propId: prop.id,
      player: prop.Player || prop.player || 'Unknown',
      prop: prop.Prop || prop.prop || 'Line',
      line: prop.Line || prop.line || 0,
      matchup: prop.Matchup || prop.matchup || '',
      team: prop.Team || prop.team || '',
      week: prop.Week || prop.week,
      selection: 'Over',
      odds: -110,
      source: 'all-props',
      status: 'pending'
    });
    toast.success(`Added ${prop.Player || prop.player} to slip`);
  };

  useEffect(() => {
    fetchProps();
  }, []);

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-black text-white tracking-tighter italic">ALL PROPS</h1>
            <p className="text-slate-500 text-sm">Search and build your custom parlays</p>
          </div>

          <Card className="bg-slate-950 border-slate-800 mb-6">
            <CardHeader className="border-b border-slate-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm text-white">Search Filters</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSearch} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Week</Label>
                  <Select value={week} onValueChange={setWeek}>
                    <SelectTrigger className="bg-slate-900 border-slate-800 text-white">
                      <SelectValue placeholder="Select week" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white max-h-60">
                      <SelectItem value="all">All Weeks</SelectItem>
                      {Array.from({ length: 22 }, (_, i) => i + 1).map((w) => (
                        <SelectItem key={w} value={String(w)}>
                          Week {w}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Team</Label>
                  <Input placeholder="e.g. KC" value={team} onChange={(e) => setTeam(e.target.value)} onKeyDown={handleKeyDown} className="bg-slate-900 border-slate-800 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Player Name</Label>
                  <Input placeholder="Search player..." value={player} onChange={(e) => setPlayer(e.target.value)} onKeyDown={handleKeyDown} className="bg-slate-900 border-slate-800 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Prop Type</Label>
                  <Select value={propType} onValueChange={setPropType}>
                    <SelectTrigger className="bg-slate-900 border-slate-800 text-white">
                      <SelectValue placeholder="Select prop type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white max-h-60">
                      {propTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400">Game Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal bg-slate-900 border-slate-800 text-white",
                          !gameDate && "text-slate-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {gameDate ? format(gameDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-slate-900">
                      <Calendar
                        mode="single"
                        selected={gameDate}
                        onSelect={setGameDate}
                        initialFocus
                        className="bg-slate-900 text-white"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-end space-x-2 col-span-full">
                  <Button type="submit" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500">Search</Button>
                  <Button type="button" variant="ghost" onClick={handleClearFilters} className="w-full sm:w-auto text-slate-400">Clear All</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {loading ? (
            <div className="text-center py-12"><p className="text-slate-400">Loading props...</p></div>
          ) : !Array.isArray(props) || props.length === 0 ? (
            <div className="text-center py-12"><p className="text-slate-400">No props found.</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {props.map((prop, index) => {
                const data = {
                  player: prop.Player || prop.player || 'Unknown',
                  team: prop.Team || prop.team || 'N/A',
                  prop: prop.Prop || prop.prop || 'Stat',
                  line: prop.Line || prop.line || '0',
                  matchup: prop.Matchup || prop.matchup || '',
                  week: prop.Week || prop.week || '?'
                };

                return (
                  <Card key={prop.id || index} className="bg-slate-900 border-slate-800 hover:border-emerald-500 transition-colors shadow-lg">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-white text-lg tracking-tight">{data.player}</h3>
                          <p className="text-sm text-slate-400 font-medium">{data.team}</p>
                          <p className="text-xs text-slate-500 italic">{data.matchup}</p>
                        </div>
                        <Badge variant="outline" className="bg-emerald-600/10 text-emerald-400 border-emerald-500/20">
                          Week {data.week}
                        </Badge>
                      </div>
                      
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 mb-3">
                        <p className="text-[10px] uppercase font-black text-slate-500 mb-1 tracking-widest">{data.prop}</p>
                        <p className="text-2xl font-bold text-emerald-400 font-mono tracking-tighter">{data.line}</p>
                      </div>

                      <Button 
                        onClick={() => handleAddToBetSlip(prop)} 
                        className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                      >
                        Add to Slip
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Single Bet Slip Sidebar - Only one! */}
      <BetSlip />
    </div>
  );
}