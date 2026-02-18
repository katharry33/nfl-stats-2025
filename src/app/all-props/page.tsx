'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBetSlip } from '@/context/betslip-context';
import { toast } from 'sonner';
import { Search, X } from 'lucide-react';

export default function HistoricalPropsPage() {
  const router = useRouter();
  const [props, setProps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisibleId, setLastVisibleId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number>(0); // State for total prop count
  const { addLeg } = useBetSlip();

  // Filter states
  const [week, setWeek] = useState('all');
  const [team, setTeam] = useState('');
  const [gameDate, setGameDate] = useState('');
  const [matchup, setMatchup] = useState('');
  const [player, setPlayer] = useState('');
  const [propType, setPropType] = useState('');

  // Prop types for dropdown
  const propTypes = [
    'Passing Yards',
    'Passing TDs',
    'Passing Attempts',
    'Passing Completions',
    'Interceptions',
    'Rushing Yards',
    'Rushing TDs',
    'Rushing Attempts',
    'Receiving Yards',
    'Receiving TDs',
    'Receptions',
    'Targets',
    'Longest Reception',
    'Longest Rush',
    'Longest Completion',
  ];

  const fetchProps = async (lastId: string | null = null) => {
    if (lastId) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      params.append('limit', '100');
      if (week !== 'all') params.append('week', week);
      if (team) params.append('team', team.trim());
      if (player) params.append('player', player.trim());
      if (propType) params.append('prop', propType);
      if (gameDate) params.append('gamedate', gameDate);
      if (matchup) params.append('matchup', matchup.trim());
      if (lastId) params.append('lastVisible', lastId);

      const response = await fetch(`/api/all-props?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch props');
      
      const { props: newProps, lastVisibleId: newLastVisibleId, totalCount: newTotalCount } = await response.json();

      setProps(prev => lastId ? [...prev, ...newProps] : newProps);
      setLastVisibleId(newLastVisibleId);
      setTotalCount(newTotalCount); // Update the total count
      setHasMore(newProps.length > 0 && newLastVisibleId !== null);

      if (!lastId) {
        toast.success(`Found ${newTotalCount} props matching your criteria.`);
      }

    } catch (error) {
      console.error('Error fetching props:', error);
      toast.error("Failed to fetch props");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setProps([]);
    setLastVisibleId(null);
    setHasMore(true);
    fetchProps();
  };

  const loadMore = () => {
    if (hasMore && !loadingMore) {
      fetchProps(lastVisibleId);
    }
  };

  // Initial load with all props
  useEffect(() => {
    handleSearch();
  }, []);

  const handleClearAll = () => {
    setWeek('all');
    setTeam('');
    setGameDate('');
    setMatchup('');
    setPlayer('');
    setPropType('');
    // Trigger search after clearing
    setTimeout(() => handleSearch(), 100);
  };

  const handleAddToBetSlip = (prop: any, selection: 'Over' | 'Under') => {
    addLeg({
      id: crypto.randomUUID(),
      propId: prop.id,
      player: prop.Player || prop.player || 'Unknown Player',
      prop: prop.Prop || prop.prop || 'Unknown Prop',
      line: prop.Line || prop.line || 0,
      matchup: prop.Matchup || prop.matchup || '',
      team: prop.Team || prop.team || '',
      selection: selection,
      odds: -110, // Default odds
      status: 'pending',
      week: prop.Week || prop.week || 'N/A',
      source: 'historical-props'
    });
    toast.success(`Added ${selection} ${prop.Line || prop.line} to slip`);
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-white tracking-tighter">All Props</h1>
          <p className="text-slate-400 text-sm">Filter and browse all available player props.</p>
        </div>

        {/* Search Filters */}
        <Card className="bg-slate-900 border-slate-800 mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {/* Week Filter */}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400 uppercase font-bold">Week</Label>
                  <Select value={week} onValueChange={setWeek}>
                    <SelectTrigger className="bg-slate-950 border-slate-700 h-11">
                      <SelectValue placeholder="All Weeks" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
                      <SelectItem value="all">All Weeks</SelectItem>
                      {Array.from({ length: 22 }, (_, i) => i + 1).map((w) => (
                        <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Team Filter */}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400 uppercase font-bold">Team</Label>
                  <Input
                    placeholder="e.g., KC or chiefs"
                    value={team}
                    onChange={(e) => setTeam(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="bg-slate-950 border-slate-700 h-11"
                  />
                </div>

                {/* Game Date Filter */}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400 uppercase font-bold">Game Date</Label>
                  <Input
                    type="date"
                    value={gameDate}
                    onChange={(e) => setGameDate(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="bg-slate-950 border-slate-700 h-11"
                  />
                </div>

                {/* Matchup Filter */}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400 uppercase font-bold">Matchup</Label>
                  <Input
                    placeholder="e.g., KC @ BUF"
                    value={matchup}
                    onChange={(e) => setMatchup(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="bg-slate-950 border-slate-700 h-11"
                  />
                </div>

                {/* Player Filter */}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400 uppercase font-bold">Player</Label>
                  <Input
                    placeholder="Search player name..."
                    value={player}
                    onChange={(e) => setPlayer(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="bg-slate-950 border-slate-700 h-11"
                  />
                </div>

                {/* Prop Type Filter */}
                <div className="space-y-2">
                  <Label className="text-xs text-slate-400 uppercase font-bold">Prop Type</Label>
                  <Select value={propType} onValueChange={setPropType}>
                    <SelectTrigger className="bg-slate-950 border-slate-700 h-11">
                      <SelectValue placeholder="All Prop Types" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 max-h-60">
                      <SelectItem value="">All Prop Types</SelectItem>
                      {propTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 font-bold px-8"
                >
                  <Search className="mr-2 h-4 w-4" />
                  {loading ? 'Searching...' : 'Search'}
                </Button>
                <Button
                  type="button"
                  onClick={handleClearAll}
                  variant="outline"
                  className="border-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear All
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results Count */}
        {!loading && (
          <div className="mb-4 text-sm text-slate-400">
            Showing {props.length} of {totalCount} props
          </div>
        )}

        {/* Props Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-500 border-r-transparent"></div>
            <p className="text-slate-400 mt-4">Loading props...</p>
          </div>
        ) : props.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">No props found</p>
            <p className="text-slate-500 text-sm mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {props.map((prop, index) => (
                <Card key={prop.id || index} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
                  <CardContent className="p-4">
                    {/* Player Info */}
                    <div className="mb-3">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-white text-lg truncate pr-2">
                          {prop.Player || prop.player || 'Unknown Player'}
                        </h3>
                        <span className="text-xs font-mono bg-emerald-900/50 text-emerald-400 border border-emerald-900 rounded-full px-2 py-0.5 whitespace-nowrap">
                          Week {prop.Week || prop.week || 'N/A'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">
                        {prop.Team || prop.team || 'N/A'}
                      </p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {prop.Matchup || prop.matchup || 'No matchup'}
                      </p>
                    </div>

                    {/* Prop Details */}
                    <div className="mb-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <p className="text-xs text-slate-500 uppercase mb-1">
                        {prop.Prop || prop.prop || 'Unknown Prop'}
                      </p>
                      <p className="text-2xl font-black text-white font-mono">
                        {prop.Line || prop.line || '0'}
                      </p>
                    </div>

                    {/* Over/Under Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleAddToBetSlip(prop, 'Over')}
                        className="bg-slate-800 hover:bg-emerald-600 border border-slate-700 font-bold"
                      >
                        OVER
                      </Button>
                      <Button
                        onClick={() => handleAddToBetSlip(prop, 'Under')}
                        className="bg-slate-800 hover:bg-blue-600 border border-slate-700 font-bold"
                      >
                        UNDER
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {hasMore && (
              <div className="text-center mt-6">
                <Button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="bg-slate-800 hover:bg-slate-700 font-bold px-8"
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}